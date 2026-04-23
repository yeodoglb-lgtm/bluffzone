import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

// 월별 무료 한도
const FREE_LIMITS: Record<string, number> = {
  'hand-review': 30,
  'chat': 100,
  'parse-voice': 50,
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── 비용 계산 (근사) ──────────────────────────────────────────────────────────
function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing: Record<string, { in: number; out: number }> = {
    'claude-sonnet-4-6':         { in: 3.0,   out: 15.0  },
    'claude-opus-4-7':           { in: 15.0,  out: 75.0  },
    'claude-haiku-4-5-20251001': { in: 0.8,   out: 4.0   },
  };
  const p = pricing[model] ?? pricing['claude-sonnet-4-6'];
  return (inputTokens / 1_000_000) * p.in + (outputTokens / 1_000_000) * p.out;
}

// ── 사용량 체크 ───────────────────────────────────────────────────────────────
async function checkUsageLimit(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  kind: string
): Promise<{ allowed: boolean; used: number; limit: number }> {
  const limit = FREE_LIMITS[kind] ?? 999;
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from('ai_usages')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('kind', kind)
    .gte('created_at', startOfMonth.toISOString());

  const used = count ?? 0;
  return { allowed: used < limit, used, limit };
}

// ── 사용량 기록 ───────────────────────────────────────────────────────────────
async function recordUsage(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  kind: string,
  model: string,
  inputTokens: number,
  outputTokens: number
) {
  await supabase.from('ai_usages').insert({
    user_id: userId,
    kind,
    model,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cost_usd: estimateCost(model, inputTokens, outputTokens),
  });
}

// ── 캐시 키 생성 ──────────────────────────────────────────────────────────────
// 같은 상황이면 GPT를 다시 부르지 않는다
// 규칙: hero_pos + villain_pos + hero_cards + board + 단순화된 액션
function buildCacheKey(hand: any): string {
  const norm = (v: any) => (v ?? '').toString().trim().toUpperCase();

  const heroPos = norm(hand?.hero_position);
  const villainPos = norm(hand?.villain_position);

  // 카드: [{rank,suit}] 형태 가정, 문자열이면 그대로
  const cardStr = (c: any): string => {
    if (!c) return '';
    if (typeof c === 'string') return c.toUpperCase();
    return `${norm(c.rank)}${(c.suit ?? '').toString().toLowerCase()}`;
  };
  const cardsStr = (arr: any): string =>
    Array.isArray(arr) ? arr.map(cardStr).filter(Boolean).join('') : '';

  const heroCards = cardsStr(hand?.hero_cards);
  const board = cardsStr(hand?.board);

  // 액션: street/actor/action/amount 만 추려서 단순화
  const actions = Array.isArray(hand?.actions)
    ? hand.actions
        .map((a: any) =>
          [
            norm(a?.street),
            norm(a?.actor),
            norm(a?.action),
            a?.amount != null ? String(a.amount) : '',
          ].join(':')
        )
        .join('|')
    : '';

  return [heroPos, villainPos, heroCards, board, actions].join('_');
}

// ── 핸드 리뷰 시스템 프롬프트 ────────────────────────────────────────────────
const HAND_REVIEW_SYSTEM = `당신은 고수준 캐시게임 홀덤 코치입니다. GTO와 익스플로잇 관점 모두를 설명하되,
입력이 충분하지 않으면 가정을 명시하세요. 에쿼티 수치는 근사임을 명시하세요.
반드시 아래 JSON 스키마로만 응답하세요. 마크다운 코드블록 없이 순수 JSON만 출력하세요.

{
  "summary": "string",
  "recommended_line": [{"street":"string","action":"string","rationale":"string"}],
  "equity": {
    "assumptions": "string",
    "preflop": {"win":number,"tie":number,"lose":number},
    "flop": {"win":number,"tie":number,"lose":number},
    "turn": {"win":number,"tie":number,"lose":number},
    "river": {"win":number,"tie":number,"lose":number}
  },
  "mistakes": [{"street":"string","severity":"low|medium|high","note":"string"}],
  "coach_notes": ["string"]
}

없는 스트리트의 에쿼티는 null로 표시하세요.`;

// ── 음성 파싱 시스템 프롬프트 ────────────────────────────────────────────────
const VOICE_PARSE_SYSTEM = `당신은 포커 핸드 분석 전문가입니다. 사용자의 자연어 음성 입력을 구조화된 핸드 데이터로 변환하세요.
반드시 아래 JSON 스키마로만 응답하세요. 마크다운 코드블록 없이 순수 JSON만 출력하세요.
파악할 수 없는 필드는 null로 두세요.

{
  "game_type": "NLH|PLO|Tournament|null",
  "stakes": "string|null",
  "hero_position": "UTG|UTG+1|MP|HJ|CO|BTN|SB|BB|null",
  "villain_position": "UTG|UTG+1|MP|HJ|CO|BTN|SB|BB|null",
  "hero_cards": [{"rank":"string","suit":"s|h|d|c"}],
  "villain_known": boolean,
  "villain_cards": [{"rank":"string","suit":"s|h|d|c"}]|null,
  "board": [{"rank":"string","suit":"s|h|d|c"}]|null,
  "actions": [{"street":"preflop|flop|turn|river","actor":"hero|villain","action":"fold|check|call|bet|raise|allin","amount":number|null}],
  "result": "won|lost|chopped|folded|null",
  "pot_size": number|null,
  "hero_pl": number|null,
  "note": "string|null"
}`;

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 인증 확인
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const userSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const endpoint = url.pathname.split('/').pop();
    const body = await req.json();

    // ── /hand-review ──────────────────────────────────────────────────────────
    if (endpoint === 'hand-review') {
      const { allowed, used, limit } = await checkUsageLimit(supabase, user.id, 'hand-review');
      if (!allowed) {
        return new Response(JSON.stringify({
          error: 'usage_limit',
          message: `이번 달 핸드 리뷰 무료 한도(${limit}회)를 초과했습니다. (사용: ${used}회)`,
        }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { hand, model = 'claude-sonnet-4-6' } = body;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: 2048,
          system: HAND_REVIEW_SYSTEM,
          messages: [{
            role: 'user',
            content: `다음 핸드를 분석해주세요:\n\n${JSON.stringify(hand, null, 2)}`,
          }],
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message ?? 'Anthropic API error');

      const inputTokens = data.usage?.input_tokens ?? 0;
      const outputTokens = data.usage?.output_tokens ?? 0;
      await recordUsage(supabase, user.id, 'hand-review', model, inputTokens, outputTokens);

      const reviewJson = JSON.parse(data.content[0].text);
      return new Response(JSON.stringify(reviewJson), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── /chat (스트리밍) ──────────────────────────────────────────────────────
    if (endpoint === 'chat') {
      const { allowed, used, limit } = await checkUsageLimit(supabase, user.id, 'chat');
      if (!allowed) {
        return new Response(JSON.stringify({
          error: 'usage_limit',
          message: `이번 달 채팅 무료 한도(${limit}회)를 초과했습니다. (사용: ${used}회)`,
        }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { messages, model = 'claude-sonnet-4-6', systemPrompt } = body;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: 4096,
          stream: true,
          system: systemPrompt ?? '당신은 블러프존AI입니다. 홀덤 전략, 핸드 분석, 뱅크롤 관리에 전문화된 포커 코치입니다. 한국어로 답변하세요.',
          messages,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message ?? 'Anthropic API error');
      }

      // SSE 스트림 중계
      const stream = new TransformStream();
      const writer = stream.writable.getWriter();
      const encoder = new TextEncoder();

      (async () => {
        const reader = response.body!.getReader();
        let inputTokens = 0;
        let outputTokens = 0;

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = new TextDecoder().decode(value);

            // 토큰 카운트 추출
            const usageMatch = chunk.match(/"input_tokens":(\d+),"output_tokens":(\d+)/);
            if (usageMatch) {
              inputTokens = parseInt(usageMatch[1]);
              outputTokens = parseInt(usageMatch[2]);
            }

            await writer.write(encoder.encode(chunk));
          }
        } finally {
          await writer.close();
          await recordUsage(supabase, user.id, 'chat', model, inputTokens, outputTokens);
        }
      })();

      return new Response(stream.readable, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
      });
    }

    // ── /parse-voice ──────────────────────────────────────────────────────────
    if (endpoint === 'parse-voice') {
      const { text, model = 'claude-haiku-4-5-20251001' } = body;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: 1024,
          system: VOICE_PARSE_SYSTEM,
          messages: [{ role: 'user', content: `음성 입력:\n${text}` }],
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message ?? 'Anthropic API error');

      const inputTokens = data.usage?.input_tokens ?? 0;
      const outputTokens = data.usage?.output_tokens ?? 0;
      await recordUsage(supabase, user.id, 'parse-voice', model, inputTokens, outputTokens);

      const parsed = JSON.parse(data.content[0].text);
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── /hand-review-gpt ─────────────────────────────────────────────────────
    if (endpoint === 'hand-review-gpt') {
      const { hand } = body;

      // ── 캐시 키 생성 ──────────────────────────────────────────────────────
      // 같은 상황(포지션 + 핸드 + 보드 + 액션)이면 GPT를 다시 부르지 않는다
      const cacheKey = buildCacheKey(hand);

      // ── 캐시 조회 ─────────────────────────────────────────────────────────
      const { data: cached } = await supabase
        .from('hand_review_cache')
        .select('id, result, hit_count')
        .eq('cache_key', cacheKey)
        .maybeSingle();

      if (cached) {
        // hit_count 증가 (실패해도 응답은 그대로 반환)
        await supabase
          .from('hand_review_cache')
          .update({ hit_count: (cached.hit_count ?? 1) + 1, updated_at: new Date().toISOString() })
          .eq('id', cached.id);

        return new Response(JSON.stringify({ ...cached.result, _cached: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // ── 사용량 한도 체크 (캐시 미스일 때만) ─────────────────────────────────
      const { allowed, used, limit } = await checkUsageLimit(supabase, user.id, 'hand-review');
      if (!allowed) {
        return new Response(JSON.stringify({
          error: 'usage_limit',
          message: `이번 달 핸드 리뷰 무료 한도(${limit}회)를 초과했습니다. (사용: ${used}회)`,
        }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // ── 사람이 읽기 쉬운 형태로 hand 요약 (프롬프트용) ─────────────────────
      const fmtCard = (c: any): string => {
        if (!c) return '';
        if (typeof c === 'string') return c;
        return `${c.rank ?? ''}${c.suit ?? ''}`;
      };
      const fmtCards = (arr: any): string =>
        Array.isArray(arr) && arr.length ? arr.map(fmtCard).join(' ') : '(없음)';
      const fmtActions = (arr: any): string =>
        Array.isArray(arr) && arr.length
          ? arr
              .map(
                (a: any) =>
                  `${a.street}:${a.actor} ${a.action}${a.amount != null ? ' ' + a.amount : ''}`
              )
              .join(' / ')
          : '(없음)';

      const position = `${hand?.hero_position ?? '?'} vs ${hand?.villain_position ?? '?'}`;
      const handCards = fmtCards(hand?.hero_cards);
      const boardCards = fmtCards(hand?.board);
      const actionsText = fmtActions(hand?.actions);

      const systemPrompt = `너는 포커 전략 코치다.

주어진 상황을 분석하고 반드시 JSON 형식으로만 답해라.
설명, 문장, 마크다운 절대 추가하지 마라.

[출력 형식]
{
  "recommended_action": "베팅 또는 체크",
  "recommended_frequency": 0-100 사이 정수,
  "secondary_action": "베팅 또는 체크",
  "secondary_frequency": 0-100 사이 정수,
  "summary": ["문장1", "문장2", "문장3"],
  "mistake": "한 문장",
  "tip": "한 문장"
}

[규칙]
- 반드시 JSON만 출력 (다른 텍스트 금지)
- recommended_frequency + secondary_frequency = 100
- summary는 정확히 3개 문장
- 모든 문장은 짧고 명확하게 작성
- 한국어로 작성`;

      const userPrompt = `[상황]
- 포지션: ${position}
- 핸드: ${handCards}
- 보드: ${boardCards}
- 액션: ${actionsText}`;

      // ── GPT 호출 헬퍼 (재시도 + JSON 파싱 fallback 포함) ─────────────────
      async function callGpt(): Promise<{
        json: any | null;
        inputTokens: number;
        outputTokens: number;
        raw: string;
      }> {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            max_tokens: 512,
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
          }),
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error?.message ?? 'OpenAI API error');

        const raw: string = d.choices?.[0]?.message?.content ?? '';
        const inputTokens = d.usage?.prompt_tokens ?? 0;
        const outputTokens = d.usage?.completion_tokens ?? 0;

        // 1차 시도: 그대로 JSON.parse
        try {
          return { json: JSON.parse(raw), inputTokens, outputTokens, raw };
        } catch {
          // 2차 시도: { ... } 구간만 추출해서 파싱 (마크다운 ```json 등 섞였을 때)
          const match = raw.match(/\{[\s\S]*\}/);
          if (match) {
            try {
              return { json: JSON.parse(match[0]), inputTokens, outputTokens, raw };
            } catch { /* fall through */ }
          }
          return { json: null, inputTokens, outputTokens, raw };
        }
      }

      // 1차 호출
      let result = await callGpt();
      let totalInput = result.inputTokens;
      let totalOutput = result.outputTokens;

      // JSON 파싱 실패 → 1회만 재시도
      if (!result.json) {
        console.warn('[hand-review-gpt] JSON parse failed, retrying once. raw:', result.raw);
        result = await callGpt();
        totalInput += result.inputTokens;
        totalOutput += result.outputTokens;
      }

      // 재시도까지 실패 → 기본값으로 안전 응답 (사용량 차감은 하되, 에러 없이 fallback 반환)
      if (!result.json) {
        console.error('[hand-review-gpt] JSON parse failed after retry. raw:', result.raw);
        await recordUsage(supabase, user.id, 'hand-review', 'gpt-4o-mini', totalInput, totalOutput);

        const fallback = {
          recommended_action: '체크',
          recommended_frequency: 50,
          secondary_action: '베팅',
          secondary_frequency: 50,
          summary: [
            '분석 결과를 가져오는 중 오류가 발생했습니다.',
            '잠시 후 다시 시도해주세요.',
            '문제가 반복되면 핸드 정보를 확인해주세요.',
          ],
          mistake: '일시적인 오류로 정확한 분석을 제공하지 못했습니다.',
          tip: '다시 분석을 요청해주세요.',
          _fallback: true,
        };
        // fallback은 캐시에 저장하지 않음 (다음에 다시 시도할 수 있도록)
        return new Response(JSON.stringify(fallback), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const reviewJson = result.json;
      await recordUsage(supabase, user.id, 'hand-review', 'gpt-4o-mini', totalInput, totalOutput);

      // ── 캐시 저장 (실패해도 응답은 그대로 반환) ─────────────────────────────
      await supabase.from('hand_review_cache').insert({
        cache_key: cacheKey,
        result: reviewJson,
        hit_count: 1,
      });

      return new Response(JSON.stringify(reviewJson), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('claude-proxy error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

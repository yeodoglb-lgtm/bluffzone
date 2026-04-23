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

      // 스트리트별 액션 그룹화 + 보드 상태 포함
      const streetOrder = ['preflop', 'flop', 'turn', 'river'];
      const actionsByStreet: Record<string, any[]> = {
        preflop: [], flop: [], turn: [], river: [],
      };
      if (Array.isArray(hand?.actions)) {
        for (const a of hand.actions) {
          const s = (a?.street ?? '').toString().toLowerCase();
          if (actionsByStreet[s]) actionsByStreet[s].push(a);
        }
      }
      const boardArr: any[] = Array.isArray(hand?.board) ? hand.board : [];
      const boardAt: Record<string, string> = {
        preflop: '(없음)',
        flop: fmtCards(boardArr.slice(0, 3)),
        turn: fmtCards(boardArr.slice(0, 4)),
        river: fmtCards(boardArr.slice(0, 5)),
      };

      const streetsBlock = streetOrder
        .map((s) => {
          const acts = actionsByStreet[s];
          if (acts.length === 0) return `  · ${s.toUpperCase()}: (액션 없음 / 진행되지 않음)`;
          const line = acts
            .map(
              (a: any) =>
                `${a.actor === 'hero' ? '히어로' : '빌런'} ${a.action}${a.amount != null ? ' ' + a.amount : ''}`
            )
            .join(' → ');
          return `  · ${s.toUpperCase()} [보드 ${boardAt[s]}]: ${line}`;
        })
        .join('\n');

      const position = `${hand?.hero_position ?? '?'} (히어로) vs ${hand?.villain_position ?? '?'} (빌런)`;
      const handCards = fmtCards(hand?.hero_cards);
      const villainCards =
        hand?.villain_known && Array.isArray(hand?.villain_cards)
          ? fmtCards(hand.villain_cards)
          : '(비공개)';
      const boardCards = fmtCards(hand?.board);
      const stakes = hand?.stakes ?? '(미기재)';
      const gameType = hand?.game_type ?? 'NLH';
      const potSize = hand?.pot_size != null ? `${hand.pot_size}` : '(미기재)';
      const heroResult =
        hand?.result
          ? `${hand.result}${hand?.hero_pl != null ? ` (${hand.hero_pl >= 0 ? '+' : ''}${hand.hero_pl})` : ''}`
          : '(미기재)';

      const systemPrompt = `너는 프로 캐시게임 홀덤 코치다.

하나의 액션만 추천하지 말고, 프리플랍/플랍/턴/리버 각 스트리트를 개별 분석해라.
각 스트리트마다:
- 추천 액션 (베팅·체크·콜·레이즈·폴드·올인 중 하나를 한국어로)
- 빈도 (%, 0~100 정수) ← 그 액션을 얼마나 자주 섞어야 하는지
- 이유 (구체적으로)

절대 "압박을 주세요" / "약한 핸드 가능" 같은 일반론만 쓰지 마라.
반드시 아래를 근거로 설명해라:
- 보드 텍스처 (드라이 / 웻 / 페어드 / 모노톤 등)
- 포지션 기반 레인지 우위 (IP/OOP, 프리플랍 어그레서 여부)
- 밸류 vs 블러프 빈도 구분
- 벳 사이징이 상대에게 주는 정보

진행되지 않은 스트리트(예: 플랍에서 폴드로 종료)는 해당 객체를 생략하거나 비워라 (null 가능).

반드시 아래 JSON 스키마로만 응답하고, 마크다운·설명·여는말 없이 순수 JSON만 출력해라.

[출력 형식]
{
  "streets": {
    "preflop": { "action": "", "frequency": number, "comment": "" },
    "flop":    { "action": "", "frequency": number, "comment": "" } | null,
    "turn":    { "action": "", "frequency": number, "comment": "" } | null,
    "river":   { "action": "", "frequency": number, "comment": "" } | null
  },
  "mistake": "한 문장 — 히어로가 저지른 가장 큰 실수, 없으면 빈 문자열",
  "tip":     "한 문장 — 다음에 바로 써먹을 실전 팁"
}

[규칙]
- 반드시 JSON만 출력
- frequency는 0~100 정수
- comment는 근거 중심으로 짧고 명확하게 (40자 내외)
- 모든 텍스트는 한국어`;

      const userPrompt = `[기본 정보]
- 게임: ${gameType} / 스테이크: ${stakes}
- 포지션: ${position}
- 히어로 핸드: ${handCards}
- 빌런 핸드: ${villainCards}
- 최종 보드: ${boardCards}
- 팟 사이즈: ${potSize}
- 결과: ${heroResult}

[스트리트별 진행]
${streetsBlock}`;

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
          streets: {
            preflop: { action: '분석 실패', frequency: 0, comment: '일시적 오류로 분석하지 못했습니다.' },
            flop: null,
            turn: null,
            river: null,
          },
          mistake: '',
          tip: '잠시 후 "다시 분석" 버튼을 눌러주세요.',
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

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
    'gpt-4o':                    { in: 2.5,   out: 10.0  },
    'gpt-4o-mini':               { in: 0.15,  out: 0.6   },
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

// ── 카드 유틸 (서버 사이드 핸드 평가용) ────────────────────────────────────
const RANK_VAL: Record<string, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  'T': 10, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
};
const VAL_RANK: Record<number, string> = {
  2:'2',3:'3',4:'4',5:'5',6:'6',7:'7',8:'8',9:'9',10:'T',11:'J',12:'Q',13:'K',14:'A',
};

interface PCard { r: number; s: string; }

function parseCard(c: any): PCard | null {
  if (!c) return null;
  if (typeof c === 'string') {
    const m = c.trim().match(/^(10|[23456789TJQKA])([shdc])$/i);
    if (!m) return null;
    return { r: RANK_VAL[m[1].toUpperCase()], s: m[2].toLowerCase() };
  }
  const rStr = (c.rank ?? '').toString().toUpperCase();
  const s = (c.suit ?? '').toString().toLowerCase();
  if (!RANK_VAL[rStr] || !'shdc'.includes(s)) return null;
  return { r: RANK_VAL[rStr], s };
}
function parseCards(arr: any): PCard[] {
  if (!Array.isArray(arr)) return [];
  return arr.map(parseCard).filter((x): x is PCard => x !== null);
}

// ── 5장 핸드 평가 ──────────────────────────────────────────────────────────
function eval5(cs: PCard[]): { rank: number; name: string; kickers: number[] } {
  const rs = cs.map(c => c.r).sort((a, b) => b - a);
  const ss = cs.map(c => c.s);
  const flush = ss.every(s => s === ss[0]);
  const cnt: Record<number, number> = {};
  for (const r of rs) cnt[r] = (cnt[r] ?? 0) + 1;
  const groups = Object.entries(cnt)
    .map(([r, c]) => ({ r: +r, c }))
    .sort((a, b) => b.c - a.c || b.r - a.r);
  const uniq = Array.from(new Set(rs));
  let straightHigh = 0;
  if (uniq.length === 5) {
    if (uniq[0] - uniq[4] === 4) straightHigh = uniq[0];
    else if (uniq[0] === 14 && uniq[1] === 5 && uniq[2] === 4 && uniq[3] === 3 && uniq[4] === 2) straightHigh = 5;
  }
  if (flush && straightHigh) return { rank: 9, name: '스트레이트 플러시', kickers: [straightHigh] };
  if (groups[0].c === 4) return { rank: 8, name: '포카드', kickers: [groups[0].r, groups[1].r] };
  if (groups[0].c === 3 && groups[1].c === 2) return { rank: 7, name: '풀하우스', kickers: [groups[0].r, groups[1].r] };
  if (flush) return { rank: 6, name: '플러시', kickers: rs };
  if (straightHigh) return { rank: 5, name: '스트레이트', kickers: [straightHigh] };
  if (groups[0].c === 3) return { rank: 4, name: '트립스/셋', kickers: [groups[0].r, groups[1].r, groups[2].r] };
  if (groups[0].c === 2 && groups[1].c === 2) return { rank: 3, name: '투페어', kickers: [groups[0].r, groups[1].r, groups[2].r] };
  if (groups[0].c === 2) return { rank: 2, name: '원페어', kickers: [groups[0].r, groups[1].r, groups[2].r, groups[3].r] };
  return { rank: 1, name: '하이카드', kickers: rs };
}

function combinations<T>(arr: T[], k: number): T[][] {
  const out: T[][] = [];
  const rec = (start: number, cur: T[]) => {
    if (cur.length === k) { out.push([...cur]); return; }
    for (let i = start; i < arr.length; i++) { cur.push(arr[i]); rec(i + 1, cur); cur.pop(); }
  };
  rec(0, []);
  return out;
}
function cmpKickers(a: number[], b: number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d) return d;
  }
  return 0;
}
function bestHand(cards: PCard[]): { rank: number; name: string; kickers: number[] } {
  if (cards.length < 5) {
    const cnt: Record<number, number> = {};
    for (const c of cards) cnt[c.r] = (cnt[c.r] ?? 0) + 1;
    const pairs = Object.entries(cnt).filter(([, c]) => c >= 2);
    if (pairs.length >= 2) {
      const sorted = pairs.map(([r]) => +r).sort((a, b) => b - a);
      return { rank: 3, name: '투페어', kickers: sorted };
    }
    if (pairs.length === 1) return { rank: 2, name: '원페어', kickers: [+pairs[0][0]] };
    const rs = cards.map(c => c.r).sort((a, b) => b - a);
    return { rank: 1, name: '하이카드', kickers: rs };
  }
  let best: { rank: number; name: string; kickers: number[] } = { rank: 0, name: '', kickers: [] };
  for (const combo of combinations(cards, 5)) {
    const e = eval5(combo);
    if (e.rank > best.rank || (e.rank === best.rank && cmpKickers(e.kickers, best.kickers) > 0)) {
      best = e;
    }
  }
  return best;
}

// ── 드로우 감지 ───────────────────────────────────────────────────────────
function detectDraws(hero: PCard[], board: PCard[]): string[] {
  if (board.length < 3 || board.length > 4) return [];
  const all = [...hero, ...board];
  const drawList: string[] = [];
  const suitCnt: Record<string, number> = { s: 0, h: 0, d: 0, c: 0 };
  for (const c of all) suitCnt[c.s]++;
  const heroSuitCnt: Record<string, number> = { s: 0, h: 0, d: 0, c: 0 };
  for (const c of hero) heroSuitCnt[c.s]++;
  for (const s of 'shdc') {
    if (suitCnt[s] === 4 && heroSuitCnt[s] >= 1) drawList.push('플러시 드로우');
  }
  const rset = Array.from(new Set(all.map(c => c.r))).sort((a, b) => a - b);
  if (rset.includes(14)) rset.unshift(1);
  let maxRun = 1, cur = 1;
  for (let i = 1; i < rset.length; i++) {
    if (rset[i] - rset[i - 1] === 1) { cur++; maxRun = Math.max(maxRun, cur); }
    else if (rset[i] !== rset[i - 1]) cur = 1;
  }
  if (maxRun >= 4) drawList.push('오픈엔디드 스트레이트 드로우');
  else {
    for (let lo = 1; lo <= 10; lo++) {
      const window = [lo, lo + 1, lo + 2, lo + 3, lo + 4];
      const hit = window.filter(v => rset.includes(v)).length;
      if (hit === 4) { drawList.push('거트샷'); break; }
    }
  }
  return drawList;
}

// ── 보드 텍스처 ────────────────────────────────────────────────────────────
function analyzeBoard(board: PCard[]): string {
  if (board.length < 3) return '(플랍 전)';
  const sCnt: Record<string, number> = { s: 0, h: 0, d: 0, c: 0 };
  for (const c of board) sCnt[c.s]++;
  const maxSuit = Math.max(...Object.values(sCnt));
  const suitTag = maxSuit >= 5 ? '모노톤(5)' : maxSuit === 4 ? '모노톤+1' : maxSuit === 3 ? '모노톤' : maxSuit === 2 ? '투톤' : '레인보우';
  const rs = board.map(c => c.r);
  const cnt: Record<number, number> = {};
  for (const r of rs) cnt[r] = (cnt[r] ?? 0) + 1;
  const counts = Object.values(cnt).sort((a, b) => b - a);
  let pairTag = '';
  if (counts[0] === 3) pairTag = '/트립 보드';
  else if (counts[0] === 2 && counts[1] === 2) pairTag = '/더블 페어드';
  else if (counts[0] === 2) pairTag = '/페어드';
  const uniq = Array.from(new Set(rs)).sort((a, b) => a - b);
  const uniqLow = uniq.includes(14) ? [1, ...uniq] : uniq;
  let tight = false;
  for (let i = 0; i + 2 < uniqLow.length; i++) {
    if (uniqLow[i + 2] - uniqLow[i] <= 4) { tight = true; break; }
  }
  const textTag = tight ? '커넥티드(웻)' : '드라이';
  const highCard = VAL_RANK[Math.max(...rs)] ?? '?';
  return `${suitTag}${pairTag} · ${textTag} · 하이카드 ${highCard}`;
}

// ── 히어로 강도 태그 ──────────────────────────────────────────────────────
function strengthTag(e: { rank: number; kickers: number[] }, board: PCard[]): string {
  if (board.length < 3) return '';
  if (e.rank >= 8) return '⭐ 실질적 넛츠급';
  if (e.rank === 7) return '⭐ 풀하우스 이상 (매우 강함)';
  if (e.rank === 6) {
    const boardPaired = new Set(board.map(c => c.r)).size < board.length;
    if (!boardPaired && e.kickers[0] === 14) return '⭐ 넛플러시';
    return '💪 플러시 (강함)';
  }
  if (e.rank === 5) return '💪 스트레이트 (강함, 풀하우스/플러시 주의)';
  if (e.rank === 4) return '💪 트립스/셋';
  if (e.rank === 3) return '👍 투페어';
  if (e.rank === 2) {
    const boardTop = Math.max(...board.map(c => c.r));
    if (e.kickers[0] === boardTop) return '👍 탑페어';
    if (e.kickers[0] > boardTop) return '👍 오버페어';
    return '⚠️ 미들/언더 페어';
  }
  return '⚠️ 약한 핸드 (하이카드)';
}

// ── SPR ──────────────────────────────────────────────────────────────────
function computeSPR(potSize: number | null, effStack: number | null): string {
  if (!potSize || !effStack || potSize <= 0) return '(미기재)';
  const spr = effStack / potSize;
  let tag = '';
  if (spr < 1) tag = ' (초저 — 커밋됨)';
  else if (spr < 4) tag = ' (저 — 탑페어도 스택 투입 가능)';
  else if (spr < 10) tag = ' (중 — 투페어+ 기준)';
  else tag = ' (고 — 넛츠 지향)';
  return `${spr.toFixed(1)}${tag}`;
}

// ── 캐시 키 생성 ──────────────────────────────────────────────────────────────
function buildCacheKey(hand: any): string {
  const norm = (v: any) => (v ?? '').toString().trim().toUpperCase();

  const heroPos = norm(hand?.hero_position);
  const villainPos = norm(hand?.villain_position);
  const aggressor = norm(hand?.preflop_aggressor);

  const cardStr = (c: any): string => {
    if (!c) return '';
    if (typeof c === 'string') return c.toUpperCase();
    return `${norm(c.rank)}${(c.suit ?? '').toString().toLowerCase()}`;
  };
  const cardsStr = (arr: any): string =>
    Array.isArray(arr) ? arr.map(cardStr).filter(Boolean).join('') : '';

  const heroCards = cardsStr(hand?.hero_cards);
  const board = cardsStr(hand?.board);

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

  // SPR 버킷
  const potBucket = hand?.pot_size ? Math.round(Math.log10(hand.pot_size + 1) * 2) : 0;
  const stackBucket = hand?.effective_stack ? Math.round(Math.log10(hand.effective_stack + 1) * 2) : 0;

  // v3: 넛츠 로직 강화 + 모든 필드 필수화 — 이전 캐시 무효화
  const SCHEMA_VERSION = 'v3';
  return [SCHEMA_VERSION, heroPos, villainPos, aggressor, heroCards, board, actions, potBucket, stackBucket].join('_');
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

      const { messages, model = 'gpt-4o-mini', systemPrompt } = body;

      // OpenAI chat/completions 형식으로 변환 (role: system/user/assistant)
      const openaiMessages = [
        {
          role: 'system',
          content: systemPrompt ?? '당신은 블러프존AI입니다. 홀덤 전략, 핸드 분석, 뱅크롤 관리에 전문화된 포커 코치입니다. 한국어로 답변하세요.',
        },
        ...messages.map((m: { role: string; content: string }) => ({
          role: m.role,
          content: m.content,
        })),
      ];

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: 2048,
          stream: true,
          stream_options: { include_usage: true },
          messages: openaiMessages,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message ?? `OpenAI API error: ${response.status}`);
      }

      // OpenAI SSE → Anthropic 비슷한 포맷으로 재포장하여 중계
      // 프론트는 `data: {delta: {text}}` 를 기대하므로 맞춰준다
      const stream = new TransformStream();
      const writer = stream.writable.getWriter();
      const encoder = new TextEncoder();

      (async () => {
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let inputTokens = 0;
        let outputTokens = 0;

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const data = line.slice(6).trim();
              if (!data) continue;
              if (data === '[DONE]') {
                await writer.write(encoder.encode('data: [DONE]\n\n'));
                continue;
              }
              try {
                const parsed = JSON.parse(data);
                // usage 이벤트 (마지막 청크)
                if (parsed.usage) {
                  inputTokens = parsed.usage.prompt_tokens ?? 0;
                  outputTokens = parsed.usage.completion_tokens ?? 0;
                }
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) {
                  const out = `data: ${JSON.stringify({ delta: { text: delta } })}\n\n`;
                  await writer.write(encoder.encode(out));
                }
              } catch {
                // 파싱 실패한 라인은 무시
              }
            }
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
      const effStack = hand?.effective_stack != null ? `${hand.effective_stack}` : '(미기재)';
      const preflopAggressor = hand?.preflop_aggressor ?? '(미기재)';
      const villainType = hand?.villain_type ?? '(미기재)';
      const heroResult =
        hand?.result
          ? `${hand.result}${hand?.hero_pl != null ? ` (${hand.hero_pl >= 0 ? '+' : ''}${hand.hero_pl})` : ''}`
          : '(미기재)';

      // ── 서버 사전 계산: 보드 텍스처, 히어로 메이드 핸드, 드로우, SPR ─────────
      const heroP = parseCards(hand?.hero_cards);
      const boardP = parseCards(hand?.board);
      const textureAt: Record<string, string> = {
        preflop: '(플랍 전)',
        flop:  analyzeBoard(boardP.slice(0, 3)),
        turn:  analyzeBoard(boardP.slice(0, 4)),
        river: analyzeBoard(boardP.slice(0, 5)),
      };
      const heroMadeAt: Record<string, string> = { preflop: '(플랍 전)' };
      for (const s of ['flop', 'turn', 'river']) {
        const bSlice = boardP.slice(0, s === 'flop' ? 3 : s === 'turn' ? 4 : 5);
        if (bSlice.length === 0 || heroP.length === 0) { heroMadeAt[s] = '(카드 미기재)'; continue; }
        const e = bestHand([...heroP, ...bSlice]);
        const tag = strengthTag(e, bSlice);
        const draws = s !== 'river' ? detectDraws(heroP, bSlice) : [];
        heroMadeAt[s] = `${e.name}${tag ? ' — ' + tag : ''}${draws.length ? ' + ' + draws.join(', ') : ''}`;
      }
      const sprStr = computeSPR(hand?.pot_size ?? null, hand?.effective_stack ?? null);

      // ── 스트리트별 누적 팟 및 히어로/빌런 실제 벳 사이즈 ──────────────────
      // 액션 순서대로 누적 팟 추적해서 각 스트리트 진입 시점 팟을 계산
      const fmtMoney = (n: number): string => {
        if (n >= 10000) return `${(n / 10000).toFixed(n % 10000 === 0 ? 0 : 1)}만원`;
        return `${n.toLocaleString()}원`;
      };
      let runningPot = 0;
      const potAtStart: Record<string, number> = { preflop: 0, flop: 0, turn: 0, river: 0 };
      const sizingInfo: Record<string, string> = { preflop: '', flop: '', turn: '', river: '' };
      for (const s of streetOrder) {
        potAtStart[s] = runningPot;
        const acts = actionsByStreet[s];
        const lastHeroBet = [...acts].reverse().find((a: any) =>
          a.actor === 'hero' && (a.action === 'bet' || a.action === 'raise' || a.action === 'allin') && a.amount != null
        );
        const lastVillainBet = [...acts].reverse().find((a: any) =>
          a.actor !== 'hero' && (a.action === 'bet' || a.action === 'raise' || a.action === 'allin') && a.amount != null
        );
        const parts: string[] = [];
        parts.push(`스트리트 진입 팟: ${fmtMoney(runningPot)}`);
        if (lastVillainBet) parts.push(`빌런 실제 벳: ${fmtMoney(lastVillainBet.amount)}`);
        if (lastHeroBet) parts.push(`히어로 실제 벳: ${fmtMoney(lastHeroBet.amount)}`);
        // 기준 사이즈 제안 (팟 대비)
        if (runningPot > 0) {
          const oneThird = Math.round(runningPot / 3);
          const half = Math.round(runningPot / 2);
          const twoThird = Math.round(runningPot * 2 / 3);
          const pot = runningPot;
          parts.push(`사이즈 가이드: 1/3팟=${fmtMoney(oneThird)} · 1/2팟=${fmtMoney(half)} · 2/3팟=${fmtMoney(twoThird)} · 팟=${fmtMoney(pot)}`);
        }
        sizingInfo[s] = parts.join(' / ');
        // 액션 금액 합산 → runningPot 증가
        for (const a of acts) {
          if (a.amount != null && ['bet', 'raise', 'call', 'allin'].includes(a.action)) {
            runningPot += a.amount;
          }
        }
      }

      // 스트리트 블록 재구성: 보드 텍스처 + 히어로 핸드 강도 + 사이즈 정보 포함
      const richStreetsBlock = streetOrder
        .map((s) => {
          const acts = actionsByStreet[s];
          const header = `  · ${s.toUpperCase()} [보드 ${boardAt[s]}]`;
          const meta = s === 'preflop'
            ? `\n    ${sizingInfo[s]}`
            : `\n    텍스처: ${textureAt[s]}\n    히어로 현재 핸드: ${heroMadeAt[s]}\n    ${sizingInfo[s]}`;
          if (acts.length === 0) return `${header}${meta}\n    액션: (진행되지 않음)`;
          const line = acts
            .map(
              (a: any) =>
                `${a.actor === 'hero' ? '히어로' : '빌런'} ${a.action}${a.amount != null ? ' ' + fmtMoney(a.amount) : ''}`
            )
            .join(' → ');
          return `${header}${meta}\n    액션: ${line}`;
        })
        .join('\n');

      const systemPrompt = `너는 NL100+ 캐시게임 코치다. 출력은 100% JSON. 모든 필드 필수. 필드 생략 금지.

[분석 축]
1. 보드 텍스처 (드라이/웻·페어드·커넥티드·모노톤)
2. 레인지 우위 (포지션·프리플랍 어그레서 기준 IP/OOP)
3. 밸류 vs 블러프 믹스 (넛츠=밸류, 블로커=블러프)
4. 사이징이 주는 정보 + 상대 콜링 레인지

[절대 규칙]
① 서버가 준 "히어로 현재 핸드"를 그대로 인정. 카드 재해석 금지.
② **넛츠급(⭐)/강한 핸드(💪)는 체크/콜이 기본 추천이 되면 안 됨.** 밸류 벳·레이즈가 1순위.
   · 유일한 예외: (a) 웻 보드에서 히어로가 어그레서 아닌 플랍 공격 방어 (b) SPR ≥ 15에서 트랩 + 스택 보존 전략. 이 때도 frequency 60 이하로만.
   · "레이즈도 가능" 같은 모호 표현 금지. 구체 수치로 alt_action에.
③ **빌런 핸드 단정 절대 금지.**
   · 금지: "빌런이 탑페어다", "빌런 블러프다"
   · 허용: "빌런 레인지상 탑페어·중간페어 비중", "빌런 콜링 레인지에 드로우 섞임", "스테이션 성향상 더 넓게 콜"
④ frequency + alt_frequency = 정확히 100. 둘 다 정수.
⑤ **size는 필수.** action이 "베팅"/"레이즈"일 때 size 빈 문자열 금지. 서버가 준 "사이즈 가이드"에서 골라라 (예: "약 10만원 (2/3 팟)").
⑥ 체크/콜/폴드일 때도 size 필드는 존재해야 함 (빈 문자열 "").
⑦ 히어로 실제 벳이 추천 사이즈와 다르면 comment에 반드시 비교. 예: "히어로 9만원(60%) — 넛츠엔 2/3팟(10만원)이 밸류 극대화."
⑧ comment는 50~80자. "밸류 벳 필요" 같은 공허한 말 금지. 이유 + 사이즈 + 상대 레인지 중 2개는 포함.
⑨ 진행 안 된 스트리트는 null (빈 객체 아님).
⑩ headline·recommended_line·actual_line·ev_note·mistake·tip 6개 필드는 반드시 채울 것. 빈 문자열도 안 됨 (mistake만 실수 없으면 "실수 없음").

[출력 스키마 — 이 구조 정확히 지켜라]
{
  "headline":   "한 줄 결론 (25~40자). 예: '넛스트레이트인데 플랍 콜은 밸류 손실'",
  "rating":     1~5 정수,
  "streets": {
    "preflop": { "action":"", "frequency":0, "alt_action":"", "alt_frequency":0, "size":"", "comment":"" },
    "flop":    {...} | null,
    "turn":    {...} | null,
    "river":   {...} | null
  },
  "recommended_line": "예: '콜 → 레이즈 2/3팟(6만원) → 벳 2/3팟(15만원) → 벳 1/2팟(30만원)'",
  "actual_line":      "히어로 실제 라인 요약",
  "ev_note":          "돈 감각 1문장. 예: '플랍 콜로 약 1 밸류 벳 손실, 리버 레이즈로 회수'",
  "mistake":          "가장 큰 실수 1문장. 없으면 '실수 없음'",
  "tip":              "바로 써먹을 1문장 코칭"
}

[풀 예시 — 넛스트레이트 on 웻보드]
입력 요약: BTN 히어로 JhTh, 플랍 9h 8c 7d (커넥티드·웻), 히어로 현재 핸드 "스트레이트 — ⭐ 실질적 넛츠급", 빌런 벳 3만원, 팟 9만원, 사이즈 가이드: 1/3=3만·1/2=4.5만·2/3=6만·팟=9만

좋은 출력:
{
  "headline": "넛스트레이트 확보, 웻보드에서 레이즈 밸류 극대화",
  "rating": 4,
  "streets": {
    "flop": {
      "action": "레이즈",
      "frequency": 75,
      "alt_action": "콜",
      "alt_frequency": 25,
      "size": "약 10만원 (3배 레이즈)",
      "comment": "넛스트레이트 + 웻보드. 빌런 레인지상 셋·투페어·드로우 많아 레이즈 밸류 큼. 트랩(콜 25%)은 IP 이점 유지 선택지."
    }
  },
  ...
}

나쁜 출력 (금지):
{ "flop": { "action":"콜", "frequency":70, "comment":"스트레이트로 강한 핸드, 레이즈도 가능" } }
  ← ❌ 넛츠인데 콜 1순위 금지 / size 비어있음 / comment 모호 / alt_action 없음`;

      const userPrompt = `[기본 정보]
- 게임: ${gameType} / 스테이크: ${stakes}
- 포지션: ${position}
- 프리플랍 어그레서: ${preflopAggressor}
- 빌런 성향: ${villainType}
- 히어로 핸드: ${handCards}
- 빌런 핸드: ${villainCards}
- 최종 보드: ${boardCards}
- 팟 사이즈: ${potSize}
- 유효 스택: ${effStack}
- SPR: ${sprStr}
- 결과: ${heroResult}

[스트리트별 진행 — 서버 사전 계산 포함]
${richStreetsBlock}

위 정보를 근거로 각 스트리트 추천 액션을 스키마대로 JSON으로만 반환해라.`;

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
            model: 'gpt-4o',
            max_tokens: 800,
            temperature: 0.4,
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
        await recordUsage(supabase, user.id, 'hand-review', 'gpt-4o', totalInput, totalOutput);

        const fallback = {
          headline: '분석 실패 — 다시 시도해주세요',
          rating: 0,
          streets: {
            preflop: { action: '분석 실패', frequency: 0, alt_action: '', alt_frequency: 0, size: '', comment: '일시적 오류로 분석하지 못했습니다.' },
            flop: null,
            turn: null,
            river: null,
          },
          recommended_line: '',
          actual_line: '',
          ev_note: '',
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
      await recordUsage(supabase, user.id, 'hand-review', 'gpt-4o', totalInput, totalOutput);

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

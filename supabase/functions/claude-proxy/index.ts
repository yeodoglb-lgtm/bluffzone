import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

// 월별 무료 한도
const FREE_LIMITS: Record<string, number> = {
  'hand-review': 50,
  'chat': 100,
  'parse-voice': 50,
  'whisper': 70,
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── 비용 계산 (근사) ──────────────────────────────────────────────────────────
function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  // 가격 (USD per 1M tokens). 현재 사용 모델만 유지.
  const pricing: Record<string, { in: number; out: number }> = {
    'gpt-4o':      { in: 2.5,   out: 10.0  },
    'gpt-4o-mini': { in: 0.15,  out: 0.6   },
  };
  const p = pricing[model] ?? pricing['gpt-4o-mini'];
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

// ── 음성 파싱 시스템 프롬프트 ────────────────────────────────────────────────
const VOICE_PARSE_SYSTEM = `당신은 한국어 포커 음성 기록을 구조화된 JSON으로 변환하는 전문가입니다.
Whisper STT의 출력을 입력으로 받으므로 오인식이 섞여 있을 수 있습니다. 문맥으로 교정하세요.
반드시 아래 JSON 스키마로만 응답하세요. 마크다운 코드블록 없이 순수 JSON만 출력하세요.
파악할 수 없는 필드는 null로 두세요. 과도한 추측은 하지 마세요.

## 스키마
{
  "game_type": "NLH|PLO|Tournament|null",
  "stakes": "string|null",                                 // 예: "1/2", "500/1000"
  "hero_position": "UTG|UTG+1|MP|HJ|CO|BTN|SB|BB|null",
  "villains": [                                            // 🔥 음성에 등장한 모든 빌런 (최대 3명, 헤즈업 상대를 [0]에)
    {
      "position": "UTG|UTG+1|MP|HJ|CO|BTN|SB|BB",
      "type": "string|null",                               // 예: "피쉬", "레귤러", "콜링스테이션"
      "known": boolean,                                    // 쇼다운에서 카드 공개 여부
      "cards": [{"rank":"...","suit":"..."}]|null
    }
  ],
  "villain_position": "UTG|UTG+1|MP|HJ|CO|BTN|SB|BB|null", // = villains[0].position (하위호환)
  "villain_known": boolean,                                // = villains[0].known
  "villain_cards": [{"rank":"...","suit":"..."}]|null,     // = villains[0].cards
  "hero_cards": [{"rank":"A|K|Q|J|T|9|8|7|6|5|4|3|2","suit":"s|h|d|c"}],
  "board": [{"rank":"...","suit":"..."}]|null,
  "actions": [{"street":"preflop|flop|turn|river","actor":"hero|villain1|villain2|villain3","action":"fold|check|call|bet|raise|allin","amount":number|null}],
  "result": "won|lost|chopped|folded|null",
  "pot_size": number|null,
  "hero_pl": number|null,                                  // 손익 (+수익, -손실)
  "note": "string|null"
}

## 한국어 → 카드 랭크 매핑
에이스/에이 → "A", 킹 → "K", 퀸 → "Q", 잭 → "J",
텐/10/십 → "T", 구 → "9", 팔 → "8", 칠 → "7", 육/륙 → "6",
오 → "5", 사 → "4", 삼 → "3", 이/투 → "2".

## 한국어 → 슈트 매핑
스페이드/스팟/삽 → "s", 하트 → "h", 다이아/다이아몬드 → "d", 클럽/크로바 → "c".
음성에서 "에이 하트 킹 스페이드" = [{"rank":"A","suit":"h"},{"rank":"K","suit":"s"}].

## 🔥 카드 배열 필수 규칙 (매우 중요)
**hero_cards는 가능한 한 항상 채우세요. null은 정말 카드 정보가 전혀 없을 때만.**
- 슈트 명시 ("에이 하트 킹 스페이드") → 명시된 슈트 그대로
- "AKo"/"에이킹오프수트"/"오프수트" → [{"rank":"A","suit":"s"},{"rank":"K","suit":"h"}] (placeholder: 다른 슈트)
- "AKs"/"에이킹수티드"/"수티드" → [{"rank":"A","suit":"s"},{"rank":"K","suit":"s"}] (placeholder: 같은 슈트)
- "포켓 잭"/"포켓페어 JJ" → [{"rank":"J","suit":"s"},{"rank":"J","suit":"h"}] (같은 랭크 다른 슈트)
- 랭크만 명시 "에이 킹" (오프/수티드 언급 없음) → [{"rank":"A","suit":"s"},{"rank":"K","suit":"h"}] (기본 오프수트)
- 카드 얘기 자체가 없으면 → null
**절대 슈트 null이나 빈 문자열 쓰지 말 것. 반드시 s/h/d/c 중 하나.**

## 포지션 구어체 매핑
언더더건/얼리/유티지 → UTG, 미들/엠피 → MP, 하이재커/하이잭 → HJ, 컷오프/컷/씨오 → CO,
버튼/딜러/비티엔 → BTN, 스몰블라인드/스블/에스비 → SB, 빅블라인드/빅블/비비 → BB.

## 🔥 빌런 포지션 추출 규칙 (매우 중요 — 자주 누락되는 항목)
**hero가 아닌 모든 등장 포지션은 villains 배열에 반드시 채우세요.** 단순히 음성에 언급된 것만으로도 추가:
- "버튼이 쓰리벳" / "버튼이 콜" / "버튼 올인" → villains에 BTN 추가
- "UTG 피쉬가 콜" / "언더더건이 레이즈" → villains에 UTG 추가 (type:"피쉬")
- "컷오프 폴드" / "씨오가 죽였다" → villains에 CO 추가
- "상대 ○○에서" / "빌런 ○○" → ○○를 villains에 추가
- "유티지 피쉬", "버튼 레귤러" 등 타입 명시되면 type 필드도 채울 것
- 헤즈업까지 살아남은 빌런 (액션에서 hero와 끝까지 대결한 자)을 villains[0]에 둘 것
- 일찍 폴드한 빌런은 villains[1], [2]에. 폴드해도 등장했으면 반드시 추가.
- villain_position/villain_known/villain_cards는 villains[0]과 동일하게 채워 하위호환 유지.

## 🔥 카드 공개 규칙 (매우 중요 — 자주 누락)
"상대 ○○ 보여주고" / "○○ 공개" / "쇼다운 ○○" / "패는 ○○였어" 등 쇼다운 패 언급되면:
- 해당 빌런의 known:true, cards 채우기 + villain_known:true, villain_cards 채우기
- "퀸퀸 세트" → [{Q,s},{Q,h}], "에이세븐 투페어" → [{A,?},{7,?}]
- 슈트 미언급이면 placeholder (s/h/d/c 중 보드와 겹치지 않게)

## 🔥 액션 actor 구분 (다중 빌런)
- hero = 영웅
- villain1 = villains[0] (헤즈업까지 살아남은 메인 상대)
- villain2 = villains[1] (두 번째로 등장한 빌런)
- villain3 = villains[2] (세 번째 빌런)
- villains 배열의 순서대로 villain1/villain2/villain3 매핑.
- 예: "UTG 피쉬가 콜, 버튼이 콜" 에서 BTN이 헤즈업 상대라면 → villains[0]=BTN, villains[1]=UTG.
  · UTG 액션의 actor="villain2", BTN 액션의 actor="villain1".

## 액션 매핑
벳/배팅 → bet, 체크 → check, 콜/받았어 → call,
레이즈/올렸어 → raise, 폴드/죽였어/접었어 → fold,
3벳/쓰리벳 → raise(프리플랍 리레이즈), 4벳/포벳 → raise,
올인/다 넣었어/다 밀었어 → allin.

## 🔥 액션 순서 강제 (사용자 narrative 순서 ≠ 실제 포커 순서)
사용자가 두서없이 말해도 **실제 포커 액션 순서로 재배열**할 것.

**프리플랍 정상 순서**: UTG → UTG+1 → MP → HJ → CO → BTN → SB → BB
- 예: hero가 BTN, UTG와 BB 빌런이면 액션 순서는 **UTG → BTN(hero) → BB**.
- 사용자가 "내가 레이즈 3만, UTG 콜, BB도 콜" 이라고 말해도, 실제 순서는 UTG가 먼저 (limp 또는 raise) → BTN → BB.
  · 만약 UTG가 limp만 했다면: UTG call(amount=10000 or matching BB), hero raise(BTN), BB call, UTG call(over-call).
  · 단순화: hero raise 후 다른 모든 빌런이 그냥 콜이면 → hero raise를 첫 액션으로 두고 그 뒤에 액션 순서대로 콜 나열.

**포스트플랍 정상 순서**: SB → BB → UTG → ... → CO → BTN
- 예: hero가 BTN, BB와 UTG 빌런이면 플랍은 **BB → UTG → BTN(hero)** 순.
- 사용자가 "다들 체크" 라고 말해도 → BB check, UTG check, hero check 순서로 출력.
- 사용자가 "내가 체크, UTG 5만 벳, BB 콜" 같이 말해도 → 실제 순서는 BB 먼저. 사용자가 자기 액션을 먼저 언급해도 폼에는 BB → UTG → hero 순서.
- **hero가 BTN/CO처럼 후반 포지션이면, 포스트플랍 액션에서 절대 첫 번째에 두지 말 것.**

## 🚨 금액 환각 방지 (절대 추측 금지)
**음성에 명시되지 않은 bet/raise/allin 금액은 절대 추측하지 말고 amount=null 로 둘 것.**
- 예: "내가 레이즈했어, UTG 콜" — 금액 미명시 → hero raise amount=null. (단, 콜 금액은 raise가 null이라 계산 불가 → 콜도 null.)
- 예: "내가 3벳" 만 말하고 금액 안 말함 → amount=null. **다른 액션의 금액 복사 금지.**
- 예: 플랍 bet 5만 명시 → 프리플랍 raise도 5만이라고 추측 금지. 프리플랍 amount=null.
- 콜 amount는 직전 액션이 amount를 가지고 있을 때만 계산. 직전 amount=null이면 콜도 null.

## 🚨 카드 중복 금지 (hero ↔ 보드 ↔ 빌런)
hero_cards, board, villains[].cards 사이에 **같은 카드(같은 rank+suit)가 중복되지 않도록**.
- 예: hero AdJd 면 보드에 Ad나 Jd 다시 넣으면 안 됨 (rank가 같다면 다른 suit로).
- 음성 오인식으로 의심되면 보드보다 hero 카드를 우선 (사용자가 자기 카드는 정확히 말함).
- "잭"을 K로 잘못 들었을 가능성 의심 시: hero가 AK라면 보드에 K가 또 나오는지 확인. 보드에 K 또 있으면 hero를 AJ로 의심해보고 문맥 재해석 (단, 확신 없으면 그대로 둘 것).

## 🚨 한국어 음성 오인식 자주 발생 패턴 (Whisper 출력 문맥 교정)
- "잭" ↔ "K" / "케이" — 잭은 보통 J. 슈트와 함께 "잭 다이아" 식으로 나오면 J. 단독 "K"라면 K.
- "7" ↔ "3" / "9" — 발음 짧아 자주 혼동. 보드 텍스처와 함께 검토.
- "투" ↔ "듀스" → 둘 다 2.
- "텐" ↔ "10" ↔ "T" → 모두 T.
- "에이" ↔ "A" → A.

## 🔥🔥 액션 amount 의미 — "이 액션에서 추가로 넣은 칩" (증분, NOT "to" 금액)
**모든 amount는 "그 액션에서 그 플레이어가 새로 넣은 칩 수"입니다. "to" 금액 아님.**
- 첫 액션이거나 그 스트리트에서 처음 칩 넣는 경우: 발화된 숫자 그대로 (증분 == 총 commit).
- 같은 플레이어가 같은 스트리트에서 칩을 추가로 넣는 경우 (이미 자기 칩이 들어가 있음):
  - 발화된 "올인 X만" / "레이즈 X만" → **X 그대로 amount에** (X = 이번 액션에 추가된 칩).

## 🔥🔥🔥 콜 금액 자동 계산 규칙 (매우 중요 — 모든 콜에 적용, null 절대 금지)
**콜의 amount는 어떤 actor든(hero, villain1, villain2, villain3) 절대 null로 두지 말 것.**
**반드시 (직전 가장 큰 to-level) - (콜러가 그 스트리트에서 이미 넣은 칩)** 으로 계산해서 채우세요.

내부 추적 방식:
- 각 스트리트마다 각 플레이어의 누적 commit을 추적.
- 누군가 bet/raise/allin amount=N 하면 그 플레이어의 commit += N.
- 콜할 때 콜러의 추가 부담 = (직전 어그레서의 누적 commit) - (콜러의 누적 commit).

**🚨 자주 발생하는 실수**:
- "hero raise 3만, UTG 콜, BB 콜" → UTG call **반드시 amount=30000** (3만-0=3만), BB call **반드시 amount=30000**.
- 빌런간 콜이라고 amount를 null로 두지 말 것. hero 콜과 동일하게 계산해서 채울 것.
- 첫 액션의 콜 (예: limp/3-way preflop call)도 amount 채울 것: 직전 raise 금액 그대로.

추가 예시: 프리플랍 hero raise 3만, UTG 콜, BB 콜 (3-way)
- hero raise amount=30000 (hero commit=30000)
- UTG call amount = 30000 - 0 = **30000** (직전 raise 매칭)
- BB call amount = 30000 - 0 = **30000** (직전 raise 매칭)
**셋 다 amount=30000 으로 채울 것. UTG/BB 콜을 null로 두면 잘못된 출력.**

예시 1: 프리플랍 hero 레이즈 후 빌런 3벳 후 hero 콜
- "내가 3만 오픈, 빌런 9만 3벳, 내 콜"
- hero raise amount=30000 (hero commit=30000)
- villain raise amount=90000 (villain commit=90000)
- hero call amount = 90000 - 30000 = **60000** (직전 빌런 commit 90000 - hero 기존 30000)

예시 2: 플랍 hero 벳 → 빌런 레이즈 → hero 올인 → 빌런 콜
- "5천 벳, 빌런 2만 레이즈, 나 올인 15만, 빌런 콜"
- hero bet amount=5000 (hero commit=5000)
- villain raise amount=20000 (villain commit=20000)
- hero allin amount=150000 (hero commit=5000+150000=155000)
- villain call amount = 155000 - 20000 = **135000** (단순히 150000 복사하면 틀림!)

예시 3: 프리플랍 빌런 레이즈 → hero 콜 (hero 첫 액션)
- "빌런 레이즈 3만, 나 콜"
- villain raise amount=30000
- hero call amount = 30000 - 0 = **30000**

**절대 직전 액션의 amount를 그대로 복사하지 말 것. 항상 "콜러 입장에서 추가로 넣어야 할 칩"을 계산.**

## 🔥 프리플랍 블라인드 + 림프 pre-commit
**BB 사이즈는 system prompt 하단 "사용자 지정 BB" 섹션이 있으면 그 값만 사용. 없으면 추정 금지.**

### 누적 commit 추적 (BB 지정된 경우만)
- 시작: SB=0.5BB, BB=1BB, 그 외=0
- 림프(limp) = action:"call", amount=1BB → commit += 1BB
- raise/bet/올인 후 commit += 그 액션의 amount

### 콜 amount 계산
**call amount = (직전 raise/올인 to-level) − (콜러 누적 commit)**

### 예시 (BB=10000 지정 시): "CO 림프, BTN raise 4만, SB 콜, BB 콜, CO 콜"
- CO limp: amount=10000 (commit=10000)
- BTN raise: amount=40000 (commit=40000)
- SB call: 40000 − 5000 = **35000**
- BB call: 40000 − 10000 = **30000**
- CO call(2번째): 40000 − 10000 = **30000**

### BB 미지정 시
- 림프 amount는 null 허용
- SB/BB 콜에서 블라인드 차감 시도 금지 (raise 매칭 그대로)
- 림프한 플레이어 재콜도 raise 매칭 그대로

### 🚨 BB 지정 시 흔한 실수 (절대 금지)
**BB 첫 콜 amount가 BB(블라인드) 값과 같으면 안 됨. 반드시 raise 차감.**
- 예: BB=5000, "hero raise 15000, BB 콜" → BB call amount = 15000-5000 = **10000** (5000 아님)
- 예: BB=10000, "hero raise 30000, BB 콜" → BB call amount = 30000-10000 = **20000** (10000 아님)
- 발화에 BB 콜 amount가 명시 안 됐어도, 항상 raise to-level과 BB 값으로 자동 계산.
- "BB만 콜" / "빅블 콜" 같은 표현은 amount 미명시 → 위 공식으로 계산해서 채울 것.

## 금액 파싱 (한국어 구어체)
**반드시 KRW 원 단위로 출력** (숫자):
- "5만" / "5만원" → 50000
- "50만" → 500000, "100만" / "백만" → 1000000
- "천원" → 1000, "만원" → 10000, "십만" → 100000
- "8만원" → 80000, "레이즈 3만" → 30000
- Whisper가 숫자를 잘못 들었을 가능성도 고려 (예: "50만"을 "45만"으로 들었을 수 있음 — 문맥상 이상하면 그대로 두고 note에 언급)
- 금액이 전혀 명시 안 되면 null.

## 스트리트 추론
카드 장수로 유추: 플랍=3장, 턴=4장, 리버=5장. "플랍에서" → street:"flop".

## 중요 규칙
- 영웅(hero)은 1인칭("내가", "난", "나")이거나 "히어로"로 지칭됨.
- 상대는 "상대", "빌런", 혹은 포지션명("UTG가", "버튼이")으로 지칭됨.
- result: 내가 이겼다 → "won", 졌다 → "lost", 나눴다/쵸핑 → "chopped", 폴드해서 졌다 → "folded".
- hero_pl은 **승패 금액 (KRW 원 단위)**. 이겼으면 양수, 졌으면 음수. 모르면 null. "수익 25만" → 250000.
- pot_size도 **KRW 원 단위**. "팟 50만" → 500000.
- villain_cards가 쇼다운에서 공개된 경우만 villain_known=true.

## 예시 1 (콜 증분 계산 + 쇼다운 공개)
입력: "컷오프에서 에이 킹 수티드 하트하트 오픈 레이즈 3만. 버튼이 쓰리벳 9만. 내가 콜. 플랍 퀸 하트 10 하트 2 클럽. 내가 체크, 버튼이 15만 벳, 나도 콜. 턴 5 스페이드. 체크 체크. 리버 3 다이아. 내가 체크, 버튼이 올인 30만 밀었고, 내가 콜. 상대 퀸퀸 세트 보여주고 내가 졌어. 팟 백만, 손실 57만."
출력:
{
  "game_type":"NLH","stakes":null,
  "hero_position":"CO",
  "villains":[
    {"position":"BTN","type":null,"known":true,"cards":[{"rank":"Q","suit":"s"},{"rank":"Q","suit":"d"}]}
  ],
  "villain_position":"BTN","villain_known":true,
  "villain_cards":[{"rank":"Q","suit":"s"},{"rank":"Q","suit":"d"}],
  "hero_cards":[{"rank":"A","suit":"h"},{"rank":"K","suit":"h"}],
  "board":[{"rank":"Q","suit":"h"},{"rank":"T","suit":"h"},{"rank":"2","suit":"c"},{"rank":"5","suit":"s"},{"rank":"3","suit":"d"}],
  "actions":[
    {"street":"preflop","actor":"hero","action":"raise","amount":30000},
    {"street":"preflop","actor":"villain1","action":"raise","amount":90000},
    {"street":"preflop","actor":"hero","action":"call","amount":60000},
    {"street":"flop","actor":"hero","action":"check","amount":null},
    {"street":"flop","actor":"villain1","action":"bet","amount":150000},
    {"street":"flop","actor":"hero","action":"call","amount":150000},
    {"street":"turn","actor":"hero","action":"check","amount":null},
    {"street":"turn","actor":"villain1","action":"check","amount":null},
    {"street":"river","actor":"hero","action":"check","amount":null},
    {"street":"river","actor":"villain1","action":"allin","amount":300000},
    {"street":"river","actor":"hero","action":"call","amount":300000}
  ],
  "result":"lost","pot_size":1000000,"hero_pl":-570000,
  "note":"Hero: AKs hh, vs BTN QQ set"
}

## 예시 2 (다중 빌런 + 소액 + 올인 콜 증분)
입력: "내가 빅블에서 KJ 오프수트. UTG 피쉬가 콜, 버튼도 콜. 플랍 K J 4. 내가 5천 벳, UTG 폴드, 버튼이 2만 레이즈, 내가 올인 15만, 버튼 콜. 버튼 KK 셋 보여주고 졌어."
출력:
{
  "game_type":"NLH","stakes":null,
  "hero_position":"BB",
  "villains":[
    {"position":"BTN","type":null,"known":true,"cards":[{"rank":"K","suit":"d"},{"rank":"K","suit":"c"}]},
    {"position":"UTG","type":"피쉬","known":false,"cards":null}
  ],
  "villain_position":"BTN","villain_known":true,
  "villain_cards":[{"rank":"K","suit":"d"},{"rank":"K","suit":"c"}],
  "hero_cards":[{"rank":"K","suit":"s"},{"rank":"J","suit":"h"}],
  "board":[{"rank":"K","suit":"h"},{"rank":"J","suit":"s"},{"rank":"4","suit":"c"}],
  "actions":[
    {"street":"preflop","actor":"villain2","action":"call","amount":null},
    {"street":"preflop","actor":"villain1","action":"call","amount":null},
    {"street":"preflop","actor":"hero","action":"check","amount":null},
    {"street":"flop","actor":"hero","action":"bet","amount":5000},
    {"street":"flop","actor":"villain2","action":"fold","amount":null},
    {"street":"flop","actor":"villain1","action":"raise","amount":20000},
    {"street":"flop","actor":"hero","action":"allin","amount":150000},
    {"street":"flop","actor":"villain1","action":"call","amount":135000}
  ],
  "result":"lost","pot_size":null,"hero_pl":null,
  "note":"hero KJo top two vs BTN KK set, UTG fish folded flop"
}
주1: villains[0]=BTN(헤즈업)=villain1, villains[1]=UTG피쉬=villain2. UTG 액션은 actor="villain2".
주2: 빌런 콜 amount — hero 커밋 5000+150000=155000, BTN 커밋 20000 → 콜 = 155000-20000 = 135000.

## 예시 4 (3-way 프리플랍 + 액션 순서 재배열 + 빌런 콜 amount)
입력: "내가 BTN, 포켓 텐 들고 레이즈 3만, UTG 콜, BB도 콜. 플랍 Q J 8 다 다른 모양, 다들 체크. 턴 9. BB가 8만 리드, UTG 폴드, 내가 콜. 리버 2. BB 20만 벳, 콜. BB가 KT 보여줘서 졌어."
주: 사용자 narrative 순서는 hero→UTG→BB. 실제 프리플랍 순서는 UTG→hero(BTN)→BB. 플랍 순서는 BB→UTG→hero. **반드시 정상 포커 순서로 재배열.**
출력:
{
  "game_type":"NLH","stakes":null,
  "hero_position":"BTN",
  "villains":[
    {"position":"BB","type":null,"known":true,"cards":[{"rank":"K","suit":"s"},{"rank":"T","suit":"d"}]},
    {"position":"UTG","type":null,"known":false,"cards":null}
  ],
  "villain_position":"BB","villain_known":true,
  "villain_cards":[{"rank":"K","suit":"s"},{"rank":"T","suit":"d"}],
  "hero_cards":[{"rank":"T","suit":"s"},{"rank":"T","suit":"h"}],
  "board":[{"rank":"Q","suit":"s"},{"rank":"J","suit":"h"},{"rank":"8","suit":"d"},{"rank":"9","suit":"c"},{"rank":"2","suit":"s"}],
  "actions":[
    {"street":"preflop","actor":"hero","action":"raise","amount":30000},
    {"street":"preflop","actor":"villain2","action":"call","amount":30000},
    {"street":"preflop","actor":"villain1","action":"call","amount":30000},
    {"street":"flop","actor":"villain1","action":"check","amount":null},
    {"street":"flop","actor":"villain2","action":"check","amount":null},
    {"street":"flop","actor":"hero","action":"check","amount":null},
    {"street":"turn","actor":"villain1","action":"bet","amount":80000},
    {"street":"turn","actor":"villain2","action":"fold","amount":null},
    {"street":"turn","actor":"hero","action":"call","amount":80000},
    {"street":"river","actor":"villain1","action":"bet","amount":200000},
    {"street":"river","actor":"hero","action":"call","amount":200000}
  ],
  "result":"lost","pot_size":null,"hero_pl":null,
  "note":"hero TT vs BB KT (bigger straight)"
}
주: villain1=BB(헤즈업), villain2=UTG(피쉬). 프리플랍 콜 amount 모두 30000 (null 아님!). 플랍 순서 BB→UTG→hero(BTN 마지막).

## 예시 3 (간단, 단일 빌런)
입력: "스몰블라인드에서 에이 하트 킹 하트. UTG 레이즈 3만, 내가 3벳 올인 30만, 폴드 받았어."
출력:
{
  "game_type":"NLH","stakes":null,
  "hero_position":"SB",
  "villains":[{"position":"UTG","type":null,"known":false,"cards":null}],
  "villain_position":"UTG","villain_known":false,"villain_cards":null,
  "hero_cards":[{"rank":"A","suit":"h"},{"rank":"K","suit":"h"}],
  "board":null,
  "actions":[
    {"street":"preflop","actor":"villain1","action":"raise","amount":30000},
    {"street":"preflop","actor":"hero","action":"allin","amount":300000},
    {"street":"preflop","actor":"villain1","action":"fold","amount":null}
  ],
  "result":"won","pot_size":null,"hero_pl":null,"note":null
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
      // 핸드 자동 입력은 정확도가 핵심이므로 gpt-4o 사용 (일반 채팅은 mini)
      const { text, bb_krw, model = 'gpt-4o' } = body;

      // 사용자가 BB를 명시한 경우 system prompt에 주입 (추정 금지 → 정확한 차감 보장)
      const bbContext = (typeof bb_krw === 'number' && bb_krw > 0)
        ? `\n\n## ★ 사용자 지정 BB (반드시 적용)\n이번 핸드의 빅블라인드(BB) = ${bb_krw}원. 추정 금지. 모든 프리플랍 콜·림프 금액 계산에 이 값을 그대로 사용.\n- SB 블라인드 = ${Math.round(bb_krw / 2)}원\n- 림프 amount = ${bb_krw}원 (절대 빈값/null 금지)\n- BB 포지션 첫 콜 amount = (raise to-level) - ${bb_krw}\n- SB 포지션 첫 콜 amount = (raise to-level) - ${Math.round(bb_krw / 2)}\n- 림프한 플레이어가 raise에 콜할 때: amount = (raise to-level) - ${bb_krw}`
        : `\n\n## BB 미지정\n사용자가 BB를 입력하지 않았음. 콜 amount는 raise 매칭값 그대로 두고 블라인드/림프 차감 시도하지 말 것 (림프는 amount=null 허용).`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: 2048,
          temperature: 0.2,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: VOICE_PARSE_SYSTEM + bbContext },
            { role: 'user', content: `다음은 Whisper로 전사된 한국어 포커 핸드 설명입니다. 오인식이 있을 수 있으니 문맥으로 교정하여 JSON으로 변환하세요.\n\n음성 입력:\n${text}` },
          ],
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message ?? 'OpenAI API error');

      const inputTokens = data.usage?.prompt_tokens ?? 0;
      const outputTokens = data.usage?.completion_tokens ?? 0;
      await recordUsage(supabase, user.id, 'parse-voice', model, inputTokens, outputTokens);

      const parsed = JSON.parse(data.choices[0].message.content);
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── /hand-review-gpt ─────────────────────────────────────────────────────
    if (endpoint === 'hand-review-gpt') {
      const { hand, force_refresh } = body;

      // ── 캐시 키 생성 ──────────────────────────────────────────────────────
      // 같은 상황(포지션 + 핸드 + 보드 + 액션)이면 GPT를 다시 부르지 않는다
      const cacheKey = buildCacheKey(hand);

      // ── 캐시 조회 (force_refresh=true면 캐시 우회) ─────────────────────────
      // "다시 분석" 버튼은 force_refresh: true로 호출 → GPT 새로 호출하고 캐시 갱신
      if (!force_refresh) {
        const { data: cached } = await supabase
          .from('hand_review_cache')
          .select('id, result, hit_count')
          .eq('cache_key', cacheKey)
          .maybeSingle();

        if (cached) {
          await supabase
            .from('hand_review_cache')
            .update({ hit_count: (cached.hit_count ?? 1) + 1, updated_at: new Date().toISOString() })
            .eq('id', cached.id);

          return new Response(JSON.stringify({ ...cached.result, _cached: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } else {
        // 강제 새로고침: 기존 캐시 삭제 (GPT 호출 후 새로 insert될 거라 충돌 회피)
        await supabase
          .from('hand_review_cache')
          .delete()
          .eq('cache_key', cacheKey);
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

[GTO 가이드라인 — 프리플랍 오픈/3벳/4벳 레인지 (9-max 캐시 기준)]
오픈(첫 raise) 비율 + 핵심 핸드:
· UTG (15%): 22+, ATs+, AJo+, KQs, KQo, KJs, QJs, JTs, T9s, 98s, 87s
· UTG+1 (16%): UTG에 KTs, QTs 추가
· MP (18%): 22+, A9s+, ATo+, KTs+, K9s, QTs+, J9s+, T8s+, 76s
· HJ (22%): 22+, A2s+, ATo+, K9s+, KJo+, Q9s+, J9s+, T8s+, 97s+, 76s, 65s
· CO (28%): 22+, A2s+, A9o+, K7s+, KTo+, Q8s+, QJo, J8s+, T7s+, 96s+, 86s+, 75s+, 64s+, 54s
· BTN (45%): 22+, A2s+, A2o+, K2s+, K8o+, Q5s+, Q9o+, J6s+, J9o+, T7s+, T9o, 96s+, 85s+, 74s+, 64s+, 53s+, 43s
· SB (35%, vs random BB): A2s+, A7o+, K6s+, KTo+, Q8s+, QTo+, J8s+, JTo, T8s+, 97s+, 86s+, 75s+, 64s+, 53s+
· BB: 오픈 없음. 콜/3벳/폴드 결정만.

3벳(re-raise) 레인지:
· vs UTG 오픈: ~6%. 밸류=QQ+, AKs/AKo. 블러프=A5s, A4s, KJs, QJs (블로커+플레이 가능).
· vs CO/BTN 오픈: ~10~12%. 밸류=JJ+, AQs+, AKo. 블러프=A2s~A5s(휠), KTs, QTs, T9s, 76s.
· vs SB 오픈 (BB에서): ~14% (포지션 + 단독 vs SB).

4벳 레인지:
· 3벳 vs 오픈자: ~3~5%. 밸류=KK+, AKs (TT/JJ/QQ는 콜 위주). 블러프=A5s, A4s (휠 에이스, 블로커).

핵심 원칙:
- 포지션 늦을수록 레인지 넓어짐 (BTN > CO > HJ > MP > UTG).
- OOP는 페널티 → 같은 핸드도 IP에선 raise, OOP에선 fold 가능.
- 타이트(NIT) 빌런 → 레인지 좁힘. 루즈(피쉬) → 얇은 밸류 OK.
- 멀티웨이(3명+) → 블러프 ↓, 메이드 가치 ↑.

[GTO 가이드라인 — 플랍 C-bet 사이징 + 빈도]
원칙: 보드 텍스처 + 레인지 우위 + SPR로 사이즈/빈도 결정.

1. 드라이 보드 (예: K72r, A82r, Q53r) — 어그레서 IP
   · 사이즈: 1/3 팟 (33%) 작게. 빈도: 75~85% 거의 항상.
   · 이유: 상대 미스 빈도 ↑, 작게 쳐도 폴드 에쿼티 큼.

2. 드라이 보드 — 어그레서 OOP (예: SB가 BB 콜 받음)
   · 사이즈: 1/3 팟. 빈도: 60~70% (OOP 페널티).

3. 웻 보드 (예: 9h8c7d, JT9 모노톤, 654 컨넥티드)
   · 사이즈: 2/3 팟~팟. 빈도: 50~60% 폴라라이즈드.
   · 이유: 큰 사이즈로 드로우 차단 + 밸류 보호. 약한 메이드는 체크.

4. 페어드 보드 (예: KK4, 882, T7T)
   · 사이즈: 1/3 팟. 빈도: 70~80%.
   · 이유: 양쪽 다 트립스 적어 약한 레인지 → 블러프 효율 ↑.

5. 모노톤 보드 (예: 9h7h4h)
   · 사이즈: 1/3 팟 또는 체크. 빈도: 30~50%.
   · 너트 플러시 블로커(Ah, Kh) 있으면 더 자주.

6. 하이카드 보드 (A high, K high)
   · A high: 1/3 팟 80%+. K high (BTN vs BB): 1/3 팟 70~80%.

7. 로우 컨넥티드 (예: 654, 543) — 어그레서 OOP면 특히 어려움
   · 체크 빈도 ↑ 50~60%. 빌런 레인지 우위 가능.

[빌런 콜링 레인지 추정 (vs c-bet)]
- vs 1/3 팟: 폴드 에쿼티 작음 → 빌런 ~50% 콜 (페어, 갓샷 이상)
- vs 2/3 팟: 빌런 ~35% 콜 (탑페어+, 강한 드로우)
- vs 팟 사이즈: 빌런 ~25% 콜 (탑페어+, 셋, 넛 드로우)

[턴 더블 배럴 (2번째 c-bet)]
- 턴 블랭크(약한 카드, 드로우 미완): 1/2~2/3 팟 계속 압박.
- 턴 무서운 카드(드로우 완성, 오버카드): 사이즈 ↑ 또는 체크.
- 빌런 콜 레인지 좁아짐 → 밸류 핸드만 더블 배럴.

[GTO 가이드라인 — SPR(Stack-to-Pot Ratio)별 전략]
SPR = 유효 스택 ÷ 플랍 진입 팟. 스택을 어디까지 넣을지 결정짓는 핵심 변수.

SPR < 4 (얕음, 보통 3벳/4벳 팟)
· 탑페어급도 스택 인 OK. 폴드 에쿼티 거의 없으니 강한 핸드는 무조건 밸류 풀.
· 라인: 플랍부터 큰 사이즈(2/3~팟) c-bet → 턴/리버 자동 스택.
· 블러프 비중 ↓. 약한 메이드(2nd 페어 이하)는 체크/콜만.

SPR 4~10 (중간, 표준 싱글 raise 팟)
· 가장 균형 잡힌 결정 영역.
· 탑페어/오버페어: 2/3 팟 c-bet → 턴 더블 배럴 검토. 큰 액션엔 폴드 가능.
· 셋·투페어+: 큰 사이즈로 밸류 짜내. 웻보드면 즉시 raise.
· 약한 핸드: 폴드 에쿼티 충분 → 작게 c-bet 블러프 가능.
· 멀티웨이는 블러프 비중 확 줄이고 밸류 위주.

SPR > 10 (깊음, 림프드 팟·콜드 콜 팟)
· 스택 보존 + 큰 핸드 위주 큰 액션.
· 탑페어로 큰 팟 만들지 말 것 (역지배 위험).
· 셋/스트레이트/플러시급만 풀 액션. 트랩 라인(체크-콜) 가능.

[SPR과 핸드 강도 매핑 — "이 SPR에서 이 핸드는 어디까지 갈 수 있나?"]
- 셋·투페어 이상: SPR 무관 풀 액션 OK.
- 오버페어: SPR <8 풀 / SPR ≥10 큰 액션엔 폴드 검토.
- 탑페어 키커 좋음: SPR <6 풀 / 6~10 두 스트리트 / >10 한 스트리트만.
- 탑페어 약한 키커: SPR <4만 풀 / 그 외 한 스트리트 콜.
- 미들/바텀 페어: 한 스트리트 콜만.
- 스트롱 드로우(OESD, 플러시드로우): SPR <6 세미블러프 풀 OK / >8 콜 위주.

[GTO 가이드라인 — 빌런 타입별 익스플로잇]
빌런 타입(VPIP/PFR/AF로 추정)에 따라 GTO에서 의도적으로 벗어나는 게 EV 최대.

1. 피쉬 (Fish, VPIP 40%+, 패시브)
   · 익스플로잇: 얇은 밸류 ↑ (탑페어 약 키커도 3스트리트 밸류). 블러프 ↓.
   · 사이즈 평소보다 크게 (2/3~팟).

2. 콜링 스테이션 (VPIP 35%+, AF<1)
   · 폴드 거의 안 함. 블러프 0%, 밸류만 풀, 사이즈 크게.
   · 미들페어 이상이면 3스트리트 밸류.

3. 매니악 (VPIP 50%+, AF 5+)
   · 무차별 베팅. 콜 빈도 ↑, 트랩 라인(체크-콜) 유효.
   · 강한 핸드는 슬로우 플레이로 블러프 유도. 베팅에 의미 부여 X.

4. NIT (너트, VPIP 12% 이하)
   · 익스플로잇: 블러프 ↑, 작게 자주 c-bet (1/3 90%+).
   · NIT의 베팅·레이즈 = 강함 가정. 폴드 임계점 ↑.

5. TAG (VPIP 22%, AF 2~3, 레귤러)
   · GTO 근사치. 익스플로잇 어려움. 거의 GTO 그대로.
   · 멀티웨이/OOP에서 살짝 더 타이트 (오버폴드 경향).

6. LAG (VPIP 28%+, AF 3~4)
   · 넓은 레인지 + 공격적. 라이트 콜다운 ↑ (탑페어 약 키커도 콜).
   · 큰 라인엔 약하게 + 작은 라인엔 라이트 콜.

[빌런 타입 빠른 추정] 정보 없으면 'TAG' 가정.
"피쉬·호구"=1, "잘 친다·레귤러"=TAG, "공격적·미쳤다"=LAG/매니악, "타이트·폴드 잘함"=NIT.

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
⑧ **comment는 90~150자. 자연스러운 한국어 문장으로 풀어 쓸 것 (키워드 나열 금지).**
   · 전문용어 처음 등장 시 괄호로 쉽게 풀이 추가.
     예: "3-bet(상대 raise를 다시 raise)", "투톤 보드(같은 무늬 2장)", "c-bet(어그레서가 플랍에서 또 베팅)", "오버페어(보드 모든 카드보다 높은 포켓페어)", "갓샷(안쪽 한 카드만 들어오면 스트레이트)", "OOP(상대보다 먼저 액션, 불리)", "IP(상대보다 늦게 액션, 유리)", "폴드 에쿼티(상대 폴드시켜 얻는 가치)", "레인지(그 자리에서 칠 만한 핸드 묶음)", "SPR(스택÷팟, 작을수록 얕은 게임)"
   · 한 문장에 "왜 이 액션인지" + "구체적으로 뭘 노리는지"를 자연스럽게 연결.
   · 좋은 예: "Q포켓은 컷오프(CO)에서 강한 핸드라 3-bet(상대 raise를 다시 raise) 필수입니다. 빌런의 약한 핸드를 폴드시켜 레인지(칠 만한 핸드 묶음)를 좁히고 주도권을 확보하는 표준 라인입니다."
   · 나쁜 예: "QQ는 CO에서 강한 핸드. 3-bet 필수. 레인지 좁히고 주도권 확보." (키워드 나열, 풀이 없음)
⑨ 진행 안 된 스트리트는 null (빈 객체 아님).
⑩ headline·recommended_line·actual_line·ev_note·mistake·tip 6개 필드는 반드시 채울 것. 빈 문자열도 안 됨 (mistake만 실수 없으면 "실수 없음"). headline은 짧게, ev_note·tip도 풀어 쓰되 60~100자 권장.
⑪ **액션 순서 절대 거꾸로 읽지 말 것.** userPrompt의 [스트리트별 진행]에 나열된 순서가 시간순서. "히어로 raise 80000 → 빌런 call 160000"이면 hero가 먼저 raise하고 빌런이 콜한 것. 빌런이 raise한 게 아님. 히어로가 첫 raise를 하면 그건 오픈 레이즈, 빌런이 그 뒤 raise하면 그게 3-bet.
⑫ **올인 + 콜 후 자동 진행 스트리트 = 가상 액션 추천 절대 금지.**
   - 어느 한쪽이 allin 했고 상대가 call 했다면, 그 시점부터 양 플레이어 모두 추가 액션 불가.
   - 이후 모든 스트리트(예: 프리플랍 올인콜 → 플랍/턴/리버)는 단순 카드 공개일 뿐, 의사결정 X.
   - 출력 시 해당 스트리트들은 **null로 처리** (절대 "체크 100%" 같은 가짜 액션 추천 금지).
   - 검증: 액션 목록을 시간순으로 훑어 마지막 allin/call 쌍을 찾고, 그 이후 스트리트는 null.
   - 예: 액션 = [hero open raise, villain allin, hero call] → 프리플랍에 액션 평가, flop/turn/river = null.
   - 예: 액션 = [hero check, villain bet, hero allin, villain call] (플랍) → 프리플랍·플랍 평가, turn/river = null.
   - 단, headline·ev_note·mistake·tip은 전체 핸드 관점에서 평가 가능 (e.g. "플랍 올인 콜이 적절했나").
   - recommended_line·actual_line은 실제 의사결정 시점까지만 표기 (그 이후 액션 추가 X).

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
  ← ❌ 넛츠인데 콜 1순위 금지 / size 비어있음 / comment 모호 / alt_action 없음

[풀 예시 2 — 드라이 보드 c-bet, 약한 핸드 블러프]
입력 요약: BTN 히어로 7h6h, BB 콜드 콜. 플랍 K72 레인보우 (드라이·하이카드), SPR 12 (깊은 싱글 raise 팟), 빌런 타입: TAG, 팟 3만원.
히어로 현재 핸드: "보텀 페어 + 스트레이트 갓샷 — 약함, 블러프 후보"

좋은 출력:
{
  "headline": "드라이 K-high에 1/3 c-bet, 작게 자주 압박",
  "rating": 4,
  "streets": {
    "flop": {
      "action": "베팅",
      "frequency": 80,
      "alt_action": "체크",
      "alt_frequency": 20,
      "size": "약 1만원 (1/3 팟)",
      "comment": "드라이 K-high은 BTN 레인지 우위 압도적. 1/3 80% c-bet 표준. TAG 빌런은 K 없으면 폴드 빈도 ↑ → 블러프 EV 큼. 보텀 페어+갓샷 백업 에쿼티."
    }
  },
  "recommended_line": "베팅 1만원 → 콜 받으면 턴 블랭크면 1/2 더블 배럴, 무서운 카드면 체크",
  "actual_line": "...",
  "ev_note": "1/3 c-bet 80%가 GTO 표준. 체크 백은 폴드 에쿼티 포기 → EV 손실.",
  "mistake": "...",
  "tip": "BTN vs BB 드라이 K-high에선 거의 무뇌 c-bet 1/3 OK. 사이즈 키울 필요 없음."
}

[풀 예시 3 — 3-bet 팟 짧은 SPR, 오버페어 풀 액션]
입력 요약: CO 히어로 QQ, BTN 3벳, 히어로 콜. 플랍 J84 레인보우 (드라이), SPR 3 (3벳 팟이라 얕음), 빌런 타입: TAG, 팟 25만원.
히어로 현재 핸드: "오버페어 (J 보드 위) — 💪 강함"

좋은 출력:
{
  "headline": "3벳 팟 SPR3, 오버페어 풀 액션 라인",
  "rating": 5,
  "streets": {
    "flop": {
      "action": "체크",
      "frequency": 65,
      "alt_action": "베팅",
      "alt_frequency": 35,
      "size": "체크-레이즈 또는 즉시 약 18만원 (2/3 팟)",
      "comment": "히어로 OOP. 빌런 3벳 어그레서로 c-bet 빈도 ↑ → 체크-레이즈 라인 강력. SPR3에서 QQ는 무조건 풀 액션, 작게 빠지면 EV 손실."
    },
    "turn": {
      "action": "베팅",
      "frequency": 100,
      "alt_action": "",
      "alt_frequency": 0,
      "size": "팟 사이즈 또는 올인",
      "comment": "SPR3은 턴 한 액션이면 거의 스택 인. 밸류 풀로 짜내. K/A 떨어져도 QQ 콜 다운 가능 (TAG 4벳 안 한 시점에서 KK+ 비중 낮음)."
    }
  },
  "recommended_line": "체크 → 빌런 c-bet → 레이즈 올인 또는 콜 → 턴 리드 팟",
  "actual_line": "...",
  "ev_note": "SPR3 오버페어를 작게 풀어내면 큰 EV 손실. 3벳 팟 큰 핸드 무조건 풀 액션이 GTO.",
  "mistake": "...",
  "tip": "3벳 팟 SPR3 = '강하면 풀, 약하면 폴드'의 이분법. 중간 사이즈 금지."
}`;

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

      // ── RAG: Play Optimal Poker 1, 2 책에서 이 핸드와 관련 청크 검색 ─────
      // 1) 핸드를 짧은 영어 쿼리로 요약 (책이 영어라 영어 매칭이 정확)
      // 2) text-embedding-3-small로 임베딩
      // 3) match_book_chunks RPC로 상위 5개 청크 검색
      // 4) systemPrompt에 권위 있는 GTO 톤으로 자료 주입
      let ragContext = '';
      let ragChunkCount = 0;
      let ragTopSimilarity = 0;
      try {
        const ragQuery = `Position: ${position}. Hero hand: ${handCards}. Board: ${boardCards}. SPR: ${sprStr}. Preflop aggressor: ${preflopAggressor}. Villain type: ${villainType}. Actions summary: ${richStreetsBlock.slice(0, 1500)}`;
        const embRes = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'text-embedding-3-small', input: ragQuery }),
        });
        if (embRes.ok) {
          const embData = await embRes.json();
          const queryEmbedding = embData.data[0].embedding;
          const { data: chunks } = await supabase.rpc('match_book_chunks', {
            query_embedding: queryEmbedding,
            match_count: 5,
          });
          if (chunks && chunks.length > 0) {
            ragChunkCount = chunks.length;
            ragTopSimilarity = chunks[0]?.similarity ?? 0;
            console.log(`[hand-review-gpt] RAG: ${chunks.length} chunks retrieved, top similarity ${(ragTopSimilarity * 100).toFixed(1)}%`);
            ragContext = '\n\n[전문 참고 자료 — 분석에 활용]\n' +
              '아래는 이 핸드와 관련된 GTO·포커 이론 자료입니다. 답변 작성 시 이 내용을 적극 반영·내재화하세요.\n\n' +
              '🚨 인용 규칙 (반드시 준수):\n' +
              '- **특정 책·저자 이름 절대 언급 금지** ("Play Optimal Poker", "Modern Poker Theory" 등 원천 자료명 X).\n' +
              '- 대신 아래 권위 있고 두루뭉실한 표현 중 하나를 자연스럽게 섞어 사용:\n' +
              '  · "GTO 이론에 따르면..." / "포커 게임이론 관점에서..." / "GTO 전략 원칙상..."\n' +
              '  · "현대 솔버 분석 결과에 의하면..." / "솔버 기반 분석에 따르면..."\n' +
              '  · "포커 전략 이론에서는..." / "게임이론 최적 플레이 기준으로..."\n' +
              '  · "GTO 관점에서 이 스팟을 분석하면..." / "이론적으로 최적화된 전략을 기준으로..."\n' +
              '  · "포커 전략 이론을 이 상황에 적용하면..." / "게임이론 기반으로 이 핸드를 분석하면..."\n' +
              '- 같은 표현 반복 금지. 매번 다른 변형 사용.\n' +
              '- 아예 인용 어구 없이 자연스럽게 내재화해서 풀어쓰는 것도 좋음.\n' +
              '- 원문이 영어니 한국어로 자연스럽게 의역. 직역 금지.\n\n' +
              chunks.map((c: any, i: number) =>
                `[자료 #${i + 1}] (관련도 ${(c.similarity * 100).toFixed(1)}%)\n${c.content}`
              ).join('\n\n---\n\n');
          }
        }
      } catch (e) {
        // RAG 실패해도 기존 시스템 프롬프트만으로 진행 (graceful degradation)
        console.warn('[hand-review-gpt] RAG retrieval failed:', e);
      }

      // RAG 컨텍스트가 있으면 systemPrompt에 추가
      const finalSystemPrompt = systemPrompt + ragContext;

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
              { role: 'system', content: finalSystemPrompt },
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
      // RAG 메타데이터를 결과에 포함 (디버그·검증용, _ 접두사로 클라이언트에서 무시 가능)
      reviewJson._rag = {
        used: ragChunkCount > 0,
        chunks: ragChunkCount,
        top_similarity: Number(ragTopSimilarity.toFixed(4)),
      };
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

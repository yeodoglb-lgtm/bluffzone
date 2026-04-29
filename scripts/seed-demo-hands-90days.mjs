// 데모 핸드 90개 (3개월) → 블러프존 yeodoglb@gmail.com 계정 시드
// 8가지 드라마 패턴 × 카드·보드·노트 변주로 생성. 매일 1개씩 played_at 분배.

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://chxcayaehgwqrpjuajqx.supabase.co';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!KEY) { console.error('❌ SUPABASE_SERVICE_ROLE_KEY 필요'); process.exit(1); }
const USER_ID = '4dd74940-ddfa-4b80-aed6-38decd6ad829';
const supabase = createClient(SUPABASE_URL, KEY, { auth: { autoRefreshToken: false, persistSession: false } });

// ─── 유틸 ────────────────────────────────────────────────────────────────────
const C = (rank, suit) => ({ rank, suit });
const pick = (arr, idx) => arr[idx % arr.length];

// ─── 노트 템플릿 풀 (1인칭 억울/드라마/기쁨) ─────────────────────────────────
const NOTES = {
  aa_set: [
    'AA 풀스택 박은 거 후회 안 함. {pair}{pair} 콜드콜은 그냥 운임. 한국 펍에선 어쩔 수 없는 듯.',
    '또야... AA 박살난 거 이번 달만 몇 번째인지. {pair}{pair} 셋 한 번만 더 만나면 진짜 그만둘 듯.',
    '{pair}{pair}로 콜드콜 들어올 때부터 쎄했는데. 플랍 {pair}하이 보고 그냥 박았다. AA가 KK보다 깨지는 게 이상함.',
    '아 진짜 토할 거 같다. AA로 200bb 풀스택 박힌 게 처음은 아닌데, 매번 이렇게 멘탈 흔들림.',
    '셋 박는 사람 표정 한 번 봐야 함. 본인이 이긴 줄 모르고 멍 때리다가 뒤늦게 환호. 그게 더 빡침.',
  ],
  set_over_set_lost: [
    '셋오버셋 클래식. {hero_pair}{hero_pair} vs {vil_pair}{vil_pair}. 폴드는 못 하지. 이런 스팟에서 돈 안 넣으면 포커 그만둬야.',
    '플랍 두 페어 같이 떨어졌을 때부터 운명. 그냥 빨리 끝난 게 다행이라고 해야 하나.',
    '바텀 셋 박힐 확률 100분의 1인데 오늘이 그날이었음. 펍 끝나고 차에서 멍.',
    '{vil_pair}{vil_pair} 그 사람 100bb 들고 올라온 사람인데, 셋 박고도 표정 안 변하더라. 그게 더 무서움.',
    '내가 탑셋이면 행복했을 텐데 하필 바텀. 보드페어 한 번만 떨어졌으면.',
  ],
  set_over_set_won: [
    '바텀 셋이 리버에 쿼즈로 변신. 펍 전체가 "오오오" 했고 빌런이 자리에서 안 일어남. 평생 한 번 있을까 말까.',
    '셋 vs 셋에서 리버 한 장에 인생역전. 빌런한테 미안하다고 말하고 싶었는데 입꼬리 안 내려와서 못 함.',
    '리버 카드 까지자마자 손 떨림. 10분 동안 카드 만지작거리며 멍 때림. 이게 포커지.',
    '운빨 인정. 빌런 입장에선 평생 트라우마일 듯. 미안.',
  ],
  hero_call_hi: [
    '리버 베팅 사이즈 보고 "아 이건 블러프다" 직감 적중. {hand} 콜한 거 평생 자랑할 듯.',
    '3분 고민하다 콜. 빌런이 카드 까는 순간 손 떨림. 영웅콜 평생 처음 성공.',
    '턴 체크-체크 라인이 너무 어색했음. AK였으면 베팅 박았을 거고. 그래서 콜 박음.',
    '"아 모르겠다 콜!" 하고 박았는데 맞음. 이런 핸드 한 번 맞히면 한 달 입소문.',
  ],
  cooler_flush_full: [
    '플랍에 하트 3개 떴을 때 "오늘 풀린다" 했는데 턴 보드페어. K-하이 너트 플러시가 풀하우스에 박살. 이런 쿨러는 진짜 답 없음.',
    '너트 플러시 들고 박은 게 죄는 아닌데... 풀하우스 시나리오는 머릿속에 안 떠올랐음.',
    '플러시 vs 풀하우스 펍 클래식. 글로 읽을 땐 "왜 폴드 안 해?" 싶지만 직접 당해보면 폴드 못 함.',
    '셋이면 어차피 박았을 거라 손해 본 건 아님. 라인 자체는 옳았다고 위안.',
  ],
  cooler_straight_flush: [
    '스트레이트 들고 박은 거 폴드는 못 하지. 플러시 시나리오 알면서도 너무 강해 보였음.',
    '플랍 투페어 상대로 콜 한 번이면 끝났을 텐데, 턴에 플러시 카드 떨어진 거 무시한 게 패착.',
    '하트 3장 붙었을 때 한 번 멈췄어야 했나. 그래도 스트레이트로 폴드는 진짜 무리.',
  ],
  sick_fold: [
    '30초 고민하다 폴드. 그리고 카드 까지는 순간... 빌런이 {bluff_hand} 까는 거 보고 펍에서 나가고 싶었음.',
    '리버 {drama_card} 봤을 때 머릿속 백지. 폴드 안 했으면 인생 핸드인데, 했으면 평생 트라우마.',
    '아 진짜 토할 거 같다. {drama_card}만 안 떨어졌으면. 폴드 자체는 옳은 결정이었다고 스스로 위로 중.',
    '빌런 표정 보고 폴드. 근데 카드 까니까 완전 블러프. 표정 잘 짓는 사람이 무서움.',
  ],
  kk_quads: [
    'KK로 4벳 박았는데 빌런 5벳 올인. 콜하면서도 "아 AA겠다" 생각함. 진짜 AA. 멘붕. 근데 플랍 K, 리버 K. AA가 KKKK한테 진 거 처음 봤음.',
    'AA한테 박힌 줄 알았는데 살아나고도 모자라 쿼즈. 평생 한 번 있을까 말까.',
    '빌런이 자리에서 안 일어났음. 미안한데 입꼬리 안 내려와서 사과 못 함.',
  ],
  bluff_caught: [
    '리버 풀팟 블러프 박았는데 빌런이 1초도 안 고민하고 콜. 카드 까니까 톱페어. 내가 너무 큰 사이즈 박은 게 패착이었나.',
    '블러프 잘 통하던 사람이었는데 그날따라 안 통했음. 100bb 날림. 다음 핸드 바로 일어남.',
    '리버 무리한 거 인정. 턴에서 멈췄어야 했는데 욕심.',
  ],
  runner_runner: [
    '플랍 4-아웃 백도어인데 운명처럼 턴-리버 둘 다 붙음. 빌런 입장에선 황당할 듯.',
    '운빨 인정. 그래도 라인은 자연스러웠다고 우기는 중.',
  ],
};
const noteIdx = (key, idx) => NOTES[key][idx % NOTES[key].length];

// ─── 카드/포지션 풀 ─────────────────────────────────────────────────────────
const SUITS = ['s','h','d','c'];
const SMALL_PAIRS = ['2','3','4','5','6','7'];
const HIGH_RANKS = ['A','K','Q','J','T'];
const POSITIONS = ['UTG','MP','HJ','CO','BTN','SB','BB'];

function pairCards(rank, idx) {
  const s1 = SUITS[idx % 4], s2 = SUITS[(idx + 1 + (idx % 3)) % 4];
  const a = s1 === s2 ? SUITS[(idx + 2) % 4] : s2;
  return [C(rank, s1), C(rank, a !== s1 ? a : SUITS[(idx + 2) % 4])];
}

// ─── 8가지 아키타입 (각각 idx 받아서 핸드 1개 반환) ─────────────────────────

function arch_aaVsSet(idx) {
  const sp = pick(SMALL_PAIRS, idx);
  const heroCards = pairCards('A', idx);
  const villCards = pairCards(sp, idx + 1);
  const heroPos = pick(['UTG','MP','HJ','CO'], idx);
  const villPos = pick(['BTN','CO','SB','BB'], idx + 2);
  const turnRank = pick(['K','Q','J','T'], idx);
  const riverRank = pick(['9','8','5'], idx);
  const board = [
    C(sp, 'h'), C('7','s'), C('T','c'),
    C(turnRank,'s'), C(riverRank,'d'),
  ];
  return {
    hero_position: heroPos, villain_position: villPos,
    hero_cards: heroCards, villain_known: true, villain_cards: villCards,
    board,
    actions: [
      { street: 'preflop', actor: 'hero', action: 'raise', amount: 5000 },
      { street: 'preflop', actor: 'villain', action: 'call', amount: 5000 },
      { street: 'flop', actor: 'hero', action: 'bet', amount: 10000 },
      { street: 'flop', actor: 'villain', action: 'raise', amount: 28000 },
      { street: 'flop', actor: 'hero', action: 'raise', amount: 80000 },
      { street: 'flop', actor: 'villain', action: 'call', amount: 80000 },
      { street: 'turn', actor: 'hero', action: 'allin', amount: 115000 },
      { street: 'turn', actor: 'villain', action: 'call', amount: 115000 },
    ],
    result: 'lost', pot_size: 416000, hero_pl: -200000,
    note: noteIdx('aa_set', idx).replaceAll('{pair}', sp),
  };
}

function arch_setOverSetLost(idx) {
  const ranks = ['7','8','9','T','J','Q'];
  const heroPair = ranks[idx % ranks.length];
  const villPair = ranks[(idx + 2) % ranks.length];
  const [low, high] = heroPair < villPair ? [heroPair, villPair] : [villPair, heroPair];
  const heroIsBottom = heroPair === low;
  const heroCards = pairCards(heroPair, idx);
  const villCards = pairCards(villPair, idx + 1);
  const flop = [C(high,'s'), C(low,'h'), C('2','c')];
  const board = [...flop, C('3','d'), C('K','s')];
  return {
    hero_position: pick(['CO','BTN','HJ'], idx),
    villain_position: pick(['UTG','MP','BB'], idx),
    hero_cards: heroCards, villain_known: true, villain_cards: villCards,
    board,
    actions: [
      { street: 'preflop', actor: 'villain', action: 'raise', amount: 5000 },
      { street: 'preflop', actor: 'hero', action: 'call', amount: 5000 },
      { street: 'flop', actor: 'villain', action: 'bet', amount: 8000 },
      { street: 'flop', actor: 'hero', action: 'raise', amount: 26000 },
      { street: 'flop', actor: 'villain', action: 'call', amount: 26000 },
      { street: 'turn', actor: 'villain', action: 'bet', amount: 50000 },
      { street: 'turn', actor: 'hero', action: 'call', amount: 50000 },
      { street: 'river', actor: 'villain', action: 'allin', amount: 119000 },
      { street: 'river', actor: 'hero', action: 'call', amount: 119000 },
    ],
    result: heroIsBottom ? 'lost' : 'won',
    pot_size: 416000,
    hero_pl: heroIsBottom ? -200000 : 200000,
    note: noteIdx('set_over_set_lost', idx)
      .replaceAll('{hero_pair}', heroPair)
      .replaceAll('{vil_pair}', villPair),
  };
}

function arch_setOverSetWonQuads(idx) {
  const ranks = ['8','9','T','J'];
  const lowPair = ranks[idx % ranks.length];
  const highPair = ranks[(idx + 2) % ranks.length];
  const heroCards = pairCards(lowPair, idx);
  const villCards = pairCards(highPair, idx + 1);
  const board = [
    C(highPair,'s'), C(lowPair,'h'), C('4','c'),
    C('2','d'), C(lowPair,'c'),
  ];
  return {
    hero_position: pick(['BTN','CO'], idx),
    villain_position: pick(['CO','BTN','HJ'], idx + 1),
    hero_cards: heroCards, villain_known: true, villain_cards: villCards,
    board,
    actions: [
      { street: 'preflop', actor: 'villain', action: 'raise', amount: 5000 },
      { street: 'preflop', actor: 'hero', action: 'call', amount: 5000 },
      { street: 'flop', actor: 'villain', action: 'bet', amount: 8000 },
      { street: 'flop', actor: 'hero', action: 'raise', amount: 26000 },
      { street: 'flop', actor: 'villain', action: 'call', amount: 26000 },
      { street: 'turn', actor: 'villain', action: 'bet', amount: 50000 },
      { street: 'turn', actor: 'hero', action: 'call', amount: 50000 },
      { street: 'river', actor: 'villain', action: 'allin', amount: 119000 },
      { street: 'river', actor: 'hero', action: 'call', amount: 119000 },
    ],
    result: 'won', pot_size: 416000, hero_pl: 200000,
    note: noteIdx('set_over_set_won', idx),
  };
}

function arch_heroCallHi(idx) {
  const heroHigh = pick(['K','A','Q'], idx);
  const heroKick = pick(['Q','J','T','9'], idx);
  const villPair = pick(['Q','J','T'], idx + 1);
  const heroCards = [C(heroHigh,'h'), C(heroKick,'h')];
  const villCards = pairCards(villPair, idx);
  const flopHi = pick(['A','K'], idx);
  const board = [
    C(flopHi === heroHigh ? 'A' : flopHi,'c'),
    C('7','d'), C('3','s'),
    C('5','h'), C('9','s'),
  ];
  return {
    hero_position: 'BTN',
    villain_position: 'CO',
    hero_cards: heroCards, villain_known: true, villain_cards: villCards,
    board,
    actions: [
      { street: 'preflop', actor: 'villain', action: 'raise', amount: 5000 },
      { street: 'preflop', actor: 'hero', action: 'raise', amount: 16000 },
      { street: 'preflop', actor: 'villain', action: 'call', amount: 16000 },
      { street: 'flop', actor: 'villain', action: 'check' },
      { street: 'flop', actor: 'hero', action: 'bet', amount: 14000 },
      { street: 'flop', actor: 'villain', action: 'call', amount: 14000 },
      { street: 'turn', actor: 'villain', action: 'check' },
      { street: 'turn', actor: 'hero', action: 'check' },
      { street: 'river', actor: 'villain', action: 'bet', amount: 55000 },
      { street: 'river', actor: 'hero', action: 'call', amount: 55000 },
    ],
    result: 'won', pot_size: 173000, hero_pl: 86500,
    note: noteIdx('hero_call_hi', idx).replaceAll('{hand}', `${heroHigh}하이`),
  };
}

function arch_coolerFlushFull(idx) {
  const heroHi = pick(['K','Q','J'], idx);
  const heroLo = pick(['Q','J','T','9'], idx + 1);
  const villPair = pick(['A','K','Q'], idx);
  const flushSuit = pick(SUITS, idx);
  const heroCards = [C(heroHi, flushSuit), C(heroLo, flushSuit)];
  const villCards = pairCards(villPair, idx);
  const pairCard = pick(['7','8','9','T'], idx);
  const board = [
    C(villPair, flushSuit), C(pairCard, flushSuit), C('2', flushSuit),
    C(pairCard, 'c'), C('5','d'),
  ];
  return {
    hero_position: pick(['UTG','MP','CO'], idx),
    villain_position: pick(['BTN','CO'], idx + 1),
    hero_cards: heroCards, villain_known: true, villain_cards: villCards,
    board,
    actions: [
      { street: 'preflop', actor: 'hero', action: 'raise', amount: 5000 },
      { street: 'preflop', actor: 'villain', action: 'raise', amount: 16000 },
      { street: 'preflop', actor: 'hero', action: 'call', amount: 16000 },
      { street: 'flop', actor: 'hero', action: 'check' },
      { street: 'flop', actor: 'villain', action: 'bet', amount: 18000 },
      { street: 'flop', actor: 'hero', action: 'raise', amount: 56000 },
      { street: 'flop', actor: 'villain', action: 'call', amount: 56000 },
      { street: 'turn', actor: 'hero', action: 'allin', amount: 128000 },
      { street: 'turn', actor: 'villain', action: 'call', amount: 128000 },
    ],
    result: 'lost', pot_size: 403000, hero_pl: -200000,
    note: noteIdx('cooler_flush_full', idx),
  };
}

function arch_coolerStraightFlush(idx) {
  const flushSuit = pick(SUITS, idx);
  const heroCards = [C('9','c'), C('8','d')];
  const villCards = [C('A', flushSuit), C('K', flushSuit)];
  const board = [
    C('7', flushSuit), C('6','c'), C('T','d'),
    C('2', flushSuit), C('Q', flushSuit),
  ];
  return {
    hero_position: pick(['BTN','CO','HJ'], idx),
    villain_position: pick(['UTG','MP','BB'], idx + 1),
    hero_cards: heroCards, villain_known: true, villain_cards: villCards,
    board,
    actions: [
      { street: 'preflop', actor: 'villain', action: 'raise', amount: 5000 },
      { street: 'preflop', actor: 'hero', action: 'call', amount: 5000 },
      { street: 'flop', actor: 'villain', action: 'bet', amount: 8000 },
      { street: 'flop', actor: 'hero', action: 'call', amount: 8000 },
      { street: 'turn', actor: 'villain', action: 'bet', amount: 30000 },
      { street: 'turn', actor: 'hero', action: 'call', amount: 30000 },
      { street: 'river', actor: 'villain', action: 'allin', amount: 157000 },
      { street: 'river', actor: 'hero', action: 'call', amount: 157000 },
    ],
    result: 'lost', pot_size: 411000, hero_pl: -200000,
    note: noteIdx('cooler_straight_flush', idx),
  };
}

function arch_sickFold(idx) {
  const heroCards = [C('8','h'), C('7','h')];
  const villCards = [C('K','c'), C('J','c')];
  const board = [
    C('6','h'), C('5','h'), C('4','c'),
    C('4','h'), C('9','h'),
  ];
  return {
    hero_position: pick(['UTG','MP','CO'], idx),
    villain_position: pick(['BB','BTN'], idx + 1),
    hero_cards: heroCards, villain_known: true, villain_cards: villCards,
    board,
    actions: [
      { street: 'preflop', actor: 'hero', action: 'raise', amount: 5000 },
      { street: 'preflop', actor: 'villain', action: 'call', amount: 3000 },
      { street: 'flop', actor: 'villain', action: 'check' },
      { street: 'flop', actor: 'hero', action: 'bet', amount: 7000 },
      { street: 'flop', actor: 'villain', action: 'raise', amount: 24000 },
      { street: 'flop', actor: 'hero', action: 'call', amount: 24000 },
      { street: 'turn', actor: 'villain', action: 'allin', amount: 165000 },
      { street: 'turn', actor: 'hero', action: 'fold' },
    ],
    result: 'folded', pot_size: 64000, hero_pl: -36000,
    note: noteIdx('sick_fold', idx)
      .replaceAll('{bluff_hand}', 'KcJc')
      .replaceAll('{drama_card}', '9하트'),
  };
}

function arch_kkQuads(idx) {
  const heroCards = pairCards('K', idx);
  const villCards = pairCards('A', idx + 1);
  const board = [
    C('K','h'), C('7','d'), C('3','c'),
    C('9','s'), C('K','d'),
  ];
  return {
    hero_position: pick(['CO','HJ','BTN'], idx),
    villain_position: pick(['BTN','SB','BB'], idx + 1),
    hero_cards: heroCards, villain_known: true, villain_cards: villCards,
    board,
    actions: [
      { street: 'preflop', actor: 'hero', action: 'raise', amount: 5000 },
      { street: 'preflop', actor: 'villain', action: 'raise', amount: 16000 },
      { street: 'preflop', actor: 'hero', action: 'raise', amount: 40000 },
      { street: 'preflop', actor: 'villain', action: 'allin', amount: 200000 },
      { street: 'preflop', actor: 'hero', action: 'call', amount: 200000 },
    ],
    result: 'won', pot_size: 402000, hero_pl: 200000,
    note: noteIdx('kk_quads', idx),
  };
}

const ARCHETYPES = [
  arch_aaVsSet,
  arch_setOverSetLost,
  arch_heroCallHi,
  arch_coolerFlushFull,
  arch_setOverSetWonQuads,
  arch_sickFold,
  arch_coolerStraightFlush,
  arch_kkQuads,
];

// ─── 메인: 90개 생성 (오늘부터 매일 1개) ───────────────────────────────────
const TOTAL = 90;
const START = new Date('2026-04-29T00:00:00+09:00');
const HOURS = [20, 21, 22, 23];
const MINS = [5, 18, 27, 35, 42, 50];

const rows = [];
for (let i = 0; i < TOTAL; i++) {
  const archetype = ARCHETYPES[i % ARCHETYPES.length];
  const hand = archetype(Math.floor(i / ARCHETYPES.length) + i);

  const date = new Date(START);
  date.setDate(date.getDate() + i);
  date.setHours(HOURS[i % HOURS.length], MINS[i % MINS.length], 0, 0);

  rows.push({
    user_id: USER_ID,
    session_id: null,
    played_at: date.toISOString(),
    game_type: 'NLH',
    stakes: '1k/2k',
    hero_position: hand.hero_position,
    villain_position: hand.villain_position,
    hero_cards: hand.hero_cards,
    villain_known: hand.villain_known,
    villain_cards: hand.villain_cards,
    board: hand.board,
    actions: hand.actions,
    result: hand.result,
    pot_size: hand.pot_size,
    hero_pl: hand.hero_pl,
    note: hand.note,
    raw_voice_text: null,
    review_status: 'none',
    review: null,
    reviewed_at: null,
    review_model: null,
    share_id: null,
    is_public: false,
  });
}

// ─── 기존 시드 7개 삭제 후 새로 INSERT ─────────────────────────────────────
console.log('🗑️  기존 시드 핸드 (note에 "AA 풀스택" 등 포함된 것) 삭제 시도...');
// 안전하게: 04-29 ~ 07-27 범위의 USER_ID 핸드만 삭제
const cleanupStart = '2026-04-29T00:00:00+09:00';
const cleanupEnd = '2026-07-28T00:00:00+09:00';
const { error: delErr, count: delCount } = await supabase
  .from('hands')
  .delete({ count: 'exact' })
  .eq('user_id', USER_ID)
  .gte('played_at', cleanupStart)
  .lt('played_at', cleanupEnd);
if (delErr) { console.error('❌ 삭제 실패:', delErr); process.exit(1); }
console.log(`   삭제된 행: ${delCount ?? '?'}개`);

console.log(`\n📤 ${rows.length}개 핸드 INSERT 시작...`);
// Supabase는 한 번에 너무 많이 넣으면 타임아웃 가능 — 30개씩 배치
const BATCH = 30;
let inserted = 0;
for (let i = 0; i < rows.length; i += BATCH) {
  const batch = rows.slice(i, i + BATCH);
  const { error } = await supabase.from('hands').insert(batch);
  if (error) { console.error(`❌ batch ${i}~${i + BATCH} 실패:`, error); process.exit(1); }
  inserted += batch.length;
  process.stdout.write(`\r   진행: ${inserted}/${rows.length}`);
}
console.log(`\n\n✅ ${inserted}개 핸드 시드 완료!`);
console.log(`   기간: 2026-04-29 ~ 2026-07-27 (90일)`);
console.log(`   매일 1개씩, 시간대 분산 (20~23시)`);
console.log(`\n📱 앱 yeodoglb@gmail.com 로그인 → 핸드 목록 확인`);

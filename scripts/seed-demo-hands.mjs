// 데모 핸드 7개 → 블러프존 yeodoglb@gmail.com 계정에 시드 (커뮤니티 마케팅용)
//
// 실행:
//   SUPABASE_SERVICE_ROLE_KEY="eyJ..." node scripts/seed-demo-hands.mjs
//
// 동작: hands 테이블에 7개 INSERT, played_at = 2026-04-30 ~ 2026-05-06 매일 1개

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://chxcayaehgwqrpjuajqx.supabase.co';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!KEY) { console.error('❌ SUPABASE_SERVICE_ROLE_KEY 필요'); process.exit(1); }

const USER_ID = '4dd74940-ddfa-4b80-aed6-38decd6ad829'; // yeodoglb@gmail.com

const supabase = createClient(SUPABASE_URL, KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// 카드 헬퍼
const C = (rank, suit) => ({ rank, suit });

// ── 7개 핸드 데이터 ───────────────────────────────────────────────────────────

const HANDS = [
  // ────────────────────────────────────────────────────────────────────────────
  // 1. JJ 톱셋이 리버 9 한 장에... 9 쿼즈 (드라마)
  //    히어로 = CO JJ (탑셋이었는데 리버에 무너짐)
  {
    played_at: '2026-04-29T21:35:00+09:00',
    game_type: 'NLH',
    stakes: '1k/2k',
    hero_position: 'CO',
    villain_position: 'BTN',
    hero_cards: [C('J','h'), C('J','d')],
    villain_known: true,
    villain_cards: [C('9','s'), C('9','c')],
    board: [C('J','s'), C('9','h'), C('4','c'), C('2','d'), C('9','c')],
    actions: [
      { street: 'preflop', actor: 'hero', action: 'raise', amount: 5000 },
      { street: 'preflop', actor: 'villain', action: 'call', amount: 5000 },
      { street: 'flop', actor: 'hero', action: 'check' },
      { street: 'flop', actor: 'villain', action: 'bet', amount: 8000 },
      { street: 'flop', actor: 'hero', action: 'raise', amount: 26000 },
      { street: 'flop', actor: 'villain', action: 'call', amount: 26000 },
      { street: 'turn', actor: 'hero', action: 'bet', amount: 50000 },
      { street: 'turn', actor: 'villain', action: 'call', amount: 50000 },
      { street: 'river', actor: 'hero', action: 'bet', amount: 119000 },
      { street: 'river', actor: 'villain', action: 'call', amount: 119000 },
    ],
    result: 'lost',
    pot_size: 405000,
    hero_pl: -200000,
    note: '아 진짜 토할 거 같다... JJ 톱셋이 리버에 9 쿼즈한테 박힘. 빌런 BTN에서 99 콜드콜할 때부터 뭔가 쎄했는데, 플랍 J9 하이가 나와서 "그냥 셋 박으면 끝이지" 하고 밸류 박은 거였음. 리버 9 보자마자 손이 떨려서 그냥 박았고, 빌런이 1초 만에 콜. 펍 끝나고 차에서 30분 멍 때렸음.',
  },

  // ────────────────────────────────────────────────────────────────────────────
  // 2. AA 4벳 올인 vs 22 셋 (현실적 클래식)
  //    히어로 = UTG AA, 진다.
  {
    played_at: '2026-04-30T22:10:00+09:00',
    game_type: 'NLH',
    stakes: '1k/2k',
    hero_position: 'UTG',
    villain_position: 'BTN',
    hero_cards: [C('A','s'), C('A','h')],
    villain_known: true,
    villain_cards: [C('2','c'), C('2','d')],
    board: [C('2','h'), C('7','s'), C('T','c'), C('K','s'), C('5','d')],
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
    result: 'lost',
    pot_size: 416000,
    hero_pl: -200000,
    note: 'AA 200bb 풀스택 박은 거 후회 안 함. 플랍 2hi에 22셋 콜드콜은 그냥 운임. 근데 플랍 체크레이즈 들어왔을 때 한 번쯤 의심했어야 했나... BTN 100bb 들고 올라간 그 사람, 표정 하나 안 변하더라. 22 콜드콜 하는 거 보면 한국식 펍에선 어쩔 수 없는 듯. 다음 핸드 바로 아꿈',
  },

  // ────────────────────────────────────────────────────────────────────────────
  // 3. K하이로 영웅콜 들어간 그 순간 (드라마, 이김)
  //    히어로 = BTN KhQh
  {
    played_at: '2026-05-01T20:50:00+09:00',
    game_type: 'NLH',
    stakes: '1k/2k',
    hero_position: 'BTN',
    villain_position: 'CO',
    hero_cards: [C('K','h'), C('Q','h')],
    villain_known: true,
    villain_cards: [C('Q','s'), C('Q','c')],
    board: [C('A','c'), C('7','d'), C('3','s'), C('5','h'), C('9','s')],
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
    result: 'won',
    pot_size: 173000,
    hero_pl: 86500,
    note: '리버에 빌런이 갑자기 50k 베팅 박는데, K하이 들고 3분을 고민. CO 레인지에 AA/AK 있으면 죽는 건데, 턴 체크-체크 라인이 너무 어색했어. AK였으면 턴 베팅 박았을 거고, AA였으면 리버 사이즈가 더 컸을 거 같았음. "아 모르겠다 콜!" 했는데 빌런이 QQ 깠을 때 손 떨림. 영웅콜 평생 처음 성공.',
  },

  // ────────────────────────────────────────────────────────────────────────────
  // 4. K하이 너트 플러시... 풀하우스 앞에 무너지다 (현실적 쿨러)
  //    히어로 = UTG KhQh, 빌런 = BTN AA
  {
    played_at: '2026-05-02T22:25:00+09:00',
    game_type: 'NLH',
    stakes: '1k/2k',
    hero_position: 'UTG',
    villain_position: 'BTN',
    hero_cards: [C('K','h'), C('Q','h')],
    villain_known: true,
    villain_cards: [C('A','s'), C('A','d')],
    board: [C('A','h'), C('7','h'), C('2','h'), C('7','c'), C('T','s')],
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
    result: 'lost',
    pot_size: 403000,
    hero_pl: -200000,
    note: '플랍에 하트 3개 떴을 때 "아 오늘 좀 풀리네" 했음. KhQh로 K하이 플러시, 체크레이즈 박고 빌런이 콜. 턴 7c로 보드 페어... 이때 한 번쯤 멈췄어야 했나? 근데 셋이면 어차피 박았을 거고, AA 풀하우스 시나리오는 머릿속에 안 떠올랐음. 박고 보니 AA. 너트 플러시가 풀하우스에 뒤지는 거 직접 당해보면 멘붕임.',
  },

  // ────────────────────────────────────────────────────────────────────────────
  // 5. 폴드한 그 핸드, 리버는 스트레이트 플러시였다 (드라마, 억울)
  //    히어로 = UTG 8h7h, 빌런 = BB KcJc 블러프
  {
    played_at: '2026-05-03T21:15:00+09:00',
    game_type: 'NLH',
    stakes: '1k/2k',
    hero_position: 'UTG',
    villain_position: 'BB',
    hero_cards: [C('8','h'), C('7','h')],
    villain_known: true,
    villain_cards: [C('K','c'), C('J','c')],
    board: [C('6','h'), C('5','h'), C('4','c'), C('4','h'), C('9','h')],
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
    result: 'folded',
    pot_size: 64000,
    hero_pl: -36000,
    note: '플랍 65하트하트 4클로버. 8h7h로 스트레이트 + 플러시 드로우 들고 c-bet, 빌런이 체크레이즈 박길래 셋이나 콤보드로 의심하면서 콜. 턴에 4하트 붙었는데 빌런이 풀팟 올인 165k. 보드 페어돼서 풀하우스나 쿼즈 시나리오가 무서워서 "아 이건 너무 큰데..." 하면서 30초 고민하다 폴드. 그리고 다음 카드 딜러가 까는데... 9하트. 스트레이트 플러시. 빌런이 그제서야 KcJc 까더라. 완전 블러프였음. 리버 9하트 봤을 때 펍에서 나가고 싶었음.',
  },

  // ────────────────────────────────────────────────────────────────────────────
  // 6. 셋 vs 너트 플러시... 리버 보드페어 역전 (드라마)
  //    3-way: hero CO 99, villain1 BTN AsKs (플러시), villain2 SB 폴드(생략)
  {
    played_at: '2026-05-04T20:40:00+09:00',
    game_type: 'NLH',
    stakes: '1k/2k',
    hero_position: 'CO',
    villain_position: 'BTN',
    hero_cards: [C('9','c'), C('9','h')],
    villain_known: true,
    villain_cards: [C('A','s'), C('K','s')],
    board: [C('9','d'), C('6','s'), C('4','s'), C('7','s'), C('6','h')],
    actions: [
      { street: 'preflop', actor: 'hero', action: 'raise', amount: 5000 },
      { street: 'preflop', actor: 'villain', action: 'raise', amount: 16000 },
      { street: 'preflop', actor: 'hero', action: 'call', amount: 16000 },
      { street: 'flop', actor: 'hero', action: 'check' },
      { street: 'flop', actor: 'villain', action: 'bet', amount: 18000 },
      { street: 'flop', actor: 'hero', action: 'raise', amount: 54000 },
      { street: 'flop', actor: 'villain', action: 'call', amount: 54000 },
      { street: 'turn', actor: 'hero', action: 'check' },
      { street: 'turn', actor: 'villain', action: 'bet', amount: 80000 },
      { street: 'turn', actor: 'hero', action: 'call', amount: 80000 },
      { street: 'river', actor: 'hero', action: 'allin', amount: 50000 },
      { street: 'river', actor: 'villain', action: 'call', amount: 50000 },
    ],
    result: 'won',
    pot_size: 446000,
    hero_pl: 200000,
    note: '플랍 9d6s4s 3way에서 탑셋 박았는데 BTN이 콜. 턴 7s 떨어지자마자 빌런이 풀팟. 아 셋 vs 너트 플러시 클래식이구나 하면서 머리 식음. 리버에 카드 까기 전에 "보드페어 한 번만"이라고 빌었는데 진짜 6h 떨어짐. 풀하우스. 리버 올인 박으니 빌런이 1초도 안 고민하고 콜. AsKs 너트 플러시였음. 펍에서 박수받음. 이런 핸드 평생 한 번 있을까.',
  },

  // ────────────────────────────────────────────────────────────────────────────
  // 7. KK가 AA를 만났는데... 플랍 K, 리버 K (드라마)
  //    hero CO KK, villain BTN AA
  {
    played_at: '2026-05-05T22:00:00+09:00',
    game_type: 'NLH',
    stakes: '1k/2k',
    hero_position: 'CO',
    villain_position: 'BTN',
    hero_cards: [C('K','s'), C('K','c')],
    villain_known: true,
    villain_cards: [C('A','h'), C('A','d')],
    board: [C('K','h'), C('7','d'), C('3','c'), C('9','s'), C('K','d')],
    actions: [
      { street: 'preflop', actor: 'hero', action: 'raise', amount: 5000 },
      { street: 'preflop', actor: 'villain', action: 'raise', amount: 16000 },
      { street: 'preflop', actor: 'hero', action: 'raise', amount: 40000 },
      { street: 'preflop', actor: 'villain', action: 'allin', amount: 200000 },
      { street: 'preflop', actor: 'hero', action: 'call', amount: 200000 },
    ],
    result: 'won',
    pot_size: 402000,
    hero_pl: 200000,
    note: 'KK로 4벳 박았는데 빌런이 5벳 올인. 콜하면서도 "아 이건 AA겠다... 200k 날렸다" 생각함. 카드 까니까 진짜 AA. 멘붕. 근데 플랍 K 떨어지는 순간 펍 전체가 "오오오"했고, 리버 K 떨어지자마자 모두 박장대소. AA가 KKKK한테 진 거 보고 빌런이 자리에서 안 일어났음. 평생 한 번 있을까 말까한 핸드. 미안하다고 말하고 싶었는데 입꼬리 안 내려와서 못 함.',
  },
];

// ── INSERT ──────────────────────────────────────────────────────────────────

const rows = HANDS.map(h => ({
  user_id: USER_ID,
  session_id: null,
  played_at: h.played_at,
  game_type: h.game_type,
  stakes: h.stakes,
  hero_position: h.hero_position,
  villain_position: h.villain_position,
  hero_cards: h.hero_cards,
  villain_known: h.villain_known,
  villain_cards: h.villain_cards,
  board: h.board,
  actions: h.actions,
  result: h.result,
  pot_size: h.pot_size,
  hero_pl: h.hero_pl,
  note: h.note,
  raw_voice_text: null,
  review_status: 'none',
  review: null,
  reviewed_at: null,
  review_model: null,
  share_id: null,
  is_public: false,
}));

console.log(`📤 ${rows.length}개 핸드 INSERT 시작...`);

const { data, error } = await supabase.from('hands').insert(rows).select('id, played_at');
if (error) {
  console.error('❌ INSERT 실패:', error);
  process.exit(1);
}

console.log(`\n✅ ${data.length}개 핸드 시드 완료!`);
data.forEach((h, i) => {
  const date = new Date(h.played_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  console.log(`  ${i + 1}. ${date} — ${h.id}`);
});
console.log(`\n📱 앱에서 yeodoglb@gmail.com 로그인 → 핸드 목록에서 확인`);

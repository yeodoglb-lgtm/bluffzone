// 어드민 계정에 테스트 핸드 1개 삽입 (오늘 날짜)
//
// 핸드 시나리오: 셋 오버 셋 쿨러 + 멀티 액션 (3-bet 팟 후 플랍 올인)
// 검증 포인트:
//   1. AI가 히어로/빌런 액션 정확히 구분 (★히어로 라벨 작동)
//   2. 빌런 카드 공개 → 쿨러 인식 (규칙 ⑮)
//   3. 'allin' / 'call' 정확히 구분 (히어로 콜을 폴드로 잘못 표현 X)
//   4. amount=BY-amount 의미 일관 (팟 계산 정확)
//
// 사용:
//   $env:SUPABASE_SERVICE_ROLE_KEY = "..."
//   node scripts/insert-test-hand.mjs

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(
  'https://chxcayaehgwqrpjuajqx.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

// 1) 어드민 user_id 찾기
const { data: admin, error: adminErr } = await sb
  .from('profiles')
  .select('id, display_name')
  .eq('role', 'admin')
  .limit(1)
  .single();

if (adminErr || !admin) {
  console.error('❌ 어드민 계정 못 찾음:', adminErr);
  process.exit(1);
}
console.log(`[ADMIN] ${admin.display_name ?? '(이름없음)'} → ${admin.id}`);

// 2) 테스트 핸드 페이로드 — 클래식 셋 오버 셋 쿨러
//    히어로: 8c8d (BTN), 빌런: TsTd (CO), 보드: 8s Tc 5d → 2h → 7s
//    프리플랍: CO 오픈 5만, BTN 콜
//    플랍 (8sTc5d): CO 체크, BTN 6만 벳 (셋 8s), CO 올인 40만 (셋 TT, hero보다 큼!), BTN 콜 34만 → SHOWDOWN
//    히어로는 풀하우스 잡으려고 콜했지만 빌런이 더 큰 셋 → 히어로 패배 (쿨러)

const heroCards = [
  { rank: '8', suit: '♣' },
  { rank: '8', suit: '♦' },
];
const villainCards = [
  { rank: 'T', suit: '♠' },
  { rank: 'T', suit: '♦' },
];
const board = [
  { rank: '8', suit: '♠' },
  { rank: 'T', suit: '♣' },
  { rank: '5', suit: '♦' },
  { rank: '2', suit: '♥' },
  { rank: '7', suit: '♠' },
];

const actions = [
  // 프리플랍
  { street: 'preflop', actor: '빌런 1', action: 'raise', amount: 50000 },
  { street: 'preflop', actor: '나', action: 'call', amount: 50000 },
  // 플랍 8s Tc 5d — 히어로는 셋 8s, 빌런은 더 높은 셋 TT
  { street: 'flop', actor: '빌런 1', action: 'check' },
  { street: 'flop', actor: '나', action: 'bet', amount: 60000 },
  { street: 'flop', actor: '빌런 1', action: 'allin', amount: 400000 },
  { street: 'flop', actor: '나', action: 'call', amount: 340000 },
  // 턴/리버는 자동 진행 (양쪽 올인+콜)
];

// 팟 계산 (BY-amount 합산):
//  preflop: 50000 + 50000 = 100000
//  flop: 60000 + 400000 + 340000 = 800000
//  total: 900000

const today = new Date().toISOString();

const handPayload = {
  user_id: admin.id,
  played_at: today,
  game_type: 'NLH',
  stakes: '1k/2k 캐쉬 (테스트)',
  hero_position: 'BTN',
  villain_position: 'CO',
  villain_known: true,
  villain_cards: villainCards,
  villain_data: [
    { pos: 'CO', cards: villainCards, cardsKnown: true, name: '빌런 1' },
  ],
  hero_cards: heroCards,
  board,
  actions,
  result: 'lost',
  pot_size: 900000,
  hero_pl: -400000,  // 자기 스택 40만 다 잃음 (allin call)
  preflop_aggressor: 'CO',
  effective_stack: 400000,
  villain_type: 'TAG',
  is_tournament: false,
  sb_chips: null,
  bb_chips: null,
  ante_chips: null,
  note: '[테스트 핸드] 셋 오버 셋 쿨러 — AI가 쿨러 인식, 히어로 콜을 폴드로 잘못 적지 않는지 검증',
  raw_voice_text: null,
  review_status: 'none',
  review: null,
  reviewed_at: null,
  review_model: null,
  share_id: null,
  is_public: false,
};

const { data: hand, error: handErr } = await sb
  .from('hands')
  .insert(handPayload)
  .select()
  .single();

if (handErr) {
  console.error('❌ 핸드 삽입 실패:', handErr);
  process.exit(1);
}

console.log('\n✅ 테스트 핸드 등록 완료');
console.log('   핸드 ID:', hand.id);
console.log('   날짜:', hand.played_at);
console.log('   결과: 패배 (-40만원)');
console.log('\n📝 시나리오: BTN 88 (셋 8s) vs CO TT (셋 T) — 보드 8sTc5d');
console.log('   프리플랍: CO 오픈 5만, BTN 콜');
console.log('   플랍: CO 체크, BTN 6만 벳, CO 올인 40만, BTN 콜 34만');
console.log('   결과: 셋 오버 셋 쿨러 — 히어로 패배');
console.log('\n🧪 검증 포인트:');
console.log('   1. actual_line: "콜(프리플랍) → 벳 6만 → 콜 34만" 정확히');
console.log('   2. mistake: "실수 없음" 또는 "쿨러"로 적기 (밸류 손실 X)');
console.log('   3. 헤드라인: "셋 오버 셋 쿨러" 또는 비슷한 톤');
console.log('   4. ev_note: 콜다운으로 손실 회피 못 함, 어쩔 수 없음 톤');
console.log('   5. 빌런 카드 TT 인지 → 쿨러 인식');
console.log(`\n→ 앱에서 핸드 ID ${hand.id} 열고 "리뷰 요청" 클릭하세요`);

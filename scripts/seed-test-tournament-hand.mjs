// 토너 테스트 핸드 1개 시드 (yeodoglb@gmail.com 계정, 2026-04-29)
// 시나리오: BTN 12bb A5s 푸시 vs BB K9o 콜 → BB 승

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://chxcayaehgwqrpjuajqx.supabase.co';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!KEY) { console.error('❌ SUPABASE_SERVICE_ROLE_KEY 필요'); process.exit(1); }
const USER_ID = '4dd74940-ddfa-4b80-aed6-38decd6ad829';
const supabase = createClient(SUPABASE_URL, KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const C = (rank, suit) => ({ rank, suit });

const hand = {
  user_id: USER_ID,
  session_id: null,
  played_at: '2026-04-29T22:30:00+09:00',
  game_type: 'NLH',
  stakes: '1000/2000', // 토너 블라인드 (참고용)
  hero_position: 'BTN',
  villain_position: 'BB',
  hero_cards: [C('A','s'), C('5','s')],
  villain_known: true,
  villain_cards: [C('K','h'), C('9','h')],
  board: [C('K','c'), C('8','d'), C('4','c'), C('7','h'), C('2','s')],
  actions: [
    { street: 'preflop', actor: 'hero', action: 'allin', amount: 24000 },
    { street: 'preflop', actor: 'villain', action: 'call', amount: 22000 }, // BB는 이미 2000 포스트
  ],
  result: 'lost',
  pot_size: 49600,
  hero_pl: -24000,
  note: '토너 8명 남은 상황(상위 3명 입상). 12bb로 BTN에서 A5s 푸시. BB가 K9o로 콜해서 K페어로 졌다. 미니멈 캐시 못 봐서 멘붕.',
  raw_voice_text: null,
  review_status: 'none',
  review: null,
  reviewed_at: null,
  review_model: null,
  share_id: null,
  is_public: false,
  // ★ 토너 컨텍스트
  is_tournament: true,
  sb_chips: 1000,
  bb_chips: 2000,
  ante_chips: 200,
  effective_stack: 24000,
  preflop_aggressor: 'hero',
  villain_type: '루즈-패시브(LP)',
};

const { data, error } = await supabase.from('hands').insert(hand).select('id').single();
if (error) { console.error('❌ INSERT 실패:', error); process.exit(1); }
console.log(`✅ 토너 테스트 핸드 시드 완료!`);
console.log(`   ID: ${data.id}`);
console.log(`   날짜: 2026-04-29 22:30`);
console.log(`   시나리오: BTN 12bb A5s 푸시 vs BB K9o (BB 승)`);
console.log(`   스택: 24,000 칩 ÷ BB 2,000 = 12bb (푸시폴드 영역)`);
console.log(`\n📱 앱에서 yeodoglb@gmail.com 로그인 → 핸드 기록 → 4/29 핸드 → 리뷰 요청`);
console.log(`   AI가 다음을 언급해야 정상:`);
console.log(`   - 12bb 단스택 / 푸시폴드 차트 기준`);
console.log(`   - ICM 압박 (상위 3명 입상 = 버블)`);
console.log(`   - A5s BTN 12bb는 차트상 PUSH`);

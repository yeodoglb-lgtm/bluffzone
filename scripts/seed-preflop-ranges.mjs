// 프리플랍 차트 시드 (6-max 캐시 100bb)
// 시나리오: open (RFI), 3bet (vs open), call (vs open)

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://chxcayaehgwqrpjuajqx.supabase.co';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!KEY) { console.error('❌ SUPABASE_SERVICE_ROLE_KEY 필요'); process.exit(1); }
const supabase = createClient(SUPABASE_URL, KEY, { auth: { autoRefreshToken: false, persistSession: false } });

// ─── 169 핸드 + range 펼치기 (pushfold seed와 동일 로직) ────────────────────
const RANKS = ['A','K','Q','J','T','9','8','7','6','5','4','3','2'];
const RANK_VAL = Object.fromEntries(RANKS.map((r,i) => [r, 13-i]));

function allHands() {
  const hands = [];
  for (let i = 0; i < 13; i++) {
    for (let j = 0; j < 13; j++) {
      const r1 = RANKS[i], r2 = RANKS[j];
      if (i === j) hands.push(r1 + r2);
      else if (i < j) hands.push(r1 + r2 + 's');
      else hands.push(r2 + r1 + 'o');
    }
  }
  return hands;
}

function expandRange(rangeStr) {
  const set = new Set();
  if (!rangeStr || !rangeStr.trim()) return set;
  for (const tokenRaw of rangeStr.split(',')) {
    const token = tokenRaw.trim();
    if (!token) continue;
    const plus = token.endsWith('+');
    const t = plus ? token.slice(0, -1) : token;
    if (t.length === 2 && t[0] === t[1]) {
      const r = t[0]; const idx = RANK_VAL[r];
      if (plus) for (let v = idx; v <= 13; v++) set.add(RANKS[13-v] + RANKS[13-v]);
      else set.add(r + r);
      continue;
    }
    if (t.length === 2 && t[0] !== t[1]) {
      const r1 = t[0], r2 = t[1];
      const v1 = RANK_VAL[r1], v2 = RANK_VAL[r2];
      if (plus) for (let v = v2; v < v1; v++) { set.add(r1 + RANKS[13-v] + 's'); set.add(r1 + RANKS[13-v] + 'o'); }
      else { set.add(r1 + r2 + 's'); set.add(r1 + r2 + 'o'); }
      continue;
    }
    if (t.length === 3) {
      const r1 = t[0], r2 = t[1], so = t[2];
      const v1 = RANK_VAL[r1], v2 = RANK_VAL[r2];
      if (plus) for (let v = v2; v < v1; v++) set.add(r1 + RANKS[13-v] + so);
      else set.add(t);
      continue;
    }
    console.warn('⚠️ 알 수 없는 토큰:', token);
  }
  return set;
}

// ─── 레인지 정의 (6-max 100bb, GTO 표준에 가깝게 단순화) ──────────────────

// OPEN (RFI): 폴드되어 자기 차례에 처음 오픈
const OPEN_RANGES = {
  UTG:  '22+, ATs+, AJo+, KQs, KJs, QJs, JTs, T9s, 98s, 87s',
  MP:   '22+, A8s+, ATo+, K9s+, KJo+, Q9s+, QJo, J9s+, JTo, T9s, 98s, 87s, 76s',
  CO:   '22+, A2s+, A8o+, K6s+, KTo+, Q8s+, QJo, J7s+, JTo, T8s+, 97s+, 87s, 76s, 65s, 54s',
  BTN:  '22+, A2+, K2s+, K6o+, Q4s+, Q8o+, J6s+, J8o+, T6s+, T8o+, 95s+, 97o+, 84s+, 87o, 74s+, 76o, 64s+, 53s+, 43s, 32s',
  SB:   '22+, A2+, K2s+, K7o+, Q5s+, Q9o+, J7s+, J9o+, T7s+, T9o, 97s+, 87s, 76s, 65s, 54s',
  BB:   '', // BB는 RFI 시나리오 거의 없음 (folded to BB는 walk)
};

// 3BET (vs earlier open): 누가 어떤 위치에서 오픈해도 통용되는 일반 레인지
const THREEBET_RANGES = {
  UTG:  'QQ+, AKs, AKo, A5s', // UTG는 거의 4벳뿐, 3벳 매우 드뭄
  MP:   'JJ+, AQs+, AKo, A5s, A4s',
  CO:   'TT+, AJs+, KQs, AQo+, A5s, A4s, A3s',
  BTN:  '99+, ATs+, KQs, AJo+, A5s, A4s, A3s, A2s, KTs',
  SB:   'TT+, AQs+, AKo, A5s, A4s, KQs',
  BB:   '99+, AJs+, AQo+, A5s, A4s, A3s, KQs, KJs',
};

// CALL (cold-call vs open): 콜드콜 (3벳 안 하고 콜)
const CALL_RANGES = {
  UTG:  '', // UTG는 콜드콜 거의 없음 (오픈 또는 폴드)
  MP:   '66, 77, 88, 99, AJs, ATs, KQs, KJs, QJs, JTs, T9s',
  CO:   '66, 77, 88, 99, TT, A8s, A9s, ATs, AJs, KTs+, QTs+, JTs, T9s, 98s, 87s, 76s',
  BTN:  '22+, A2s, A3s, A4s, A5s, A6s, A7s, A8s, A9o, ATo, K9s, KTs, KJo, Q9s, QTs, J9s+, JTo, T9s, 98s, 87s, 76s, 65s, 54s',
  SB:   '', // SB는 보통 3벳 or 폴드 (콜드콜 매우 드뭄)
  BB:   '22+, A2+, K2s+, K9o+, Q5s+, Q9o+, J7s+, J9o+, T7s+, T9o, 96s+, 86s+, 75s+, 65s, 54s', // BB defend 매우 와이드
};

const ALL_HANDS = allHands();
const POSITIONS = ['UTG','MP','CO','BTN','SB','BB'];
const SCENARIOS = ['open', '3bet', 'call'];

const RANGE_MAP = {
  open: OPEN_RANGES,
  '3bet': THREEBET_RANGES,
  call: CALL_RANGES,
};

const rows = [];
for (const pos of POSITIONS) {
  for (const sc of SCENARIOS) {
    const rangeStr = RANGE_MAP[sc][pos] ?? '';
    const set = expandRange(rangeStr);
    const action = sc === 'call' ? 'call' : 'raise';
    for (const hand of ALL_HANDS) {
      rows.push({
        position: pos,
        scenario: sc,
        hand,
        action: set.has(hand) ? action : 'fold',
        frequency: set.has(hand) ? 1 : 0,
      });
    }
  }
}

console.log(`📊 ${POSITIONS.length}포지션 × ${SCENARIOS.length}시나리오 × ${ALL_HANDS.length}핸드 = ${rows.length} rows 생성`);

console.log('🗑️  기존 preflop_ranges 데이터 삭제...');
const { error: delErr } = await supabase.from('preflop_ranges').delete().neq('id', -1);
if (delErr) { console.error('❌ 삭제 실패:', delErr); process.exit(1); }

console.log(`📤 INSERT 시작 (배치 500개씩)...`);
const BATCH = 500;
let inserted = 0;
for (let i = 0; i < rows.length; i += BATCH) {
  const batch = rows.slice(i, i + BATCH);
  const { error } = await supabase.from('preflop_ranges').insert(batch);
  if (error) { console.error(`❌ batch ${i} 실패:`, error); process.exit(1); }
  inserted += batch.length;
  process.stdout.write(`\r   ${inserted}/${rows.length}`);
}
console.log(`\n\n✅ ${inserted}개 행 시드 완료!`);

// 검증 샘플
const { data: sample } = await supabase
  .from('preflop_ranges')
  .select('hand')
  .eq('position', 'BTN')
  .eq('scenario', 'open')
  .eq('action', 'raise')
  .limit(15);
console.log(`\n샘플 (BTN open raise):`, sample?.map(r => r.hand).join(', '));

// 푸시/폴드 차트 시드 (Nash equilibrium 기반)
//
// 실행:
//   SUPABASE_SERVICE_ROLE_KEY="eyJ..." node scripts/seed-pushfold-charts.mjs
//
// 데이터 출처: HRC(Holdem Resources) Nash 차트, ICMIZER 무료 차트, 종합 큐레이션
// 포지션 9: UTG, UTG+1, MP, HJ, CO, BTN, SB
// 스택 7개: 5, 8, 10, 12, 15, 20, 25 (bb)

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://chxcayaehgwqrpjuajqx.supabase.co';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!KEY) { console.error('❌ SUPABASE_SERVICE_ROLE_KEY 필요'); process.exit(1); }
const supabase = createClient(SUPABASE_URL, KEY, { auth: { autoRefreshToken: false, persistSession: false } });

// ─── 169 핸드 전체 목록 생성 ────────────────────────────────────────────────
const RANKS = ['A','K','Q','J','T','9','8','7','6','5','4','3','2'];
const RANK_VAL = Object.fromEntries(RANKS.map((r,i) => [r, 13-i])); // A=13, 2=1

function allHands() {
  const hands = [];
  for (let i = 0; i < 13; i++) {
    for (let j = 0; j < 13; j++) {
      const r1 = RANKS[i], r2 = RANKS[j];
      if (i === j) hands.push(r1 + r2);                   // pair
      else if (i < j) hands.push(r1 + r2 + 's');          // suited
      else hands.push(r2 + r1 + 'o');                      // offsuit
    }
  }
  return hands;  // 169
}

// ─── range 표기 → 핸드 set 펼치기 ───────────────────────────────────────────
// 지원 표기: "22+", "A2s+", "A5o+", "K9s+", "KTo+", "QJs", "76s", "AA"
function expandRange(rangeStr) {
  const set = new Set();
  if (!rangeStr || !rangeStr.trim()) return set;

  for (const tokenRaw of rangeStr.split(',')) {
    const token = tokenRaw.trim();
    if (!token) continue;

    const plus = token.endsWith('+');
    const t = plus ? token.slice(0, -1) : token;

    // pair
    if (t.length === 2 && t[0] === t[1]) {
      const r = t[0];
      const idx = RANK_VAL[r];
      if (plus) {
        // 22+ → 22, 33, ..., AA
        for (let v = idx; v <= 13; v++) {
          const rr = RANKS[13 - v];
          set.add(rr + rr);
        }
      } else {
        set.add(r + r);
      }
      continue;
    }

    // 2글자 (s/o 표기 없음) = suited + offsuit 둘 다
    // 예: "A2+" = A2s+, A2o+ 둘 다 / "K9" = K9s, K9o 둘 다
    if (t.length === 2 && t[0] !== t[1]) {
      const r1 = t[0], r2 = t[1];
      const v1 = RANK_VAL[r1], v2 = RANK_VAL[r2];
      if (plus) {
        for (let v = v2; v < v1; v++) {
          const rr2 = RANKS[13 - v];
          set.add(r1 + rr2 + 's');
          set.add(r1 + rr2 + 'o');
        }
      } else {
        set.add(r1 + r2 + 's');
        set.add(r1 + r2 + 'o');
      }
      continue;
    }

    // suited / offsuit
    if (t.length === 3) {
      const r1 = t[0], r2 = t[1], so = t[2];
      const v1 = RANK_VAL[r1], v2 = RANK_VAL[r2];
      if (plus) {
        // A2s+ → A2s, A3s, ..., AKs (kicker 올라감)
        for (let v = v2; v < v1; v++) {
          const rr2 = RANKS[13 - v];
          set.add(r1 + rr2 + so);
        }
      } else {
        set.add(t);
      }
      continue;
    }

    console.warn('⚠️ 알 수 없는 토큰:', token);
  }
  return set;
}

// ─── Nash 푸시 레인지 (포지션 × 스택) ───────────────────────────────────────
// 데이터: HRC, ICMIZER, Sklansky-Chubukov 종합. 9-max 토너 기준.
// 더 타이트한 스팟(앞쪽 포지션)부터 점점 루즈하게 (뒤쪽 포지션).
const PUSH_RANGES = {
  // ─ UTG (9-max)
  'UTG': {
    5:  '22+, A2s+, A2o+, K2s+, K7o+, Q7s+, QTo+, J9s+, T9s',
    8:  '22+, A2s+, A8o+, K9s+, KJo+, QTs+, QJo, JTs',
    10: '33+, A7s+, A9o+, KTs+, KQo, QJs',
    12: '55+, A9s+, ATo+, KJs+, KQo',
    15: '66+, ATs+, AJo+, KQs',
    20: '77+, AJs+, AQo+, KQs',
    25: '88+, AQs+, AKo, AKs',
  },
  // ─ UTG+1
  'UTG+1': {
    5:  '22+, A2+, K2s+, K5o+, Q5s+, Q9o+, J7s+, J9o+, T8s+, T9o, 97s+, 87s',
    8:  '22+, A2s+, A6o+, K8s+, KTo+, Q9s+, QJo, JTs',
    10: '22+, A4s+, A8o+, K9s+, KJo+, QTs+, JTs',
    12: '33+, A6s+, A9o+, KTs+, KQo, QJs',
    15: '44+, A8s+, ATo+, KJs+, KQo',
    20: '66+, ATs+, AJo+, KQs',
    25: '77+, AJs+, AQo+, KQs',
  },
  // ─ MP
  'MP': {
    5:  '22+, A2+, K2+, Q2s+, Q6o+, J4s+, J8o+, T6s+, T8o+, 96s+, 87s, 86s',
    8:  '22+, A2s+, A4o+, K6s+, K9o+, Q8s+, QTo+, J9s+, T9s',
    10: '22+, A2s+, A6o+, K8s+, KTo+, Q9s+, QJo, JTs',
    12: '22+, A3s+, A8o+, K9s+, KJo+, QTs+, JTs',
    15: '33+, A6s+, A9o+, KTs+, KQo, QJs',
    20: '55+, A9s+, AJo+, KJs+',
    25: '66+, ATs+, AQo+, KQs',
  },
  // ─ HJ
  'HJ': {
    5:  '22+, A2+, K2+, Q2+, J2s+, J6o+, T4s+, T7o+, 95s+, 97o+, 86s+, 87o, 75s+, 65s, 54s',
    8:  '22+, A2+, K3s+, K8o+, Q7s+, Q9o+, J8s+, J9o+, T8s+, T9o, 97s+, 87s',
    10: '22+, A2s+, A4o+, K6s+, K9o+, Q8s+, QTo+, J9s+, JTo, T9s',
    12: '22+, A2s+, A7o+, K8s+, KTo+, Q9s+, QJo, JTs',
    15: '22+, A4s+, A8o+, K9s+, KJo+, QTs+, JTs',
    20: '33+, A7s+, ATo+, KTs+, KQo, QJs',
    25: '55+, A9s+, AJo+, KJs+, KQo',
  },
  // ─ CO
  'CO': {
    5:  '22+, A2+, K2+, Q2+, J2+, T2s+, T6o+, 94s+, 96o+, 84s+, 86o+, 73s+, 75o+, 63s+, 53s+, 43s',
    8:  '22+, A2+, K2s+, K6o+, Q5s+, Q9o+, J7s+, J9o+, T7s+, T9o, 97s+, 87s, 76s',
    10: '22+, A2+, K4s+, K8o+, Q7s+, Q9o+, J8s+, J9o+, T8s+, T9o, 98s',
    12: '22+, A2s+, A5o+, K7s+, K9o+, Q8s+, QTo+, J9s+, JTo, T9s',
    15: '22+, A2s+, A7o+, K9s+, KTo+, Q9s+, QJo, JTs',
    20: '22+, A4s+, A9o+, KTs+, KQo, QJs',
    25: '33+, A7s+, ATo+, KJs+, KQo',
  },
  // ─ BTN
  'BTN': {
    5:  '22+, A2+, K2+, Q2+, J2+, T2+, 92s+, 95o+, 82s+, 85o+, 72s+, 74o+, 62s+, 64o+, 52s+, 54o, 42s+, 32s',
    8:  '22+, A2+, K2+, Q3s+, Q7o+, J5s+, J8o+, T6s+, T8o+, 95s+, 97o+, 85s+, 87o, 75s+, 64s+, 54s',
    10: '22+, A2+, K3s+, K7o+, Q6s+, Q9o+, J7s+, J9o+, T7s+, T9o, 97s+, 87s, 76s, 65s',
    12: '22+, A2+, K5s+, K8o+, Q7s+, Q9o+, J8s+, J9o+, T8s+, T9o, 98s, 87s',
    15: '22+, A2s+, A4o+, K7s+, K9o+, Q8s+, QTo+, J9s+, JTo, T9s',
    20: '22+, A2s+, A8o+, K9s+, KJo+, QTs+, JTs',
    25: '22+, A5s+, A9o+, KTs+, KQo, QJs',
  },
  // ─ SB
  'SB': {
    5:  '22+, A2+, K2+, Q2+, J2+, T2+, 92+, 82s+, 85o+, 72s+, 74o+, 62s+, 64o+, 52s+, 54o, 42s+, 43o, 32s',
    8:  '22+, A2+, K2+, Q2+, J3s+, J7o+, T5s+, T7o+, 94s+, 97o+, 84s+, 87o, 74s+, 64s+, 53s+, 43s',
    10: '22+, A2+, K2+, Q3s+, Q7o+, J5s+, J8o+, T6s+, T8o+, 95s+, 97o+, 85s+, 87o, 75s+, 65s, 54s',
    12: '22+, A2+, K2+, Q5s+, Q8o+, J6s+, J9o+, T7s+, T9o, 97s+, 87s, 76s, 65s',
    15: '22+, A2+, K3s+, K7o+, Q7s+, Q9o+, J7s+, J9o+, T8s+, T9o, 98s, 87s',
    20: '22+, A2s+, A5o+, K7s+, K9o+, Q8s+, QTo+, J9s+, T9s',
    25: '22+, A2s+, A8o+, K9s+, KJo+, QTs+, JTs',
  },
};

const ALL_HANDS = allHands();
const STACKS = [5, 8, 10, 12, 15, 20, 25];
const POSITIONS = Object.keys(PUSH_RANGES);

const rows = [];
for (const pos of POSITIONS) {
  for (const stack of STACKS) {
    const rangeStr = PUSH_RANGES[pos][stack];
    const pushSet = expandRange(rangeStr);
    for (const hand of ALL_HANDS) {
      rows.push({
        position: pos,
        stack_bb: stack,
        hand,
        action: pushSet.has(hand) ? 'push' : 'fold',
      });
    }
  }
}

console.log(`📊 ${POSITIONS.length}포지션 × ${STACKS.length}스택 × 169핸드 = ${rows.length} rows 생성`);

// ─── 기존 데이터 삭제 후 INSERT ────────────────────────────────────────────
console.log('🗑️  기존 pushfold_charts 데이터 삭제...');
const { error: delErr } = await supabase.from('pushfold_charts').delete().neq('id', -1);
if (delErr) { console.error('❌ 삭제 실패:', delErr); process.exit(1); }

console.log(`📤 INSERT 시작 (배치 500개씩)...`);
const BATCH = 500;
let inserted = 0;
for (let i = 0; i < rows.length; i += BATCH) {
  const batch = rows.slice(i, i + BATCH);
  const { error } = await supabase.from('pushfold_charts').insert(batch);
  if (error) { console.error(`❌ batch ${i} 실패:`, error); process.exit(1); }
  inserted += batch.length;
  process.stdout.write(`\r   ${inserted}/${rows.length}`);
}
console.log(`\n\n✅ ${inserted}개 행 시드 완료!`);

// ─── 검증: 샘플 조회 ────────────────────────────────────────────────────────
const { data: sample, error: sErr } = await supabase
  .from('pushfold_charts')
  .select('*')
  .eq('position', 'BTN')
  .eq('stack_bb', 10)
  .eq('action', 'push')
  .limit(5);
if (sErr) console.error('샘플 조회 실패:', sErr);
else console.log(`\n샘플 (BTN 10bb push):`, sample.map(r => r.hand).join(', '), '...');

// raise/bet/call/allin 액션에 amount가 없는 행 찾아서 fix
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { createClient } = require('@supabase/supabase-js');

const sb = createClient('https://chxcayaehgwqrpjuajqx.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const USER_ID = '4dd74940-ddfa-4b80-aed6-38decd6ad829';
const NEEDS_AMOUNT = ['raise', 'bet', 'call', 'allin'];

const { data: hands } = await sb.from('hands')
  .select('id, played_at, actions, hero_position, villain_position')
  .eq('user_id', USER_ID)
  .gte('played_at', '2026-04-29T00:00:00+09:00')
  .lt('played_at', '2026-07-28T00:00:00+09:00');

let fixedCount = 0;
let brokenCount = 0;

for (const hand of hands) {
  const actions = hand.actions ?? [];
  let needsFix = false;
  const fixed = actions.map((a, i) => {
    if (!NEEDS_AMOUNT.includes(a.action)) return a;
    if (a.amount != null && Number.isFinite(Number(a.amount))) return a;

    needsFix = true;
    // amount 없으면: 같은 스트리트 직전 베팅 액션 amount 가져옴 (call이면 그 값, raise/bet은 그것의 2~3배)
    let prevAmount = 0;
    for (let j = i - 1; j >= 0; j--) {
      const p = actions[j];
      if (p.street !== a.street) break;
      if (p.amount != null && Number.isFinite(Number(p.amount))) {
        prevAmount = Number(p.amount);
        break;
      }
    }
    let inferred = prevAmount;
    if (a.action === 'raise') inferred = Math.max(prevAmount * 2.5, 1000);
    else if (a.action === 'bet') inferred = Math.max(prevAmount * 0.7, 1000);
    else if (a.action === 'call') inferred = prevAmount;
    else if (a.action === 'allin') inferred = Math.max(prevAmount * 2, 1000);

    return { ...a, amount: Math.round(inferred) };
  });

  if (!needsFix) continue;
  brokenCount++;
  const date = new Date(hand.played_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  console.log(`⚠️  ${date} ${hand.hero_position} vs ${hand.villain_position}`);
  actions.forEach((a, i) => {
    if (NEEDS_AMOUNT.includes(a.action) && (a.amount == null || !Number.isFinite(Number(a.amount)))) {
      console.log(`    ${a.street} ${a.actor} ${a.action}: (없음) → ${fixed[i].amount}`);
    }
  });

  const { error } = await sb.from('hands').update({ actions: fixed }).eq('id', hand.id);
  if (error) console.log(`  ❌ ${error.message}`);
  else fixedCount++;
}

console.log(`\n📊 총 ${hands.length}개 / 액션 amount 없는 핸드 ${brokenCount}개 / 수정 완료 ${fixedCount}개`);

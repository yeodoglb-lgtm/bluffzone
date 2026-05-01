// 종료 시각이 시작 시각보다 빠르거나 같은 세션을 일괄 +1일 처리

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { createClient } = require('@supabase/supabase-js');

const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!KEY) { console.error('❌ SUPABASE_SERVICE_ROLE_KEY 필요'); process.exit(1); }

const sb = createClient('https://chxcayaehgwqrpjuajqx.supabase.co', KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await sb.from('sessions')
  .select('id, started_at, ended_at')
  .not('started_at', 'is', null)
  .not('ended_at', 'is', null);
if (error) { console.error(error); process.exit(1); }

const broken = data.filter(s => new Date(s.ended_at) <= new Date(s.started_at));
console.log(`📋 총 세션: ${data.length} / 종료<=시작인 행: ${broken.length}`);

let fixed = 0;
for (const s of broken) {
  const ended = new Date(s.ended_at);
  ended.setDate(ended.getDate() + 1);
  const { error: e } = await sb.from('sessions')
    .update({ ended_at: ended.toISOString() })
    .eq('id', s.id);
  if (e) console.error(`  ❌ ${s.id}: ${e.message}`);
  else {
    fixed++;
    console.log(`  ✅ ${s.id.slice(0,8)}... ${s.started_at.slice(11,16)}~${s.ended_at.slice(11,16)} → +1일 처리`);
  }
}
console.log(`\n✅ ${fixed}/${broken.length}개 수정 완료`);

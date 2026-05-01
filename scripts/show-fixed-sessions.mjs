import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { createClient } = require('@supabase/supabase-js');

const sb = createClient('https://chxcayaehgwqrpjuajqx.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// 모든 세션 가져와서 prefix 매칭
const { data: allRows } = await sb.from('sessions')
  .select('id, user_id, played_on, started_at, ended_at, place_name_snapshot');

const targetPrefixes = ['091c7850', 'cfe53275'];

for (const prefix of targetPrefixes) {
  const data = allRows?.find(r => r.id.startsWith(prefix));
  if (!data) { console.log(`${prefix}: 못 찾음`); continue; }

  const { data: profile } = await sb.from('profiles')
    .select('display_name').eq('id', data.user_id).single();

  const startKst = new Date(data.started_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  const endKst = new Date(data.ended_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

  console.log(`\n📌 ${data.id}`);
  console.log(`  유저: ${profile?.display_name ?? '(닉네임 없음)'} (${data.user_id.slice(0,8)}...)`);
  console.log(`  날짜: ${data.played_on}`);
  console.log(`  장소: ${data.place_name_snapshot ?? '(미입력)'}`);
  console.log(`  시작: ${startKst}`);
  console.log(`  종료: ${endKst}`);
}

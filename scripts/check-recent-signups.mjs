// 5/1~5/3 광고 기간 동안 신규 가입자 확인

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { createClient } = require('@supabase/supabase-js');

const sb = createClient('https://chxcayaehgwqrpjuajqx.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// 광고 기간 (5/1~5/3 KST)
const start = '2026-05-01T00:00:00+09:00';
const end = '2026-05-04T00:00:00+09:00';

console.log('📊 광고 기간 (5/1~5/3) 신규 가입자 분석\n');

const { data, error } = await sb.from('profiles')
  .select('id, display_name, created_at')
  .gte('created_at', start)
  .lt('created_at', end)
  .order('created_at', { ascending: true });

if (error) { console.error(error); process.exit(1); }

console.log(`총 신규 가입: ${data?.length ?? 0}명\n`);

if (data && data.length > 0) {
  console.log('가입자 목록 (KST):');
  data.forEach((p, i) => {
    const kst = new Date(p.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
    console.log(`  ${i + 1}. ${kst} - ${p.display_name ?? '(닉네임 없음)'} (${p.id.slice(0, 8)})`);
  });
}

// 전체 가입자 수 (비교용)
const { count: totalCount } = await sb.from('profiles').select('*', { count: 'exact', head: true });
console.log(`\n전체 누적 가입자: ${totalCount}명`);

// 광고 클릭 추정 (gtag 데이터 없어서 광고 콘솔 데이터 기반)
const adClicks = 559;
const adCost = 40805;
const newSignups = data?.length ?? 0;
const conversionRate = adClicks > 0 ? (newSignups / adClicks * 100).toFixed(2) : 0;
const cpa = newSignups > 0 ? Math.round(adCost / newSignups) : null;

console.log(`\n📈 광고 효과 분석`);
console.log(`  클릭수: ${adClicks}`);
console.log(`  신규 가입자: ${newSignups}`);
console.log(`  전환율: ${conversionRate}%`);
console.log(`  가입당 비용 (CPA): ${cpa ? '₩' + cpa.toLocaleString() : '계산 불가'}`);

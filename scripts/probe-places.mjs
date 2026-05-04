import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { createClient } = require('@supabase/supabase-js');

const sb = createClient('https://chxcayaehgwqrpjuajqx.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// 다양한 컬럼명 시도
const variants = [
  { name: 'lat/lng', body: { name: '_t1', lat: 37, lng: 127 } },
  { name: 'latitude/longitude', body: { name: '_t2', latitude: 37, longitude: 127 } },
  { name: 'name only', body: { name: '_t3' } },
];

for (const v of variants) {
  const { data, error } = await sb.from('places').insert(v.body).select().single();
  console.log(`\n[${v.name}]`);
  if (error) console.log('  ❌', error.message);
  else {
    console.log('  ✅ 성공! 컬럼들:', Object.keys(data).join(', '));
    await sb.from('places').delete().eq('id', data.id);
  }
}

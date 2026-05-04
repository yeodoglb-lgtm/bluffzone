// 테스트 등록: 헤즈업 공덕점

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { createClient } = require('@supabase/supabase-js');

const sb = createClient('https://chxcayaehgwqrpjuajqx.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const place = {
  name: '헤즈업 공덕점',
  address: '서울특별시 마포구 도화길 33 4층',
  road_address: '서울특별시 마포구 도화길 33',
  lat: 37.5411361,
  lng: 126.9494463,
  phone: '010-5463-7578',
  games: ['NLH 토너먼트'],
  min_buyin: 10000,
  max_buyin: 50000,
  description: '토너먼트 / 블라인드 업 6분 / 프라이즈 50%',
  is_active: true,
  featured: false,
};

const { data, error } = await sb.from('places').insert(place).select().single();
if (error) { console.error('❌', error); process.exit(1); }

console.log('✅ 등록 완료');
console.log('   ID:', data.id);
console.log('   이름:', data.name);
console.log('   좌표:', data.lat, ',', data.lng);
console.log('   주소:', data.address);
console.log('\n📱 앱에서 확인: 플레이스 탭 → "헤즈업" 검색');

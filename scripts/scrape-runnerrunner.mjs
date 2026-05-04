// 러너러너 (runnerrunner.co.kr) 전국 펍 정보 수집
// API: /nest/pub/search (POST, JWT Bearer)
// 좌표 lat/lng 이미 포함 → 카카오 geocoding 불필요

import fs from 'node:fs/promises';

const TOKEN = process.env.RUNNERRUNNER_TOKEN;
if (!TOKEN) { console.error('❌ RUNNERRUNNER_TOKEN 환경변수 필요'); process.exit(1); }

const OUT = 'C:\\Users\\ghkdr\\OneDrive\\바탕 화면\\블러프존_펍데이터';
await fs.mkdir(OUT, { recursive: true });

console.log('📡 러너러너 전국 펍 수집...');
const res = await fetch('https://api.runnerrunner.co.kr/nest/pub/search', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
    'Origin': 'https://runnerrunner.co.kr',
    'User-Agent': 'Mozilla/5.0',
  },
  body: JSON.stringify({ lat: 36.5, lon: 127.5, km: 500, sort: 'distance' }),
});
const pubs = await res.json();
console.log(`✅ ${pubs.length}개 펍 수신\n`);

// 정리: 필요한 필드만
const cleaned = pubs.map(p => ({
  source: 'runnerrunner',
  external_id: p.id,
  name: p.pubName || p.cafeName,
  cafe_name: p.cafeName,
  address: p.newAddress,
  detail_address: p.detailAddress,
  phone: p.phoneNumber || p.vcn,
  vcn: p.vcn,
  lat: p.lat,
  lon: p.lon,
  game_types: p.gameTypes,  // ['TOURNAMENT', 'OTHER_GAME']
  buyin: p.buyIn,
  buyin_max: p.buyInMax,
  blind_up: p.blindUp,
  blind_up_max: p.blindUpMax,
  prize: p.prize,
  prize_max: p.prizeMax,
  pub_type: p.pubType,
  images: (p.images ?? []).map(i => i.imageUrl),
  area_province_id: p.areaProvinceId,
  area_city_id: p.areaCityId,
  like_count: p.likeCount,
  review_count: p.reviewCount,
}));

const jsonPath = `${OUT}\\runnerrunner-pubs.json`;
await fs.writeFile(jsonPath, JSON.stringify(cleaned, null, 2), 'utf-8');

const csv = [
  ['펍명','카페명','주소','상세주소','전화','lat','lon','게임','바이인','바이인최대','블라인드업(분)','프라이즈%','펍타입'].join(','),
  ...cleaned.map(p => [
    `"${p.name ?? ''}"`,
    `"${p.cafe_name ?? ''}"`,
    `"${p.address ?? ''}"`,
    `"${p.detail_address ?? ''}"`,
    p.phone ?? '',
    p.lat ?? '',
    p.lon ?? '',
    `"${(p.game_types ?? []).join('|')}"`,
    p.buyin ?? '',
    p.buyin_max ?? '',
    p.blind_up ?? '',
    p.prize ?? '',
    p.pub_type ?? '',
  ].join(',')),
].join('\n');
const csvPath = `${OUT}\\runnerrunner-pubs.csv`;
await fs.writeFile(csvPath, '﻿' + csv, 'utf-8');

console.log(`💾 저장 완료`);
console.log(`   JSON: ${jsonPath} (${cleaned.length}개)`);
console.log(`   CSV:  ${csvPath}`);
console.log(`\n샘플 5개:`);
cleaned.slice(0, 5).forEach((p, i) => {
  console.log(`  ${i+1}. ${p.name} - ${p.address} - ${p.phone}`);
});

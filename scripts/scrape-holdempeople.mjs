// 홀덤민족 (holdempeople.com) 전국 펍 정보 수집
//
// 1단계: 페이지 1~5 순회 → 펍 코드·이름 수집
// 2단계: 각 펍 상세 페이지 fetch → 주소·전화·영업시간 추출
// 3단계: JSON으로 저장 (Supabase 등록은 별도 스크립트, 좌표 변환 필요)

import fs from 'node:fs/promises';

const BASE = 'https://holdempeople.com';
const OUT = 'C:\\Users\\ghkdr\\OneDrive\\바탕 화면\\블러프존_펍데이터';
await fs.mkdir(OUT, { recursive: true });

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ─── 1단계: 페이지별 펍 리스트 수집 ───────────────────────────────────────
async function fetchListPage(page) {
  const body = new URLSearchParams({ page: String(page) }).toString();
  const res = await fetch(`${BASE}/sub/ajax.store_list_find.php`, {
    method: 'POST',
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Requested-With': 'XMLHttpRequest',
      'Referer': `${BASE}/sub/store_list_find.php`,
    },
    body,
  });
  return await res.text();
}

function parseList(html) {
  const items = [];
  const liRegex = /<li class="">([\s\S]*?)<\/li>/g;
  let m;
  while ((m = liRegex.exec(html)) !== null) {
    const block = m[1];
    const codeMatch = block.match(/store_view\.php\?code=([^"]+)/);
    const nameMatch = block.match(/<div class="tit"><a [^>]+>([^<]+)<\/a>/);
    const descMatch = block.match(/<div class="desc">([^<]+)<\/div>/);
    if (codeMatch && nameMatch) {
      items.push({
        code: codeMatch[1],
        name: nameMatch[1].trim(),
        region_desc: descMatch ? descMatch[1].trim() : '',
      });
    }
  }
  return items;
}

// ─── 2단계: 상세 페이지에서 주소·전화·영업시간 추출 ────────────────────────
async function fetchDetail(code) {
  const res = await fetch(`${BASE}/sub/store_view.php?code=${code}`, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });
  const html = await res.text();

  // 주소 추출 (다양한 패턴 시도)
  const addressMatch = html.match(/주소[^>]*>[^<]*<\/[^>]+>\s*<[^>]+>([^<]+)</) ||
                       html.match(/<address[^>]*>([^<]+)<\/address>/) ||
                       html.match(/주소[^<]*<\/[^>]+>([^<]+)/);
  const address = addressMatch ? addressMatch[1].trim().replace(/\s+/g, ' ') : '';

  // 전화 추출
  const phoneMatch = html.match(/tel:([0-9-]+)/);
  const phone = phoneMatch ? phoneMatch[1] : '';

  // 영업시간 (러프하게)
  const hoursMatch = html.match(/영업시간[^<]*<\/[^>]+>([^<]+)/);
  const hours = hoursMatch ? hoursMatch[1].trim().replace(/\s+/g, ' ') : '';

  // 인스타 ID
  const instaMatch = html.match(/instagram\.com\/([a-zA-Z0-9_.]+)/);
  const insta = instaMatch ? instaMatch[1] : '';

  return { address, phone, hours, insta };
}

// ─── 메인 ─────────────────────────────────────────────────────────────────
console.log('📡 홀덤민족 펍 리스트 수집 중...\n');

const all = [];
for (let page = 1; page <= 10; page++) {
  const html = await fetchListPage(page);
  const items = parseList(html);
  if (items.length === 0) {
    console.log(`  page ${page}: (빈 페이지, 종료)`);
    break;
  }
  console.log(`  page ${page}: ${items.length}개`);
  all.push(...items);
  await sleep(300);
}

console.log(`\n📋 총 ${all.length}개 펍 발견. 상세 정보 수집 시작...\n`);

const detailed = [];
for (let i = 0; i < all.length; i++) {
  const pub = all[i];
  try {
    const detail = await fetchDetail(pub.code);
    detailed.push({ ...pub, ...detail });
    process.stdout.write(`\r   ${i + 1}/${all.length}: ${pub.name.slice(0, 25)}`);
  } catch (e) {
    console.error(`\n  ❌ ${pub.name}: ${e.message}`);
  }
  await sleep(400); // 부하 방지
}

console.log('\n\n💾 저장 중...');
const jsonPath = `${OUT}\\holdempeople-pubs.json`;
await fs.writeFile(jsonPath, JSON.stringify(detailed, null, 2), 'utf-8');

// 엑셀용 CSV도 생성
const csv = [
  ['펍명', '지역', '주소', '전화', '영업시간', '인스타ID', '코드'].join(','),
  ...detailed.map(p => [
    `"${p.name}"`,
    `"${p.region_desc}"`,
    `"${p.address}"`,
    p.phone,
    `"${p.hours}"`,
    p.insta,
    p.code,
  ].join(',')),
].join('\n');
const csvPath = `${OUT}\\holdempeople-pubs.csv`;
await fs.writeFile(csvPath, '﻿' + csv, 'utf-8'); // BOM 추가 (엑셀 한글 깨짐 방지)

console.log(`✅ 완료!`);
console.log(`   JSON: ${jsonPath}`);
console.log(`   CSV:  ${csvPath}`);
console.log(`   총 ${detailed.length}개 펍`);

// 러너러너 890개 펍 데이터에서 SMS 발송용 전화번호 정제
//
// 출력:
//   - clean-phones.csv: 매장명, 정제된 010 번호, 주소
//   - phone-stats.txt: 통계 (전체/유효/중복/제외)
//
// 정제 규칙:
//   1. 010-XXXX-XXXX 정규화 (하이픈 통일)
//   2. 010 으로 시작하지 않으면 제외 (vcn 0503, 02 시내, 070 등)
//   3. 중복 전화번호는 첫 번째 매장만 유지
//   4. 길이 검증 (010 + 8자리 = 11자리)

import fs from 'node:fs';
import path from 'node:path';

const SRC = 'C:\\Users\\ghkdr\\OneDrive\\바탕 화면\\블러프존_펍데이터\\runnerrunner-pubs.json';
const OUT_DIR = 'C:\\Users\\ghkdr\\OneDrive\\바탕 화면\\블러프존_펍데이터';
const OUT_CSV = path.join(OUT_DIR, 'clean-phones.csv');
const OUT_STATS = path.join(OUT_DIR, 'phone-stats.txt');

function normalize(raw) {
  if (!raw) return null;
  // 숫자만 추출
  const digits = raw.replace(/\D/g, '');
  // 010 으로 시작하고 11자리여야 함
  if (!digits.startsWith('010') || digits.length !== 11) return null;
  // 010-XXXX-XXXX
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

function csvEscape(s) {
  if (s == null) return '';
  const str = String(s);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

const raw = JSON.parse(fs.readFileSync(SRC, 'utf-8'));
console.log(`[load] ${raw.length}개 매장 로드`);

const seen = new Set();
const cleaned = [];
const stats = {
  total: raw.length,
  noPhone: 0,
  invalidFormat: 0,
  duplicate: 0,
  valid: 0,
};

for (const p of raw) {
  const phone = p.phone;
  if (!phone) {
    stats.noPhone++;
    continue;
  }
  const normalized = normalize(phone);
  if (!normalized) {
    stats.invalidFormat++;
    continue;
  }
  if (seen.has(normalized)) {
    stats.duplicate++;
    continue;
  }
  seen.add(normalized);
  stats.valid++;
  cleaned.push({
    external_id: p.external_id,
    name: p.name,
    phone: normalized,
    address: p.address ?? '',
  });
}

// CSV 출력
const header = 'external_id,name,phone,address\n';
const body = cleaned
  .map(r => [r.external_id, r.name, r.phone, r.address].map(csvEscape).join(','))
  .join('\n');
fs.writeFileSync(OUT_CSV, header + body, 'utf-8');

// 통계 출력
const statsText = `
[펍 전화번호 정제 결과]
생성 시각: ${new Date().toISOString()}

전체 매장: ${stats.total}
─ 전화번호 없음: ${stats.noPhone}
─ 형식 불일치 (vcn 0503, 02, 070 등): ${stats.invalidFormat}
─ 중복 번호: ${stats.duplicate}
─ ✅ 발송 가능: ${stats.valid}

출력 파일: ${OUT_CSV}
`.trim();

fs.writeFileSync(OUT_STATS, statsText, 'utf-8');
console.log(statsText);
console.log(`\n✅ 저장 완료 → ${OUT_CSV}`);

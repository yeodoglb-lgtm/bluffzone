// 카카오 추출 결과에서 매장명 + 전화번호 2개 컬럼만 뽑기
// 출력: UTF-8 BOM (Excel 호환)

import fs from 'node:fs';

const SRC = 'C:/Users/ghkdr/OneDrive/바탕 화면/블러프존_펍데이터/kakao-extracted-pubs.csv';
const OUT = 'C:/Users/ghkdr/OneDrive/바탕 화면/블러프존_펍데이터/kakao-매장명_전화번호.csv';

function parseCsvRow(line) {
  const out = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') { inQ = false; }
      else cur += c;
    } else {
      if (c === ',') { out.push(cur); cur = ''; }
      else if (c === '"') { inQ = true; }
      else cur += c;
    }
  }
  out.push(cur);
  return out;
}

const text = fs.readFileSync(SRC, 'utf-8');
const lines = text.split('\n').filter(l => l.trim());
const header = parseCsvRow(lines[0]);
const nameIdx = header.indexOf('매장명');
const phoneIdx = header.indexOf('전화번호');

const rows = [];
for (let i = 1; i < lines.length; i++) {
  const f = parseCsvRow(lines[i]);
  const name = (f[nameIdx] ?? '').trim();
  const phone = (f[phoneIdx] ?? '').trim();
  if (!phone) continue;
  rows.push({ name: name === '(미상)' ? '' : name, phone });
}

function csvEscape(s) {
  if (s == null) return '';
  const str = String(s);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

const BOM = '﻿';
const out = '매장명,전화번호\n' + rows.map(r => `${csvEscape(r.name)},${r.phone}`).join('\n');
fs.writeFileSync(OUT, BOM + out, 'utf-8');

console.log(`✅ ${rows.length}건 출력`);
console.log(`매장명 있음: ${rows.filter(r => r.name).length}`);
console.log(`매장명 없음: ${rows.filter(r => !r.name).length}`);
console.log(`출력: ${OUT}`);

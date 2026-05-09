// 980건 발송 대상 미리보기 — 사람이 읽기 쉬운 txt 출력

import fs from 'node:fs';

const SRC = 'C:/Users/ghkdr/OneDrive/바탕 화면/블러프존_펍데이터/sms-targets-master.csv';
const OUT = 'C:/Users/ghkdr/OneDrive/바탕 화면/블러프존_펍데이터/sms-targets-preview.txt';

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

const text = fs.readFileSync(SRC, 'utf-8').replace(/^﻿/, '');
const lines = text.split('\n').filter(l => l.trim());
const header = parseCsvRow(lines[0]);
const nameIdx = header.indexOf('매장명');
const phoneIdx = header.indexOf('전화번호');
const sourceIdx = header.indexOf('출처');

const rows = [];
for (let i = 1; i < lines.length; i++) {
  const f = parseCsvRow(lines[i]);
  rows.push({
    n: i,
    name: f[nameIdx] ?? '',
    phone: f[phoneIdx] ?? '',
    source: f[sourceIdx] ?? '',
  });
}

const out = [];
out.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
out.push(`  SMS 발송 대상 ${rows.length}건 미리보기`);
out.push(`  생성: ${new Date().toLocaleString('ko-KR')}`);
out.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
out.push('');
out.push(`No   매장명${' '.repeat(34)}전화번호${' '.repeat(8)}출처`);
out.push('-'.repeat(80));
for (const r of rows) {
  const num = String(r.n).padStart(3, ' ');
  const name = (r.name || '(미상)').slice(0, 38).padEnd(40, ' ');
  const phone = (r.phone || '').padEnd(15, ' ');
  out.push(`${num}  ${name}${phone}${r.source}`);
}
out.push('-'.repeat(80));
out.push(`총 ${rows.length}건`);

fs.writeFileSync(OUT, out.join('\n'), 'utf-8');
console.log(`✅ 출력: ${OUT}`);
console.log(`총 ${rows.length}건`);

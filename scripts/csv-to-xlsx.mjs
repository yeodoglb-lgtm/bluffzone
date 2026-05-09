// 마스터 CSV → 엑셀 XLSX 변환

import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const SRC = 'C:/Users/ghkdr/OneDrive/바탕 화면/블러프존_펍데이터/sms-targets-master.csv';
const OUT = 'C:/Users/ghkdr/OneDrive/바탕 화면/블러프존_펍데이터/sms-targets-master.xlsx';

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
const data = lines.map(parseCsvRow);

const ws = XLSX.utils.aoa_to_sheet(data);
// 컬럼 너비 자동 조정 (최대값 사용)
const colWidths = [];
for (let c = 0; c < data[0].length; c++) {
  let max = 0;
  for (const row of data) {
    const v = String(row[c] ?? '');
    if (v.length > max) max = v.length;
  }
  colWidths.push({ wch: Math.min(max + 2, 50) });
}
ws['!cols'] = colWidths;

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'SMS 대상 980건');
XLSX.writeFile(wb, OUT);

console.log(`✅ 출력: ${OUT}`);
console.log(`총 ${data.length - 1}행 (헤더 제외)`);

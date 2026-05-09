// 러너러너 + 카카오 매장 데이터 통합 → SMS 발송 대상 마스터 리스트
//
// 입력:
//   - clean-phones.csv (러너러너 890 → 정제 860)
//   - kakao-extracted-pubs.csv (카카오 136 매장)
// 출력:
//   - sms-targets-master.csv (발송 대상, UTF-8 BOM, Excel 호환)
//   - sms-targets-summary.txt (통계)

import fs from 'node:fs';

const DIR = 'C:/Users/ghkdr/OneDrive/바탕 화면/블러프존_펍데이터';
const RUNNER_CSV = `${DIR}/clean-phones.csv`;
const KAKAO_CSV = `${DIR}/kakao-extracted-pubs.csv`;
const OUT_CSV = `${DIR}/sms-targets-master.csv`;
const OUT_SUMMARY = `${DIR}/sms-targets-summary.txt`;

// ── CSV 파서 (간단) ─────────────────────────────────────────
function parseCSV(text) {
  const lines = text.split('\n').filter(l => l.trim().length > 0);
  if (lines.length === 0) return [];
  const header = parseCsvRow(lines[0]);
  return lines.slice(1).map(l => {
    const fields = parseCsvRow(l);
    const obj = {};
    header.forEach((h, i) => { obj[h.trim()] = (fields[i] ?? '').trim(); });
    return obj;
  });
}
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

// ── 데이터 로드 ──────────────────────────────────────────────
const runnerRows = parseCSV(fs.readFileSync(RUNNER_CSV, 'utf-8'));
const kakaoRows = parseCSV(fs.readFileSync(KAKAO_CSV, 'utf-8'));

console.log(`[load] 러너러너 ${runnerRows.length}, 카카오 ${kakaoRows.length}`);

// ── 정규화 + 통합 ────────────────────────────────────────────
function normalizePhone(p) {
  if (!p) return '';
  const d = p.replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('010')) {
    return `010-${d.slice(3, 7)}-${d.slice(7)}`;
  }
  return '';
}

const seenPhones = new Map(); // phone → record

// 러너러너 (토너 위주)
for (const r of runnerRows) {
  const phone = normalizePhone(r.phone);
  if (!phone) continue;
  if (seenPhones.has(phone)) continue;
  seenPhones.set(phone, {
    name: r.name ?? '',
    phone,
    address: r.address ?? '',
    region: '',
    source: 'runnerrunner',
    game_format_hint: 'tournament', // 러너러너는 토너 위주
    confidence: 'medium',
    post_type: 'ad',
    note: '',
  });
}

// 카카오 (혼재) — 러너러너에 이미 있으면 보강만
for (const k of kakaoRows) {
  const phone = normalizePhone(k.전화번호);
  if (!phone) continue;
  const existing = seenPhones.get(phone);
  if (existing) {
    // 카카오에서 추가 정보 있으면 보강
    if (k.매장명 && k.매장명 !== '(미상)' && !existing.name.includes(k.매장명)) {
      existing.note = `카카오 매장명: ${k.매장명}`;
    }
    if (k.post_type === 'recruitment') {
      existing.note = (existing.note ? existing.note + ' / ' : '') + '구인글 출처';
    }
    continue;
  }
  seenPhones.set(phone, {
    name: k.매장명 === '(미상)' ? '' : (k.매장명 ?? ''),
    phone,
    address: '',
    region: k.지역 ?? '',
    source: 'kakao',
    game_format_hint: k.game_format ?? 'unknown',
    confidence: k.신뢰도 ?? 'low',
    post_type: k.post_type ?? 'ad',
    note: '',
  });
}

const allRecords = [...seenPhones.values()];

// ── 통계 ────────────────────────────────────────────────────
const stats = {
  total_unique: allRecords.length,
  from_runner: 0,
  from_kakao: 0,
  with_name: 0,
  recruitment: 0,
  by_format: { tournament: 0, cash: 0, mixed: 0, unknown: 0 },
};
for (const r of allRecords) {
  if (r.source === 'runnerrunner') stats.from_runner++;
  if (r.source === 'kakao') stats.from_kakao++;
  if (r.name) stats.with_name++;
  if (r.post_type === 'recruitment') stats.recruitment++;
  const fmt = r.game_format_hint;
  if (stats.by_format[fmt] != null) stats.by_format[fmt]++;
}

// 카카오에서 러너러너와 겹친 매장 수 (보강된 거)
const kakaoOverlap = kakaoRows.filter(k => {
  const phone = normalizePhone(k.전화번호);
  if (!phone) return false;
  const r = seenPhones.get(phone);
  return r && r.source === 'runnerrunner';
}).length;

// ── CSV 출력 (UTF-8 BOM 포함, Excel 호환) ────────────────
function csvEscape(s) {
  if (s == null) return '';
  const str = String(s);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

const header = '매장명,전화번호,주소,지역,출처,게임형태_힌트,신뢰도,글_종류,비고\n';
const body = allRecords.map(r =>
  [r.name, r.phone, r.address, r.region, r.source, r.game_format_hint, r.confidence, r.post_type, r.note]
    .map(csvEscape).join(',')
).join('\n');

const BOM = '﻿';
fs.writeFileSync(OUT_CSV, BOM + header + body, 'utf-8');

// ── 요약 ────────────────────────────────────────────────────
const summary = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[SMS 발송 마스터 리스트 통합 완료]
생성: ${new Date().toLocaleString('ko-KR')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[입력]
- 러너러너 정제 리스트: ${runnerRows.length}건
- 카카오 추출 리스트: ${kakaoRows.length}건

[통합 결과]
- 고유 전화번호 (발송 대상): ${stats.total_unique}건
- 러너러너 단독: ${stats.from_runner}건
- 카카오 단독: ${stats.from_kakao}건
- 겹침 (러너러너에 이미 있음): ${kakaoOverlap}건

[메타 정보]
- 매장명 보유: ${stats.with_name}건
- 구인글 출처: ${stats.recruitment}건

[게임 형태 힌트 (참고용, 사장님이 폼에서 직접 선택)]
- 토너먼트 추정: ${stats.by_format.tournament}
- 캐쉬 추정: ${stats.by_format.cash}
- 토너+캐쉬: ${stats.by_format.mixed}
- 미분류: ${stats.by_format.unknown}

[출력 파일]
- ${OUT_CSV}  (Excel UTF-8 호환, BOM 포함)

[다음 단계]
1. 알리고 사업자 전환 승인 (대기 중)
2. 발신번호 등록
3. 충전 (예상 ${Math.ceil(stats.total_unique * 25 / 1000) * 1000}원)
4. 본 CSV의 전화번호로 SMS 일괄 발송
   → 사장님이 구글폼에서 직접 게임 형태 선택
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`.trim();

fs.writeFileSync(OUT_SUMMARY, summary, 'utf-8');
console.log(summary);

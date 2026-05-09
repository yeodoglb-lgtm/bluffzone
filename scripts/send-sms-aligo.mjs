// 알리고 LMS 일괄 발송 스크립트 (980건)
//
// 사용법:
//   1. 환경변수 설정:
//      $env:ALIGO_API_KEY = "발급받은_API_키"
//      $env:ALIGO_USER_ID = "알리고_아이디"
//      $env:ALIGO_SENDER  = "발신번호 (010-XXXX-XXXX 본인폰)"
//   2. 테스트 모드 (5건만 발송):
//      node scripts/send-sms-aligo.mjs --test
//   3. 본 발송 (980건):
//      node scripts/send-sms-aligo.mjs --go
//
// 알리고 LMS 단가 25원/건 → 980건 ≈ 24,500원

import fs from 'node:fs';

const MASTER_CSV = 'C:/Users/ghkdr/OneDrive/바탕 화면/블러프존_펍데이터/sms-targets-master.csv';
const LOG_FILE = 'C:/Users/ghkdr/OneDrive/바탕 화면/블러프존_펍데이터/sms-send-log.csv';
const TEST_LIMIT = 5;
const RATE_LIMIT_MS = 2000; // 분당 30건 = 2초 간격

const API_KEY = process.env.ALIGO_API_KEY;
const USER_ID = process.env.ALIGO_USER_ID;
const SENDER  = process.env.ALIGO_SENDER;

if (!API_KEY || !USER_ID || !SENDER) {
  console.error('❌ 환경변수 누락: ALIGO_API_KEY, ALIGO_USER_ID, ALIGO_SENDER');
  process.exit(1);
}

const isTest = process.argv.includes('--test');
const isGo   = process.argv.includes('--go');

if (!isTest && !isGo) {
  console.error('사용법: node scripts/send-sms-aligo.mjs [--test | --go]');
  process.exit(1);
}

// ── 메시지 본문 (LMS, 약 200자) ──────────────────────────────────────
const MSG_TEMPLATE = `[블러프존 매장 등록 안내]

안녕하세요, 사장님!
홀덤 매니저 앱 '블러프존(bluffzone.kr)'입니다.

저희 앱 유저분들께 전국 홀덤 플레이스를
무료로 소개해드리고 있습니다.

귀 매장 등록을 원하시면 아래 링크에서
정보 입력 + 매장 사진 업로드 부탁드립니다.
👉 https://forms.gle/eiAJR4W2AhazaxkW7

소요 시간: 약 1~2분
문의·수신거부: 본 번호로 회신
※ 1회 발송 / 재발송 없음`;

const SUBJECT = '블러프존 매장 등록 안내';

// ── CSV 파서 ─────────────────────────────────────────────────────────
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

const text = fs.readFileSync(MASTER_CSV, 'utf-8').replace(/^﻿/, '');
const lines = text.split('\n').filter(l => l.trim());
const header = parseCsvRow(lines[0]);
const phoneIdx = header.indexOf('전화번호');
const nameIdx = header.indexOf('매장명');

const targets = [];
for (let i = 1; i < lines.length; i++) {
  const f = parseCsvRow(lines[i]);
  const phone = (f[phoneIdx] ?? '').trim().replace(/-/g, '');
  const name = (f[nameIdx] ?? '').trim();
  if (phone && phone.startsWith('010') && phone.length === 11) {
    targets.push({ phone, name });
  }
}

const sendList = isTest ? targets.slice(0, TEST_LIMIT) : targets;

console.log(`\n[알리고 LMS 발송]`);
console.log(`발신번호: ${SENDER}`);
console.log(`대상: ${sendList.length}건 (${isTest ? '테스트' : '본 발송'})`);
console.log(`예상 비용: 약 ${(sendList.length * 25).toLocaleString()}원`);
console.log(`예상 소요: 약 ${Math.ceil(sendList.length * RATE_LIMIT_MS / 60000)}분\n`);

// 5초 카운트다운 (취소 기회)
console.log('5초 후 발송 시작합니다... (Ctrl+C 취소)');
await new Promise(r => setTimeout(r, 5000));

// 로그 헤더
if (!fs.existsSync(LOG_FILE)) {
  fs.writeFileSync(LOG_FILE, '시각,전화번호,매장명,결과,메시지ID,에러\n', 'utf-8');
}

let success = 0, fail = 0;

// ── 발송 루프 ────────────────────────────────────────────────────────
for (let i = 0; i < sendList.length; i++) {
  const { phone, name } = sendList[i];
  const formData = new URLSearchParams();
  formData.append('key', API_KEY);
  formData.append('user_id', USER_ID);
  formData.append('sender', SENDER.replace(/-/g, ''));
  formData.append('receiver', phone);
  formData.append('msg', MSG_TEMPLATE);
  formData.append('msg_type', 'LMS');
  formData.append('title', SUBJECT);
  formData.append('testmode_yn', 'N');

  let result;
  try {
    const res = await fetch('https://apis.aligo.in/send/', {
      method: 'POST',
      body: formData,
    });
    result = await res.json();
  } catch (e) {
    result = { result_code: '-99', message: String(e) };
  }

  const ok = result.result_code === '1' || result.result_code === 1;
  if (ok) success++; else fail++;

  const logLine = [
    new Date().toISOString(),
    phone,
    `"${name.replace(/"/g, '""')}"`,
    ok ? 'success' : 'fail',
    result.msg_id ?? '',
    `"${(result.message ?? '').replace(/"/g, '""')}"`,
  ].join(',');
  fs.appendFileSync(LOG_FILE, logLine + '\n', 'utf-8');

  process.stdout.write(`\r[${i + 1}/${sendList.length}] 성공 ${success} / 실패 ${fail}`);

  if (i < sendList.length - 1) {
    await new Promise(r => setTimeout(r, RATE_LIMIT_MS));
  }
}

console.log('\n\n✅ 발송 완료');
console.log(`성공: ${success}건 / 실패: ${fail}건`);
console.log(`로그: ${LOG_FILE}`);

// Supabase 수동 백업 — 모든 주요 테이블을 JSON으로 저장
//
// 사용법:
//   $env:SUPABASE_SERVICE_ROLE_KEY = "..."
//   node scripts/backup-supabase.mjs
//
// 출력:
//   C:\Users\ghkdr\OneDrive\바탕 화면\블러프존_백업\YYYY-MM-DD/
//     ├── profiles.json
//     ├── sessions.json
//     ├── hands.json
//     ├── places.json
//     ├── ai_chats.json / ai_messages.json
//     ├── feedback.json
//     ├── hand_review_cache.json
//     └── _summary.txt
//
// 정기적 실행 권장: 주 1회 (또는 큰 마이그레이션 직전)

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { createClient } = require('@supabase/supabase-js');

// .env 파일에서 자동 로드 (env var 우선, 없으면 .env)
function loadEnvFromFile() {
  try {
    const envPath = path.resolve('.env');
    if (!fs.existsSync(envPath)) return;
    const text = fs.readFileSync(envPath, 'utf-8');
    for (const line of text.split('\n')) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.+)\s*$/);
      if (!m) continue;
      const [, key, val] = m;
      if (!process.env[key]) process.env[key] = val.replace(/^["']|["']$/g, '');
    }
  } catch { /* ignore */ }
}
loadEnvFromFile();

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY 없음 (.env 파일 또는 환경변수에 추가 필요)');
  console.error('   .env 예시:');
  console.error('   SUPABASE_SERVICE_ROLE_KEY=eyJ...');
  process.exit(1);
}

const sb = createClient(
  'https://chxcayaehgwqrpjuajqx.supabase.co',
  SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

// 백업 대상 테이블 (RAG 데이터·차트는 재생성 가능하니 제외)
const TABLES = [
  'profiles',
  'sessions',
  'hands',
  'places',
  'ai_chats',
  'ai_messages',
  'ai_usages',
  'feedback',
  'hand_review_cache',
];

// 출력 폴더 (날짜별)
const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
const OUT_DIR = `C:/Users/ghkdr/OneDrive/바탕 화면/블러프존_백업/${today}`;
fs.mkdirSync(OUT_DIR, { recursive: true });

console.log(`\n[백업 시작] ${today}`);
console.log(`출력: ${OUT_DIR}\n`);

const summary = [];
let totalRows = 0;
let totalBytes = 0;

for (const table of TABLES) {
  process.stdout.write(`  ${table.padEnd(20)} `);
  try {
    // Supabase는 한 번에 1000행 제한 → 페이지네이션
    let allRows = [];
    let from = 0;
    const PAGE = 1000;
    while (true) {
      const { data, error, count } = await sb
        .from(table)
        .select('*', { count: 'exact' })
        .range(from, from + PAGE - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      allRows = allRows.concat(data);
      if (data.length < PAGE) break;
      from += PAGE;
      if (allRows.length >= (count ?? 0)) break;
    }

    const json = JSON.stringify(allRows, null, 2);
    const filePath = path.join(OUT_DIR, `${table}.json`);
    fs.writeFileSync(filePath, json, 'utf-8');
    const sizeKb = (json.length / 1024).toFixed(1);
    totalRows += allRows.length;
    totalBytes += json.length;
    console.log(`✅ ${allRows.length}행 (${sizeKb} KB)`);
    summary.push(`${table}: ${allRows.length}행 / ${sizeKb} KB`);
  } catch (e) {
    console.log(`❌ 실패 — ${e?.message ?? e}`);
    summary.push(`${table}: 실패 (${e?.message ?? e})`);
  }
}

// 요약 파일
const summaryText = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Supabase 수동 백업 완료]
시각: ${new Date().toLocaleString('ko-KR')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[테이블별]
${summary.map(s => '  · ' + s).join('\n')}

[합계]
  총 ${totalRows}행 / ${(totalBytes / 1024).toFixed(1)} KB

[복구 방법]
사고 시 Supabase SQL Editor에서:
  TRUNCATE table_name;
  -- JSON 파일 → COPY 또는 INSERT 스크립트로 복원
또는 service_role 키로 봤
  await sb.from('table_name').insert(JSON.parse(jsonString));

[다음 백업 권장 시점]
- 매주 1회 (정기)
- 큰 마이그레이션 / TRUNCATE / DELETE 직전
- 광고 시작 → 유저 급증 시 매일
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`.trim();
fs.writeFileSync(path.join(OUT_DIR, '_summary.txt'), summaryText, 'utf-8');

console.log('\n' + summaryText);
console.log(`\n✅ 완료. ${OUT_DIR}\n`);

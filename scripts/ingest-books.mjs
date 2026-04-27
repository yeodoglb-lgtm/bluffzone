// GTO 책 → 텍스트 추출 → 청크 분할 → 임베딩 → Supabase pgvector 저장
//
// 실행 방법:
//   SUPABASE_SERVICE_ROLE_KEY="eyJ..." OPENAI_API_KEY="sk-..." node scripts/ingest-books.mjs
//
// 입력 파일:
//   C:\Users\ghkdr\OneDrive\바탕 화면\GTO 책\Play Optimal Poker 1.pdf
//   C:\Users\ghkdr\OneDrive\바탕 화면\GTO 책\Play Optimal Poker 2.docx
//
// 동작:
//   1. 두 파일에서 텍스트 추출
//   2. ~500토큰 단위 청크 분할 (자연 문단 경계 우선)
//   3. OpenAI text-embedding-3-small (1536차원) 임베딩 생성
//   4. Supabase book_chunks 테이블에 batch insert
//   5. 진행률 출력 + 비용 추정

import fs from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
// pdf-parse는 CommonJS, mammoth도 동일. createRequire로 우회
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

// ── 설정 ────────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://chxcayaehgwqrpjuajqx.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY;

if (!SUPABASE_SERVICE_KEY) { console.error('❌ SUPABASE_SERVICE_ROLE_KEY 환경변수 필요'); process.exit(1); }
if (!OPENAI_KEY) { console.error('❌ OPENAI_API_KEY 환경변수 필요'); process.exit(1); }

const BOOKS_DIR = 'C:\\Users\\ghkdr\\OneDrive\\바탕 화면\\GTO 책';
// 처리할 책 목록 — 이미 들어간 책 제외, 새 책만.
const FILES = [
  { name: 'Modern Poker Theory', file: 'Modern Poker Theory_-_Michael_Acevedo.pdf', type: 'pdf' },
];

// 청크 파라미터 — text-embedding-3-small 권장: 약 500토큰 (~2000자)
// 너무 작으면 컨텍스트 부족, 너무 크면 검색 정밀도 ↓
const TARGET_CHUNK_CHARS = 1800; // 약 450 토큰
const CHUNK_OVERLAP = 200;        // 인접 청크 간 200자 겹침 (경계 정보 보존)

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── 1. 텍스트 추출 ─────────────────────────────────────────────────────────
async function extractText(filePath, type) {
  const buf = await fs.readFile(filePath);
  if (type === 'pdf') {
    const data = await pdfParse(buf);
    return data.text;
  }
  if (type === 'docx') {
    const result = await mammoth.extractRawText({ buffer: buf });
    return result.value;
  }
  throw new Error('Unknown type: ' + type);
}

// ── 2. 청크 분할 ───────────────────────────────────────────────────────────
// 자연 문단 경계(\n\n)에서 우선 분할, 청크 크기 맞추되 의미 단위 보존
function splitIntoChunks(text) {
  // 정규화: 여러 공백·줄바꿈 정리
  const cleaned = text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();

  // 문단 단위 분할
  const paragraphs = cleaned.split(/\n\n+/);

  const chunks = [];
  let buffer = '';

  for (const p of paragraphs) {
    if (buffer.length + p.length + 2 <= TARGET_CHUNK_CHARS) {
      buffer = buffer ? buffer + '\n\n' + p : p;
    } else {
      // 현재 버퍼 저장
      if (buffer) chunks.push(buffer);
      // 단일 문단이 청크 한도 초과면 강제 분할
      if (p.length > TARGET_CHUNK_CHARS) {
        for (let i = 0; i < p.length; i += TARGET_CHUNK_CHARS - CHUNK_OVERLAP) {
          chunks.push(p.slice(i, i + TARGET_CHUNK_CHARS));
        }
        buffer = '';
      } else {
        // 새 청크 시작 (이전 청크 끝부분 일부 overlap으로 가져옴)
        const tailOverlap = chunks.length > 0
          ? chunks[chunks.length - 1].slice(-CHUNK_OVERLAP)
          : '';
        buffer = (tailOverlap ? tailOverlap + '\n\n' : '') + p;
      }
    }
  }
  if (buffer) chunks.push(buffer);

  // 너무 짧은 청크(50자 미만) 제외 — 노이즈 방지
  return chunks.filter(c => c.trim().length >= 50);
}

// ── 3. OpenAI 임베딩 (배치 처리, 100개씩) ──────────────────────────────────
async function embedBatch(texts) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: texts,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI embeddings failed: ${res.status} ${err}`);
  }
  const data = await res.json();
  return data.data.map(d => d.embedding);
}

// ── 4. Supabase insert (배치) ──────────────────────────────────────────────
async function insertChunks(rows) {
  const { error } = await supabase.from('book_chunks').insert(rows);
  if (error) throw error;
}

// ── 메인 ────────────────────────────────────────────────────────────────────
let totalChunks = 0;
let totalTokens = 0;
const BATCH_SIZE = 50; // OpenAI 배치 크기

for (const book of FILES) {
  console.log(`\n📖 처리 중: ${book.name}`);
  const filePath = path.join(BOOKS_DIR, book.file);

  console.log('  → 텍스트 추출...');
  const text = await extractText(filePath, book.type);
  console.log(`     추출 완료: ${text.length.toLocaleString()}자`);

  console.log('  → 청크 분할...');
  const chunks = splitIntoChunks(text);
  console.log(`     청크 ${chunks.length}개 생성`);

  console.log('  → 임베딩 + 저장 (배치 단위)...');
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const embeddings = await embedBatch(batch);

    const rows = batch.map((content, j) => ({
      book_title: book.name,
      content,
      embedding: embeddings[j],
      token_count: Math.ceil(content.length / 4), // 추정 (영어 ~4자/토큰)
    }));

    await insertChunks(rows);
    const done = Math.min(i + BATCH_SIZE, chunks.length);
    process.stdout.write(`\r     진행: ${done}/${chunks.length}`);
  }
  process.stdout.write('\n');

  totalChunks += chunks.length;
  totalTokens += chunks.reduce((s, c) => s + Math.ceil(c.length / 4), 0);
}

// ── 비용 추정 ──────────────────────────────────────────────────────────────
// text-embedding-3-small: $0.02 / 1M 토큰
const cost = (totalTokens / 1_000_000) * 0.02;

console.log(`\n✅ 완료!`);
console.log(`   총 청크: ${totalChunks.toLocaleString()}개`);
console.log(`   총 토큰: ${totalTokens.toLocaleString()}`);
console.log(`   임베딩 비용: $${cost.toFixed(4)} (≈ ${(cost * 1400).toFixed(0)}원)`);
console.log(`\n📦 Supabase book_chunks 테이블에 저장됨. 다음: hand-review에 RAG 검색 통합.`);

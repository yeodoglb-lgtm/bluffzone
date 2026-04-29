// bluffzone.kr QR 코드 생성 (영상·포스터·명함용)
// 출력:
//   1. 검정 (가장 안정적, 어떤 배경에도 OK)
//   2. 브랜드 주황 (#FF6B35) on 검정 배경 (테마 매치)

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const QRCode = require('qrcode');

const URL = 'https://bluffzone.kr';
const OUT_DIR = 'C:\\Users\\ghkdr\\OneDrive\\바탕 화면\\GTO 책\\..\\QR';

import fs from 'node:fs/promises';
await fs.mkdir(OUT_DIR, { recursive: true });

// 1. 검정 (흰 배경) — 가장 안정적
await QRCode.toFile(`${OUT_DIR}\\bluffzone-qr-black.png`, URL, {
  width: 1024,
  margin: 2,
  color: { dark: '#000000', light: '#FFFFFF' },
  errorCorrectionLevel: 'H',
});

// 2. 주황 (검정 배경) — 브랜드 매치
await QRCode.toFile(`${OUT_DIR}\\bluffzone-qr-orange.png`, URL, {
  width: 1024,
  margin: 2,
  color: { dark: '#FF6B35', light: '#0A0A0A' },
  errorCorrectionLevel: 'H',
});

// 3. 흰색 (검정 배경) — 다크 테마 영상 위에 깔끔
await QRCode.toFile(`${OUT_DIR}\\bluffzone-qr-white.png`, URL, {
  width: 1024,
  margin: 2,
  color: { dark: '#FFFFFF', light: '#0A0A0A' },
  errorCorrectionLevel: 'H',
});

console.log('✅ QR 3종 생성 완료');
console.log('  저장 위치: C:\\Users\\ghkdr\\OneDrive\\바탕 화면\\QR\\');
console.log('  - bluffzone-qr-black.png  (흰 배경 + 검정 QR, 가장 안전)');
console.log('  - bluffzone-qr-orange.png (검정 배경 + 주황 QR, 브랜드)');
console.log('  - bluffzone-qr-white.png  (검정 배경 + 흰 QR, 영상용)');

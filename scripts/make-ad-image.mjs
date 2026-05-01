// 구글 광고용 가로 모드 이미지 (1200×628) + 정사각형 (1200×1200) 생성
// 실제 앱 아이콘(주황 스페이드) 그대로 활용. 글자 최소화.

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const sharp = require('sharp');
import fs from 'node:fs/promises';

const ICON_PATH = 'C:\\Users\\ghkdr\\OneDrive\\바탕 화면\\클로드\\bluffzone\\assets\\icon.png';
const OUT_DIR = 'C:\\Users\\ghkdr\\OneDrive\\바탕 화면\\블러프존_광고이미지';
await fs.mkdir(OUT_DIR, { recursive: true });

// ─── 가로 모드 (1200×628) ───────────────────────────────────────────────
// 검정 배경 + 좌측에 스페이드 아이콘 + 우측에 BLUFFZONE 텍스트
const horizontalBg = await sharp({
  create: { width: 1200, height: 628, channels: 3, background: { r: 10, g: 10, b: 10 } },
}).png().toBuffer();

const iconResizedH = await sharp(ICON_PATH)
  .resize(380, 380)
  .toBuffer();

const textOverlayH = `
<svg xmlns="http://www.w3.org/2000/svg" width="720" height="400">
  <text x="0" y="105" fill="#FF6B35"
        font-family="Pretendard, 'Apple SD Gothic Neo', Arial, sans-serif"
        font-size="92" font-weight="900" letter-spacing="2">BLUFFZONE</text>
  <text x="3" y="220" fill="#C0C8DA"
        font-family="Pretendard, 'Apple SD Gothic Neo', Arial, sans-serif"
        font-size="56" font-weight="700">이 핸드 콜 or 폴드?</text>
  <text x="3" y="305" fill="#C0C8DA"
        font-family="Pretendard, 'Apple SD Gothic Neo', Arial, sans-serif"
        font-size="48" font-weight="500">GTO AI에게 물어보세요</text>
</svg>
`;

await sharp(horizontalBg)
  .composite([
    { input: iconResizedH, left: 60, top: 124 },
    { input: Buffer.from(textOverlayH), left: 470, top: 110 },
  ])
  .png()
  .toFile(`${OUT_DIR}\\bluffzone-ad-1200x628.png`);

// ─── 정사각형 (1200×1200) ───────────────────────────────────────────────
// 검정 배경 + 큰 스페이드 + 하단 작은 BLUFFZONE
const squareBg = await sharp({
  create: { width: 1200, height: 1200, channels: 3, background: { r: 10, g: 10, b: 10 } },
}).png().toBuffer();

const iconResizedS = await sharp(ICON_PATH)
  .resize(800, 800)
  .toBuffer();

const textOverlayS = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="180">
  <text x="600" y="130" fill="#FF6B35" text-anchor="middle"
        font-family="Pretendard, 'Apple SD Gothic Neo', Arial, sans-serif"
        font-size="130" font-weight="900" letter-spacing="6">BLUFFZONE</text>
</svg>
`;

await sharp(squareBg)
  .composite([
    { input: iconResizedS, left: 200, top: 80 },
    { input: Buffer.from(textOverlayS), left: 0, top: 960 },
  ])
  .png()
  .toFile(`${OUT_DIR}\\bluffzone-ad-1200x1200.png`);

console.log('✅ 이미지 2종 재생성 완료 (실제 아이콘 + 글자 최소)');
console.log(`   - bluffzone-ad-1200x628.png`);
console.log(`   - bluffzone-ad-1200x1200.png`);

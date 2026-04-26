// 아이콘 흰색 모서리 → 검정으로 변환 (안티앨리어싱 + 둥근 모서리 흔적 제거)
import { Jimp } from 'jimp';
import { writeFile } from 'node:fs/promises';

const SRC = process.argv[2] ?? 'assets/icon.png';
const OUT_PATHS = [
  'assets/icon.png',
  'assets/adaptive-icon.png',
  'public/icon.png',
  'public/apple-touch-icon.png',
];

const BG = { r: 0x0A, g: 0x0A, b: 0x0A }; // #0A0A0A 검정 배경

const img = await Jimp.read(SRC);
const w = img.bitmap.width;
const h = img.bitmap.height;

// 모든 픽셀 순회: "주황색"이 아닌 모든 픽셀을 검정으로 변환.
// 주황 판정: R > 200 AND R - B > 100 (붉은빛이 강함)
img.scan(0, 0, w, h, function (x, y, idx) {
  const r = this.bitmap.data[idx + 0];
  const g = this.bitmap.data[idx + 1];
  const b = this.bitmap.data[idx + 2];
  const isOrange = r > 200 && (r - b) > 100;
  if (!isOrange) {
    this.bitmap.data[idx + 0] = BG.r;
    this.bitmap.data[idx + 1] = BG.g;
    this.bitmap.data[idx + 2] = BG.b;
    this.bitmap.data[idx + 3] = 255;
  }
});

const buf = await img.getBuffer('image/png');
for (const p of OUT_PATHS) {
  await writeFile(p, buf);
  console.log(`✓ ${p}`);
}
console.log('\n완료. 흰색 배경이 검정으로 변환됨.');

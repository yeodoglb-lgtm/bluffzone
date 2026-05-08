// Word docx에서 텍스트만 추출 (간단 정규식 파서)
import fs from 'node:fs';

const XML_PATH = 'C:/Users/ghkdr/AppData/Local/Temp/kakao-doc/word/document.xml';
const OUT_PATH = 'C:/Users/ghkdr/AppData/Local/Temp/kakao-doc/extracted.txt';
const xml = fs.readFileSync(XML_PATH, 'utf-8');

// <w:p>...</w:p>를 단락으로, <w:t>...</w:t>를 텍스트로 추출
const paragraphs = [];
const pRegex = /<w:p[^>]*>([\s\S]*?)<\/w:p>/g;
let pMatch;
while ((pMatch = pRegex.exec(xml)) !== null) {
  const inner = pMatch[1];
  const tRegex = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
  let tMatch;
  let line = '';
  while ((tMatch = tRegex.exec(inner)) !== null) {
    line += tMatch[1];
  }
  // XML 엔티티 디코드
  line = line
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
  paragraphs.push(line);
}

const out = paragraphs.join('\n');
fs.writeFileSync(OUT_PATH, out, 'utf-8');
console.log(`총 단락: ${paragraphs.length}`);
console.log(`텍스트 길이: ${out.length}자`);
console.log(`출력 파일: /tmp/kakao-doc/extracted.txt`);

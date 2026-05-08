// 카카오 오픈채팅 홀덤정보.docx 파싱 (V2 — 전화번호 기반 그룹화)
//
// 알고리즘:
//   1. 텍스트의 모든 010 전화번호 위치 찾기
//   2. 각 전화번호 위쪽 15줄 + 아래쪽 5줄을 컨텍스트로 묶기
//   3. 컨텍스트에서 매장명·지역·게임형태 추출
//   4. 전화번호 단위로 중복 제거
//
// 출력: 전화번호 1개당 매장 1개 = 깨끗한 등록 후보 리스트

import fs from 'node:fs';

const SRC = 'C:/Users/ghkdr/AppData/Local/Temp/kakao-doc/extracted.txt';
const OUT_DIR = 'C:/Users/ghkdr/OneDrive/바탕 화면/블러프존_펍데이터';
const OUT_CSV = `${OUT_DIR}/kakao-extracted-pubs.csv`;
const OUT_STATS = `${OUT_DIR}/kakao-extract-stats.txt`;

const text = fs.readFileSync(SRC, 'utf-8');
const lines = text.split('\n');

// ── 모든 전화번호 위치 찾기 ─────────────────────────────────────────
const phoneOccurrences = []; // { line: idx, phone: '010-XXXX-XXXX' }
const PHONE_RE = /(?:^|[^\d])(010[\s\-.]?\d{3,4}[\s\-.]?\d{4})(?=$|[^\d])/g;
for (let i = 0; i < lines.length; i++) {
  PHONE_RE.lastIndex = 0;
  let m;
  while ((m = PHONE_RE.exec(lines[i])) !== null) {
    const digits = m[1].replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('010')) {
      const formatted = `010-${digits.slice(3, 7)}-${digits.slice(7)}`;
      phoneOccurrences.push({ line: i, phone: formatted });
    }
  }
}
console.log(`[phones] ${phoneOccurrences.length}개 전화번호 위치 발견`);

// ── 각 전화번호에 대한 컨텍스트 (위 12줄 + 아래 3줄) 추출 ─────────────
function getContext(centerLine) {
  const start = Math.max(0, centerLine - 12);
  const end = Math.min(lines.length, centerLine + 4);
  return lines.slice(start, end).join('\n');
}
// 전화번호 줄 기준으로 어느 줄에서 매장명/지역 후보가 나왔는지 거리 계산용
function getContextLines(centerLine) {
  const start = Math.max(0, centerLine - 12);
  const end = Math.min(lines.length, centerLine + 4);
  return { lines: lines.slice(start, end), startIdx: start, phoneIdx: centerLine };
}

// ── 분류 룰 ─────────────────────────────────────────────────────────
const TOURNAMENT_KEYWORDS = [
  '토너', '토너먼트', '게런티', 'GTD', '프라이즈', '프라이스',
  '블라인드 업', '블업', '리바이', '리엔트리', '애드온',
  '스타팅 칩', '시작 칩',
  '데일리', '레크펍', '레크 펍', '레크레이션',
];
const CASH_KEYWORDS = [
  '캐쉬', '캐시', '현금', '라이브 게임', '라이브게임',
  '링게임', '링 게임',
  '노리밋', '포리밋', '팟리밋', 'NL', 'PL',
  '매입 최소', '매입 최대',
  '스트레들', '스트래들',
  '24시간 운영', '상시 운영',
  '5/10', '10/20', '1k/2k', '2k/5k',
];
const NEGATIVE_CASH = ['링게임❌', '링게임 X', '링게임x', '링게임불가', '링게임 ❌', '캐쉬x', '캐쉬❌', '캐시x', '캐시❌', '캐쉬X', '링게임X', '캐쉬 X', '캐시 X', '링 X'];
const RECRUITMENT_KEYWORDS = [
  '구인', '모집', '구합', '구해',
  '딜러 모집', '직원 모집', '경력딜', '연습딜', '매니저',
  '지원 받', '지원받', '시급', '월급', '급여',
  '근무 시간', '근무시간', '근무 요일', '근무요일',
  '5시간 보장', '6시간 보장',
  '문자 지원', '문자지원',
];

function countMatches(t, keywords) {
  let count = 0;
  const matched = [];
  for (const k of keywords) {
    if (t.includes(k)) { count++; matched.push(k); }
  }
  return { count, matched };
}

function classify(ctx) {
  const tour = countMatches(ctx, TOURNAMENT_KEYWORDS);
  const cash = countMatches(ctx, CASH_KEYWORDS);
  const negCash = countMatches(ctx, NEGATIVE_CASH);
  const recruit = countMatches(ctx, RECRUITMENT_KEYWORDS);

  const cashEffective = negCash.count > 0 ? 0 : cash.count;

  let game_format = 'unknown';
  let confidence = 'low';

  if (tour.count >= 1 && cashEffective >= 1) {
    game_format = 'mixed';
    confidence = 'medium';
  } else if (tour.count >= 2) {
    game_format = 'tournament';
    confidence = 'high';
  } else if (cashEffective >= 2) {
    game_format = 'cash';
    confidence = 'high';
  } else if (tour.count === 1) {
    game_format = 'tournament';
    confidence = 'medium';
  } else if (cashEffective === 1) {
    game_format = 'cash';
    confidence = 'medium';
  }

  const post_type = recruit.count >= 2 ? 'recruitment' : 'ad';

  return {
    game_format, confidence, post_type,
    tournament_signals: tour.matched.slice(0, 4).join('|'),
    cash_signals: (cash.matched.slice(0, 3).join('|')) + (negCash.matched.length ? ' [부정:' + negCash.matched.join(',') + ']' : ''),
    recruit_signals: recruit.matched.slice(0, 3).join('|'),
  };
}

// ── 매장명 추출 ────────────────────────────────────────────────────
// "[매장명] + (점/펍/홀덤펍/홀덤/매장/클럽/라운지/스튜디오)" 패턴만 인정
// 일반 광고 문구 / 게임 형태 설명 / 업무 설명은 매장명으로 인정 X
function extractPubNameFromLines(ctxLines, phoneIdx, startIdx) {
  const ctx = ctxLines.join('\n');
  const result = extractPubName(ctx);
  return result;
}
function extractPubName(ctx) {
  // 명백한 노이즈 (description-style 제외)
  const NOISE_PATTERNS = [
    /링게임/, /토너 데일리/, /데일리 토너/, /레크펍$/, /레크 펍$/,
    /^업무[:\s]/, /^위치[:\s]/, /^급여[:\s]/, /^시급[:\s]/, /^월급[:\s]/,
    /^문의/, /^문자/, /^연락/, /^지원/, /^모집/, /^구인/, /^구합/,
    /^성별/, /^나이/, /^성함/, /^경력/, /^근무/, /^일자/, /^날짜/, /^시간/,
    /^주소/, /^이름/, /^거주/, /^복지/, /^혜택/, /^교육/, /^식사/, /^숙소/,
    /^주차/, /^편의/, /^규모/, /^시설/, /^블라인드/, /^GTD/, /^프라이즈/,
    /^조건/, /^우대/, /^환영/, /^남,/, /^여,/, /^남\s/, /^여\s/,
    /동그라미|네잎클로버|이름|성명|성함/,
    /보여주|남겨주|적어주|문자주/,
    /오픈|진상|분위기|환경/,
    /근무.*시|근무.*요일|근무.*가능/,
  ];

  // 직접 매장 키워드 (이게 있어야 매장명 인정)
  const STRICT_PUB_RE = /^([가-힣A-Za-z0-9\s]{2,20})\s*(홀덤펍|홀덤\s?펍|홀덤|펍|점|매장|클럽|라운지|스튜디오)\s*$/i;

  const linesArr = ctx.split('\n');
  const candidates = [];

  for (let i = 0; i < linesArr.length; i++) {
    const l = linesArr[i];
    // 거리 가중치: 컨텍스트 안에서 전화 줄(끝-3 위치)에 가까울수록 점수 ↑
    // ctx는 phone+3까지 → 전화 줄은 length - 4 위치
    const phonePos = linesArr.length - 4;
    const distance = Math.abs(i - phonePos);
    const proximityBonus = Math.max(0, 5 - distance); // 0~5점
    let cleaned = l.replace(/^\[[^\]]+\]\s*\[(?:오전|오후)\s*\d+:\d+\]\s*/, '').trim();
    let noEmoji = cleaned
      .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27FF}]/gu, '')
      .replace(/[♥♠♣♦◆◇○●▪▫🏳★☆▶◀➖✔✅❤︎\-=_~`!@#$%^&*+|\\?/<>{}\[\]]/g, '')
      .replace(/\(\S+?\)/g, '')  // 카카오톡 (사랑) (스타) (네잎클로버) 등 제거
      .replace(/\s+/g, ' ')
      .trim();
    if (noEmoji.length < 3 || noEmoji.length > 30) continue;
    if (NOISE_PATTERNS.some(rx => rx.test(noEmoji))) continue;

    // 1) 강한 패턴: "ABC 홀덤펍 강남점" 형태
    const m = STRICT_PUB_RE.exec(noEmoji);
    if (m) {
      candidates.push({ name: noEmoji, score: 5 + proximityBonus });
      continue;
    }

    // 2) 매장 키워드 포함 + 짧은 줄
    if (/홀덤|펍|매장|클럽|라운지|스튜디오/.test(noEmoji) && noEmoji.length <= 25) {
      candidates.push({ name: noEmoji, score: 3 + proximityBonus });
      continue;
    }
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0].name;
}

function extractRegion(ctx) {
  const re = /(서울|부산|대구|인천|광주|대전|울산|세종|경기도?|경기|강원|충북|충남|전북|전남|경북|경남|제주)\s*[\w가-힣]*[시구군]?/;
  const m = re.exec(ctx);
  if (m) return m[0].trim();
  // 도시·구 단독 (예: "방이동", "강남구")
  const m2 = /([가-힣]{2,5}(?:시|구|동|역))/.exec(ctx);
  return m2 ? m2[1] : null;
}

// ── 전화번호별로 처리 (중복 제거) ──────────────────────────────────
const records = [];
const seenPhones = new Set();
const stats = {
  total_phones: phoneOccurrences.length,
  unique_pubs: 0,
  ad: 0,
  recruitment: 0,
  by_format: { tournament: 0, cash: 0, mixed: 0, unknown: 0 },
  by_confidence: { high: 0, medium: 0, low: 0 },
};

for (const occ of phoneOccurrences) {
  if (seenPhones.has(occ.phone)) continue;
  seenPhones.add(occ.phone);

  const ctx = getContext(occ.line);
  const pubName = extractPubName(ctx);
  const region = extractRegion(ctx);
  const cls = classify(ctx);

  // 컨텍스트 요약 (앞 80자)
  const summary = ctx
    .replace(/\s+/g, ' ')
    .replace(/^\[[^\]]+\]\s*\[(?:오전|오후)\s*\d+:\d+\]\s*/, '')
    .slice(0, 100);

  records.push({
    name: pubName ?? '(미상)',
    region: region ?? '',
    phone: occ.phone,
    game_format: cls.game_format,
    confidence: cls.confidence,
    post_type: cls.post_type,
    summary,
    tournament_signals: cls.tournament_signals,
    cash_signals: cls.cash_signals,
    recruit_signals: cls.recruit_signals,
  });

  if (cls.post_type === 'recruitment') stats.recruitment++; else stats.ad++;
  stats.by_format[cls.game_format]++;
  stats.by_confidence[cls.confidence]++;
}
stats.unique_pubs = records.length;

// ── CSV 출력 ────────────────────────────────────────────────────────
function csvEscape(s) {
  if (s == null) return '';
  const str = String(s);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}
const header = '매장명,지역,전화번호,game_format,신뢰도,post_type,원문요약,토너시그널,캐쉬시그널,구인시그널\n';
const body = records.map(r =>
  [r.name, r.region, r.phone, r.game_format, r.confidence, r.post_type, r.summary, r.tournament_signals, r.cash_signals, r.recruit_signals]
    .map(csvEscape).join(',')
).join('\n');

fs.writeFileSync(OUT_CSV, header + body, 'utf-8');

// ── 통계 ────────────────────────────────────────────────────────────
const statsText = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[카카오 오픈채팅 홀덤정보 추출 결과]
생성: ${new Date().toLocaleString('ko-KR')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[기본 통계]
- 전체 010 등장 횟수: ${stats.total_phones}
- 고유 매장 (전번 단위): ${stats.unique_pubs}

[메시지 종류]
- 광고 (ad): ${stats.ad}
- 구인글 (recruitment): ${stats.recruitment}

[게임 형태 분류]
- 토너먼트: ${stats.by_format.tournament}
- 캐쉬: ${stats.by_format.cash}
- 둘 다 (mixed): ${stats.by_format.mixed}
- 미분류 (unknown): ${stats.by_format.unknown}

[분류 신뢰도]
- 🟢 high: ${stats.by_confidence.high}
- 🟡 medium: ${stats.by_confidence.medium}
- 🔴 low: ${stats.by_confidence.low}

[출력 파일]
${OUT_CSV}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`.trim();

fs.writeFileSync(OUT_STATS, statsText, 'utf-8');
console.log(statsText);

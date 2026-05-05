// 7장(hole 2 + board 5) 중 최고 5장을 찾는 간단 핸드 평가기
// 공유 카드 하이라이트 용 — 정확한 EV 계산은 백엔드에서

import type { Card } from '../constants/poker';

const RANK_ORDER = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
const rankVal = (r: string) => RANK_ORDER.indexOf(r);

interface ScoredCard extends Card {
  _idx: number; // 원래 배열의 인덱스 (highlight 매핑용)
}

function combos<T>(arr: T[], k: number): T[][] {
  const out: T[][] = [];
  const n = arr.length;
  if (k > n) return out;
  const idx = Array.from({ length: k }, (_, i) => i);
  while (true) {
    out.push(idx.map(i => arr[i]));
    let i = k - 1;
    while (i >= 0 && idx[i] === n - k + i) i--;
    if (i < 0) break;
    idx[i]++;
    for (let j = i + 1; j < k; j++) idx[j] = idx[j - 1] + 1;
  }
  return out;
}

// 5장 핸드 점수 계산 (높을수록 강함)
// 카테고리: 9=스플 8=쿼즈 7=풀하 6=플러시 5=스트레이트 4=트립스 3=투페어 2=원페어 1=하이카드
function scoreFive(cards: Card[]): number {
  const ranks = cards.map(c => rankVal(c.rank)).sort((a, b) => b - a);
  const suits = cards.map(c => c.suit);
  const isFlush = suits.every(s => s === suits[0]);
  // 스트레이트 체크 (A-5 휠 포함)
  const uniqueRanks = [...new Set(ranks)].sort((a, b) => b - a);
  let isStraight = false;
  let straightHigh = 0;
  if (uniqueRanks.length === 5) {
    if (uniqueRanks[0] - uniqueRanks[4] === 4) {
      isStraight = true;
      straightHigh = uniqueRanks[0];
    } else if (uniqueRanks[0] === 12 && uniqueRanks[1] === 3 && uniqueRanks[4] === 0) {
      // A-5 휠
      isStraight = true;
      straightHigh = 3;
    }
  }
  // rank 그룹 (페어, 트립스, 풀하 등)
  const counts: Record<number, number> = {};
  ranks.forEach(r => { counts[r] = (counts[r] || 0) + 1; });
  const groups = Object.entries(counts)
    .map(([r, c]) => ({ r: Number(r), c }))
    .sort((a, b) => b.c - a.c || b.r - a.r);
  const cnt = groups.map(g => g.c);

  let category = 1; // 하이카드
  let kicker: number[] = [];

  if (isFlush && isStraight) { category = 9; kicker = [straightHigh]; }
  else if (cnt[0] === 4) { category = 8; kicker = [groups[0].r, groups[1].r]; }
  else if (cnt[0] === 3 && cnt[1] === 2) { category = 7; kicker = [groups[0].r, groups[1].r]; }
  else if (isFlush) { category = 6; kicker = ranks; }
  else if (isStraight) { category = 5; kicker = [straightHigh]; }
  else if (cnt[0] === 3) { category = 4; kicker = [groups[0].r, ...groups.slice(1).map(g => g.r).sort((a, b) => b - a).slice(0, 2)]; }
  else if (cnt[0] === 2 && cnt[1] === 2) {
    const pairs = [groups[0].r, groups[1].r].sort((a, b) => b - a);
    category = 3; kicker = [...pairs, groups[2].r];
  }
  else if (cnt[0] === 2) { category = 2; kicker = [groups[0].r, ...groups.slice(1).map(g => g.r).sort((a, b) => b - a).slice(0, 3)]; }
  else { category = 1; kicker = ranks; }

  // 스코어 = 카테고리 * 13^5 + sum(kicker[i] * 13^(4-i))
  let score = category * Math.pow(13, 6);
  for (let i = 0; i < kicker.length && i < 6; i++) {
    score += kicker[i] * Math.pow(13, 5 - i);
  }
  return score;
}

/**
 * 7장(hole 2 + board 5)에서 최고 5장 찾기
 * @returns 베스트 5장의 _idx 배열 (입력 순서 기준)
 */
export function findBestFiveIndices(holeCards: Card[], board: Card[]): Set<number> {
  if (!holeCards || holeCards.length !== 2 || !board || board.length < 3) {
    // 카드 부족 — 모든 카드 반환
    return new Set([...holeCards.map((_, i) => i), ...board.map((_, i) => 100 + i)]);
  }
  // _idx 부여: hole = 0,1 / board = 100,101,102,103,104
  const tagged: ScoredCard[] = [
    ...holeCards.map((c, i) => ({ ...c, _idx: i })),
    ...board.map((c, i) => ({ ...c, _idx: 100 + i })),
  ];
  const all5 = combos(tagged, 5);
  let best: ScoredCard[] | null = null;
  let bestScore = -1;
  for (const five of all5) {
    const s = scoreFive(five);
    if (s > bestScore) {
      bestScore = s;
      best = five;
    }
  }
  return new Set((best ?? tagged).map(c => c._idx));
}

/**
 * 카드가 베스트 5에 포함되는지 — UI에서 호출하기 쉬운 헬퍼
 * @param indices findBestFiveIndices 결과
 * @param holeIdx 0 or 1 (hole), or pass null
 * @param boardIdx 0~4 (board), or pass null
 */
export function isInBestFive(indices: Set<number>, holeIdx: number | null, boardIdx: number | null): boolean {
  if (holeIdx != null) return indices.has(holeIdx);
  if (boardIdx != null) return indices.has(100 + boardIdx);
  return false;
}

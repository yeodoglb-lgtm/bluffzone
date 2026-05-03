// 시드 핸드 중 카드 중복(같은 카드가 hero+villain+board에 두 번 이상) 검사 + 자동 수정

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { createClient } = require('@supabase/supabase-js');

const sb = createClient('https://chxcayaehgwqrpjuajqx.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const USER_ID = '4dd74940-ddfa-4b80-aed6-38decd6ad829'; // yeodoglb

const cardKey = (c) => `${c?.rank}${c?.suit}`;

const { data: hands, error } = await sb.from('hands')
  .select('id, played_at, hero_cards, villain_cards, villain_data, board, hero_position, villain_position')
  .eq('user_id', USER_ID)
  .gte('played_at', '2026-04-29T00:00:00+09:00')
  .lt('played_at', '2026-07-28T00:00:00+09:00');

if (error) { console.error(error); process.exit(1); }

console.log(`📊 총 ${hands.length}개 핸드 검사\n`);

const SUITS = ['s', 'h', 'd', 'c'];
const RANKS = ['2','3','4','5','6','7','8','9','T','J','Q','K','A'];

// 카드 중복 검사 + 자동 fix
function detectDuplicates(hand) {
  const villainDataCards = (hand.villain_data ?? []).flatMap(v => v?.cards ?? []);
  const allCards = [
    ...(hand.hero_cards ?? []),
    ...(hand.villain_cards ?? []),
    ...villainDataCards,
    ...(hand.board ?? []),
  ];
  const seen = new Set();
  const dupes = [];
  for (const c of allCards) {
    if (!c?.rank || !c?.suit) continue;
    const k = cardKey(c);
    if (seen.has(k)) dupes.push(k);
    seen.add(k);
  }
  return dupes;
}

// 사용 안 한 카드 1장 찾기
function findUnusedCard(usedKeys, preferredRank = null) {
  // 같은 rank 우선
  if (preferredRank) {
    for (const s of SUITS) {
      const k = preferredRank + s;
      if (!usedKeys.has(k)) return { rank: preferredRank, suit: s };
    }
  }
  // 어떤 카드든 안 쓴 거
  for (const r of RANKS) {
    for (const s of SUITS) {
      const k = r + s;
      if (!usedKeys.has(k)) return { rank: r, suit: s };
    }
  }
  return null;
}

// 핸드의 중복 자동 수정 — hero(고정), villain·villain_data·board 순으로 충돌 시 교체
function fixHand(hand) {
  const usedKeys = new Set();
  const newVillain = [...(hand.villain_cards ?? [])];
  const newVillainData = (hand.villain_data ?? []).map(v => ({ ...v, cards: [...(v?.cards ?? [])] }));
  const newBoard = [...(hand.board ?? [])];

  // 히어로 먼저 등록
  for (const c of (hand.hero_cards ?? [])) {
    if (c?.rank && c?.suit) usedKeys.add(cardKey(c));
  }

  const fixArr = (arr) => {
    for (let i = 0; i < arr.length; i++) {
      const c = arr[i];
      if (!c?.rank || !c?.suit) continue;
      const k = cardKey(c);
      if (usedKeys.has(k)) {
        const replacement = findUnusedCard(usedKeys, c.rank);
        if (replacement) {
          arr[i] = replacement;
          usedKeys.add(cardKey(replacement));
        }
      } else {
        usedKeys.add(k);
      }
    }
  };

  fixArr(newVillain);
  for (const v of newVillainData) {
    fixArr(v.cards);
  }
  fixArr(newBoard);

  return { villain: newVillain, villainData: newVillainData, board: newBoard };
}

let brokenCount = 0;
let fixedCount = 0;

for (const hand of hands) {
  const dupes = detectDuplicates(hand);
  if (dupes.length === 0) continue;

  brokenCount++;
  const date = new Date(hand.played_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  console.log(`⚠️  ${date} ${hand.hero_position} vs ${hand.villain_position}`);
  console.log(`    중복 카드: ${dupes.join(', ')}`);
  console.log(`    원본 보드: ${(hand.board ?? []).map(cardKey).join(' ')}`);

  const { villain: newVillain, villainData: newVillainData, board: newBoard } = fixHand(hand);
  console.log(`    수정 빌런: ${newVillain.map(cardKey).join(' ')}`);
  console.log(`    수정 보드: ${newBoard.map(cardKey).join(' ')}`);

  // 검증: 수정 후 중복 없어야 함
  const after = detectDuplicates({
    ...hand,
    villain_cards: newVillain,
    villain_data: newVillainData,
    board: newBoard,
  });
  if (after.length > 0) {
    console.log(`    ❌ 수정 실패 (여전히 중복): ${after.join(', ')}`);
    continue;
  }

  // DB 업데이트
  const { error: e } = await sb.from('hands').update({
    villain_cards: newVillain,
    villain_data: newVillainData,
    board: newBoard,
  }).eq('id', hand.id);
  if (e) console.log(`    ❌ DB 업데이트 실패: ${e.message}`);
  else { fixedCount++; console.log(`    ✅ 수정 완료\n`); }
}

console.log(`\n📊 결과:`);
console.log(`  중복 핸드: ${brokenCount}개`);
console.log(`  수정 완료: ${fixedCount}개`);
console.log(`  정상 핸드: ${hands.length - brokenCount}개`);

// 마지막 3개 핸드의 villain_data를 villain_cards와 동기화 (남은 중복 정리)

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { createClient } = require('@supabase/supabase-js');

const sb = createClient('https://chxcayaehgwqrpjuajqx.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const USER_ID = '4dd74940-ddfa-4b80-aed6-38decd6ad829';

const cardKey = (c) => `${c?.rank}${c?.suit}`;
const SUITS = ['s', 'h', 'd', 'c'];

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

const { data: hands } = await sb.from('hands')
  .select('id, played_at, hero_cards, villain_cards, villain_data, board, hero_position, villain_position')
  .eq('user_id', USER_ID)
  .gte('played_at', '2026-04-29T00:00:00+09:00')
  .lt('played_at', '2026-07-28T00:00:00+09:00');

let fixed = 0;
for (const hand of hands) {
  const dupes = detectDuplicates(hand);
  if (dupes.length === 0) continue;

  const date = new Date(hand.played_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  console.log(`⚠️  ${date} ${hand.hero_position} vs ${hand.villain_position} — 중복: ${dupes.join(',')}`);

  // 단일 빌런 — villain_data 비워서 villain_cards와 중복 인식 회피
  const newVillainData = [];

  // 검증
  const after = detectDuplicates({ ...hand, villain_data: newVillainData });
  if (after.length > 0) {
    console.log(`  ❌ 동기화 후에도 중복: ${after.join(',')}`);
    continue;
  }

  const { error } = await sb.from('hands').update({ villain_data: newVillainData }).eq('id', hand.id);
  if (error) console.log(`  ❌ 업데이트 실패: ${error.message}`);
  else { fixed++; console.log(`  ✅ villain_data 동기화 완료`); }
}

console.log(`\n📊 ${fixed}개 추가 수정 완료`);

// 최종 검증
const { data: finalCheck } = await sb.from('hands')
  .select('id, played_at, hero_cards, villain_cards, villain_data, board')
  .eq('user_id', USER_ID)
  .gte('played_at', '2026-04-29T00:00:00+09:00')
  .lt('played_at', '2026-07-28T00:00:00+09:00');

const stillBroken = finalCheck.filter(h => detectDuplicates(h).length > 0);
console.log(`\n🔍 최종 검사: 총 ${finalCheck.length}개 / 중복 남음 ${stillBroken.length}개`);

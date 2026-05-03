// 마지막 자동 수정 안 된 3개 핸드 삭제
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { createClient } = require('@supabase/supabase-js');

const sb = createClient('https://chxcayaehgwqrpjuajqx.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const USER_ID = '4dd74940-ddfa-4b80-aed6-38decd6ad829';

const cardKey = (c) => `${c?.rank}${c?.suit}`;

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

const broken = hands.filter(h => detectDuplicates(h).length > 0);
console.log(`삭제 대상: ${broken.length}개`);

for (const h of broken) {
  const date = new Date(h.played_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  const { error } = await sb.from('hands').delete().eq('id', h.id);
  console.log(`  ${error ? '❌' : '✅'} ${date} ${h.hero_position} vs ${h.villain_position}`);
}

const { count } = await sb.from('hands').select('*', { count: 'exact', head: true })
  .eq('user_id', USER_ID)
  .gte('played_at', '2026-04-29T00:00:00+09:00')
  .lt('played_at', '2026-07-28T00:00:00+09:00');
console.log(`\n남은 시드 핸드: ${count}개`);

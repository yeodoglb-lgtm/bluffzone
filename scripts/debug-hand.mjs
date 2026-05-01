import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { createClient } = require('@supabase/supabase-js');

const sb = createClient('https://chxcayaehgwqrpjuajqx.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const handId = 'cd5a6692-4e6f-4704-9f68-7b8b4c5e5525';
const userId = '3e8cc9e3-0dd2-4444-a78e-022552efc5d8';

const { data: hand, error: e1 } = await sb.from('hands').select('*').eq('id', handId).single();
console.log('핸드 조회:', e1 ? `❌ ${e1.message}` : '✅');
if (hand) {
  console.log('  user_id:', hand.user_id);
  console.log('  is_tournament:', hand.is_tournament);
  console.log('  review_status:', hand.review_status);
  console.log('  hero_position:', hand.hero_position);
}

const { data: profile } = await sb.from('profiles').select('display_name').eq('id', userId).single();
console.log('\n유저:', profile?.display_name ?? '(닉네임 없음)');

// 최근 hand_review_cache 에러 추적
const { data: recentReviews } = await sb.from('hand_review_cache')
  .select('id, cache_key, created_at')
  .order('created_at', { ascending: false })
  .limit(3);
console.log('\n최근 review cache:', recentReviews?.length ?? 0, '개');

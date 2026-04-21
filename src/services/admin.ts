import { supabase } from './supabase';

export interface AdminOverviewStats {
  total_users: number;
  total_hands: number;
  total_sessions: number;
  new_users_7d: number;
  new_hands_7d: number;
}

export interface AdminUserStat {
  id: string;
  display_name: string | null;
  role: string;
  created_at: string;
  hand_count: number;
  session_count: number;
}

export async function fetchAdminOverview(): Promise<AdminOverviewStats> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: total_users },
    { count: total_hands },
    { count: total_sessions },
    { count: new_users_7d },
    { count: new_hands_7d },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('hands').select('*', { count: 'exact', head: true }),
    supabase.from('sessions').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
    supabase.from('hands').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
  ]);

  return {
    total_users: total_users ?? 0,
    total_hands: total_hands ?? 0,
    total_sessions: total_sessions ?? 0,
    new_users_7d: new_users_7d ?? 0,
    new_hands_7d: new_hands_7d ?? 0,
  };
}

export async function fetchAdminUsers(): Promise<AdminUserStat[]> {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, display_name, role, created_at')
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!profiles || profiles.length === 0) return [];

  // 핸드/세션 수 집계
  const [{ data: hands }, { data: sessions }] = await Promise.all([
    supabase.from('hands').select('user_id'),
    supabase.from('sessions').select('user_id'),
  ]);

  const handCounts: Record<string, number> = {};
  const sessionCounts: Record<string, number> = {};

  (hands ?? []).forEach(h => {
    handCounts[h.user_id] = (handCounts[h.user_id] ?? 0) + 1;
  });
  (sessions ?? []).forEach(s => {
    sessionCounts[s.user_id] = (sessionCounts[s.user_id] ?? 0) + 1;
  });

  return profiles.map(p => ({
    id: p.id,
    display_name: p.display_name,
    role: p.role ?? 'user',
    created_at: p.created_at,
    hand_count: handCounts[p.id] ?? 0,
    session_count: sessionCounts[p.id] ?? 0,
  }));
}

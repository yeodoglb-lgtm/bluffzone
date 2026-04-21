import { supabase } from './supabase';
import type { Session, SessionWithProfit } from '../types/database';

// ── 월별 세션 조회 (캘린더용) ────────────────────────────────────────────────
// userId: null 이면 어드민 전체 조회
export async function fetchSessionsByMonth(
  userId: string | null,
  year: number,
  month: number
): Promise<SessionWithProfit[]> {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const end = new Date(year, month, 0).toISOString().split('T')[0];

  let query = supabase
    .from('v_sessions')
    .select('*')
    .gte('played_on', start)
    .lte('played_on', end)
    .order('played_on', { ascending: true });

  if (userId) query = query.eq('user_id', userId);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as SessionWithProfit[];
}

// ── 특정 날짜 세션 조회 ────────────────────────────────────────────────────────
export async function fetchSessionsByDate(
  userId: string | null,
  date: string
): Promise<SessionWithProfit[]> {
  let query = supabase
    .from('v_sessions')
    .select('*')
    .eq('played_on', date)
    .order('started_at', { ascending: true });

  if (userId) query = query.eq('user_id', userId);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as SessionWithProfit[];
}

// ── 기간별 세션 조회 (통계용) ──────────────────────────────────────────────────
export async function fetchSessionsByRange(
  userId: string | null,
  from: string,
  to: string
): Promise<SessionWithProfit[]> {
  let query = supabase
    .from('v_sessions')
    .select('*')
    .gte('played_on', from)
    .lte('played_on', to)
    .order('played_on', { ascending: true });

  if (userId) query = query.eq('user_id', userId);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as SessionWithProfit[];
}

// ── 세션 단건 조회 ─────────────────────────────────────────────────────────────
export async function fetchSession(id: string): Promise<SessionWithProfit | null> {
  const { data, error } = await supabase
    .from('v_sessions')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  return data as SessionWithProfit;
}

// ── 세션 생성 ─────────────────────────────────────────────────────────────────
export type SessionInput = Omit<Session, 'id' | 'user_id' | 'created_at'>;

export async function createSession(input: SessionInput): Promise<Session> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('sessions')
    .insert({ ...input, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data as Session;
}

// ── 세션 수정 ─────────────────────────────────────────────────────────────────
export async function updateSession(
  id: string,
  input: Partial<SessionInput>
): Promise<Session> {
  const { data, error } = await supabase
    .from('sessions')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Session;
}

// ── 세션 삭제 ─────────────────────────────────────────────────────────────────
export async function deleteSession(id: string): Promise<void> {
  const { error } = await supabase.from('sessions').delete().eq('id', id);
  if (error) throw error;
}

// ── 어드민: 유저 프로필 맵 조회 (uid → display_name) ──────────────────────────
export async function fetchUserNameMap(): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name');

  if (error) return {};
  const map: Record<string, string> = {};
  (data ?? []).forEach((p: any) => {
    map[p.id] = p.display_name ?? p.id.slice(0, 6);
  });
  return map;
}

// ── 날짜별 집계 (캘린더 dot 데이터) ───────────────────────────────────────────
export type DayStats = {
  date: string;
  net_profit: number;
  session_count: number;
};

export function aggregateByDay(sessions: SessionWithProfit[]): Record<string, DayStats> {
  return sessions.reduce<Record<string, DayStats>>((acc, s) => {
    const d = s.played_on;
    if (!acc[d]) acc[d] = { date: d, net_profit: 0, session_count: 0 };
    acc[d].net_profit += Number(s.net_profit);
    acc[d].session_count += 1;
    return acc;
  }, {});
}

// ── 기간 통계 계산 ─────────────────────────────────────────────────────────────
export type PeriodStats = {
  totalProfit: number;
  sessionCount: number;
  winCount: number;
  winRate: number;
  avgProfit: number;
  totalHours: number;
  hourlyProfit: number | null;
};

export function calcPeriodStats(sessions: SessionWithProfit[]): PeriodStats {
  const totalProfit = sessions.reduce((sum, s) => sum + Number(s.net_profit), 0);
  const winCount = sessions.filter(s => Number(s.net_profit) > 0).length;
  const totalHours = sessions.reduce((sum, s) => {
    if (!s.started_at || !s.ended_at) return sum;
    const mins = (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000;
    return sum + Math.max(0, mins) / 60;
  }, 0);
  return {
    totalProfit,
    sessionCount: sessions.length,
    winCount,
    winRate: sessions.length > 0 ? (winCount / sessions.length) * 100 : 0,
    avgProfit: sessions.length > 0 ? totalProfit / sessions.length : 0,
    totalHours,
    hourlyProfit: totalHours > 0 ? totalProfit / totalHours : null,
  };
}

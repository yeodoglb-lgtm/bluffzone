import { supabase } from './supabase';
import type { Session, SessionWithProfit } from '../types/database';

// ── 월별 세션 조회 (캘린더용) ────────────────────────────────────────────────
export async function fetchSessionsByMonth(
  userId: string,
  year: number,
  month: number
): Promise<SessionWithProfit[]> {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const end = new Date(year, month, 0).toISOString().split('T')[0]; // 월 말일

  const { data, error } = await supabase
    .from('v_sessions')
    .select('*')
    .eq('user_id', userId)
    .gte('played_on', start)
    .lte('played_on', end)
    .order('played_on', { ascending: true });

  if (error) throw error;
  return (data ?? []) as SessionWithProfit[];
}

// ── 특정 날짜 세션 조회 ────────────────────────────────────────────────────────
export async function fetchSessionsByDate(
  userId: string,
  date: string
): Promise<SessionWithProfit[]> {
  const { data, error } = await supabase
    .from('v_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('played_on', date)
    .order('started_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as SessionWithProfit[];
}

// ── 기간별 세션 조회 (통계용) ──────────────────────────────────────────────────
export async function fetchSessionsByRange(
  userId: string,
  from: string,
  to: string
): Promise<SessionWithProfit[]> {
  const { data, error } = await supabase
    .from('v_sessions')
    .select('*')
    .eq('user_id', userId)
    .gte('played_on', from)
    .lte('played_on', to)
    .order('played_on', { ascending: true });

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
};

export function calcPeriodStats(sessions: SessionWithProfit[]): PeriodStats {
  const totalProfit = sessions.reduce((sum, s) => sum + Number(s.net_profit), 0);
  const winCount = sessions.filter(s => Number(s.net_profit) > 0).length;
  return {
    totalProfit,
    sessionCount: sessions.length,
    winCount,
    winRate: sessions.length > 0 ? (winCount / sessions.length) * 100 : 0,
    avgProfit: sessions.length > 0 ? totalProfit / sessions.length : 0,
  };
}

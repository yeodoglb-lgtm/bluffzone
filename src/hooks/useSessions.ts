import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import {
  fetchSessionsByMonth,
  fetchSessionsByDate,
  fetchSessionsByRange,
  fetchUserNameMap,
  createSession,
  updateSession,
  deleteSession,
  type SessionInput,
} from '../services/sessions';

const KEYS = {
  month: (key: string, y: number, m: number) => ['sessions', 'month', key, y, m],
  date: (key: string, d: string) => ['sessions', 'date', key, d],
  range: (key: string, from: string, to: string) => ['sessions', 'range', key, from, to],
};

export function useSessionsByMonth(year: number, month: number) {
  const { session, profile } = useAuthStore();
  const uid = session?.user.id ?? '';
  const isAdmin = profile?.role === 'admin';
  // 어드민이면 null → 전체 유저 세션 조회, 일반 유저는 본인 것만
  const queryUid = isAdmin ? null : uid;
  const cacheKey = isAdmin ? 'admin' : uid;
  return useQuery({
    queryKey: KEYS.month(cacheKey, year, month),
    queryFn: () => fetchSessionsByMonth(queryUid, year, month),
    enabled: !!uid,
    staleTime: 1000 * 60 * 2,
  });
}

export function useSessionsByDate(date: string) {
  const { session, profile } = useAuthStore();
  const uid = session?.user.id ?? '';
  const isAdmin = profile?.role === 'admin';
  const queryUid = isAdmin ? null : uid;
  const cacheKey = isAdmin ? 'admin' : uid;
  return useQuery({
    queryKey: KEYS.date(cacheKey, date),
    queryFn: () => fetchSessionsByDate(queryUid, date),
    enabled: !!uid && !!date,
  });
}

export function useSessionsByRange(from: string, to: string) {
  const { session, profile } = useAuthStore();
  const uid = session?.user.id ?? '';
  const isAdmin = profile?.role === 'admin';
  const queryUid = isAdmin ? null : uid;
  const cacheKey = isAdmin ? 'admin' : uid;
  return useQuery({
    queryKey: KEYS.range(cacheKey, from, to),
    queryFn: () => fetchSessionsByRange(queryUid, from, to),
    enabled: !!uid && !!from && !!to,
  });
}

export function useCreateSession() {
  const qc = useQueryClient();
  const { session } = useAuthStore();
  const uid = session?.user.id ?? '';

  return useMutation({
    mutationFn: (input: SessionInput) => createSession(input),
    onSuccess: data => {
      const [y, m] = data.played_on.split('-').map(Number);
      qc.invalidateQueries({ queryKey: ['sessions', 'month', uid, y, m] });
      qc.invalidateQueries({ queryKey: ['sessions', 'date', uid, data.played_on] });
      qc.invalidateQueries({ queryKey: ['sessions', 'range'] });
    },
  });
}

export function useUpdateSession() {
  const qc = useQueryClient();
  const { session } = useAuthStore();
  const uid = session?.user.id ?? '';

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<SessionInput> }) =>
      updateSession(id, input),
    onSuccess: data => {
      const [y, m] = data.played_on.split('-').map(Number);
      qc.invalidateQueries({ queryKey: ['sessions', 'month', uid, y, m] });
      qc.invalidateQueries({ queryKey: ['sessions', 'date', uid, data.played_on] });
      qc.invalidateQueries({ queryKey: ['sessions', 'range'] });
    },
  });
}

export function useDeleteSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; playedOn: string }) => deleteSession(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
}

// 어드민: uid → display_name 맵 (세션 카드에서 유저 이름 표시용)
export function useUserNameMap() {
  const { profile } = useAuthStore();
  const isAdmin = profile?.role === 'admin';
  return useQuery({
    queryKey: ['admin', 'userNameMap'],
    queryFn: fetchUserNameMap,
    enabled: isAdmin,
    staleTime: 1000 * 60 * 10, // 10분 캐시
  });
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import {
  fetchSessionsByMonth,
  fetchSessionsByDate,
  fetchSessionsByRange,
  createSession,
  updateSession,
  deleteSession,
  type SessionInput,
} from '../services/sessions';

const KEYS = {
  month: (uid: string, y: number, m: number) => ['sessions', 'month', uid, y, m],
  date: (uid: string, d: string) => ['sessions', 'date', uid, d],
  range: (uid: string, from: string, to: string) => ['sessions', 'range', uid, from, to],
};

export function useSessionsByMonth(year: number, month: number) {
  const { session } = useAuthStore();
  const uid = session?.user.id ?? '';
  return useQuery({
    queryKey: KEYS.month(uid, year, month),
    queryFn: () => fetchSessionsByMonth(uid, year, month),
    enabled: !!uid,
    staleTime: 1000 * 60 * 2,
  });
}

export function useSessionsByDate(date: string) {
  const { session } = useAuthStore();
  const uid = session?.user.id ?? '';
  return useQuery({
    queryKey: KEYS.date(uid, date),
    queryFn: () => fetchSessionsByDate(uid, date),
    enabled: !!uid && !!date,
  });
}

export function useSessionsByRange(from: string, to: string) {
  const { session } = useAuthStore();
  const uid = session?.user.id ?? '';
  return useQuery({
    queryKey: KEYS.range(uid, from, to),
    queryFn: () => fetchSessionsByRange(uid, from, to),
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

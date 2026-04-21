import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import {
  fetchHands,
  fetchHand,
  createHand,
  updateHand,
  deleteHand,
  type HandInsert,
} from '../services/hands';

export function useHands(limit = 50) {
  const { session } = useAuthStore();
  const uid = session?.user?.id ?? '';
  return useQuery({
    queryKey: ['hands', uid, limit],
    queryFn: () => fetchHands(limit),
    enabled: !!uid,
    staleTime: 1000 * 60 * 2,
  });
}

export function useHand(id: string | undefined) {
  return useQuery({
    queryKey: ['hands', id],
    queryFn: () => fetchHand(id!),
    enabled: !!id,
  });
}

export function useCreateHand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: HandInsert) => createHand(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hands'] });
    },
  });
}

export function useUpdateHand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<HandInsert> }) =>
      updateHand(id, data),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['hands'] });
      qc.invalidateQueries({ queryKey: ['hands', id] });
    },
  });
}

export function useDeleteHand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteHand(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hands'] });
    },
  });
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import {
  submitFeedback,
  fetchMyFeedback,
  fetchAllFeedbackAdmin,
  updateFeedbackStatus,
  type FeedbackInput,
  type FeedbackStatus,
} from '../services/feedback';

// ── 의견 등록 (사용자) ───────────────────────────────────────────────────────
export function useSubmitFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: FeedbackInput) => submitFeedback(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feedback'] });
    },
  });
}

// ── 내 의견 이력 ─────────────────────────────────────────────────────────────
export function useMyFeedback(limit = 50) {
  const { session } = useAuthStore();
  const uid = session?.user?.id ?? '';
  return useQuery({
    queryKey: ['feedback', 'mine', uid],
    queryFn: () => fetchMyFeedback(limit),
    enabled: !!uid,
    staleTime: 1000 * 30,
  });
}

// ── 어드민: 모든 의견 ───────────────────────────────────────────────────────
export function useAllFeedbackAdmin() {
  const { profile } = useAuthStore();
  const isAdmin = profile?.role === 'admin';
  return useQuery({
    queryKey: ['feedback', 'admin', 'all'],
    queryFn: () => fetchAllFeedbackAdmin(200),
    enabled: isAdmin,
    staleTime: 1000 * 30,
  });
}

// ── 어드민: 상태 변경 ───────────────────────────────────────────────────────
export function useUpdateFeedbackStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, adminNote }: { id: string; status: FeedbackStatus; adminNote?: string | null }) =>
      updateFeedbackStatus(id, status, adminNote),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feedback'] });
    },
  });
}

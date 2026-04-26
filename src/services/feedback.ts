import { supabase } from './supabase';
import { withTimeout } from './queryTimeout';

export type FeedbackCategory = 'general' | 'bug' | 'feature' | 'praise';
export type FeedbackStatus = 'new' | 'read' | 'replied' | 'closed';

export interface Feedback {
  id: string;
  user_id: string | null;
  category: FeedbackCategory;
  subject: string;
  content: string;
  status: FeedbackStatus;
  admin_note: string | null;
  user_email: string | null;
  user_agent: string | null;
  created_at: string;
  updated_at: string;
}

export interface FeedbackInput {
  category: FeedbackCategory;
  subject: string;
  content: string;
  user_email?: string | null;
  user_agent?: string | null;
}

// 어드민 조회용: 작성자 닉네임 포함
export interface FeedbackWithUser extends Feedback {
  display_name: string | null;
}

// ── 의견 등록 (사용자) ──────────────────────────────────────────────────────
export async function submitFeedback(input: FeedbackInput): Promise<Feedback> {
  return withTimeout((async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const payload = {
      user_id: user.id,
      category: input.category,
      subject: input.subject.trim(),
      content: input.content.trim(),
      user_email: input.user_email ?? user.email ?? null,
      user_agent: input.user_agent ?? null,
    };

    const { data, error } = await supabase
      .from('feedback')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data as Feedback;
  })());
}

// ── 내 의견 이력 조회 ───────────────────────────────────────────────────────
export async function fetchMyFeedback(limit = 50): Promise<Feedback[]> {
  return withTimeout((async () => {
    const { data, error } = await supabase
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data ?? []) as Feedback[];
  })());
}

// ── 어드민: 모든 의견 조회 ──────────────────────────────────────────────────
export async function fetchAllFeedbackAdmin(limit = 200): Promise<Feedback[]> {
  return withTimeout((async () => {
    const { data, error } = await supabase
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data ?? []) as Feedback[];
  })());
}

// ── 어드민: 상태 변경 ───────────────────────────────────────────────────────
export async function updateFeedbackStatus(
  id: string,
  status: FeedbackStatus,
  adminNote?: string | null
): Promise<Feedback> {
  return withTimeout((async () => {
    const { data, error } = await supabase
      .from('feedback')
      .update({ status, admin_note: adminNote ?? null })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Feedback;
  })());
}

import { supabase } from './supabase';
import { withTimeout } from './queryTimeout';
import type { Profile } from '../types/database';

// ── 프로필 조회/동기화 ─────────────────────────────────────────────────────────
export async function fetchProfile(userId: string): Promise<Profile | null> {
  return withTimeout((async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('fetchProfile error:', error.message);
      return null;
    }
    return data as Profile;
  })());
}

export async function updateProfile(
  userId: string,
  updates: Partial<Omit<Profile, 'id' | 'created_at'>>
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('updateProfile error:', error.message);
    return null;
  }
  return data as Profile;
}

// ── 로그아웃 ─────────────────────────────────────────────────────────────────
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

// ── 계정 삭제 (소프트 — Edge Function 또는 service_role 필요) ────────────────
export async function deleteAccount(): Promise<{ error: string | null }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: 'Not authenticated' };

  const res = await fetch(
    `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/delete-account`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    }
  );

  if (!res.ok) return { error: await res.text() };
  return { error: null };
}

import { supabase } from './supabase';
import type { ChatMessage } from './claudeApi';

export interface StoredMessage extends ChatMessage {
  id: string;
  created_at: string;
}

/** 현재 사용자의 "최신 채팅"을 가져오거나, 없으면 생성해서 반환 */
export async function getOrCreateChat(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('로그인이 필요합니다');

  // 가장 최근 채팅 조회
  const { data: existing, error: selErr } = await supabase
    .from('ai_chats')
    .select('id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (selErr) throw selErr;
  if (existing?.id) return existing.id as string;

  // 없으면 생성
  const { data: created, error: insErr } = await supabase
    .from('ai_chats')
    .insert({ user_id: user.id, title: '블러프존 홀덤 알파고' })
    .select('id')
    .single();

  if (insErr) throw insErr;
  return created.id as string;
}

/** 해당 채팅의 모든 메시지를 시간순(오래된→최신)으로 로드 */
export async function loadMessages(chatId: string): Promise<StoredMessage[]> {
  const { data, error } = await supabase
    .from('ai_messages')
    .select('id, role, content, created_at')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(m => ({
    id: m.id as string,
    role: m.role as ChatMessage['role'],
    content: m.content as string,
    created_at: m.created_at as string,
  }));
}

/** 메시지 저장 */
export async function saveMessage(
  chatId: string,
  role: ChatMessage['role'],
  content: string
): Promise<void> {
  const { error } = await supabase
    .from('ai_messages')
    .insert({ chat_id: chatId, role, content });
  if (error) throw error;
}

/** 채팅 초기화 (모든 메시지 삭제) */
export async function clearMessages(chatId: string): Promise<void> {
  const { error } = await supabase
    .from('ai_messages')
    .delete()
    .eq('chat_id', chatId);
  if (error) throw error;
}

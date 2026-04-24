/**
 * OpenAI 프록시 클라이언트
 *
 * Supabase Edge Function(`/claude-proxy`)을 호출합니다.
 * Edge Function 이름은 과거 Anthropic 시절의 네이밍이라 `claude-proxy`로 남아있으나,
 * 내부 구현은 전부 OpenAI(gpt-4o / gpt-4o-mini)입니다.
 */
import { supabase } from './supabase';
import type { Hand } from '../types/database';

const FUNCTION_BASE = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/claude-proxy`;

async function getAuthHeader(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');
  return `Bearer ${session.access_token}`;
}

// ── 음성 텍스트 → 핸드 파싱 ──────────────────────────────────────────────────
// 모델: gpt-4o (서버 기본값, 정확도 우선)
export async function parseVoiceToHand(text: string): Promise<Partial<Hand>> {
  const authHeader = await getAuthHeader();

  const res = await fetch(`${FUNCTION_BASE}/parse-voice`, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message ?? `Voice parse failed: ${res.status}`);
  }

  return res.json() as Promise<Partial<Hand>>;
}

// ── AI 채팅 스트리밍 ──────────────────────────────────────────────────────────
// 모델: gpt-4o-mini (서버 기본값, 비용 우선)
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function* streamChat(
  messages: ChatMessage[],
  model: string = 'gpt-4o-mini',
  systemPrompt?: string
): AsyncGenerator<string> {
  const authHeader = await getAuthHeader();

  const res = await fetch(`${FUNCTION_BASE}/chat`, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages, model, systemPrompt }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message ?? `Chat failed: ${res.status}`);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6);
      if (data === '[DONE]') return;

      try {
        const parsed = JSON.parse(data);
        const delta = parsed.delta?.text ?? parsed.delta?.content?.[0]?.text;
        if (delta) yield delta;
      } catch {
        // SSE 파싱 실패는 무시
      }
    }
  }
}

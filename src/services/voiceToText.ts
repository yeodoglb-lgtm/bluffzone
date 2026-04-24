import { supabase } from './supabase';

const WHISPER_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/whisper-proxy`;

async function getAuthHeader(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');
  return `Bearer ${session.access_token}`;
}

/**
 * 오디오 Blob/File을 Whisper API로 전송 → 한국어 텍스트 반환
 * - 플랫폼 중립: Blob만 주면 웹/네이티브 어디서든 동작
 */
export async function transcribeAudio(audio: Blob, filename = 'recording.webm'): Promise<string> {
  const auth = await getAuthHeader();

  const formData = new FormData();
  formData.append('file', audio as any, filename);

  const res = await fetch(WHISPER_URL, {
    method: 'POST',
    headers: { Authorization: auth },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `Whisper error: ${res.status}`);
  }

  const data = await res.json();
  return (data.text as string) ?? '';
}

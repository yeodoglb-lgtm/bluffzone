import { useRef, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { transcribeAudio } from '../services/voiceToText';

type Status = 'idle' | 'recording' | 'transcribing' | 'error';

interface UseVoiceRecorder {
  status: Status;
  error: string | null;
  start: () => Promise<void>;
  stop: () => Promise<string>; // 녹음 종료 후 텍스트 반환
  cancel: () => void;
}

/**
 * 음성 녹음 + Whisper 변환 훅
 * - 웹: MediaRecorder API 사용
 * - 네이티브(iOS/Android): 현재는 미지원 (추후 expo-av로 확장 예정)
 */
export function useVoiceRecorder(): UseVoiceRecorder {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
  }, []);

  const start = useCallback(async () => {
    if (Platform.OS !== 'web') {
      throw new Error('네이티브 앱에서는 아직 지원되지 않습니다.');
    }
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('이 브라우저는 마이크를 지원하지 않습니다.');
    }

    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // 브라우저별 지원 포맷 선택
      const mimeType =
        MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' :
        MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' :
        MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' :
        '';

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.start();
      setStatus('recording');
    } catch (e) {
      cleanup();
      const msg = e instanceof Error ? e.message : '마이크 접근 실패';
      setError(msg);
      setStatus('error');
      throw e;
    }
  }, [cleanup]);

  const stop = useCallback(async (): Promise<string> => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) {
      setStatus('idle');
      return '';
    }

    // 녹음 종료 대기
    const blob: Blob = await new Promise((resolve, reject) => {
      recorder.onstop = () => {
        const mimeType = recorder.mimeType || 'audio/webm';
        resolve(new Blob(chunksRef.current, { type: mimeType }));
      };
      recorder.onerror = (e) => reject(e);
      try {
        recorder.stop();
      } catch (e) {
        reject(e);
      }
    });

    cleanup();

    if (blob.size === 0) {
      setStatus('idle');
      return '';
    }

    // Whisper 변환
    setStatus('transcribing');
    try {
      const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
      const text = await transcribeAudio(blob, `recording.${ext}`);
      setStatus('idle');
      return text.trim();
    } catch (e) {
      const msg = e instanceof Error ? e.message : '변환 실패';
      setError(msg);
      setStatus('error');
      throw e;
    }
  }, [cleanup]);

  const cancel = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      try { recorder.stop(); } catch {}
    }
    cleanup();
    setStatus('idle');
    setError(null);
  }, [cleanup]);

  return { status, error, start, stop, cancel };
}

import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://PLACEHOLDER.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'PLACEHOLDER_ANON_KEY';

// 웹에서는 localStorage, 네이티브에서는 AsyncStorage 사용
const storage = Platform.OS === 'web'
  ? {
      getItem: (key: string) => Promise.resolve(localStorage.getItem(key)),
      setItem: (key: string, value: string) => { localStorage.setItem(key, value); return Promise.resolve(); },
      removeItem: (key: string) => { localStorage.removeItem(key); return Promise.resolve(); },
    }
  : AsyncStorage;

// 모든 Supabase 요청에 12초 타임아웃 적용.
// 무료 티어 콜드 스타트로 응답 안 올 때 영원히 펜딩 → React Query가 무한 로딩 보이는 문제 차단.
// 타임아웃 발생 시 fetch가 throw → React Query retry 정책으로 자동 재시도.
const fetchWithTimeout: typeof fetch = (input, init) => {
  const controller = new AbortController();
  // 외부에서 받은 signal과 우리 타임아웃 signal 합치기
  const externalSignal = init?.signal;
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort();
    else externalSignal.addEventListener('abort', () => controller.abort(), { once: true });
  }
  const timeoutId = setTimeout(() => controller.abort(), 12000);
  return fetch(input, { ...init, signal: controller.signal })
    .finally(() => clearTimeout(timeoutId));
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    storage,
    // 웹에서 Web Locks API 무한 대기 방지
    ...(Platform.OS === 'web' ? { lock: (_name: string, _acquireTimeout: number, fn: () => Promise<any>) => fn() } : {}),
  },
  global: {
    fetch: fetchWithTimeout,
  },
});

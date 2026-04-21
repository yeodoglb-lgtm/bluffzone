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

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    storage,
    // 웹에서 Web Locks API 무한 대기 방지
    ...(Platform.OS === 'web' ? { lock: (name: string, acquireTimeout: number, fn: () => Promise<any>) => fn() } : {}),
  },
});

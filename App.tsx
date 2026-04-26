import './src/i18n';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Platform, StyleSheet } from 'react-native';
// 플랫폼별 Sentry SDK:
// - 웹: @sentry/browser (Expo web 빌드에서 안정적)
// - 네이티브: @sentry/react-native (iOS/Android, 향후 EAS 빌드 시)
// 현재는 웹만 배포 중이라 @sentry/browser 사용. 네이티브 출시 시 분기 추가.
import * as Sentry from '@sentry/browser';

import { colors } from './src/theme';
import RootNavigator from './src/navigation/RootNavigator';
import { useAuthInit } from './src/hooks/useAuth';
import InstallPwaBanner from './src/components/InstallPwaBanner';

// ── Sentry 초기화 (prod 에러 추적) ──────────────────────────────────────────
// DSN이 설정된 경우만 활성화.
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
const IS_WEB = Platform.OS === 'web';
if (SENTRY_DSN && IS_WEB) {
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: 0.2,
    environment: __DEV__ ? 'development' : 'production',
  });
  // 웹 콘솔에서 직접 테스트 가능하도록 전역 노출
  (window as any).Sentry = Sentry;
}

// ── 웹 한정: SEO Open Graph 태그 동적 주입 + Service Worker 등록 ──────────
// PWA 메타 태그(manifest, theme-color, apple-touch-icon 등)는 public/index.html에
// 정적으로 박혀있어서 Lighthouse·검색 봇·iOS Safari가 즉시 인식. 여기는 OG 태그만.
if (IS_WEB && typeof document !== 'undefined') {
  const head = document.head;
  const ensure = (selector: string, create: () => HTMLElement) => {
    if (!document.querySelector(selector)) head.appendChild(create());
  };
  // SEO/소셜 — Open Graph (카톡·디스코드 미리보기)
  ensure('meta[property="og:title"]', () => {
    const m = document.createElement('meta');
    m.setAttribute('property', 'og:title'); m.content = '블러프존 - 홀덤 핸드 매니저';
    return m;
  });
  ensure('meta[property="og:description"]', () => {
    const m = document.createElement('meta');
    m.setAttribute('property', 'og:description');
    m.content = 'AI가 분석해주는 홀덤 핸드 기록·리뷰 앱. 음성 입력으로 1분 만에 핸드를 기록하세요.';
    return m;
  });
  ensure('meta[property="og:type"]', () => {
    const m = document.createElement('meta');
    m.setAttribute('property', 'og:type'); m.content = 'website';
    return m;
  });

  // ── Service Worker 등록 (PWA 설치 프롬프트 활성화 + 새 버전 자동 반영) ───
  // localhost 또는 prod에서만 등록 (file:// 같은 환경 제외)
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('[SW] register failed:', err);
      });
    });
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Supabase 무료 티어 콜드 스타트(첫 요청 후 깨어나기 30초~1분) 대응:
      // - 첫 요청이 12초 타임아웃에 걸려도 자동으로 2번 더 재시도
      // - 지수 백오프로 점점 길게 (1초 → 2초 → 4초)
      // - 총 약 30초 안에 3번 시도 → 콜드 스타트 깨어나는 동안 충분히 재시도
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
      staleTime: 1000 * 60 * 5,
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});

function AppContent() {
  useAuthInit();
  return (
    <>
      <StatusBar style="light" backgroundColor={colors.bg} />
      <RootNavigator />
      <InstallPwaBanner />
    </>
  );
}

function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AppContent />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// @sentry/browser는 Sentry.wrap이 없음. 웹은 자동 글로벌 에러 핸들러로 충분.
export default App;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0A0A' },
});

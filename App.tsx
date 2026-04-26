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

// ── PWA 메타 태그 주입 (웹에서 홈 화면 추가 시 네이티브 앱처럼 동작) ────────
if (IS_WEB && typeof document !== 'undefined') {
  const head = document.head;
  const ensure = (selector: string, create: () => HTMLElement) => {
    if (!document.querySelector(selector)) head.appendChild(create());
  };
  // manifest 링크
  ensure('link[rel="manifest"]', () => {
    const l = document.createElement('link');
    l.rel = 'manifest'; l.href = '/manifest.json';
    return l;
  });
  // theme-color (브라우저 상단 색상)
  ensure('meta[name="theme-color"]', () => {
    const m = document.createElement('meta');
    m.name = 'theme-color'; m.content = '#FF6B35';
    return m;
  });
  // iOS PWA 활성화
  ensure('meta[name="apple-mobile-web-app-capable"]', () => {
    const m = document.createElement('meta');
    m.name = 'apple-mobile-web-app-capable'; m.content = 'yes';
    return m;
  });
  ensure('meta[name="apple-mobile-web-app-status-bar-style"]', () => {
    const m = document.createElement('meta');
    m.name = 'apple-mobile-web-app-status-bar-style'; m.content = 'black-translucent';
    return m;
  });
  ensure('meta[name="apple-mobile-web-app-title"]', () => {
    const m = document.createElement('meta');
    m.name = 'apple-mobile-web-app-title'; m.content = '블러프존';
    return m;
  });
  // iOS 홈화면 아이콘
  ensure('link[rel="apple-touch-icon"]', () => {
    const l = document.createElement('link');
    l.rel = 'apple-touch-icon'; l.setAttribute('sizes', '180x180');
    (l as HTMLLinkElement).href = '/apple-touch-icon.png';
    return l;
  });
  // 모바일 뷰포트 (이미 expo가 설정하지만 안전장치)
  ensure('meta[name="viewport"]', () => {
    const m = document.createElement('meta');
    m.name = 'viewport';
    m.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';
    return m;
  });
  // SEO/소셜 — Open Graph
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
  ensure('meta[name="description"]', () => {
    const m = document.createElement('meta');
    m.name = 'description';
    m.content = 'AI가 분석해주는 홀덤 핸드 기록·리뷰 앱. 음성 입력으로 1분 만에 핸드를 기록하세요.';
    return m;
  });
  // 페이지 타이틀
  if (document.title === '' || document.title === 'Expo') {
    document.title = '블러프존 - 홀덤 핸드 매니저';
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,           // 실패 시 1회만 재시도 (기본 2→1, 불안정 체감 감소)
      retryDelay: 1000,   // 재시도 전 1초 대기
      staleTime: 1000 * 60 * 5,
    },
  },
});

function AppContent() {
  useAuthInit();
  return (
    <>
      <StatusBar style="light" backgroundColor={colors.bg} />
      <RootNavigator />
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

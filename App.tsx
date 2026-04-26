import './src/i18n';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import * as Sentry from '@sentry/react-native';

import { colors } from './src/theme';
import RootNavigator from './src/navigation/RootNavigator';
import { useAuthInit } from './src/hooks/useAuth';

// ── Sentry 초기화 (prod 에러 추적) ──────────────────────────────────────────
// DSN이 설정된 경우만 활성화. 개발 환경에선 콘솔로만 출력하고 Sentry 전송 X.
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    // 개발(__DEV__) 중엔 Sentry로 전송 안 함 (노이즈 방지)
    enabled: !__DEV__,
    // prod에서만 100% 전송. 부하 늘면 sampleRate 낮춰 조절.
    tracesSampleRate: 0.2,
    // 에러 컨텍스트로 환경 표시
    environment: __DEV__ ? 'development' : 'production',
  });
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

// Sentry 활성화 시 ErrorBoundary로 감싸서 자동 캡처. 비활성화 시 그냥 export.
export default SENTRY_DSN ? Sentry.wrap(App) : App;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0A0A' },
});

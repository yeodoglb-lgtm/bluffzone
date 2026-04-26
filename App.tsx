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

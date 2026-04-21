import './src/i18n';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';

import { colors } from './src/theme';
import RootNavigator from './src/navigation/RootNavigator';
import { useAuthInit } from './src/hooks/useAuth';

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

export default function App() {
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0A0A' },
});

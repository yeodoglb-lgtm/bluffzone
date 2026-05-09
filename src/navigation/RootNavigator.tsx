import { useNavigationContainerRef, NavigationContainer } from '@react-navigation/native';
import type { LinkingOptions } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ActivityIndicator, View, Text, StyleSheet, BackHandler, Platform, ToastAndroid } from 'react-native';
import { useEffect, useRef, useState } from 'react';

import { useAuthStore } from '../store/authStore';
import { colors } from '../theme';
import type { RootStackParamList } from './types';

import React, { Suspense } from 'react';
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import PreviewHomeScreen from '../screens/preview/PreviewHomeScreen';
import MainTabNavigator from './MainTabNavigator';
import { LoginPromptProvider } from '../components/LoginPromptModal';

// 보조 화면들은 lazy load — 메인 번들에서 분리
const AIChatScreen = React.lazy(() => import('../screens/ai/AIChatScreen'));
const TermsScreen = React.lazy(() => import('../screens/auth/TermsScreen'));
const PrivacyScreen = React.lazy(() => import('../screens/auth/PrivacyScreen'));
const FeedbackScreen = React.lazy(() => import('../screens/feedback/FeedbackScreen'));
const MyFeedbackListScreen = React.lazy(() => import('../screens/feedback/MyFeedbackListScreen'));
const AdminFeedbackScreen = React.lazy(() => import('../screens/admin/AdminFeedbackScreen'));

// Suspense fallback
function LazyFallback() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}
function withSuspense<P extends object>(Component: React.ComponentType<P>) {
  const Wrapped = (props: P) => (
    <Suspense fallback={<LazyFallback />}>
      <Component {...props} />
    </Suspense>
  );
  Wrapped.displayName = `Lazy(${(Component as any).displayName ?? 'Screen'})`;
  return Wrapped;
}
const AIChatScreenLazy = withSuspense(AIChatScreen);
const TermsScreenLazy = withSuspense(TermsScreen);
const PrivacyScreenLazy = withSuspense(PrivacyScreen);
const FeedbackScreenLazy = withSuspense(FeedbackScreen);
const MyFeedbackListScreenLazy = withSuspense(MyFeedbackListScreen);
const AdminFeedbackScreenLazy = withSuspense(AdminFeedbackScreen);

const Stack = createStackNavigator<RootStackParamList>();

// ── 화면 ↔ URL 매핑 (브라우저 history 연동) ─────────────────────────────────
// 화면 전환 시 브라우저 URL이 바뀌고, 뒤로가기 누르면 이전 화면으로 이동.
// 새로고침해도 같은 화면 유지, URL 직접 공유 가능.
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [
    'https://bluffzone-iota.vercel.app',
    'https://bluffzone.kr',
    'https://bluffzone.com',
    'bluffzone://',
  ],
  config: {
    screens: {
      Home: 'home',  // /home 경로 (비로그인 시 / 도 자동으로 Home으로 fallback)
      Auth: 'login',
      Terms: 'terms',
      Privacy: 'privacy',
      AIChat: 'chat/:chatId?',
      Feedback: 'feedback',
      MyFeedback: 'feedback/mine',
      AdminFeedback: 'admin/feedback',
      Main: {
        path: '',
        screens: {
          DashboardTab: {
            path: '',
            screens: {
              Dashboard: '',
              GtoHub: 'gto',
              PushfoldChart: 'gto/pushfold',
              PreflopChart: 'gto/preflop',
            },
          },
          BankrollTab: {
            path: 'bankroll',
            screens: {
              BankrollCalendar: '',
              DayDetail: 'day/:date',
              SessionDetail: 'session/:sessionId',
              SessionForm: 'session/edit/:sessionId?',
              BankrollStats: 'stats',
            },
          },
          HandsTab: {
            path: 'hands',
            screens: {
              HandList: '',
              HandEditor: 'edit/:handId?',
              HandDetail: ':handId',
            },
          },
          PlacesTab: {
            path: 'places',
            screens: {
              PlacesMap: '',
              PlaceDetail: ':placeId',
            },
          },
          SettingsTab: 'settings',
          AdminTab: 'admin',
        },
      },
    },
  },
};

// 모달 전환 애니메이션 설정
const modalOptions = {
  headerShown: false,
  presentation: 'modal' as const,
  cardStyle: { backgroundColor: 'transparent' },
  cardOverlayEnabled: true,
  gestureEnabled: true,
};

const DEV_SKIP_AUTH = false;

export default function RootNavigator() {
  const { session, isLoading } = useAuthStore();
  const navRef = useNavigationContainerRef();
  const lastBackRef = useRef(0);

  // Android 네이티브 뒤로가기 버튼: 스택이 있으면 이전 화면, 없으면 2번 눌러야 종료
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (navRef.isReady() && navRef.canGoBack()) {
        return false; // React Navigation이 처리 (스택 pop)
      }
      const now = Date.now();
      if (now - lastBackRef.current < 2000) {
        return false; // 2초 내 2번 → 앱 종료
      }
      lastBackRef.current = now;
      ToastAndroid.show('한 번 더 누르면 종료됩니다', ToastAndroid.SHORT);
      return true; // 종료 방지
    });
    return () => sub.remove();
  }, [navRef]);

  // 웹: 브라우저 뒤로가기는 linking 설정으로 자동 동작.
  // 안드로이드 PWA에서 첫 화면(스택 없음) + 뒤로가기 → 그냥 PWA 종료 (브라우저 기본 동작).
  // → 사용자 경험 OK (홈 화면으로 돌아감)

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer ref={navRef} linking={linking as any}>
      <LoginPromptProvider>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {session || DEV_SKIP_AUTH ? (
            <>
              <Stack.Screen name="Main" component={MainTabNavigator} options={{ title: '블러프존 - 홀덤 핸드 매니저' }} />
              <Stack.Screen
                name="AIChat"
                component={AIChatScreenLazy}
                options={{ ...modalOptions, title: '블러프존 홀덤 알파고' }}
              />
              <Stack.Screen name="Terms" component={TermsScreenLazy} options={{ title: '이용약관 - 블러프존' }} />
              <Stack.Screen name="Privacy" component={PrivacyScreenLazy} options={{ title: '개인정보처리방침 - 블러프존' }} />
              <Stack.Screen name="Feedback" component={FeedbackScreenLazy} options={{ title: '의견 보내기 - 블러프존' }} />
              <Stack.Screen name="MyFeedback" component={MyFeedbackListScreenLazy} options={{ title: '내 의견 이력 - 블러프존' }} />
              <Stack.Screen name="AdminFeedback" component={AdminFeedbackScreenLazy} options={{ title: '어드민 - 블러프존' }} />
            </>
          ) : (
            <>
              <Stack.Screen name="Home" component={PreviewHomeScreen} options={{ title: '블러프존 - 홀덤 핸드 매니저' }} />
              <Stack.Screen name="Main" component={MainTabNavigator} options={{ title: '블러프존 - 홀덤 핸드 매니저' }} />
              <Stack.Screen name="Auth" component={WelcomeScreen} options={{ title: '로그인 / 가입 - 블러프존' }} />
              <Stack.Screen name="Terms" component={TermsScreenLazy} options={{ title: '이용약관 - 블러프존' }} />
              <Stack.Screen name="Privacy" component={PrivacyScreenLazy} options={{ title: '개인정보처리방침 - 블러프존' }} />
            </>
          )}
        </Stack.Navigator>
      </LoginPromptProvider>
    </NavigationContainer>
  );
}

// 콜드 스타트 시 길게 기다리는 사용자에게 진행 안내
function LoadingScreen() {
  const [showSlowMsg, setShowSlowMsg] = useState(false);
  const [showVerySlowMsg, setShowVerySlowMsg] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setShowSlowMsg(true), 4000);
    const t2 = setTimeout(() => setShowVerySlowMsg(true), 12000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.primary} size="large" />
      {showSlowMsg && (
        <Text style={styles.loadingText}>서버 연결 중...</Text>
      )}
      {showVerySlowMsg && (
        <Text style={styles.loadingHint}>
          첫 접속 시 서버를 깨우는 데 잠시 걸릴 수 있어요{'\n'}10초 정도 기다려주세요
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 24,
  },
  loadingText: { color: colors.text, fontSize: 14, marginTop: 8 },
  loadingHint: { color: colors.textMuted, fontSize: 12, textAlign: 'center', lineHeight: 18 },
});

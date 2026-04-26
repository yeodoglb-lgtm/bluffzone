import { useNavigationContainerRef, NavigationContainer } from '@react-navigation/native';
import type { LinkingOptions } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ActivityIndicator, View, Text, StyleSheet, BackHandler, Platform, ToastAndroid } from 'react-native';
import { useEffect, useRef, useState } from 'react';

import { useAuthStore } from '../store/authStore';
import { colors } from '../theme';
import type { RootStackParamList } from './types';

import WelcomeScreen from '../screens/auth/WelcomeScreen';
import MainTabNavigator from './MainTabNavigator';
import AIChatScreen from '../screens/ai/AIChatScreen';
import TermsScreen from '../screens/auth/TermsScreen';
import PrivacyScreen from '../screens/auth/PrivacyScreen';
import FeedbackScreen from '../screens/feedback/FeedbackScreen';
import MyFeedbackListScreen from '../screens/feedback/MyFeedbackListScreen';
import AdminFeedbackScreen from '../screens/admin/AdminFeedbackScreen';

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
          DashboardTab: '',
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
    <NavigationContainer ref={navRef} linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {session || DEV_SKIP_AUTH ? (
          <>
            <Stack.Screen name="Main" component={MainTabNavigator} />
            <Stack.Screen
              name="AIChat"
              component={AIChatScreen}
              options={modalOptions}
            />
            <Stack.Screen name="Terms" component={TermsScreen} />
            <Stack.Screen name="Privacy" component={PrivacyScreen} />
            <Stack.Screen name="Feedback" component={FeedbackScreen} />
            <Stack.Screen name="MyFeedback" component={MyFeedbackListScreen} />
            <Stack.Screen name="AdminFeedback" component={AdminFeedbackScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Auth" component={WelcomeScreen} />
            <Stack.Screen name="Terms" component={TermsScreen} />
            <Stack.Screen name="Privacy" component={PrivacyScreen} />
          </>
        )}
      </Stack.Navigator>
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

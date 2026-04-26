import { useNavigationContainerRef, NavigationContainer } from '@react-navigation/native';
import type { LinkingOptions } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ActivityIndicator, View, StyleSheet, BackHandler, Platform, ToastAndroid } from 'react-native';
import { useEffect, useRef } from 'react';

import { useAuthStore } from '../store/authStore';
import { colors } from '../theme';
import type { RootStackParamList } from './types';

import WelcomeScreen from '../screens/auth/WelcomeScreen';
import MainTabNavigator from './MainTabNavigator';
import AIChatScreen from '../screens/ai/AIChatScreen';
import TermsScreen from '../screens/auth/TermsScreen';
import PrivacyScreen from '../screens/auth/PrivacyScreen';

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
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
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

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

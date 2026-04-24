import { useNavigationContainerRef, NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ActivityIndicator, View, StyleSheet, BackHandler, Platform, ToastAndroid } from 'react-native';
import { useEffect, useRef } from 'react';

import { useAuthStore } from '../store/authStore';
import { colors } from '../theme';
import type { RootStackParamList } from './types';

import WelcomeScreen from '../screens/auth/WelcomeScreen';
import MainTabNavigator from './MainTabNavigator';
import AIChatScreen from '../screens/ai/AIChatScreen';

const Stack = createStackNavigator<RootStackParamList>();

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

  // Android 뒤로가기 버튼: 스택이 있으면 이전 화면, 없으면 2번 눌러야 종료
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

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {session || DEV_SKIP_AUTH ? (
          <>
            <Stack.Screen name="Main" component={MainTabNavigator} />
            <Stack.Screen
              name="AIChat"
              component={AIChatScreen}
              options={modalOptions}
            />
          </>
        ) : (
          <Stack.Screen name="Auth" component={WelcomeScreen} />
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

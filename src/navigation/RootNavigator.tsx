import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

import { useAuthStore } from '../store/authStore';
import { colors } from '../theme';
import type { RootStackParamList } from './types';

import WelcomeScreen from '../screens/auth/WelcomeScreen';
import MainTabNavigator from './MainTabNavigator';
import AIChatScreen from '../screens/ai/AIChatScreen';
import HandReviewScreen from '../screens/ai/HandReviewScreen';

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

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {session || DEV_SKIP_AUTH ? (
          <>
            <Stack.Screen name="Main" component={MainTabNavigator} />
            <Stack.Screen
              name="AIChat"
              component={AIChatScreen}
              options={modalOptions}
            />
            <Stack.Screen
              name="HandReview"
              component={HandReviewScreen}
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

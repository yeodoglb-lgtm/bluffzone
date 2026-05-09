import React, { Suspense } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import {
  Home,
  CalendarDays,
  ClipboardList,
  MapPin,
  Settings,
  ShieldCheck,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fontWeight, spacing } from '../theme';
import { useAuthStore } from '../store/authStore';
import type {
  MainTabParamList,
  DashboardStackParamList,
  BankrollStackParamList,
  HandsStackParamList,
  PlacesStackParamList,
} from './types';

// ── 1차 화면 (탭 루트) — 즉시 로드 ─────────────────────────────────────────
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import BankrollCalendarScreen from '../screens/bankroll/BankrollCalendarScreen';
import HandListScreen from '../screens/hands/HandListScreen';
import PlacesMapScreen from '../screens/places/PlacesMapScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';

// ── 2차 화면 (서브 라우트) — lazy load (방문 시 별도 chunk 다운로드) ────────
const GtoHubScreen = React.lazy(() => import('../screens/gto/GtoHubScreen'));
const PushfoldChartScreen = React.lazy(() => import('../screens/gto/PushfoldChartScreen'));
const PreflopChartScreen = React.lazy(() => import('../screens/gto/PreflopChartScreen'));
const DayDetailScreen = React.lazy(() => import('../screens/bankroll/DayDetailScreen'));
const SessionDetailScreen = React.lazy(() => import('../screens/bankroll/SessionDetailScreen'));
const SessionFormScreen = React.lazy(() => import('../screens/bankroll/SessionFormScreen'));
const BankrollStatsScreen = React.lazy(() => import('../screens/bankroll/BankrollStatsScreen'));
const HandEditorScreen = React.lazy(() => import('../screens/hands/HandEditorScreen'));
const HandDetailScreen = React.lazy(() => import('../screens/hands/HandDetailScreen'));
const PlaceDetailScreen = React.lazy(() => import('../screens/places/PlaceDetailScreen'));
const AdminScreen = React.lazy(() => import('../screens/admin/AdminScreen'));

// Suspense fallback (로딩 표시)
function LazyFallback() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}

// 라우트 컴포넌트를 Suspense로 감싸는 헬퍼
function withSuspense<P extends object>(Component: React.ComponentType<P>) {
  const Wrapped = (props: P) => (
    <Suspense fallback={<LazyFallback />}>
      <Component {...props} />
    </Suspense>
  );
  Wrapped.displayName = `Lazy(${(Component as any).displayName ?? 'Screen'})`;
  return Wrapped;
}

// 각 lazy 화면을 Suspense로 한 번 감쌈
const GtoHubScreenLazy = withSuspense(GtoHubScreen);
const PushfoldChartScreenLazy = withSuspense(PushfoldChartScreen);
const PreflopChartScreenLazy = withSuspense(PreflopChartScreen);
const DayDetailScreenLazy = withSuspense(DayDetailScreen);
const SessionDetailScreenLazy = withSuspense(SessionDetailScreen);
const SessionFormScreenLazy = withSuspense(SessionFormScreen);
const BankrollStatsScreenLazy = withSuspense(BankrollStatsScreen);
const HandEditorScreenLazy = withSuspense(HandEditorScreen);
const HandDetailScreenLazy = withSuspense(HandDetailScreen);
const PlaceDetailScreenLazy = withSuspense(PlaceDetailScreen);
const AdminScreenLazy = withSuspense(AdminScreen);

// ── 네비게이터 인스턴스 ────────────────────────────────────────────────────────
const Tab = createBottomTabNavigator<MainTabParamList>();
const DashboardStack = createStackNavigator<DashboardStackParamList>();
const BankrollStack = createStackNavigator<BankrollStackParamList>();
const HandsStack = createStackNavigator<HandsStackParamList>();
const PlacesStack = createStackNavigator<PlacesStackParamList>();

// ── 스택 네비게이터들 ─────────────────────────────────────────────────────────
const stackOptions = { headerShown: false };

function DashboardNavigator() {
  return (
    <DashboardStack.Navigator screenOptions={stackOptions}>
      <DashboardStack.Screen name="Dashboard" component={DashboardScreen} options={{ title: '블러프존 - 홀덤 핸드 매니저' }} />
      <DashboardStack.Screen name="GtoHub" component={GtoHubScreenLazy} options={{ title: 'GTO 도구 - 블러프존' }} />
      <DashboardStack.Screen name="PushfoldChart" component={PushfoldChartScreenLazy} options={{ title: '푸시폴드 차트 - 블러프존' }} />
      <DashboardStack.Screen name="PreflopChart" component={PreflopChartScreenLazy} options={{ title: '프리플랍 차트 - 블러프존' }} />
    </DashboardStack.Navigator>
  );
}

function BankrollNavigator() {
  return (
    <BankrollStack.Navigator screenOptions={stackOptions}>
      <BankrollStack.Screen name="BankrollCalendar" component={BankrollCalendarScreen} options={{ title: '뱅크롤 관리 - 블러프존' }} />
      <BankrollStack.Screen name="DayDetail" component={DayDetailScreenLazy} options={{ title: '일별 세션 - 블러프존' }} />
      <BankrollStack.Screen name="SessionDetail" component={SessionDetailScreenLazy} options={{ title: '세션 상세 - 블러프존' }} />
      <BankrollStack.Screen name="SessionForm" component={SessionFormScreenLazy} options={{ title: '세션 입력 - 블러프존' }} />
      <BankrollStack.Screen name="BankrollStats" component={BankrollStatsScreenLazy} options={{ title: '뱅크롤 통계 - 블러프존' }} />
    </BankrollStack.Navigator>
  );
}

function HandsNavigator() {
  return (
    <HandsStack.Navigator screenOptions={stackOptions}>
      <HandsStack.Screen name="HandList" component={HandListScreen} options={{ title: '핸드 기록 - 블러프존' }} />
      <HandsStack.Screen name="HandEditor" component={HandEditorScreenLazy} options={{ title: '핸드 입력 - 블러프존' }} />
      <HandsStack.Screen name="HandDetail" component={HandDetailScreenLazy} options={{ title: '핸드 상세 - 블러프존' }} />
      <HandsStack.Screen name="GtoHub" component={GtoHubScreenLazy} options={{ title: 'GTO 도구 - 블러프존' }} />
      <HandsStack.Screen name="PushfoldChart" component={PushfoldChartScreenLazy} options={{ title: '푸시폴드 차트 - 블러프존' }} />
      <HandsStack.Screen name="PreflopChart" component={PreflopChartScreenLazy} options={{ title: '프리플랍 차트 - 블러프존' }} />
    </HandsStack.Navigator>
  );
}

function PlacesNavigator() {
  return (
    <PlacesStack.Navigator screenOptions={stackOptions}>
      <PlacesStack.Screen name="PlacesMap" component={PlacesMapScreen} options={{ title: '홀덤 펍 검색 - 블러프존' }} />
      <PlacesStack.Screen name="PlaceDetail" component={PlaceDetailScreenLazy} options={{ title: '장소 상세 - 블러프존' }} />
    </PlacesStack.Navigator>
  );
}

// ── 메인 탭 네비게이터 ────────────────────────────────────────────────────────
export default function MainTabNavigator() {
  const insets = useSafeAreaInsets();
  const { profile } = useAuthStore();
  const isAdmin = profile?.role === 'admin';
  const TAB_BAR_HEIGHT = 60;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
          borderTopWidth: 1,
          height: TAB_BAR_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: spacing.xs,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: fontWeight.medium,
          marginTop: 2,
        },
        tabBarIconStyle: { marginBottom: -2 },
      }}
    >
      <Tab.Screen
        name="DashboardTab"
        component={DashboardNavigator}
        options={{
          tabBarLabel: '홈',
          tabBarIcon: ({ color, size }) => (
            <Home color={color} size={size - 2} strokeWidth={2} />
          ),
        }}
      />
      <Tab.Screen
        name="BankrollTab"
        component={BankrollNavigator}
        options={{
          tabBarLabel: '뱅크롤',
          tabBarIcon: ({ color, size }) => (
            <CalendarDays color={color} size={size - 2} strokeWidth={2} />
          ),
        }}
      />
      <Tab.Screen
        name="HandsTab"
        component={HandsNavigator}
        options={{
          tabBarLabel: '핸드기록',
          tabBarIcon: ({ color, size }) => (
            <ClipboardList color={color} size={size - 2} strokeWidth={2} />
          ),
        }}
      />
      {/* 플레이스 탭 — 정식 오픈 (2026-05-09) */}
      <Tab.Screen
        name="PlacesTab"
        component={PlacesNavigator}
        options={{
          tabBarLabel: '플레이스',
          tabBarIcon: ({ color, size }) => (
            <MapPin color={color} size={size - 2} strokeWidth={2} />
          ),
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{
          title: '설정 - 블러프존',
          tabBarLabel: '설정',
          tabBarIcon: ({ color, size }) => (
            <Settings color={color} size={size - 2} strokeWidth={2} />
          ),
        }}
      />
      {/* 어드민 전용 탭 — role=admin 계정에만 표시 */}
      {isAdmin && (
        <Tab.Screen
          name="AdminTab"
          component={AdminScreenLazy}
          options={{
            tabBarLabel: '어드민',
            tabBarIcon: ({ color, size }) => (
              <ShieldCheck color={color} size={size - 2} strokeWidth={2} />
            ),
            tabBarActiveTintColor: colors.warning,
          }}
        />
      )}
    </Tab.Navigator>
  );
}

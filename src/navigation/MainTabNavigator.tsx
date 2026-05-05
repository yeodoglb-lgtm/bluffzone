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

// ── 화면 imports ──────────────────────────────────────────────────────────────
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import GtoHubScreen from '../screens/gto/GtoHubScreen';
import PushfoldChartScreen from '../screens/gto/PushfoldChartScreen';
import PreflopChartScreen from '../screens/gto/PreflopChartScreen';

import BankrollCalendarScreen from '../screens/bankroll/BankrollCalendarScreen';
import DayDetailScreen from '../screens/bankroll/DayDetailScreen';
import SessionDetailScreen from '../screens/bankroll/SessionDetailScreen';
import SessionFormScreen from '../screens/bankroll/SessionFormScreen';
import BankrollStatsScreen from '../screens/bankroll/BankrollStatsScreen';

import HandListScreen from '../screens/hands/HandListScreen';
import HandEditorScreen from '../screens/hands/HandEditorScreen';
import HandDetailScreen from '../screens/hands/HandDetailScreen';

import PlacesMapScreen from '../screens/places/PlacesMapScreen';
import PlaceDetailScreen from '../screens/places/PlaceDetailScreen';

import SettingsScreen from '../screens/settings/SettingsScreen';
import AdminScreen from '../screens/admin/AdminScreen';

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
      <DashboardStack.Screen name="GtoHub" component={GtoHubScreen} options={{ title: 'GTO 도구 - 블러프존' }} />
      <DashboardStack.Screen name="PushfoldChart" component={PushfoldChartScreen} options={{ title: '푸시폴드 차트 - 블러프존' }} />
      <DashboardStack.Screen name="PreflopChart" component={PreflopChartScreen} options={{ title: '프리플랍 차트 - 블러프존' }} />
    </DashboardStack.Navigator>
  );
}

function BankrollNavigator() {
  return (
    <BankrollStack.Navigator screenOptions={stackOptions}>
      <BankrollStack.Screen name="BankrollCalendar" component={BankrollCalendarScreen} options={{ title: '뱅크롤 관리 - 블러프존' }} />
      <BankrollStack.Screen name="DayDetail" component={DayDetailScreen} options={{ title: '일별 세션 - 블러프존' }} />
      <BankrollStack.Screen name="SessionDetail" component={SessionDetailScreen} options={{ title: '세션 상세 - 블러프존' }} />
      <BankrollStack.Screen name="SessionForm" component={SessionFormScreen} options={{ title: '세션 입력 - 블러프존' }} />
      <BankrollStack.Screen name="BankrollStats" component={BankrollStatsScreen} options={{ title: '뱅크롤 통계 - 블러프존' }} />
    </BankrollStack.Navigator>
  );
}

function HandsNavigator() {
  return (
    <HandsStack.Navigator screenOptions={stackOptions}>
      <HandsStack.Screen name="HandList" component={HandListScreen} options={{ title: '핸드 기록 - 블러프존' }} />
      <HandsStack.Screen name="HandEditor" component={HandEditorScreen} options={{ title: '핸드 입력 - 블러프존' }} />
      <HandsStack.Screen name="HandDetail" component={HandDetailScreen} options={{ title: '핸드 상세 - 블러프존' }} />
      <HandsStack.Screen name="GtoHub" component={GtoHubScreen} options={{ title: 'GTO 도구 - 블러프존' }} />
      <HandsStack.Screen name="PushfoldChart" component={PushfoldChartScreen} options={{ title: '푸시폴드 차트 - 블러프존' }} />
      <HandsStack.Screen name="PreflopChart" component={PreflopChartScreen} options={{ title: '프리플랍 차트 - 블러프존' }} />
    </HandsStack.Navigator>
  );
}

function PlacesNavigator() {
  return (
    <PlacesStack.Navigator screenOptions={stackOptions}>
      <PlacesStack.Screen name="PlacesMap" component={PlacesMapScreen} options={{ title: '홀덤 펍 검색 - 블러프존' }} />
      <PlacesStack.Screen name="PlaceDetail" component={PlaceDetailScreen} options={{ title: '장소 상세 - 블러프존' }} />
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
      {/* 플레이스 탭 — 베타 동안 어드민만 노출 (유튜브 광고 시 수익성 목적 인상 회피) */}
      {isAdmin && (
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
      )}
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
          component={AdminScreen}
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

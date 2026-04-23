import { View } from 'react-native';
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
  BankrollStackParamList,
  HandsStackParamList,
  PlacesStackParamList,
} from './types';

// ── 화면 imports ──────────────────────────────────────────────────────────────
import DashboardScreen from '../screens/dashboard/DashboardScreen';

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
const BankrollStack = createStackNavigator<BankrollStackParamList>();
const HandsStack = createStackNavigator<HandsStackParamList>();
const PlacesStack = createStackNavigator<PlacesStackParamList>();

// ── 스택 네비게이터들 ─────────────────────────────────────────────────────────
const stackOptions = { headerShown: false };

function BankrollNavigator() {
  return (
    <BankrollStack.Navigator screenOptions={stackOptions}>
      <BankrollStack.Screen name="BankrollCalendar" component={BankrollCalendarScreen} />
      <BankrollStack.Screen name="DayDetail" component={DayDetailScreen} />
      <BankrollStack.Screen name="SessionDetail" component={SessionDetailScreen} />
      <BankrollStack.Screen name="SessionForm" component={SessionFormScreen} />
      <BankrollStack.Screen name="BankrollStats" component={BankrollStatsScreen} />
    </BankrollStack.Navigator>
  );
}

function HandsNavigator() {
  return (
    <HandsStack.Navigator screenOptions={stackOptions}>
      <HandsStack.Screen name="HandList" component={HandListScreen} />
      <HandsStack.Screen name="HandEditor" component={HandEditorScreen} />
      <HandsStack.Screen name="HandDetail" component={HandDetailScreen} />
    </HandsStack.Navigator>
  );
}

function PlacesNavigator() {
  return (
    <PlacesStack.Navigator screenOptions={stackOptions}>
      <PlacesStack.Screen name="PlacesMap" component={PlacesMapScreen} />
      <PlacesStack.Screen name="PlaceDetail" component={PlaceDetailScreen} />
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
        component={DashboardScreen}
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

import { Text, StyleSheet, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import {
  LayoutDashboard,
  CalendarDays,
  MapPin,
  Settings,
  MessageSquarePlus,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { colors, fontWeight, spacing } from '../theme';
import type {
  MainTabParamList,
  BankrollStackParamList,
  HandsStackParamList,
  PlacesStackParamList,
  RootStackParamList,
} from './types';
import type { StackNavigationProp } from '@react-navigation/stack';

// ── 화면 imports ──────────────────────────────────────────────────────────────
import DashboardScreen from '../screens/dashboard/DashboardScreen';

import BankrollCalendarScreen from '../screens/bankroll/BankrollCalendarScreen';
import DayDetailScreen from '../screens/bankroll/DayDetailScreen';
import SessionFormScreen from '../screens/bankroll/SessionFormScreen';
import BankrollStatsScreen from '../screens/bankroll/BankrollStatsScreen';

import HandListScreen from '../screens/hands/HandListScreen';
import HandEditorScreen from '../screens/hands/HandEditorScreen';
import HandDetailScreen from '../screens/hands/HandDetailScreen';

import PlacesMapScreen from '../screens/places/PlacesMapScreen';
import PlaceDetailScreen from '../screens/places/PlaceDetailScreen';

import SettingsScreen from '../screens/settings/SettingsScreen';

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

// ── AI FAB 중앙 버튼 ──────────────────────────────────────────────────────────
function AiTabButton() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  return (
    <TouchableOpacity
      style={styles.aiFab}
      onPress={() => navigation.navigate('AIChat', {})}
      activeOpacity={0.85}
      accessibilityLabel="블러프존 AI와 대화하기"
      accessibilityRole="button"
    >
      <MessageSquarePlus color={colors.text} size={22} strokeWidth={2} />
      <Text style={styles.aiFabText}>AI</Text>
    </TouchableOpacity>
  );
}

// ── 메인 탭 네비게이터 ────────────────────────────────────────────────────────
export default function MainTabNavigator() {
  const insets = useSafeAreaInsets();
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
          tabBarLabel: '대시보드',
          tabBarIcon: ({ color, size }) => (
            <LayoutDashboard color={color} size={size - 2} strokeWidth={2} />
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
      {/* 중앙 AI FAB — HandsTab을 눈에 보이지 않는 탭으로 처리 */}
      <Tab.Screen
        name="HandsTab"
        component={HandsNavigator}
        options={{
          tabBarLabel: '',
          tabBarIcon: () => null,
          tabBarButton: () => <AiTabButton />,
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
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  aiFab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 10,
    gap: 2,
    alignSelf: 'center',
  },
  aiFabText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: colors.text,
    letterSpacing: 0.5,
  },
});

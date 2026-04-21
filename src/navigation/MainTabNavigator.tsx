import { View, PanResponder, Dimensions } from 'react-native';
import { useRef as _useRef } from 'react';
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

// ── 스와이프 탭 전환 HOC ──────────────────────────────────────────────────────
// 탭 이름 순서 (어드민 탭 제외)
const SWIPEABLE_TABS: (keyof MainTabParamList)[] = [
  'DashboardTab', 'BankrollTab', 'HandsTab', 'PlacesTab', 'SettingsTab',
];
const SCREEN_W = Dimensions.get('window').width;
const EDGE_PX   = 60;   // 화면 양 끝 60px 내에서 시작해야 활성화
const SWIPE_THR = 60;   // 이 이상 드래그해야 탭 전환

function makeSwipeable<P extends object>(
  Component: React.ComponentType<P>,
  tabIndex: number,
): React.ComponentType<P> {
  const SwipeableScreen = function({ navigation, ...rest }: any) {
    const navRef = _useRef<any>(null);
    navRef.current = navigation;

    const panHandlers = _useRef(
      PanResponder.create({
        // 엣지에서 시작한 터치만 캡처
        onStartShouldSetPanResponder: (e, _gs) => {
          const x = e.nativeEvent.pageX;
          return x < EDGE_PX || x > SCREEN_W - EDGE_PX;
        },
        // 수평 이동이 수직의 1.5배 이상일 때만 유지
        onMoveShouldSetPanResponder: (_e, gs) =>
          Math.abs(gs.dx) > 10 && Math.abs(gs.dx) > Math.abs(gs.dy) * 1.5,
        onPanResponderRelease: (_e, gs) => {
          if (gs.dx < -SWIPE_THR && tabIndex < SWIPEABLE_TABS.length - 1) {
            navRef.current?.navigate(SWIPEABLE_TABS[tabIndex + 1]);
          } else if (gs.dx > SWIPE_THR && tabIndex > 0) {
            navRef.current?.navigate(SWIPEABLE_TABS[tabIndex - 1]);
          }
        },
      })
    ).current.panHandlers;

    return (
      <View style={{ flex: 1 }} {...panHandlers}>
        <Component navigation={navigation} {...(rest as P)} />
      </View>
    );
  };
  SwipeableScreen.displayName = `Swipeable(${Component.displayName ?? Component.name ?? 'Screen'})`;
  return SwipeableScreen as unknown as React.ComponentType<P>;
}

// 모듈 수준에서 한 번만 생성 (재렌더 시 재생성 방지)
const SwipeableDashboard  = makeSwipeable(DashboardScreen,  0);
const SwipeableBankroll   = makeSwipeable(BankrollNavigator, 1);
const SwipeableHands      = makeSwipeable(HandsNavigator,   2);
const SwipeablePlaces     = makeSwipeable(PlacesNavigator,  3);
const SwipeableSettings   = makeSwipeable(SettingsScreen,   4);

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
        component={SwipeableDashboard}
        options={{
          tabBarLabel: '홈',
          tabBarIcon: ({ color, size }) => (
            <Home color={color} size={size - 2} strokeWidth={2} />
          ),
        }}
      />
      <Tab.Screen
        name="BankrollTab"
        component={SwipeableBankroll}
        options={{
          tabBarLabel: '뱅크롤',
          tabBarIcon: ({ color, size }) => (
            <CalendarDays color={color} size={size - 2} strokeWidth={2} />
          ),
        }}
      />
      <Tab.Screen
        name="HandsTab"
        component={SwipeableHands}
        options={{
          tabBarLabel: '핸드기록',
          tabBarIcon: ({ color, size }) => (
            <ClipboardList color={color} size={size - 2} strokeWidth={2} />
          ),
        }}
      />
      <Tab.Screen
        name="PlacesTab"
        component={SwipeablePlaces}
        options={{
          tabBarLabel: '플레이스',
          tabBarIcon: ({ color, size }) => (
            <MapPin color={color} size={size - 2} strokeWidth={2} />
          ),
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SwipeableSettings}
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


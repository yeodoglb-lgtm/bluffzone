import { Text, StyleSheet, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { LayoutDashboard, CalendarDays, MapPin, Settings, MessageSquarePlus } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fontWeight } from '../theme';
import type { MainTabParamList, BankrollStackParamList, HandsStackParamList, PlacesStackParamList } from './types';

import DashboardScreen from '../screens/dashboard/DashboardScreen';
import BankrollCalendarScreen from '../screens/bankroll/BankrollCalendarScreen';
import HandListScreen from '../screens/hands/HandListScreen';
import PlacesMapScreen from '../screens/places/PlacesMapScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();
const BankrollStack = createStackNavigator<BankrollStackParamList>();
const HandsStack = createStackNavigator<HandsStackParamList>();
const PlacesStack = createStackNavigator<PlacesStackParamList>();

function BankrollNavigator() {
  return (
    <BankrollStack.Navigator screenOptions={{ headerShown: false }}>
      <BankrollStack.Screen name="BankrollCalendar" component={BankrollCalendarScreen} />
    </BankrollStack.Navigator>
  );
}

function HandsNavigator() {
  return (
    <HandsStack.Navigator screenOptions={{ headerShown: false }}>
      <HandsStack.Screen name="HandList" component={HandListScreen} />
    </HandsStack.Navigator>
  );
}

function PlacesNavigator() {
  return (
    <PlacesStack.Navigator screenOptions={{ headerShown: false }}>
      <PlacesStack.Screen name="PlacesMap" component={PlacesMapScreen} />
    </PlacesStack.Navigator>
  );
}

interface AiTabButtonProps {
  onPress?: () => void;
}

function AiTabButton({ onPress }: AiTabButtonProps) {
  return (
    <TouchableOpacity style={styles.aiFab} onPress={onPress} activeOpacity={0.85}>
      <MessageSquarePlus color={colors.text} size={20} />
      <Text style={styles.aiFabText}>AI</Text>
    </TouchableOpacity>
  );
}

export default function MainTabNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: fontWeight.medium },
      }}
    >
      <Tab.Screen
        name="DashboardTab"
        component={DashboardScreen}
        options={{
          tabBarLabel: '대시보드',
          tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="BankrollTab"
        component={BankrollNavigator}
        options={{
          tabBarLabel: '뱅크롤',
          tabBarIcon: ({ color, size }) => <CalendarDays color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="HandsTab"
        component={HandsNavigator}
        options={{
          tabBarLabel: 'AI',
          tabBarIcon: () => null,
          tabBarButton: props => <AiTabButton onPress={props.onPress ? () => props.onPress?.({} as never) : undefined} />,
        }}
      />
      <Tab.Screen
        name="PlacesTab"
        component={PlacesNavigator}
        options={{
          tabBarLabel: '플레이스',
          tabBarIcon: ({ color, size }) => <MapPin color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{
          tabBarLabel: '설정',
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
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
    marginBottom: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    gap: 2,
  },
  aiFabText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
});

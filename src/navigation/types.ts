import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { StackScreenProps } from '@react-navigation/stack';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';

// ── Bottom Tab Params ──────────────────────────────────────────────────────────
export type MainTabParamList = {
  DashboardTab: undefined;
  BankrollTab: NavigatorScreenParams<BankrollStackParamList>;
  HandsTab: NavigatorScreenParams<HandsStackParamList>;
  PlacesTab: NavigatorScreenParams<PlacesStackParamList>;
  SettingsTab: undefined;
};

// ── Bankroll Stack ─────────────────────────────────────────────────────────────
export type BankrollStackParamList = {
  BankrollCalendar: undefined;
  DayDetail: { date: string };
  SessionForm: { sessionId?: string; date?: string };
  BankrollStats: undefined;
};

// ── Hands Stack ────────────────────────────────────────────────────────────────
export type HandsStackParamList = {
  HandList: undefined;
  HandEditor: { handId?: string; sessionId?: string };
  HandDetail: { handId: string };
};

// ── Places Stack ───────────────────────────────────────────────────────────────
export type PlacesStackParamList = {
  PlacesMap: undefined;
  PlaceDetail: { placeId: string };
};

// ── Root Stack ─────────────────────────────────────────────────────────────────
export type RootStackParamList = {
  Auth: undefined;
  Main: NavigatorScreenParams<MainTabParamList>;
  AIChat: { chatId?: string };
  HandReview: { handId: string };
};

// ── Screen Props helpers ───────────────────────────────────────────────────────
export type RootStackScreenProps<T extends keyof RootStackParamList> = StackScreenProps<
  RootStackParamList,
  T
>;

export type MainTabScreenProps<T extends keyof MainTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, T>,
  RootStackScreenProps<keyof RootStackParamList>
>;

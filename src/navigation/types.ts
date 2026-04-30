import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { StackScreenProps } from '@react-navigation/stack';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';

// ── Bottom Tab Params ──────────────────────────────────────────────────────────
export type MainTabParamList = {
  DashboardTab: NavigatorScreenParams<DashboardStackParamList>;
  BankrollTab: NavigatorScreenParams<BankrollStackParamList>;
  HandsTab: NavigatorScreenParams<HandsStackParamList>;
  PlacesTab: NavigatorScreenParams<PlacesStackParamList>;
  SettingsTab: undefined;
  AdminTab: undefined;
};

// ── Dashboard Stack (홈 + GTO 도구) ────────────────────────────────────────
export type DashboardStackParamList = {
  Dashboard: undefined;
  GtoHub: undefined;
  PushfoldChart: undefined;
};

// ── Bankroll Stack ─────────────────────────────────────────────────────────────
export type BankrollStackParamList = {
  BankrollCalendar: undefined;
  DayDetail: { date: string };
  SessionDetail: { sessionId: string };
  SessionForm: { sessionId?: string; date?: string };
  BankrollStats: undefined;
};

// ── Hands Stack ────────────────────────────────────────────────────────────────
export type HandsStackParamList = {
  HandList: undefined;
  HandEditor: { handId?: string; sessionId?: string };
  HandDetail: { handId: string };
  // GTO 도구는 DashboardStack과 공유 — 탭 전환 없이 같은 스택 안에서 이동 → 뒤로가기 자연스러움
  GtoHub: undefined;
  PushfoldChart: undefined;
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
  Terms: undefined;
  Privacy: undefined;
  Feedback: undefined;
  MyFeedback: undefined;
  AdminFeedback: undefined;
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

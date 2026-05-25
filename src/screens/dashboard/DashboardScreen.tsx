import React, { Suspense } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { StackNavigationProp } from '@react-navigation/stack';
import { User, Bot } from 'lucide-react-native';

import { colors, spacing, fontSize, fontWeight, radius } from '../../theme';
import Logo from '../../components/common/Logo';
import { useAuthStore } from '../../store/authStore';
import { useHands } from '../../hooks/useHands';
import { useLoginPrompt } from '../../components/LoginPromptModal';
import type { MainTabParamList, RootStackParamList, DashboardStackParamList } from '../../navigation/types';

// LCP 측정 회피 — 비필수 컴포넌트는 lazy + 첫 렌더 후 마운트
const InstallPwaCard = React.lazy(() => import('../../components/InstallPwaCard'));
const BetaBanner = React.lazy(() => import('../../components/BetaBanner'));
const WelcomeModal = React.lazy(() => import('../../components/WelcomeModal'));
const OnboardingChecklist = React.lazy(() => import('../../components/OnboardingChecklist'));
const NotificationPermissionPrompt = React.lazy(() => import('../../components/NotificationPermissionPrompt'));

type DashboardNav = CompositeNavigationProp<
  StackNavigationProp<DashboardStackParamList, 'Dashboard'>,
  CompositeNavigationProp<
    BottomTabNavigationProp<MainTabParamList, 'DashboardTab'>,
    StackNavigationProp<RootStackParamList>
  >
>;

export default function DashboardScreen() {
  const navigation = useNavigation<DashboardNav>();
  const { profile, session } = useAuthStore();
  const { requireAuth } = useLoginPrompt();
  // 신규 유저 판단: 핸드 0개면 첫 핸드 입력 큰 CTA 노출
  const { data: hands } = useHands(1);
  const isNewUser = !hands || hands.length === 0;
  const isLoggedIn = !!session;
  const isAdmin = profile?.role === 'admin';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* lazy import는 유지 (chunk 분리), 지연 마운트는 제거 (Speed Index 악화) */}
      <Suspense fallback={null}>
        <WelcomeModal />
        <NotificationPermissionPrompt />
      </Suspense>
      {/* 헤더 */}
      <View style={styles.header}>
        <Logo size="sm" variant="full" />
        {isLoggedIn ? (
          <TouchableOpacity
            style={styles.avatarBtn}
            onPress={() => navigation.navigate('SettingsTab')}
            accessibilityLabel="설정으로 이동"
          >
            <View style={styles.avatar}>
              <User color={colors.textMuted} size={18} strokeWidth={2} />
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => navigation.navigate('Auth')}
            activeOpacity={0.85}
          >
            <Text style={styles.loginBtnText}>로그인 / 가입</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* 온보딩 카드 (기록 없을 때) */}
        <View style={styles.onboardingSection}>
          <Text style={styles.sectionTitle}>
            {profile?.display_name ? `${profile.display_name}님, 안녕하세요 👋` : '블러프존에 오신 것을 환영합니다 👋'}
          </Text>
          <Text style={styles.sectionSub}>
            {isNewUser
              ? '음성으로 1분 만에 첫 핸드를 기록해보세요'
              : '아래 기능으로 포커 실력을 키워보세요'}
          </Text>
        </View>

        {/* 비로그인 사용자 — 마케팅 CTA (최상단) */}
        {!isLoggedIn && (
          <View style={styles.marketingCta}>
            <Text style={styles.marketingEmoji}>🎁</Text>
            <Text style={styles.marketingTitle}>지금 무료로 시작</Text>
            <Text style={styles.marketingDesc}>
              가입 30초 · AI 핸드 리뷰 · 푸시폴드 차트 · 뱅크롤 관리{'\n'}
              한 앱에서 시작하세요
            </Text>
            <TouchableOpacity
              style={styles.marketingButton}
              onPress={() => navigation.navigate('Auth')}
              activeOpacity={0.85}
            >
              <Text style={styles.marketingButtonText}>무료로 시작하기</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 온보딩 체크리스트 — 로그인 유저 중 3단계 미완료자에게 노출 */}
        {isLoggedIn && (
          <Suspense fallback={null}>
            <OnboardingChecklist
              onNavigateHand={() => navigation.navigate('HandsTab', { screen: 'HandList' })}
              onNavigateBankroll={() => navigation.navigate('BankrollTab', { screen: 'BankrollCalendar' })}
            />
          </Suspense>
        )}

        {/* 신규 유저 전용 CTA — 로그인 + 핸드 0개일 때 */}
        {isLoggedIn && isNewUser && (
          <TouchableOpacity
            style={styles.firstHandCta}
            onPress={() => requireAuth(() => navigation.navigate('HandsTab', { screen: 'HandEditor', params: {} }))}
            activeOpacity={0.85}
          >
            <Text style={styles.firstHandEmoji}>🎙</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.firstHandTitle}>음성으로 첫 핸드 기록하기</Text>
              <Text style={styles.firstHandDesc}>
                마이크로 자연스럽게 설명만 하면{'\n'}
                AI가 자동으로 정리 + 리뷰까지
              </Text>
            </View>
            <Text style={styles.firstHandArrow}>›</Text>
          </TouchableOpacity>
        )}

        {/* 메뉴 카드 3개 */}
        {[
          {
            icon: '💰',
            title: '뱅크롤 관리',
            desc: '매 세션을 기록하고\n수익 추이를 한눈에',
            onPress: () => navigation.navigate('BankrollTab', { screen: 'BankrollCalendar' }),
          },
          {
            icon: '🃏',
            title: '핸드 기록 및 분석',
            desc: '어려웠던 핸드를 기록하고\n플레이를 분석해보세요',
            onPress: () => navigation.navigate('HandsTab', { screen: 'HandList' }),
          },
          // 플레이스 — 어드민만 노출
          ...(isAdmin ? [{
            icon: '📍',
            title: '홀덤 플레이스',
            desc: '내 주변 홀덤 클럽을\n지도에서 쉽게 찾기',
            onPress: () => navigation.navigate('PlacesTab', { screen: 'PlacesMap' }),
          }] : []),
          {
            icon: '🎯',
            title: 'GTO 도구',
            desc: '푸시폴드 차트 등\nGTO 의사결정 가이드',
            onPress: () => navigation.navigate('GtoHub'),
          },
        ].map(card => (
          <TouchableOpacity
            key={card.title}
            style={styles.card}
            onPress={card.onPress}
            activeOpacity={0.75}
          >
            <Text style={styles.cardIcon}>{card.icon}</Text>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{card.title}</Text>
              <Text style={styles.cardDesc}>{card.desc}</Text>
            </View>
            <Text style={styles.cardArrow}>›</Text>
          </TouchableOpacity>
        ))}

        {/* 블러프존 홀덤 알파고 배너 */}
        <TouchableOpacity
          style={styles.aiBtn}
          onPress={() => requireAuth(() => navigation.navigate('AIChat', {}))}
          activeOpacity={0.85}
        >
          <Bot color={colors.bg} size={24} strokeWidth={2} />
          <View style={styles.aiBtnTextWrap}>
            <Text style={styles.aiBtnText}>블러프존 홀덤 알파고</Text>
            <Text style={styles.aiBtnSub}>당신의 홀덤 고민, 지금 바로 답해드립니다</Text>
          </View>
        </TouchableOpacity>

        {/* 모바일 PWA 설치 안내 + 베타 배너 */}
        <Suspense fallback={null}>
          <InstallPwaCard />
          <BetaBanner />
        </Suspense>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  avatarBtn: { padding: 4 },
  loginBtn: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  loginBtnText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  marketingCta: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    gap: spacing.sm,
  },
  marketingEmoji: { fontSize: 36 },
  marketingTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.primary },
  marketingDesc: { fontSize: fontSize.sm, color: colors.text, textAlign: 'center', lineHeight: 22 },
  marketingButton: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: radius.button,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  marketingButtonText: { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.bg },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  scroll: { flex: 1 },
  content: {
    padding: spacing.xl,
    gap: spacing.md,
    paddingBottom: 120,
  },
  onboardingSection: { gap: spacing.xs, marginBottom: spacing.sm },
  firstHandCta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.card,
    padding: spacing.base,
    gap: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  firstHandEmoji: { fontSize: 36 },
  firstHandTitle: { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.bg },
  firstHandDesc: { fontSize: fontSize.xs, color: colors.bg, opacity: 0.85, marginTop: 2, lineHeight: 18 },
  firstHandArrow: { fontSize: 28, color: colors.bg, fontWeight: fontWeight.bold },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  sectionSub: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing.md,
  },
  cardIcon: { fontSize: 28 },
  cardBody: { flex: 1, gap: 2 },
  cardTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  cardDesc: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 18,
  },
  cardArrow: {
    fontSize: 22,
    color: colors.textMuted,
    marginRight: -4,
  },
  aiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.base,
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  aiBtnTextWrap: {
    flex: 1,
    gap: 2,
  },
  aiBtnText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.bg,
  },
  aiBtnSub: {
    fontSize: fontSize.xs,
    color: colors.bg,
    opacity: 0.8,
  },
});

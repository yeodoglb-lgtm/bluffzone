import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { StackNavigationProp } from '@react-navigation/stack';
import { User, Bot } from 'lucide-react-native';

import { colors, spacing, fontSize, fontWeight, radius } from '../../theme';
import Logo from '../../components/common/Logo';
import InstallPwaCard from '../../components/InstallPwaCard';
import BetaBanner from '../../components/BetaBanner';
import { useAuthStore } from '../../store/authStore';
import { useHands } from '../../hooks/useHands';
import type { MainTabParamList, RootStackParamList } from '../../navigation/types';

type DashboardNav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'DashboardTab'>,
  StackNavigationProp<RootStackParamList>
>;

export default function DashboardScreen() {
  const navigation = useNavigation<DashboardNav>();
  const { profile } = useAuthStore();
  // 신규 유저 판단: 핸드 0개면 첫 핸드 입력 큰 CTA 노출
  const { data: hands } = useHands(1);
  const isNewUser = !hands || hands.length === 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Logo size="sm" variant="full" />
        <TouchableOpacity
          style={styles.avatarBtn}
          onPress={() => navigation.navigate('SettingsTab')}
          accessibilityLabel="설정으로 이동"
        >
          <View style={styles.avatar}>
            <User color={colors.textMuted} size={18} strokeWidth={2} />
          </View>
        </TouchableOpacity>
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

        {/* 신규 유저 전용 CTA — 핸드 0개일 때만 노출 */}
        {isNewUser && (
          <TouchableOpacity
            style={styles.firstHandCta}
            onPress={() => navigation.navigate('HandsTab', { screen: 'HandEditor', params: {} })}
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
            title: '핸드 기록',
            desc: '어려웠던 핸드를 기록하고\n패턴을 분석해보세요',
            onPress: () => navigation.navigate('HandsTab', { screen: 'HandList' }),
          },
          {
            icon: '📍',
            title: '홀덤 플레이스',
            desc: '내 주변 홀덤 클럽을\n지도에서 쉽게 찾기',
            onPress: () => navigation.navigate('PlacesTab', { screen: 'PlacesMap' }),
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
          onPress={() => navigation.navigate('AIChat', {})}
          activeOpacity={0.85}
        >
          <Bot color={colors.bg} size={24} strokeWidth={2} />
          <View style={styles.aiBtnTextWrap}>
            <Text style={styles.aiBtnText}>블러프존 홀덤 알파고</Text>
            <Text style={styles.aiBtnSub}>당신의 홀덤 고민, 지금 바로 답해드립니다</Text>
          </View>
        </TouchableOpacity>

        {/* 모바일 PWA 설치 안내 카드 (인앱 브라우저면 Chrome 안내) */}
        <InstallPwaCard />

        {/* 베타 배너 — 정식 출시 후 제거 */}
        <BetaBanner />
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

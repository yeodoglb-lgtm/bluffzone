import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { User } from 'lucide-react-native';

import { colors, spacing, fontSize, fontWeight, radius } from '../../theme';
import Logo from '../../components/common/Logo';
import { useAuthStore } from '../../store/authStore';
import type { MainTabParamList } from '../../navigation/types';

type DashboardNav = BottomTabNavigationProp<MainTabParamList, 'DashboardTab'>;

export default function DashboardScreen() {
  const navigation = useNavigation<DashboardNav>();
  const { profile } = useAuthStore();

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
          <Text style={styles.sectionSub}>아래 기능으로 포커 실력을 키워보세요</Text>
        </View>

        {/* 온보딩 카드 3개 */}
        {[
          {
            icon: '💰',
            title: '뱅크롤 관리',
            desc: '매 세션을 기록하고\n수익 추이를 한눈에',
            tab: 'BankrollTab' as const,
          },
          {
            icon: '🤖',
            title: 'AI 핸드 리뷰',
            desc: '어려웠던 핸드를 기록하고\nAI 코치의 피드백 수령',
            tab: 'HandsTab' as const,
          },
          {
            icon: '📍',
            title: '홀덤 플레이스',
            desc: '내 주변 홀덤 클럽을\n지도에서 쉽게 찾기',
            tab: 'PlacesTab' as const,
          },
        ].map(card => (
          <TouchableOpacity
            key={card.title}
            style={styles.card}
            onPress={() => {
              if (card.tab === 'BankrollTab') navigation.navigate('BankrollTab', { screen: 'BankrollCalendar' });
              else if (card.tab === 'HandsTab') navigation.navigate('HandsTab', { screen: 'HandList' });
              else navigation.navigate('PlacesTab', { screen: 'PlacesMap' });
            }}
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

        {/* 퀵 액션 */}
        <Text style={styles.sectionTitle2}>빠른 기록</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickBtn}
            onPress={() => navigation.navigate('BankrollTab', { screen: 'BankrollCalendar' })}
            activeOpacity={0.8}
          >
            <Text style={styles.quickBtnIcon}>＋</Text>
            <Text style={styles.quickBtnText}>세션 기록</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickBtn}
            onPress={() => navigation.navigate('HandsTab', { screen: 'HandList' })}
            activeOpacity={0.8}
          >
            <Text style={styles.quickBtnIcon}>＋</Text>
            <Text style={styles.quickBtnText}>핸드 기록</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickBtn}
            onPress={() => navigation.navigate('PlacesTab', { screen: 'PlacesMap' })}
            activeOpacity={0.8}
          >
            <Text style={styles.quickBtnIcon}>📍</Text>
            <Text style={styles.quickBtnText}>주변 플레이스</Text>
          </TouchableOpacity>
        </View>
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
  sectionTitle2: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.sm,
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  quickBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.button,
    paddingVertical: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.line,
  },
  quickBtnIcon: { fontSize: 20 },
  quickBtnText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: fontWeight.medium,
    textAlign: 'center',
  },
});

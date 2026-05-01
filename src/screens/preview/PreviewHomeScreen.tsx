// 비로그인 사용자용 미리보기 홈 화면
// 광고로 들어온 사용자가 가입 없이 앱을 둘러볼 수 있게.
// 뱅크롤·핸드·플레이스·GTO 페이지는 자유롭게 둘러보기 가능.
// 실제 데이터 입력 액션 시 LoginPrompt 모달 노출.

import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Bot } from 'lucide-react-native';

import { colors, spacing, fontSize, fontWeight, radius } from '../../theme';
import Logo from '../../components/common/Logo';
import { useLoginPrompt } from '../../components/LoginPromptModal';
import type { RootStackParamList } from '../../navigation/types';

type Nav = StackNavigationProp<RootStackParamList>;

export default function PreviewHomeScreen() {
  const navigation = useNavigation<Nav>();
  const { requireAuth } = useLoginPrompt();

  const goToAuth = () => navigation.navigate('Auth');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Logo size="sm" variant="full" />
        <TouchableOpacity style={styles.loginBtn} onPress={goToAuth}>
          <Text style={styles.loginBtnText}>로그인 / 가입</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* 환영 */}
        <View style={styles.onboarding}>
          <Text style={styles.welcomeTitle}>블러프존에 오신 것을 환영합니다 👋</Text>
          <Text style={styles.welcomeSub}>한국 최초 GTO AI 홀덤 핸드 리뷰 · 무료</Text>
        </View>

        {/* 메뉴 카드 — 뱅크롤·핸드기록·플레이스·GTO는 둘러보기 가능 */}
        {[
          {
            icon: '💰',
            title: '뱅크롤 관리',
            desc: '매 세션을 기록하고\n수익 추이를 한눈에',
            onPress: () =>
              navigation.navigate('Main', { screen: 'BankrollTab', params: { screen: 'BankrollCalendar' } }),
          },
          {
            icon: '🃏',
            title: '핸드 기록',
            desc: '어려웠던 핸드를 기록하고\n패턴을 분석해보세요',
            onPress: () =>
              navigation.navigate('Main', { screen: 'HandsTab', params: { screen: 'HandList' } }),
          },
          {
            icon: '📍',
            title: '홀덤 플레이스',
            desc: '내 주변 홀덤 클럽을\n지도에서 쉽게 찾기',
            onPress: () =>
              navigation.navigate('Main', { screen: 'PlacesTab', params: { screen: 'PlacesMap' } }),
          },
          {
            icon: '🎯',
            title: 'GTO 도구',
            desc: '푸시폴드 차트 등\nGTO 의사결정 가이드',
            onPress: () =>
              navigation.navigate('Main', { screen: 'DashboardTab', params: { screen: 'GtoHub' } }),
          },
        ].map(card => (
          <TouchableOpacity key={card.title} style={styles.card} onPress={card.onPress} activeOpacity={0.75}>
            <Text style={styles.cardIcon}>{card.icon}</Text>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{card.title}</Text>
              <Text style={styles.cardDesc}>{card.desc}</Text>
            </View>
            <Text style={styles.cardArrow}>›</Text>
          </TouchableOpacity>
        ))}

        {/* AI 챗봇 — 가입 필요 */}
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

        {/* CTA */}
        <View style={styles.ctaCard}>
          <Text style={styles.ctaEmoji}>🎁</Text>
          <Text style={styles.ctaTitle}>지금 무료로 시작</Text>
          <Text style={styles.ctaDesc}>
            가입 30초 · AI 핸드 리뷰 · 푸시폴드 차트 · 뱅크롤 관리{'\n'}
            한 앱에서 시작하세요
          </Text>
          <TouchableOpacity style={styles.ctaButton} onPress={goToAuth} activeOpacity={0.85}>
            <Text style={styles.ctaButtonText}>무료로 시작하기</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: spacing.xxl }} />
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
  loginBtn: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  loginBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.primary },
  scroll: { flex: 1 },
  content: { padding: spacing.xl, gap: spacing.md, paddingBottom: 60 },
  onboarding: { gap: spacing.xs, marginBottom: spacing.sm },
  welcomeTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
  welcomeSub: { fontSize: fontSize.sm, color: colors.textMuted },
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
  cardTitle: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text },
  cardDesc: { fontSize: fontSize.sm, color: colors.textMuted, lineHeight: 18 },
  cardArrow: { fontSize: 22, color: colors.textMuted, marginRight: -4 },
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
  aiBtnTextWrap: { flex: 1, gap: 2 },
  aiBtnText: { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.bg },
  aiBtnSub: { fontSize: fontSize.xs, color: colors.bg, opacity: 0.85 },
  ctaCard: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    gap: spacing.sm,
  },
  ctaEmoji: { fontSize: 36 },
  ctaTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.primary },
  ctaDesc: { fontSize: fontSize.sm, color: colors.text, textAlign: 'center', lineHeight: 22 },
  ctaButton: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: radius.button,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  ctaButtonText: { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.bg },
});

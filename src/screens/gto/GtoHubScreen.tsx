import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Target, BookOpen, Calculator, Cpu } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, radius } from '../../theme';

// 양쪽 스택(Dashboard·Hands)에서 모두 사용 — navigation 타입 generic
type Props = { navigation: any };

interface ToolItem {
  key: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
  enabled: boolean;
  onPress?: () => void;
  badge?: string;
}

export default function GtoHubScreen({ navigation }: Props) {
  const tools: ToolItem[] = [
    {
      key: 'pushfold',
      title: '푸시 / 폴드 차트',
      desc: '토너 단스택 (5~25bb)에서 포지션별 푸시·폴드 결정',
      icon: <Target color={colors.primary} size={28} strokeWidth={2} />,
      enabled: true,
      onPress: () => navigation.navigate('PushfoldChart'),
    },
    {
      key: 'preflop',
      title: '프리플랍 가이드',
      desc: 'Open / 3bet / 콜드콜 / 4bet 레인지 (캐시·토너)',
      icon: <BookOpen color={colors.textMuted} size={28} strokeWidth={2} />,
      enabled: false,
      badge: '준비 중',
    },
    {
      key: 'icm',
      title: 'ICM 계산기',
      desc: '버블·파이널 테이블에서 $EV 자동 계산',
      icon: <Calculator color={colors.textMuted} size={28} strokeWidth={2} />,
      enabled: false,
      badge: '준비 중',
    },
    {
      key: 'solver',
      title: '솔버 결과 검색',
      desc: '주요 포스트플랍 스팟 솔버 분석 (TexasSolver)',
      icon: <Cpu color={colors.textMuted} size={28} strokeWidth={2} />,
      enabled: false,
      badge: '준비 중',
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <ChevronLeft color={colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>GTO 도구</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>
          GTO 이론 기반 의사결정 도구. 본인 핸드를 차트와 비교해보세요.
        </Text>

        {tools.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.card, !t.enabled && styles.cardDisabled]}
            onPress={t.onPress}
            disabled={!t.enabled}
            activeOpacity={0.7}
          >
            <View style={styles.cardIcon}>{t.icon}</View>
            <View style={styles.cardBody}>
              <View style={styles.cardTitleRow}>
                <Text style={[styles.cardTitle, !t.enabled && styles.cardTitleDisabled]}>
                  {t.title}
                </Text>
                {t.badge && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{t.badge}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.cardDesc}>{t.desc}</Text>
            </View>
          </TouchableOpacity>
        ))}
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  content: { padding: spacing.md, gap: spacing.sm },
  subtitle: { fontSize: fontSize.sm, color: colors.textMuted, marginBottom: spacing.sm, lineHeight: 20 },
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
  cardDisabled: { opacity: 0.55 },
  cardIcon: { width: 44, alignItems: 'center' },
  cardBody: { flex: 1, gap: 4 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardTitle: { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.text },
  cardTitleDisabled: { color: colors.textMuted },
  cardDesc: { fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 18 },
  badge: {
    backgroundColor: `${colors.textMuted}33`,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 10, color: colors.textMuted, fontWeight: fontWeight.medium },
});

import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { colors, spacing, fontSize, fontWeight, radius } from '../../theme';
import {
  fetchPreflopChart,
  PREFLOP_POSITIONS,
  PREFLOP_SCENARIOS,
  type PreflopPosition,
  type PreflopScenario,
} from '../../services/gto';

type Props = { navigation: any };

const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];

function cellHand(i: number, j: number): string {
  const r1 = RANKS[i], r2 = RANKS[j];
  if (i === j) return r1 + r2;
  if (i < j) return r1 + r2 + 's';
  return r2 + r1 + 'o';
}

const ACTION_COLORS = {
  raise: '#FF6B35',  // 주황 (오픈/3벳)
  call:  '#3B82F6',  // 파랑 (콜)
  fold:  'transparent',
  mixed: '#A855F7',  // 보라
};

export default function PreflopChartScreen({ navigation }: Props) {
  const [position, setPosition] = useState<PreflopPosition>('BTN');
  const [scenario, setScenario] = useState<PreflopScenario>('open');

  const { data, isLoading } = useQuery({
    queryKey: ['preflop', position, scenario],
    queryFn: () => fetchPreflopChart(position, scenario),
    staleTime: 1000 * 60 * 60,
  });

  const lookup = useMemo(() => {
    const map = new Map<string, 'raise' | 'call' | 'fold' | 'mixed'>();
    (data ?? []).forEach(e => map.set(e.hand, e.action));
    return map;
  }, [data]);

  const playCount = useMemo(
    () => (data ?? []).filter(e => e.action !== 'fold').length,
    [data]
  );
  const playPct = ((playCount / 169) * 100).toFixed(1);

  const currentScenario = PREFLOP_SCENARIOS.find(s => s.key === scenario);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <ChevronLeft color={colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>프리플랍 가이드</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* 사용법 안내 */}
        <View style={styles.howto}>
          <Text style={styles.howtoTitle}>📖 사용법</Text>
          <Text style={styles.howtoText}>
            6-max 캐시 게임 100bb 기준 GTO 프리플랍 레인지입니다.
          </Text>
          <Text style={styles.howtoText}>
            <Text style={styles.howtoStrong}>1.</Text> 본인 포지션 + 시나리오 선택{'\n'}
            <Text style={styles.howtoStrong}>2.</Text> 매트릭스에서 본인 핸드 색깔 확인{'\n'}
            {'   '}· 🟠 주황 = 레이즈 (오픈/3벳){'\n'}
            {'   '}· 🔵 파랑 = 콜{'\n'}
            {'   '}· ⬜ 회색 = 폴드
          </Text>
        </View>

        {/* 시나리오 선택 */}
        <Text style={styles.label}>시나리오</Text>
        <View style={styles.scenarioRow}>
          {PREFLOP_SCENARIOS.map(s => (
            <TouchableOpacity
              key={s.key}
              style={[
                styles.scenarioBtn,
                scenario === s.key && styles.scenarioBtnActive,
              ]}
              onPress={() => setScenario(s.key as PreflopScenario)}
              activeOpacity={0.7}
            >
              <Text style={[styles.scenarioText, scenario === s.key && styles.scenarioTextActive]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {currentScenario && (
          <Text style={styles.scenarioDesc}>💡 {currentScenario.desc}</Text>
        )}

        {/* 포지션 선택 */}
        <Text style={styles.label}>포지션</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.posRow}>
          {PREFLOP_POSITIONS.map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.posBtn, position === p && styles.posBtnActive]}
              onPress={() => setPosition(p)}
              activeOpacity={0.7}
            >
              <Text style={[styles.posText, position === p && styles.posTextActive]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* 매트릭스 */}
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <>
            <View style={styles.summaryBar}>
              <Text style={styles.summaryText}>
                {position} · {currentScenario?.label} 빈도{' '}
                <Text style={styles.summaryHi}>{playPct}%</Text>
              </Text>
            </View>

            <View style={styles.matrix}>
              {Array.from({ length: 13 }).map((_, i) => (
                <View key={i} style={styles.matrixRow}>
                  {Array.from({ length: 13 }).map((__, j) => {
                    const h = cellHand(i, j);
                    const a = lookup.get(h) ?? 'fold';
                    const bg = ACTION_COLORS[a];
                    const isPlay = a !== 'fold';
                    return (
                      <View
                        key={j}
                        style={[
                          styles.cell,
                          isPlay
                            ? { backgroundColor: bg }
                            : styles.cellFold,
                        ]}
                      >
                        <Text style={[styles.cellText, isPlay && styles.cellTextPlay]}>
                          {h}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>

            {/* 범례 */}
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: ACTION_COLORS.raise }]} />
                <Text style={styles.legendText}>레이즈</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: ACTION_COLORS.call }]} />
                <Text style={styles.legendText}>콜</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, styles.cellFold]} />
                <Text style={styles.legendText}>폴드</Text>
              </View>
            </View>

            <View style={styles.notice}>
              <Text style={styles.noticeText}>
                💡 6-max 캐시 100bb 기준 GTO 표준 레인지입니다. 빌런 성향이나 상황에 따라 실제 최적 액션은 달라질 수 있습니다.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const CELL_SIZE = 26;

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
  label: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: fontWeight.medium,
    marginTop: spacing.xs,
    marginBottom: 4,
  },
  scenarioRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  scenarioBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  scenarioBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  scenarioText: { fontSize: fontSize.sm, color: colors.textMuted, fontWeight: fontWeight.medium },
  scenarioTextActive: { color: colors.bg, fontWeight: fontWeight.bold },
  scenarioDesc: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 4,
    fontStyle: 'italic',
  },
  posRow: { flexDirection: 'row', gap: 6, paddingVertical: 4 },
  posBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  posBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  posText: { fontSize: fontSize.sm, color: colors.textMuted, fontWeight: fontWeight.medium },
  posTextActive: { color: colors.bg, fontWeight: fontWeight.bold },
  center: { paddingVertical: 60, alignItems: 'center' },
  summaryBar: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  summaryText: { fontSize: fontSize.sm, color: colors.text },
  summaryHi: { color: colors.primary, fontWeight: fontWeight.bold },
  matrix: { gap: 2, marginTop: spacing.sm, alignItems: 'center' },
  matrixRow: { flexDirection: 'row', gap: 2 },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 3,
  },
  cellFold: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  cellText: { fontSize: 9, color: colors.textMuted, fontWeight: fontWeight.medium },
  cellTextPlay: { color: colors.bg, fontWeight: fontWeight.bold },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 16, height: 16, borderRadius: 3 },
  legendText: { fontSize: fontSize.sm, color: colors.text },
  notice: {
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: `${colors.primary}11`,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: `${colors.primary}33`,
  },
  noticeText: { fontSize: fontSize.xs, color: colors.text, lineHeight: 18 },
  howto: {
    padding: spacing.base,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  howtoTitle: { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.text },
  howtoText: { fontSize: fontSize.sm, color: colors.text, lineHeight: 22 },
  howtoStrong: { fontWeight: fontWeight.bold, color: colors.primary },
});

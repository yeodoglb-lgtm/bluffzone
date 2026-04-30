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
  fetchPushfoldChart,
  PUSHFOLD_POSITIONS,
  PUSHFOLD_STACKS,
  type PushfoldPosition,
  type PushfoldStack,
} from '../../services/gto';

// 양쪽 스택(Dashboard·Hands)에서 모두 사용 — navigation 타입 generic 처리
type Props = { navigation: any };

const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];

// (i,j) → 핸드 표기 (i=row, j=col)
function cellHand(i: number, j: number): string {
  const r1 = RANKS[i], r2 = RANKS[j];
  if (i === j) return r1 + r2;            // pair (대각선)
  if (i < j) return r1 + r2 + 's';        // suited (위쪽)
  return r2 + r1 + 'o';                    // offsuit (아래쪽)
}

export default function PushfoldChartScreen({ navigation }: Props) {
  const [position, setPosition] = useState<PushfoldPosition>('BTN');
  const [stack, setStack] = useState<PushfoldStack>(10);

  const { data, isLoading } = useQuery({
    queryKey: ['pushfold', position, stack],
    queryFn: () => fetchPushfoldChart(position, stack),
    staleTime: 1000 * 60 * 60, // 1시간 캐시 (데이터 변동 없음)
  });

  const lookup = useMemo(() => {
    const map = new Map<string, 'push' | 'fold'>();
    (data ?? []).forEach(e => map.set(e.hand, e.action));
    return map;
  }, [data]);

  const pushCount = useMemo(
    () => (data ?? []).filter(e => e.action === 'push').length,
    [data]
  );
  const pushPct = ((pushCount / 169) * 100).toFixed(1);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <ChevronLeft color={colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>푸시 / 폴드 차트</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* 사용법 안내 */}
        <View style={styles.howto}>
          <Text style={styles.howtoTitle}>📖 사용법</Text>
          <Text style={styles.howtoText}>
            토너 단스택(5~25bb)에서 <Text style={styles.howtoStrong}>"올인 vs 폴드"</Text> 결정용 차트입니다.
          </Text>
          <Text style={styles.howtoText}>
            <Text style={styles.howtoStrong}>1.</Text> 본인 포지션과 스택 선택{'\n'}
            <Text style={styles.howtoStrong}>2.</Text> 13×13 매트릭스에서 본인 핸드 위치 찾기{'\n'}
            {'   '}· 대각선 = 페어 (AA, KK, …){'\n'}
            {'   '}· 위쪽 (s) = 수티드, 아래쪽 (o) = 오프수트{'\n'}
            <Text style={styles.howtoStrong}>3.</Text> 색깔 확인{'\n'}
            {'   '}· 🟠 주황 = <Text style={styles.howtoStrong}>푸시 (올인)</Text>{'\n'}
            {'   '}· ⬜ 회색 = <Text style={styles.howtoStrong}>폴드</Text>
          </Text>
          <Text style={styles.howtoTip}>
            💡 스택이 적을수록 푸시 범위가 넓어집니다 (블라인드 살아남기 위해).
            {'\n'}💡 뒤 포지션일수록 푸시 범위가 넓어집니다 (남은 인원이 적으니).
          </Text>
        </View>

        {/* 포지션 선택 */}
        <Text style={styles.label}>포지션</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.toggleRow}
        >
          {PUSHFOLD_POSITIONS.map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.toggleBtn, position === p && styles.toggleBtnActive]}
              onPress={() => setPosition(p)}
              activeOpacity={0.7}
            >
              <Text style={[styles.toggleText, position === p && styles.toggleTextActive]}>
                {p}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* 스택 선택 */}
        <Text style={styles.label}>스택 (BB)</Text>
        <View style={styles.toggleRow}>
          {PUSHFOLD_STACKS.map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.toggleBtn, stack === s && styles.toggleBtnActive]}
              onPress={() => setStack(s)}
              activeOpacity={0.7}
            >
              <Text style={[styles.toggleText, stack === s && styles.toggleTextActive]}>
                {s}bb
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 매트릭스 */}
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <>
            <View style={styles.summaryBar}>
              <Text style={styles.summaryText}>
                {position} · {stack}bb 푸시 빈도{' '}
                <Text style={styles.summaryHi}>{pushPct}%</Text>
              </Text>
            </View>

            <View style={styles.matrix}>
              {Array.from({ length: 13 }).map((_, i) => (
                <View key={i} style={styles.matrixRow}>
                  {Array.from({ length: 13 }).map((__, j) => {
                    const h = cellHand(i, j);
                    const a = lookup.get(h);
                    return (
                      <View
                        key={j}
                        style={[
                          styles.cell,
                          a === 'push'
                            ? styles.cellPush
                            : a === 'fold'
                              ? styles.cellFold
                              : styles.cellNone,
                        ]}
                      >
                        <Text style={[styles.cellText, a === 'push' && styles.cellTextPush]}>
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
                <View style={[styles.legendDot, styles.cellPush]} />
                <Text style={styles.legendText}>푸시</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, styles.cellFold]} />
                <Text style={styles.legendText}>폴드</Text>
              </View>
            </View>

            <View style={styles.notice}>
              <Text style={styles.noticeText}>
                💡 Nash equilibrium 기반 단스택 푸시·폴드 차트입니다. 빌런 콜 레인지에 따라 실제
                최적 액션은 달라질 수 있습니다.
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
  toggleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  toggleBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  toggleText: { fontSize: fontSize.sm, color: colors.textMuted, fontWeight: fontWeight.medium },
  toggleTextActive: { color: colors.bg, fontWeight: fontWeight.bold },
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
  cellPush: { backgroundColor: colors.primary },
  cellFold: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  cellNone: { backgroundColor: 'transparent' },
  cellText: { fontSize: 9, color: colors.textMuted, fontWeight: fontWeight.medium },
  cellTextPush: { color: colors.bg, fontWeight: fontWeight.bold },
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
  howtoTip: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    lineHeight: 18,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
});

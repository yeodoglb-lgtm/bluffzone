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
import { CartesianChart, Line } from 'victory-native';
import { colors, spacing, fontSize, fontWeight, radius } from '../../theme';
import { useSessionsByRange } from '../../hooks/useSessions';
import { calcPeriodStats } from '../../services/sessions';
import { formatProfit } from '../../utils/currency';
import { dayjs, today, weekRange, monthRange, quarterRange, yearRange } from '../../utils/date';
import { useSettingsStore } from '../../store/settingsStore';
import type { GameType } from '../../constants/poker';

type TabKey = 'day' | 'week' | 'month' | 'quarter' | 'year';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'day', label: '일' },
  { key: 'week', label: '주' },
  { key: 'month', label: '월' },
  { key: 'quarter', label: '분기' },
  { key: 'year', label: '연' },
];

function getRangeForTab(tab: TabKey, offset: number): { start: string; end: string } {
  const base = dayjs(today());

  switch (tab) {
    case 'day': {
      const d = base.add(offset, 'day').format('YYYY-MM-DD');
      return { start: d, end: d };
    }
    case 'week': {
      const d = base.add(offset, 'week').format('YYYY-MM-DD');
      return weekRange(d);
    }
    case 'month': {
      const shifted = base.add(offset, 'month');
      return monthRange(shifted.year(), shifted.month() + 1);
    }
    case 'quarter': {
      const d = base.add(offset * 3, 'month').format('YYYY-MM-DD');
      return quarterRange(d);
    }
    case 'year': {
      return yearRange(base.add(offset, 'year').year());
    }
  }
}

function formatRangeLabel(tab: TabKey, start: string, end: string): string {
  switch (tab) {
    case 'day':
      return dayjs(start).format('YYYY년 M월 D일');
    case 'week':
      return `${dayjs(start).format('M/D')} ~ ${dayjs(end).format('M/D')}`;
    case 'month':
      return dayjs(start).format('YYYY년 M월');
    case 'quarter': {
      const q = Math.ceil((dayjs(start).month() + 1) / 3);
      return `${dayjs(start).year()}년 ${q}분기`;
    }
    case 'year':
      return `${dayjs(start).year()}년`;
  }
}

type ChartDatum = { x: number; y: number };

export default function BankrollStatsScreen() {
  const { currency } = useSettingsStore();
  const [activeTab, setActiveTab] = useState<TabKey>('month');
  const [offset, setOffset] = useState(0);

  const { start, end } = useMemo(() => getRangeForTab(activeTab, offset), [activeTab, offset]);
  const rangeLabel = useMemo(() => formatRangeLabel(activeTab, start, end), [activeTab, start, end]);

  const { data: sessions = [], isLoading } = useSessionsByRange(start, end);

  const stats = useMemo(() => calcPeriodStats(sessions), [sessions]);

  // Cumulative chart data
  const chartData = useMemo<ChartDatum[]>(() => {
    if (sessions.length === 0) return [];
    let cumulative = 0;
    return sessions.map((s, i) => {
      cumulative += Number(s.net_profit);
      return { x: i + 1, y: cumulative };
    });
  }, [sessions]);

  // Game type breakdown
  const gameTypeStats = useMemo(() => {
    const map = new Map<GameType | 'Unknown', { sessions: number; profit: number }>();
    sessions.forEach(s => {
      const key = s.game_type ?? ('Unknown' as const);
      const prev = map.get(key) ?? { sessions: 0, profit: 0 };
      map.set(key, {
        sessions: prev.sessions + 1,
        profit: prev.profit + Number(s.net_profit),
      });
    });
    return Array.from(map.entries()).sort((a, b) => b[1].profit - a[1].profit);
  }, [sessions]);

  const totalColor =
    stats.totalProfit > 0
      ? colors.primary
      : stats.totalProfit < 0
      ? colors.danger
      : colors.textMuted;

  function handleTabChange(key: TabKey) {
    setActiveTab(key);
    setOffset(0);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>통계</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => handleTabChange(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Period navigation */}
      <View style={styles.periodNav}>
        <TouchableOpacity style={styles.navBtn} onPress={() => setOffset(o => o - 1)}>
          <Text style={styles.navBtnText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.periodLabel}>{rangeLabel}</Text>
        <TouchableOpacity
          style={styles.navBtn}
          onPress={() => setOffset(o => o + 1)}
          disabled={offset >= 0}
        >
          <Text style={[styles.navBtnText, offset >= 0 && styles.navBtnDisabled]}>{'>'}</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {/* Stat cards */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>합계</Text>
              <Text style={[styles.statValue, { color: totalColor }]}>
                {formatProfit(stats.totalProfit, currency)}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>세션 수</Text>
              <Text style={styles.statValue}>{stats.sessionCount}회</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>승률</Text>
              <Text style={styles.statValue}>{stats.winRate.toFixed(0)}%</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>평균 수익</Text>
              <Text
                style={[
                  styles.statValue,
                  {
                    color:
                      stats.avgProfit > 0
                        ? colors.primary
                        : stats.avgProfit < 0
                        ? colors.danger
                        : colors.textMuted,
                  },
                ]}
              >
                {formatProfit(stats.avgProfit, currency)}
              </Text>
            </View>
          </View>

          {/* Line Chart */}
          {chartData.length >= 2 ? (
            <View style={styles.chartCard}>
              <Text style={styles.sectionTitle}>누적 뱅크롤 추이</Text>
              <View style={styles.chartContainer}>
                <CartesianChart
                  data={chartData}
                  xKey="x"
                  yKeys={['y']}
                  axisOptions={{
                    tickCount: { x: 4, y: 4 },
                    labelColor: colors.textMuted,
                    lineColor: colors.line,
                  }}
                >
                  {({ points }) => (
                    <Line
                      points={points.y}
                      color={colors.primary}
                      strokeWidth={2}
                      curveType="linear"
                    />
                  )}
                </CartesianChart>
              </View>
            </View>
          ) : sessions.length > 0 ? (
            <View style={styles.chartCard}>
              <Text style={styles.sectionTitle}>누적 뱅크롤 추이</Text>
              <View style={styles.chartEmpty}>
                <Text style={styles.chartEmptyText}>데이터가 부족합니다 (최소 2개 세션)</Text>
              </View>
            </View>
          ) : null}

          {/* Game type breakdown */}
          {gameTypeStats.length > 0 && (
            <View style={styles.breakdownCard}>
              <Text style={styles.sectionTitle}>게임 타입별 수익</Text>
              <View style={styles.breakdownHeader}>
                <Text style={[styles.breakdownCell, styles.breakdownLabelHeader]}>게임</Text>
                <Text style={[styles.breakdownCell, styles.breakdownNumHeader]}>세션</Text>
                <Text style={[styles.breakdownCell, styles.breakdownNumHeader]}>합계</Text>
              </View>
              {gameTypeStats.map(([gameType, data]) => {
                const pColor =
                  data.profit > 0
                    ? colors.primary
                    : data.profit < 0
                    ? colors.danger
                    : colors.textMuted;
                return (
                  <View key={gameType} style={styles.breakdownRow}>
                    <Text style={[styles.breakdownCell, styles.breakdownLabel]}>{gameType}</Text>
                    <Text style={[styles.breakdownCell, styles.breakdownNum]}>{data.sessions}회</Text>
                    <Text style={[styles.breakdownCell, styles.breakdownNum, { color: pColor }]}>
                      {formatProfit(data.profit, currency)}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          {sessions.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>이 기간에 세션이 없습니다</Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  headerTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  tabRow: {
    flexDirection: 'row',
    margin: spacing.base,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.button,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.button - 2,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: colors.surface },
  tabText: { fontSize: fontSize.sm, color: colors.textMuted, fontWeight: fontWeight.medium },
  tabTextActive: { color: colors.text, fontWeight: fontWeight.semibold },
  periodNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  navBtn: { padding: spacing.sm },
  navBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.primary },
  navBtnDisabled: { color: colors.textMuted },
  periodLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.base, gap: spacing.base },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing.xs,
  },
  statLabel: { fontSize: fontSize.xs, color: colors.textMuted },
  statValue: { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.text },
  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing.base,
  },
  sectionTitle: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text },
  chartContainer: { height: 200 },
  chartEmpty: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartEmptyText: { fontSize: fontSize.sm, color: colors.textMuted },
  breakdownCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing.sm,
  },
  breakdownHeader: {
    flexDirection: 'row',
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  breakdownRow: {
    flexDirection: 'row',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  breakdownCell: { flex: 1 },
  breakdownLabelHeader: { fontSize: fontSize.xs, color: colors.textMuted },
  breakdownNumHeader: { fontSize: fontSize.xs, color: colors.textMuted, textAlign: 'right' },
  breakdownLabel: { fontSize: fontSize.sm, color: colors.text },
  breakdownNum: { fontSize: fontSize.sm, color: colors.text, textAlign: 'right' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxl },
  emptyText: { fontSize: fontSize.base, color: colors.textMuted },
});

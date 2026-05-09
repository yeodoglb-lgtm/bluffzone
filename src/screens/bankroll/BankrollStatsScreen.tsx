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
import Svg, { Polyline, Line as SvgLine, Text as SvgText } from 'react-native-svg';
import { colors, spacing, fontSize, fontWeight, radius } from '../../theme';
import { useSessionsByRange } from '../../hooks/useSessions';
import { calcPeriodStats } from '../../services/sessions';
import { formatProfit } from '../../utils/currency';
import { dayjs, today, weekRange, monthRange, quarterRange, yearRange } from '../../utils/date';
import { useSettingsStore } from '../../store/settingsStore';
import { useAuthStore } from '../../store/authStore';
import AdminUserFilter from '../../components/AdminUserFilter';
import type { GameType } from '../../constants/poker';

type ChartDatum = { x: number; y: number };

function SimpleLine({ data }: { data: ChartDatum[] }) {
  const W = 320, H = 160, PAD = 24;
  const xs = data.map(d => d.x);
  const ys = data.map(d => d.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const toSvg = (d: ChartDatum) => ({
    sx: PAD + ((d.x - minX) / rangeX) * (W - PAD * 2),
    sy: PAD + (1 - (d.y - minY) / rangeY) * (H - PAD * 2),
  });
  const pts = data.map(d => { const { sx, sy } = toSvg(d); return `${sx},${sy}`; }).join(' ');
  const zeroY = PAD + (1 - (0 - minY) / rangeY) * (H - PAD * 2);
  const clampedZero = Math.max(PAD, Math.min(H - PAD, zeroY));
  return (
    <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
      <SvgLine x1={PAD} y1={clampedZero} x2={W - PAD} y2={clampedZero} stroke={colors.line} strokeWidth={1} />
      <Polyline points={pts} fill="none" stroke={colors.primary} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {[minY, (minY + maxY) / 2, maxY].map((v, i) => (
        <SvgText key={i} x={PAD - 4} y={toSvg({ x: minX, y: v }).sy + 4} fontSize={9} fill={colors.textMuted} textAnchor="end">
          {v >= 10000 ? `${(v / 10000).toFixed(0)}만` : v.toFixed(0)}
        </SvgText>
      ))}
    </Svg>
  );
}

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

export default function BankrollStatsScreen() {
  const { currency } = useSettingsStore();
  const { profile } = useAuthStore();
  const isAdmin = profile?.role === 'admin';
  const [activeTab, setActiveTab] = useState<TabKey>('month');
  const [offset, setOffset] = useState(0);
  const [filterUid, setFilterUid] = useState<string | null>(null);

  const { start, end } = useMemo(() => getRangeForTab(activeTab, offset), [activeTab, offset]);
  const rangeLabel = useMemo(() => formatRangeLabel(activeTab, start, end), [activeTab, start, end]);

  const { data: allSessions = [], isLoading } = useSessionsByRange(start, end);

  // 어드민: 선택 유저로 클라이언트 필터링
  const sessions = useMemo(() =>
    isAdmin && filterUid ? allSessions.filter(s => s.user_id === filterUid) : allSessions,
    [allSessions, isAdmin, filterUid]
  );

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

  // 베스트 / 워스트 세션
  const bestSession = useMemo(() => {
    if (sessions.length === 0) return null;
    return sessions.reduce((best, s) =>
      Number(s.net_profit) > Number(best.net_profit) ? s : best
    );
  }, [sessions]);
  const worstSession = useMemo(() => {
    if (sessions.length === 0) return null;
    return sessions.reduce((worst, s) =>
      Number(s.net_profit) < Number(worst.net_profit) ? s : worst
    );
  }, [sessions]);

  // 요일별 수익
  const weekdayStats = useMemo(() => {
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const stats = days.map(d => ({ day: d, profit: 0, count: 0 }));
    sessions.forEach(s => {
      const d = new Date(s.played_on).getDay();
      stats[d].profit += Number(s.net_profit);
      stats[d].count += 1;
    });
    return stats;
  }, [sessions]);

  // 연승 / 연패 (최근 세션부터 역순)
  const streak = useMemo(() => {
    if (sessions.length === 0) return null;
    // 날짜 역순 정렬
    const sorted = [...sessions].sort((a, b) =>
      (b.started_at ?? b.played_on).localeCompare(a.started_at ?? a.played_on)
    );
    const first = Number(sorted[0].net_profit);
    if (first === 0) return null;
    const isWin = first > 0;
    let count = 0;
    for (const s of sorted) {
      const p = Number(s.net_profit);
      if (isWin && p > 0) count++;
      else if (!isWin && p < 0) count++;
      else break;
    }
    return { isWin, count };
  }, [sessions]);

  // 장소별 수익 top 5
  const placeStats = useMemo(() => {
    const map = new Map<string, { sessions: number; profit: number }>();
    sessions.forEach(s => {
      const name = s.place_name_snapshot ?? '(미기재)';
      const prev = map.get(name) ?? { sessions: 0, profit: 0 };
      map.set(name, {
        sessions: prev.sessions + 1,
        profit: prev.profit + Number(s.net_profit),
      });
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1].profit - a[1].profit)
      .slice(0, 5);
  }, [sessions]);

  // Stakes별 ROI (캐쉬만, 스테이크 표기 있는 세션)
  const stakeStats = useMemo(() => {
    const map = new Map<string, { sessions: number; profit: number; hours: number }>();
    sessions.forEach(s => {
      if (s.is_tournament) return;
      const stake = (s.stakes ?? '').trim();
      if (!stake) return;
      const prev = map.get(stake) ?? { sessions: 0, profit: 0, hours: 0 };
      let hours = 0;
      if (s.started_at && s.ended_at) {
        hours = Math.max(0, (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 3600000);
      }
      map.set(stake, {
        sessions: prev.sessions + 1,
        profit: prev.profit + Number(s.net_profit),
        hours: prev.hours + hours,
      });
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1].profit - a[1].profit);
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

      {/* 어드민 유저 필터 */}
      <AdminUserFilter selectedUid={filterUid} onChange={setFilterUid} />

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
              <Text style={[styles.statValue, { color: stats.avgProfit > 0 ? colors.primary : stats.avgProfit < 0 ? colors.danger : colors.textMuted }]}>
                {formatProfit(stats.avgProfit, currency)}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>총 플레이 시간</Text>
              <Text style={styles.statValue}>
                {stats.totalHours >= 1
                  ? `${Math.floor(stats.totalHours)}시간 ${Math.round((stats.totalHours % 1) * 60)}분`
                  : stats.totalHours > 0
                  ? `${Math.round(stats.totalHours * 60)}분`
                  : '-'}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>시간당 수익</Text>
              <Text style={[styles.statValue, {
                color: stats.hourlyProfit == null
                  ? colors.textMuted
                  : stats.hourlyProfit > 0 ? colors.primary
                  : stats.hourlyProfit < 0 ? colors.danger
                  : colors.textMuted,
              }]}>
                {stats.hourlyProfit != null ? formatProfit(stats.hourlyProfit, currency) + '/h' : '-'}
              </Text>
            </View>
          </View>

          {/* 연승/연패 streak */}
          {streak && (
            <View style={[styles.streakCard, { backgroundColor: streak.isWin ? `${colors.primary}15` : `${colors.danger}15`, borderColor: streak.isWin ? colors.primary : colors.danger }]}>
              <Text style={styles.streakEmoji}>{streak.isWin ? '🔥' : '🥶'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.streakTitle, { color: streak.isWin ? colors.primary : colors.danger }]}>
                  {streak.count}세션 {streak.isWin ? '연승' : '연패'} 중
                </Text>
                <Text style={styles.streakSub}>
                  {streak.isWin ? '집중력 유지하세요' : '잠시 쉬어가는 것도 방법'}
                </Text>
              </View>
            </View>
          )}

          {/* 베스트/워스트 세션 */}
          {bestSession && worstSession && bestSession.id !== worstSession.id && (
            <View style={styles.bwRow}>
              <View style={[styles.bwCard, { borderColor: colors.primary }]}>
                <Text style={styles.bwLabel}>🏆 베스트 세션</Text>
                <Text style={[styles.bwValue, { color: colors.primary }]}>
                  {formatProfit(Number(bestSession.net_profit), currency)}
                </Text>
                <Text style={styles.bwSub} numberOfLines={1}>
                  {dayjs(bestSession.played_on).format('M/D')} · {bestSession.place_name_snapshot ?? '(미기재)'}
                </Text>
              </View>
              <View style={[styles.bwCard, { borderColor: colors.danger }]}>
                <Text style={styles.bwLabel}>🥲 워스트 세션</Text>
                <Text style={[styles.bwValue, { color: colors.danger }]}>
                  {formatProfit(Number(worstSession.net_profit), currency)}
                </Text>
                <Text style={styles.bwSub} numberOfLines={1}>
                  {dayjs(worstSession.played_on).format('M/D')} · {worstSession.place_name_snapshot ?? '(미기재)'}
                </Text>
              </View>
            </View>
          )}

          {/* Line Chart */}
          {chartData.length >= 2 ? (
            <View style={styles.chartCard}>
              <Text style={styles.sectionTitle}>누적 뱅크롤 추이</Text>
              <View style={styles.chartContainer}>
                <SimpleLine data={chartData} />
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

          {/* 요일별 수익 — 패턴 분석 */}
          {sessions.length >= 3 && weekdayStats.some(d => d.count > 0) && (
            <View style={styles.breakdownCard}>
              <Text style={styles.sectionTitle}>요일별 수익</Text>
              {(() => {
                const max = Math.max(...weekdayStats.map(d => Math.abs(d.profit)), 1);
                return (
                  <View style={styles.weekdayRow}>
                    {weekdayStats.map(d => {
                      const barH = (Math.abs(d.profit) / max) * 60;
                      const positive = d.profit >= 0;
                      return (
                        <View key={d.day} style={styles.weekdayCol}>
                          <Text style={[styles.weekdayProfit, { color: positive ? colors.primary : colors.danger }]}>
                            {d.count > 0 ? (d.profit >= 0 ? '+' : '') + (d.profit / 10000).toFixed(0) + '만' : '-'}
                          </Text>
                          <View style={styles.weekdayBarWrap}>
                            {d.count > 0 && (
                              <View style={[styles.weekdayBar, {
                                height: Math.max(2, barH),
                                backgroundColor: positive ? colors.primary : colors.danger,
                              }]} />
                            )}
                          </View>
                          <Text style={styles.weekdayLabel}>{d.day}</Text>
                          <Text style={styles.weekdayCount}>{d.count}회</Text>
                        </View>
                      );
                    })}
                  </View>
                );
              })()}
            </View>
          )}

          {/* Top 5 장소별 수익 */}
          {placeStats.length > 1 && (
            <View style={styles.breakdownCard}>
              <Text style={styles.sectionTitle}>장소별 수익 (Top 5)</Text>
              <View style={styles.breakdownHeader}>
                <Text style={[styles.breakdownCell, styles.breakdownLabelHeader, { flex: 2 }]}>장소</Text>
                <Text style={[styles.breakdownCell, styles.breakdownNumHeader]}>세션</Text>
                <Text style={[styles.breakdownCell, styles.breakdownNumHeader]}>합계</Text>
              </View>
              {placeStats.map(([name, d]) => {
                const c = d.profit > 0 ? colors.primary : d.profit < 0 ? colors.danger : colors.textMuted;
                return (
                  <View key={name} style={styles.breakdownRow}>
                    <Text style={[styles.breakdownCell, styles.breakdownLabel, { flex: 2 }]} numberOfLines={1}>{name}</Text>
                    <Text style={[styles.breakdownCell, styles.breakdownNum]}>{d.sessions}회</Text>
                    <Text style={[styles.breakdownCell, styles.breakdownNum, { color: c }]}>
                      {formatProfit(d.profit, currency)}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* Stakes별 시간당 수익 (캐쉬만) */}
          {stakeStats.length > 0 && (
            <View style={styles.breakdownCard}>
              <Text style={styles.sectionTitle}>스테이크별 수익 (캐쉬)</Text>
              <View style={styles.breakdownHeader}>
                <Text style={[styles.breakdownCell, styles.breakdownLabelHeader]}>스테이크</Text>
                <Text style={[styles.breakdownCell, styles.breakdownNumHeader]}>세션</Text>
                <Text style={[styles.breakdownCell, styles.breakdownNumHeader]}>합계</Text>
                <Text style={[styles.breakdownCell, styles.breakdownNumHeader]}>시간당</Text>
              </View>
              {stakeStats.map(([stake, d]) => {
                const c = d.profit > 0 ? colors.primary : d.profit < 0 ? colors.danger : colors.textMuted;
                const hourly = d.hours > 0 ? d.profit / d.hours : null;
                return (
                  <View key={stake} style={styles.breakdownRow}>
                    <Text style={[styles.breakdownCell, styles.breakdownLabel]} numberOfLines={1}>{stake}</Text>
                    <Text style={[styles.breakdownCell, styles.breakdownNum]}>{d.sessions}회</Text>
                    <Text style={[styles.breakdownCell, styles.breakdownNum, { color: c }]}>
                      {formatProfit(d.profit, currency)}
                    </Text>
                    <Text style={[styles.breakdownCell, styles.breakdownNum, { color: c, fontSize: 11 }]}>
                      {hourly != null ? formatProfit(hourly, currency) + '/h' : '-'}
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

  // 연승 streak 카드
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.base,
    borderRadius: radius.card,
    borderWidth: 1.5,
  },
  streakEmoji: { fontSize: 32 },
  streakTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  streakSub: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },

  // 베스트 / 워스트 카드
  bwRow: { flexDirection: 'row', gap: spacing.sm },
  bwCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    borderWidth: 1.5,
    gap: 4,
  },
  bwLabel: { fontSize: fontSize.xs, color: colors.textMuted, fontWeight: fontWeight.medium },
  bwValue: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  bwSub: { fontSize: 10, color: colors.textMuted, marginTop: 2 },

  // 요일별 차트
  weekdayRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 4, paddingTop: spacing.sm },
  weekdayCol: { flex: 1, alignItems: 'center', gap: 2 },
  weekdayProfit: { fontSize: 9, fontWeight: fontWeight.semibold },
  weekdayBarWrap: { height: 60, justifyContent: 'flex-end' },
  weekdayBar: { width: 16, borderRadius: 2, minHeight: 2 },
  weekdayLabel: { fontSize: fontSize.xs, color: colors.text, fontWeight: fontWeight.medium, marginTop: 2 },
  weekdayCount: { fontSize: 9, color: colors.textMuted },
});

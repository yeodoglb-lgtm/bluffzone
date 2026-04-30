import { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Modal, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import type { DateData } from 'react-native-calendars';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { BarChart2, Plus } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, radius } from '../../theme';
import { useSessionsByMonth, useSessionsByRange } from '../../hooks/useSessions';
import { aggregateByDay, calcPeriodStats } from '../../services/sessions';
import { formatProfit } from '../../utils/currency';
import { useSettingsStore } from '../../store/settingsStore';
import { useAuthStore } from '../../store/authStore';
import { dayjs, today, weekRange, yearRange } from '../../utils/date';
import type { BankrollStackParamList } from '../../navigation/types';
import AdminUserFilter from '../../components/AdminUserFilter';

type Nav = StackNavigationProp<BankrollStackParamList, 'BankrollCalendar'>;
type PeriodTab = 'week' | 'month' | 'year';
type GameTypeFilter = 'all' | 'cash' | 'tournament';

const PERIOD_TABS: { key: PeriodTab; label: string }[] = [
  { key: 'week',  label: '이번 주' },
  { key: 'month', label: '이번 달' },
  { key: 'year',  label: '올해' },
];

const GAME_TYPE_TABS: { key: GameTypeFilter; label: string }[] = [
  { key: 'all',        label: '전체' },
  { key: 'cash',       label: '캐시' },
  { key: 'tournament', label: '토너' },
];

const MONTH_LABELS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

export default function BankrollCalendarScreen() {
  const navigation = useNavigation<Nav>();
  const { currency, lossProtect } = useSettingsStore();
  const { profile } = useAuthStore();
  const isAdmin = profile?.role === 'admin';
  const now = dayjs();
  const [year, setYear] = useState(now.year());
  const [month, setMonth] = useState(now.month() + 1);
  const [showAmount, setShowAmount] = useState(true);
  const [periodTab, setPeriodTab] = useState<PeriodTab>('month');
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(now.year());
  const [showHourlyDetail, setShowHourlyDetail] = useState(false);
  const [filterUid, setFilterUid] = useState<string | null>(null);
  const [gameTypeFilter, setGameTypeFilter] = useState<GameTypeFilter>('all');

  // 게임 타입 필터 적용 헬퍼
  const applyGameTypeFilter = (sessions: any[]) => {
    if (gameTypeFilter === 'all') return sessions;
    if (gameTypeFilter === 'cash') return sessions.filter(s => !s.is_tournament);
    return sessions.filter(s => s.is_tournament);
  };

  // 월별 데이터 (캘린더용) — 어드민은 전체 fetch 후 클라이언트 필터링
  const { data: allMonthSessions = [], isLoading } = useSessionsByMonth(year, month);
  const monthSessions = useMemo(() => {
    let filtered = allMonthSessions;
    if (isAdmin && filterUid) filtered = filtered.filter(s => s.user_id === filterUid);
    return applyGameTypeFilter(filtered);
  }, [allMonthSessions, isAdmin, filterUid, gameTypeFilter]);
  const dayStats = useMemo(() => aggregateByDay(monthSessions), [monthSessions]);

  // 기간별 데이터 (상단 통계용)
  const periodRange = useMemo(() => {
    switch (periodTab) {
      case 'week':  return weekRange(today());
      case 'month': {
        const start = dayjs(`${year}-${String(month).padStart(2, '0')}-01`);
        return { start: start.format('YYYY-MM-DD'), end: start.endOf('month').format('YYYY-MM-DD') };
      }
      case 'year':  return yearRange(year);
    }
  }, [periodTab, year, month]);

  const { data: allPeriodSessions = [] } = useSessionsByRange(periodRange.start, periodRange.end);
  const periodSessions = useMemo(() => {
    let filtered = allPeriodSessions;
    if (isAdmin && filterUid) filtered = filtered.filter(s => s.user_id === filterUid);
    return applyGameTypeFilter(filtered);
  }, [allPeriodSessions, isAdmin, filterUid, gameTypeFilter]);
  const stats = useMemo(() => calcPeriodStats(periodSessions), [periodSessions]);

  function handleDayPress(day: DateData) {
    navigation.navigate('DayDetail', { date: day.dateString });
  }
  function handleMonthChange(date: DateData) {
    setYear(date.year);
    setMonth(date.month);
  }
  function confirmMonthPick(m: number) {
    setYear(pickerYear);
    setMonth(m);
    setShowMonthPicker(false);
    if (periodTab === 'month') {/* stats will update via useMemo */}
  }

  const profitColor =
    stats.totalProfit > 0 ? colors.success :
    stats.totalProfit < 0 ? colors.danger : colors.textMuted;

  const calCurrent = `${year}-${String(month).padStart(2, '0')}-01`;

  // 시간당 수익 계산 근거 텍스트
  const hourlyDetailText = stats.hourlyProfit != null && stats.totalHours > 0
    ? `${formatProfit(Math.round(stats.totalProfit), currency)} ÷ ${stats.totalHours.toFixed(1)}시간`
    : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>뱅크롤</Text>
        <TouchableOpacity style={styles.statsBtn} onPress={() => navigation.navigate('BankrollStats')}>
          <BarChart2 color={colors.primary} size={22} />
        </TouchableOpacity>
      </View>

      {/* 어드민 유저 필터 */}
      <AdminUserFilter selectedUid={filterUid} onChange={setFilterUid} />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 게임 타입 필터 (전체 / 캐시 / 토너) */}
        <View style={styles.gameTypeFilterRow}>
          {GAME_TYPE_TABS.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.gameTypeFilterChip,
                gameTypeFilter === tab.key && styles.gameTypeFilterChipActive,
              ]}
              onPress={() => setGameTypeFilter(tab.key)}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.gameTypeFilterText,
                  gameTypeFilter === tab.key && styles.gameTypeFilterTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 기간 탭 */}
        <View style={styles.periodTabRow}>
          {PERIOD_TABS.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.periodTab, periodTab === tab.key && styles.periodTabActive]}
              onPress={() => setPeriodTab(tab.key)}
            >
              <Text style={[styles.periodTabText, periodTab === tab.key && styles.periodTabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 통계 바 */}
        <View style={styles.statsCard}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>합계</Text>
              <Text style={[styles.statValue, { color: profitColor }]}>
                {formatProfit(stats.totalProfit, currency)}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>세션</Text>
              <Text style={styles.statValue}>{stats.sessionCount}회</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>승률</Text>
              <Text style={styles.statValue}>{stats.winRate.toFixed(0)}%</Text>
            </View>
            <View style={styles.statDivider} />
            {/* 시간당 수익 - 탭하면 계산 근거 표시 */}
            <TouchableOpacity
              style={styles.statItem}
              onPress={() => stats.hourlyProfit != null && setShowHourlyDetail(v => !v)}
              activeOpacity={stats.hourlyProfit != null ? 0.6 : 1}
            >
              <Text style={styles.statLabel}>시간당 {stats.hourlyProfit != null ? '💡' : ''}</Text>
              <Text style={[styles.statValue, {
                color: stats.hourlyProfit == null ? colors.textMuted
                  : stats.hourlyProfit > 0 ? colors.success
                  : colors.danger,
              }]}>
                {stats.hourlyProfit != null
                  ? formatProfit(Math.round(stats.hourlyProfit), currency) + '/h'
                  : '-'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* 계산 근거 */}
          {showHourlyDetail && hourlyDetailText && (
            <View style={styles.hourlyDetail}>
              <Text style={styles.hourlyDetailText}>📊 {hourlyDetailText}</Text>
            </View>
          )}
        </View>

        {/* 월 선택 + 금액/승패 토글 */}
        <View style={styles.calHeader}>
          <TouchableOpacity
            style={styles.monthPickerBtn}
            onPress={() => { setPickerYear(year); setShowMonthPicker(true); }}
          >
            <Text style={styles.monthPickerText}>{year}년 {month}월 ▾</Text>
          </TouchableOpacity>
          <View style={styles.toggleRowSmall}>
            {(['금액', '승패'] as const).map((label, i) => (
              <TouchableOpacity
                key={label}
                style={[styles.toggleBtnSmall, showAmount === (i === 0) && styles.toggleActiveSmall]}
                onPress={() => setShowAmount(i === 0)}
              >
                <Text style={[styles.toggleTextSmall, showAmount === (i === 0) && styles.toggleTextActiveSmall]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loading}><ActivityIndicator color={colors.primary} /></View>
        ) : (
          <Calendar
            current={calCurrent}
            onDayPress={handleDayPress}
            onMonthChange={handleMonthChange}
            markingType="custom"
            theme={{
              backgroundColor: colors.bg,
              calendarBackground: colors.bg,
              textSectionTitleColor: colors.textMuted,
              todayTextColor: colors.primary,
              dayTextColor: colors.text,
              textDisabledColor: colors.textMuted,
              arrowColor: colors.primary,
              monthTextColor: colors.text,
            }}
            dayComponent={({ date, state }) => {
              if (!date) return null;
              const ds = dayStats[date.dateString];
              const isToday = date.dateString === today();
              const isDisabled = state === 'disabled';
              const pc = ds
                ? ds.net_profit >= 0 ? colors.primary : (lossProtect ? colors.textMuted : colors.danger)
                : colors.textMuted;
              return (
                <TouchableOpacity
                  style={[styles.dayCell, isToday && styles.dayCellToday]}
                  onPress={() => handleDayPress(date)}
                  disabled={isDisabled}
                >
                  <Text style={[styles.dayNum, isDisabled && { color: colors.textMuted }, isToday && { color: colors.primary }]}>
                    {date.day}
                  </Text>
                  {ds && showAmount && (
                    <Text style={[styles.dayAmount, { color: pc }]} numberOfLines={1}>
                      {ds.net_profit >= 0 ? '+' : ''}
                      {currency === 'KRW'
                        ? `${Math.round(ds.net_profit / 10000)}만`
                        : `$${Math.abs(ds.net_profit).toFixed(0)}`}
                    </Text>
                  )}
                  {ds && !showAmount && (
                    <View style={[styles.dayDot, { backgroundColor: ds.net_profit >= 0 ? colors.primary : colors.textMuted }]} />
                  )}
                </TouchableOpacity>
              );
            }}
          />
        )}

        <View style={styles.legend}>
          {[{ color: colors.primary, label: '수익' }, { color: colors.textMuted, label: '손실' }].map(l => (
            <View key={l.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: l.color }]} />
              <Text style={styles.legendText}>{l.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* + 세션 추가 FAB (오늘 날짜 기본값) */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('SessionForm', { date: today() })}
        activeOpacity={0.85}
      >
        <Plus color={colors.bg} size={20} strokeWidth={2.5} />
        <Text style={styles.fabText}>세션 추가</Text>
      </TouchableOpacity>

      {/* 월 선택 모달 */}
      <Modal visible={showMonthPicker} transparent animationType="fade" onRequestClose={() => setShowMonthPicker(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowMonthPicker(false)}>
          <Pressable style={styles.monthModal} onPress={e => e.stopPropagation()}>
            {/* 연도 네비게이션 */}
            <View style={styles.yearNav}>
              <TouchableOpacity onPress={() => setPickerYear(y => y - 1)} style={styles.yearNavBtn}>
                <Text style={styles.yearNavText}>◀</Text>
              </TouchableOpacity>
              <Text style={styles.yearNavLabel}>{pickerYear}년</Text>
              <TouchableOpacity
                onPress={() => setPickerYear(y => y + 1)}
                style={styles.yearNavBtn}
                disabled={pickerYear >= now.year()}
              >
                <Text style={[styles.yearNavText, pickerYear >= now.year() && { color: colors.textMuted }]}>▶</Text>
              </TouchableOpacity>
            </View>
            {/* 월 그리드 */}
            <View style={styles.monthGrid}>
              {MONTH_LABELS.map((label, i) => {
                const m = i + 1;
                const isSelected = m === month && pickerYear === year;
                const isFuture = pickerYear === now.year() && m > now.month() + 1;
                return (
                  <TouchableOpacity
                    key={m}
                    style={[styles.monthCell, isSelected && styles.monthCellSelected]}
                    onPress={() => !isFuture && confirmMonthPick(m)}
                    disabled={isFuture}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.monthCellText,
                      isSelected && styles.monthCellTextSelected,
                      isFuture && { color: colors.textMuted, opacity: 0.4 },
                    ]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingVertical: spacing.base,
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  headerTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  statsBtn: { padding: spacing.xs },

  periodTabRow: {
    flexDirection: 'row', margin: spacing.base, marginBottom: 0,
    backgroundColor: colors.surfaceAlt, borderRadius: radius.button, padding: 3,
  },
  periodTab: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.button - 2, alignItems: 'center' },
  periodTabActive: { backgroundColor: colors.surface },
  periodTabText: { fontSize: fontSize.sm, color: colors.textMuted, fontWeight: fontWeight.medium },
  periodTabTextActive: { color: colors.text, fontWeight: fontWeight.semibold },

  gameTypeFilterRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginHorizontal: spacing.base,
    marginTop: spacing.sm,
  },
  gameTypeFilterChip: {
    paddingHorizontal: spacing.base,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  gameTypeFilterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  gameTypeFilterText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: fontWeight.medium,
  },
  gameTypeFilterTextActive: {
    color: colors.bg,
    fontWeight: fontWeight.bold,
  },

  statsCard: {
    margin: spacing.base,
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  statsRow: { flexDirection: 'row', paddingVertical: spacing.base, paddingHorizontal: spacing.sm },
  statItem: { flex: 1, alignItems: 'center', gap: 3 },
  statLabel: { fontSize: fontSize.xs, color: colors.textMuted },
  statValue: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.text },
  statDivider: { width: 1, backgroundColor: colors.line, marginVertical: 4 },
  hourlyDetail: {
    borderTopWidth: 1, borderTopColor: colors.line,
    paddingVertical: spacing.xs, paddingHorizontal: spacing.base,
    backgroundColor: colors.surfaceAlt,
  },
  hourlyDetailText: { fontSize: fontSize.xs, color: colors.textMuted, textAlign: 'center' },

  calHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.base, marginBottom: 4,
  },
  monthPickerBtn: {
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
    backgroundColor: colors.surface, borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.line,
  },
  monthPickerText: { fontSize: fontSize.sm, color: colors.text, fontWeight: fontWeight.semibold },
  toggleRowSmall: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt, borderRadius: radius.button, padding: 2,
  },
  toggleBtnSmall: { paddingHorizontal: spacing.base, paddingVertical: 5, borderRadius: radius.button - 2 },
  toggleActiveSmall: { backgroundColor: colors.surface },
  toggleTextSmall: { fontSize: fontSize.xs, color: colors.textMuted },
  toggleTextActiveSmall: { color: colors.text },

  loading: { height: 300, alignItems: 'center', justifyContent: 'center' },
  dayCell: { width: 44, minHeight: 48, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 4, borderRadius: 8, gap: 2 },
  dayCellToday: { borderWidth: 1, borderColor: colors.primary },
  dayNum: { fontSize: 13, fontWeight: fontWeight.medium, color: colors.text },
  dayAmount: { fontSize: 9, fontWeight: fontWeight.bold, letterSpacing: -0.3 },
  dayDot: { width: 6, height: 6, borderRadius: 3 },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xl, padding: spacing.base },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  fab: {
    position: 'absolute',
    right: spacing.base,
    bottom: spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.bg,
  },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: fontSize.xs, color: colors.textMuted },

  // 모달
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },
  monthModal: {
    backgroundColor: colors.surface, borderRadius: radius.card,
    padding: spacing.base, width: 280,
    borderWidth: 1, borderColor: colors.line,
  },
  yearNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.base,
  },
  yearNavBtn: { padding: spacing.sm },
  yearNavText: { fontSize: fontSize.md, color: colors.primary, fontWeight: fontWeight.bold },
  yearNavLabel: { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.text },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  monthCell: {
    width: '30%', paddingVertical: spacing.sm,
    borderRadius: radius.sm, alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1, borderColor: colors.line,
  },
  monthCellSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  monthCellText: { fontSize: fontSize.sm, color: colors.text, fontWeight: fontWeight.medium },
  monthCellTextSelected: { color: colors.bg, fontWeight: fontWeight.bold },
});

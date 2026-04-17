import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import type { DateData } from 'react-native-calendars';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { BarChart2 } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, radius } from '../../theme';
import { useSessionsByMonth } from '../../hooks/useSessions';
import { aggregateByDay, calcPeriodStats } from '../../services/sessions';
import { formatProfit } from '../../utils/currency';
import { useSettingsStore } from '../../store/settingsStore';
import { dayjs, today } from '../../utils/date';
import type { BankrollStackParamList } from '../../navigation/types';

type Nav = StackNavigationProp<BankrollStackParamList, 'BankrollCalendar'>;

export default function BankrollCalendarScreen() {
  const navigation = useNavigation<Nav>();
  const { currency, lossProtect } = useSettingsStore();
  const now = dayjs();
  const [year, setYear] = useState(now.year());
  const [month, setMonth] = useState(now.month() + 1);
  const [showAmount, setShowAmount] = useState(true);

  const { data: sessions = [], isLoading } = useSessionsByMonth(year, month);
  const dayStats = useMemo(() => aggregateByDay(sessions), [sessions]);
  const monthStats = useMemo(() => calcPeriodStats(sessions), [sessions]);

  function handleDayPress(day: DateData) {
    navigation.navigate('DayDetail', { date: day.dateString });
  }
  function handleMonthChange(date: DateData) {
    setYear(date.year);
    setMonth(date.month);
  }

  const monthNetColor =
    monthStats.totalProfit > 0 ? colors.success :
    monthStats.totalProfit < 0 ? colors.danger : colors.textMuted;

  const calCurrent = `${year}-${String(month).padStart(2, '0')}-01`;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>뱅크롤</Text>
        <TouchableOpacity style={styles.statsBtn} onPress={() => navigation.navigate('BankrollStats')}>
          <BarChart2 color={colors.primary} size={22} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.monthBar}>
          <View style={styles.monthStat}>
            <Text style={styles.monthStatLabel}>이번 달 합계</Text>
            <Text style={[styles.monthStatValue, { color: monthNetColor }]}>
              {formatProfit(monthStats.totalProfit, currency)}
            </Text>
          </View>
          <View style={styles.monthStat}>
            <Text style={styles.monthStatLabel}>세션</Text>
            <Text style={styles.monthStatValue}>{monthStats.sessionCount}회</Text>
          </View>
          <View style={styles.monthStat}>
            <Text style={styles.monthStatLabel}>승률</Text>
            <Text style={styles.monthStatValue}>{monthStats.winRate.toFixed(0)}%</Text>
          </View>
        </View>

        <View style={styles.toggleRow}>
          {(['금액 표시', '승패 표시'] as const).map((label, i) => (
            <TouchableOpacity
              key={label}
              style={[styles.toggleBtn, showAmount === (i === 0) && styles.toggleActive]}
              onPress={() => setShowAmount(i === 0)}
            >
              <Text style={[styles.toggleText, showAmount === (i === 0) && styles.toggleTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
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
              const stats = dayStats[date.dateString];
              const isToday = date.dateString === today();
              const isDisabled = state === 'disabled';
              const profitColor = stats
                ? stats.net_profit >= 0 ? colors.primary : (lossProtect ? colors.textMuted : colors.danger)
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
                  {stats && showAmount && (
                    <Text style={[styles.dayAmount, { color: profitColor }]} numberOfLines={1}>
                      {stats.net_profit >= 0 ? '+' : ''}
                      {currency === 'KRW'
                        ? `${Math.round(stats.net_profit / 10000)}만`
                        : `$${Math.abs(stats.net_profit).toFixed(0)}`}
                    </Text>
                  )}
                  {stats && !showAmount && (
                    <View style={[styles.dayDot, { backgroundColor: stats.net_profit >= 0 ? colors.primary : colors.textMuted }]} />
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
  monthBar: {
    flexDirection: 'row', paddingHorizontal: spacing.xl, paddingVertical: spacing.base,
    borderBottomWidth: 1, borderBottomColor: colors.line, gap: spacing.base,
  },
  monthStat: { flex: 1, alignItems: 'center', gap: 2 },
  monthStatLabel: { fontSize: fontSize.xs, color: colors.textMuted },
  monthStatValue: { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.text },
  toggleRow: {
    flexDirection: 'row', margin: spacing.base,
    backgroundColor: colors.surfaceAlt, borderRadius: radius.button, padding: 3,
  },
  toggleBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.button - 2, alignItems: 'center' },
  toggleActive: { backgroundColor: colors.surface },
  toggleText: { fontSize: fontSize.sm, color: colors.textMuted, fontWeight: fontWeight.medium },
  toggleTextActive: { color: colors.text },
  loading: { height: 300, alignItems: 'center', justifyContent: 'center' },
  dayCell: { width: 44, minHeight: 48, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 4, borderRadius: 8, gap: 2 },
  dayCellToday: { borderWidth: 1, borderColor: colors.primary },
  dayNum: { fontSize: 13, fontWeight: fontWeight.medium, color: colors.text },
  dayAmount: { fontSize: 9, fontWeight: fontWeight.bold, letterSpacing: -0.3 },
  dayDot: { width: 6, height: 6, borderRadius: 3 },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xl, padding: spacing.base },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: fontSize.xs, color: colors.textMuted },
});

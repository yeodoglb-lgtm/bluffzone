import { useLayoutEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { showConfirm, showAlert } from '../../utils/alert';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { StackScreenProps } from '@react-navigation/stack';
import { Plus } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, radius } from '../../theme';
import { useSessionsByDate, useDeleteSession, useUserNameMap } from '../../hooks/useSessions';
import { useAuthStore } from '../../store/authStore';
import { calcPeriodStats } from '../../services/sessions';
import { formatProfit, formatCurrency } from '../../utils/currency';
import { formatDate, formatTime, formatDuration, dayjs } from '../../utils/date';
import { useSettingsStore } from '../../store/settingsStore';
import type { BankrollStackParamList } from '../../navigation/types';
import type { SessionWithProfit } from '../../types/database';

type Props = StackScreenProps<BankrollStackParamList, 'DayDetail'>;

export default function DayDetailScreen({ route, navigation }: Props) {
  const { date } = route.params;
  const { currency } = useSettingsStore();

  const { profile } = useAuthStore();
  const isAdmin = profile?.role === 'admin';
  const { data: sessions = [], isLoading } = useSessionsByDate(date);
  const { data: userNameMap = {} } = useUserNameMap();
  const deleteSession = useDeleteSession();

  const stats = calcPeriodStats(sessions);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  // 이전/다음 날 이동 (replace로 스택 누적 방지)
  const goDay = useCallback((offset: number) => {
    const newDate = dayjs(date).add(offset, 'day').format('YYYY-MM-DD');
    navigation.replace('DayDetail', { date: newDate });
  }, [date, navigation]);

  function handleAdd() {
    navigation.navigate('SessionForm', { date });
  }

  function handleLongPress(session: SessionWithProfit) {
    // 웹: window.confirm이 2버튼만 지원하므로 삭제 확인만
    if (Platform.OS === 'web') {
      showConfirm({
        title: '세션 삭제',
        message: `${session.place_name_snapshot ?? '장소 없음'} 세션을 삭제하시겠습니까?\n(수정은 세션을 탭해서 상세 화면에서 가능합니다.)`,
        confirmText: '삭제',
        destructive: true,
        onConfirm: () => {
          deleteSession.mutate(
            { id: session.id, playedOn: session.played_on },
            {
              onError: (err: any) => {
                const msg = err?.message ?? String(err);
                if (msg?.includes('foreign key') || err?.code === '23503') {
                  showAlert(
                    '세션을 삭제할 수 없습니다',
                    '이 세션에 기록된 핸드가 있습니다. 먼저 핸드를 삭제하거나 다른 세션으로 옮겨주세요.'
                  );
                } else {
                  showAlert('삭제 실패', msg);
                }
              },
            }
          );
        },
      });
      return;
    }
    // 네이티브: 3버튼 메뉴 (수정 / 삭제 / 취소)
    Alert.alert(
      '세션 관리',
      `${session.place_name_snapshot ?? '장소 없음'} 세션`,
      [
        {
          text: '수정',
          onPress: () => navigation.navigate('SessionForm', { sessionId: session.id }),
        },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => {
            Alert.alert('세션 삭제', '이 세션을 삭제하시겠습니까?', [
              { text: '취소', style: 'cancel' },
              {
                text: '삭제',
                style: 'destructive',
                onPress: () =>
                  deleteSession.mutate({ id: session.id, playedOn: session.played_on }),
              },
            ]);
          },
        },
        { text: '취소', style: 'cancel' },
      ]
    );
  }

  function renderSession({ item }: { item: SessionWithProfit }) {
    const net = Number(item.net_profit);
    const profitColor = net > 0 ? colors.primary : net < 0 ? colors.danger : colors.textMuted;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('SessionDetail', { sessionId: item.id })}
        onLongPress={() => handleLongPress(item)}
        delayLongPress={400}
        activeOpacity={0.8}
      >
        <View style={styles.cardTop}>
          {/* 캐시/토너 아이콘 */}
          <View style={[styles.typeIcon, item.is_tournament ? styles.typeIconTour : styles.typeIconCash]}>
            <Text style={styles.typeIconText}>{item.is_tournament ? '🏆' : '💰'}</Text>
          </View>
          <View style={{ flex: 1, marginRight: spacing.sm }}>
            <Text style={styles.placeName} numberOfLines={1}>
              {item.place_name_snapshot ?? '장소 미지정'}
            </Text>
            {isAdmin && userNameMap[item.user_id] && (
              <View style={styles.userBadge}>
                <Text style={styles.userBadgeText}>👤 {userNameMap[item.user_id]}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.netProfit, { color: profitColor }]}>
            {formatProfit(net, currency)}
          </Text>
        </View>

        <View style={styles.cardMid}>
          {(item.started_at || item.ended_at) ? (
            <Text style={styles.timeText}>
              {formatTime(item.started_at)}
              {item.started_at && item.ended_at ? ' ~ ' : ''}
              {formatTime(item.ended_at)}
              {item.started_at && item.ended_at
                ? `  (${formatDuration(item.started_at, item.ended_at)})`
                : ''}
            </Text>
          ) : null}
          {item.stakes ? (
            <Text style={styles.stakes}>{item.stakes}</Text>
          ) : null}
        </View>

        <View style={styles.cardBottom}>
          {item.game_type ? (
            <View style={styles.tag}>
              <Text style={styles.tagText}>{item.game_type}</Text>
            </View>
          ) : null}
          <Text style={styles.inout}>
            {formatCurrency(item.buy_in, currency)} → {formatCurrency(item.cash_out, currency)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  const totalNetColor =
    stats.totalProfit > 0
      ? colors.primary
      : stats.totalProfit < 0
      ? colors.danger
      : colors.textMuted;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>{'<'}</Text>
        </TouchableOpacity>

        {/* 날짜 + 이전/다음 화살표 */}
        <View style={styles.dateNav}>
          <TouchableOpacity style={styles.dayNavBtn} onPress={() => goDay(-1)}>
            <Text style={styles.dayNavText}>{'‹'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{formatDate(date)}</Text>
          <TouchableOpacity style={styles.dayNavBtn} onPress={() => goDay(1)}>
            <Text style={styles.dayNavText}>{'›'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
          <Plus color={colors.primary} size={22} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={item => item.id}
          renderItem={renderSession}
          contentContainerStyle={[
            styles.listContent,
            sessions.length === 0 && styles.emptyContent,
          ]}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>이 날 기록이 없습니다</Text>
              <TouchableOpacity style={styles.emptyAddBtn} onPress={handleAdd}>
                <Text style={styles.emptyAddText}>세션 추가</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Bottom summary bar */}
      {sessions.length > 0 && (
        <View style={styles.summaryBar}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>세션</Text>
            <Text style={styles.summaryValue}>{stats.sessionCount}회</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>합계</Text>
            <Text style={[styles.summaryValue, { color: totalNetColor }]}>
              {formatProfit(stats.totalProfit, currency)}
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  backBtn: { padding: spacing.xs },
  backText: { fontSize: fontSize.md, color: colors.primary, fontWeight: fontWeight.bold },
  dateNav: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  dayNavBtn: { padding: spacing.xs, paddingHorizontal: spacing.sm },
  dayNavText: { fontSize: 24, color: colors.primary, lineHeight: 26 },
  headerTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    textAlign: 'center',
  },
  addBtn: { padding: spacing.xs },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: spacing.base, gap: spacing.sm },
  emptyContent: { flex: 1 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.base },
  emptyText: { fontSize: fontSize.base, color: colors.textMuted },
  emptyAddBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.button,
  },
  emptyAddText: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.base,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.line,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  typeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  typeIconCash: {
    backgroundColor: `${colors.primary}22`,
    borderColor: `${colors.primary}55`,
  },
  typeIconTour: {
    backgroundColor: `${colors.warning}22`,
    borderColor: `${colors.warning}55`,
  },
  typeIconText: { fontSize: 16 },
  placeName: {
    flex: 1,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginRight: spacing.sm,
  },
  netProfit: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  cardMid: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
  },
  timeText: { fontSize: fontSize.sm, color: colors.textMuted },
  stakes: { fontSize: fontSize.sm, color: colors.textMuted },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  tag: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  tagText: { fontSize: fontSize.xs, color: colors.textMuted, fontWeight: fontWeight.medium },
  inout: { fontSize: fontSize.sm, color: colors.textMuted },
  userBadge: {
    alignSelf: 'flex-start',
    backgroundColor: `${colors.primary}22`,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: `${colors.primary}55`,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginTop: 2,
  },
  userBadgeText: { fontSize: 10, color: colors.primary, fontWeight: fontWeight.medium },
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  summaryItem: { alignItems: 'center', gap: 2 },
  summaryLabel: { fontSize: fontSize.xs, color: colors.textMuted },
  summaryValue: { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.text },
  summaryDivider: { width: 1, height: 32, backgroundColor: colors.line },
});

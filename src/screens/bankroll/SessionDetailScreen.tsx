import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { StackScreenProps } from '@react-navigation/stack';
import { colors, spacing, fontSize, fontWeight, radius } from '../../theme';
import { formatDate, formatTime, formatDuration } from '../../utils/date';
import { formatProfit, formatCurrency } from '../../utils/currency';
import { useSettingsStore } from '../../store/settingsStore';
import { useDeleteSession } from '../../hooks/useSessions';
import { fetchSession } from '../../services/sessions';
import { useEffect, useState } from 'react';
import type { BankrollStackParamList } from '../../navigation/types';
import type { SessionWithProfit } from '../../types/database';

type Props = StackScreenProps<BankrollStackParamList, 'SessionDetail'>;

const GAME_TYPE_LABELS: Record<string, string> = {
  NLH: "Hold'em",
  PLO: 'Omaha',
  Tournament: 'Tournament',
  Mixed: '기타',
  PLO5: 'PLO5',
};

export default function SessionDetailScreen({ route, navigation }: Props) {
  const { sessionId } = route.params;
  const { currency } = useSettingsStore();
  const deleteSession = useDeleteSession();
  const [session, setSession] = useState<SessionWithProfit | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSession(sessionId).then(s => {
      setSession(s);
      setLoading(false);
    });
  }, [sessionId]);

  function handleEdit() {
    navigation.navigate('SessionForm', { sessionId });
  }

  function handleDelete() {
    Alert.alert('세션 삭제', '이 세션을 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          deleteSession.mutate(
            { id: sessionId, playedOn: session?.played_on ?? '' },
            { onSuccess: () => navigation.goBack() }
          );
        },
      },
    ]);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loading}>
          <Text style={styles.errorText}>세션을 찾을 수 없습니다.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const net = Number(session.net_profit);
  const netColor = net > 0 ? colors.primary : net < 0 ? colors.danger : colors.textMuted;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>세션 상세</Text>
        <TouchableOpacity onPress={handleEdit} style={styles.editBtn}>
          <Text style={styles.editText}>수정</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* 수익 카드 */}
        <View style={styles.profitCard}>
          <Text style={[styles.profitValue, { color: netColor }]}>
            {formatProfit(net, currency)}
          </Text>
          <Text style={styles.profitLabel}>
            {formatCurrency(session.buy_in, currency)} → {formatCurrency(session.cash_out, currency)}
          </Text>
        </View>

        {/* 기본 정보 */}
        <View style={styles.section}>
          <Row label="날짜" value={formatDate(session.played_on)} />
          {(session.started_at || session.ended_at) && (
            <Row
              label="시간"
              value={`${formatTime(session.started_at)}${session.started_at && session.ended_at ? ' ~ ' : ''}${formatTime(session.ended_at)}${session.started_at && session.ended_at ? `  (${formatDuration(session.started_at, session.ended_at)})` : ''}`}
            />
          )}
          {session.place_name_snapshot && (
            <Row label="장소" value={session.place_name_snapshot} />
          )}
          {session.game_type && (
            <Row label="게임 타입" value={GAME_TYPE_LABELS[session.game_type] ?? session.game_type} />
          )}
          {session.stakes && (
            <Row label="블라인드" value={session.stakes} />
          )}
          {session.note && (
            <Row label="메모" value={session.note} />
          )}
        </View>

        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Text style={styles.deleteBtnText}>세션 삭제</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: colors.textMuted, fontSize: fontSize.base },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  backBtn: { padding: spacing.xs, marginRight: spacing.sm },
  backText: { fontSize: fontSize.md, color: colors.primary, fontWeight: fontWeight.bold },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  editBtn: { padding: spacing.xs },
  editText: { fontSize: fontSize.base, color: colors.primary, fontWeight: fontWeight.semibold },
  content: { padding: spacing.base, gap: spacing.base },
  profitCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.xs,
  },
  profitValue: { fontSize: 32, fontWeight: fontWeight.extrabold },
  profitLabel: { fontSize: fontSize.sm, color: colors.textMuted },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  rowLabel: { fontSize: fontSize.sm, color: colors.textMuted, flex: 1 },
  rowValue: { fontSize: fontSize.sm, color: colors.text, flex: 2, textAlign: 'right' },
  deleteBtn: {
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.danger,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  deleteBtnText: { color: colors.danger, fontSize: fontSize.base, fontWeight: fontWeight.semibold },
});

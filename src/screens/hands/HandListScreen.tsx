import { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { StackScreenProps } from '@react-navigation/stack';
import { colors, spacing, fontSize, fontWeight, radius } from '../../theme';
import type { HandsStackParamList } from '../../navigation/types';
import { useHands, useAllHandsAdmin } from '../../hooks/useHands';
import { useAuthStore } from '../../store/authStore';
import { useUserNameMap } from '../../hooks/useSessions';
import AdminUserFilter from '../../components/AdminUserFilter';
import type { HandWithUser } from '../../services/hands';
import { SUIT_COLORS, SUIT_SYMBOLS } from '../../constants/poker';
import type { Card } from '../../constants/poker';

type Props = StackScreenProps<HandsStackParamList, 'HandList'>;

function CardBadge({ card }: { card: Card }) {
  const suitColor = SUIT_COLORS[card.suit];
  const suitSymbol = SUIT_SYMBOLS[card.suit];
  return (
    <View style={styles.cardBadge}>
      <Text style={[styles.cardText, { color: suitColor }]}>
        {card.rank}{suitSymbol}
      </Text>
    </View>
  );
}

const RESULT_COLORS: Record<string, string> = {
  won: colors.success,
  lost: colors.danger,
  chopped: colors.warning,
  folded: colors.textMuted,
};

const RESULT_LABELS: Record<string, string> = {
  won: '승',
  lost: '패',
  chopped: '반반',
  folded: '폴드',
};

function HandCard({ hand, onPress, showUser }: { hand: HandWithUser; onPress: () => void; showUser?: boolean }) {
  const date = new Date(hand.played_at).toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
  });
  const resultColor = hand.result ? RESULT_COLORS[hand.result] : colors.textMuted;
  const resultLabel = hand.result ? RESULT_LABELS[hand.result] : '-';

  const plText =
    hand.hero_pl != null
      ? (hand.hero_pl >= 0 ? '+' : '') + hand.hero_pl.toLocaleString()
      : '';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.cardLeft}>
        {hand.hero_cards.length > 0 ? (
          <View style={styles.cardRow}>
            {hand.hero_cards.map((c, i) => (
              <CardBadge key={i} card={c} />
            ))}
          </View>
        ) : (
          <View style={styles.cardRow}>
            <View style={[styles.cardBadge, { opacity: 0.3 }]}>
              <Text style={styles.cardText}>??</Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.cardMid}>
        <Text style={styles.dateText}>{date}</Text>
        {showUser && (hand as HandWithUser).display_name != null && (
          <View style={styles.userBadge}>
            <Text style={styles.userBadgeText}>
              👤 {(hand as HandWithUser).display_name}
            </Text>
          </View>
        )}
        <Text style={styles.posText}>
          {hand.hero_position ?? '?'} vs {hand.villain_position ?? '?'}
        </Text>
        <Text style={styles.gameText}>
          {hand.game_type}
          {hand.stakes ? ` · ${hand.stakes}` : ''}
        </Text>
      </View>

      <View style={styles.cardRight}>
        <View style={[styles.resultBadge, { borderColor: resultColor }]}>
          <Text style={[styles.resultLabel, { color: resultColor }]}>{resultLabel}</Text>
        </View>
        {plText !== '' && (
          <Text style={[styles.plText, { color: resultColor }]}>{plText}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function HandListScreen({ navigation }: Props) {
  const { profile } = useAuthStore();
  const isAdmin = profile?.role === 'admin';
  const [filterUid, setFilterUid] = useState<string | null>(null);

  // 어드민이면 전체 유저 핸드, 일반 유저면 본인 핸드만
  const { data: myHands, isLoading: loadingMy } = useHands();
  const { data: adminHands, isLoading: loadingAdmin } = useAllHandsAdmin();
  // 어드민: uid → 닉네임 맵 (display_name 주입용)
  const { data: userNameMap = {} } = useUserNameMap();

  const isLoading = isAdmin ? loadingAdmin : loadingMy;

  // 어드민: userNameMap 으로 display_name 주입 + 유저 필터링
  const hands = useMemo<HandWithUser[]>(() => {
    const raw = (isAdmin ? adminHands : myHands) ?? [];
    const withNames: HandWithUser[] = raw.map(h => ({
      ...h,
      display_name: isAdmin ? (userNameMap[h.user_id] ?? null) : null,
    }));
    if (!isAdmin || filterUid === null) return withNames;
    return withNames.filter(h => h.user_id === filterUid);
  }, [isAdmin, adminHands, myHands, filterUid, userNameMap]);

  // 타이틀: 어드민 + 필터 유저 이름 표시
  const titleSuffix = isAdmin
    ? filterUid === null
      ? ' (전체)'
      : ` (필터)`
    : '';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>핸드 기록{titleSuffix}</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.push('HandEditor', {})}
          activeOpacity={0.75}
        >
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* 어드민 유저 필터 */}
      <AdminUserFilter selectedUid={filterUid} onChange={setFilterUid} />

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={hands}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <HandCard
              hand={item as HandWithUser}
              showUser={isAdmin && filterUid === null}
              onPress={() => navigation.push('HandDetail', { handId: item.id })}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>아직 기록된 핸드가 없습니다</Text>
              <Text style={styles.emptySub}>+ 버튼으로 첫 핸드를 기록해보세요</Text>
            </View>
          }
        />
      )}
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
  title: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: { fontSize: fontSize.xl, color: colors.text, lineHeight: 36 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: spacing.md, gap: spacing.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.line,
  },
  cardLeft: { marginRight: spacing.base },
  cardRow: { flexDirection: 'row', gap: 4 },
  cardBadge: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.line,
  },
  cardText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.text },
  cardMid: { flex: 1, gap: 2 },
  dateText: { fontSize: fontSize.xs, color: colors.textMuted },
  posText: { fontSize: fontSize.sm, color: colors.text, fontWeight: fontWeight.medium },
  gameText: { fontSize: fontSize.xs, color: colors.textMuted },
  userBadge: {
    alignSelf: 'flex-start',
    backgroundColor: `${colors.primary}22`,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: `${colors.primary}55`,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  userBadgeText: { fontSize: 10, color: colors.primary, fontWeight: fontWeight.medium },
  cardRight: { alignItems: 'flex-end', gap: 4 },
  resultBadge: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  resultLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  plText: { fontSize: fontSize.xs, fontWeight: fontWeight.medium },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: spacing.sm,
  },
  emptyTitle: { fontSize: fontSize.md, color: colors.text },
  emptySub: { fontSize: fontSize.sm, color: colors.textMuted },
});

// 온보딩 체크리스트 — 신규 유저 핵심 기능 가이드
//
// 3단계:
//   1. 첫 핸드 기록 (음성 또는 수동)
//   2. AI 리뷰 받기
//   3. 첫 세션 기록 (뱅크롤)
//
// 모두 완료 시 자동 숨김.
// localStorage로 "완료 후 숨김" 기억해서 다시 안 보이도록.

import { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { colors, spacing, fontSize, fontWeight, radius } from '../theme';
import { useHands } from '../hooks/useHands';
import { useSessionsByRange } from '../hooks/useSessions';
import { dayjs, today } from '../utils/date';

const STORAGE_KEY = 'bz.onboarding.dismissed';

function isDismissed(): boolean {
  try {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY) === '1';
    }
  } catch {}
  return false;
}
function setDismissed() {
  try {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, '1');
    }
  } catch {}
}

interface Props {
  onNavigateHand: () => void;
  onNavigateBankroll: () => void;
}

export default function OnboardingChecklist({ onNavigateHand, onNavigateBankroll }: Props) {
  const { data: hands } = useHands(50);
  // 최근 1년 세션 — 신규 유저 판정용
  const yearStart = dayjs(today()).subtract(1, 'year').format('YYYY-MM-DD');
  const todayStr = today();
  const { data: sessions } = useSessionsByRange(yearStart, todayStr);

  const status = useMemo(() => {
    const handCount = hands?.length ?? 0;
    const reviewedCount = (hands ?? []).filter(h => h.review_status === 'done').length;
    const sessionCount = sessions?.length ?? 0;
    return {
      hasHand: handCount > 0,
      hasReview: reviewedCount > 0,
      hasSession: sessionCount > 0,
      handCount,
      reviewedCount,
      sessionCount,
    };
  }, [hands, sessions]);

  const completedCount = [status.hasHand, status.hasReview, status.hasSession].filter(Boolean).length;
  const allDone = completedCount === 3;

  // 모두 완료 또는 이미 dismiss 했으면 X
  if (allDone || isDismissed()) return null;
  // 데이터 로딩 중 빈 상태로 표시 X
  if (hands === undefined || sessions === undefined) return null;

  const items = [
    {
      key: 'hand',
      done: status.hasHand,
      icon: '🎙',
      title: '첫 핸드 기록',
      sub: status.hasHand
        ? `${status.handCount}개 기록됨`
        : '음성 또는 수동으로 한 핸드 기록해보세요',
      onPress: onNavigateHand,
    },
    {
      key: 'review',
      done: status.hasReview,
      icon: '🤖',
      title: 'AI 핸드 리뷰 받기',
      sub: status.hasReview
        ? `${status.reviewedCount}개 분석 완료`
        : '기록한 핸드에서 "리뷰 요청" 클릭',
      onPress: onNavigateHand,
    },
    {
      key: 'session',
      done: status.hasSession,
      icon: '💰',
      title: '첫 세션 기록',
      sub: status.hasSession
        ? `${status.sessionCount}회 세션 기록됨`
        : '뱅크롤 메뉴에서 + 버튼으로 추가',
      onPress: onNavigateBankroll,
    },
  ];

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>🚀 시작 가이드</Text>
        <View style={styles.progressWrap}>
          <Text style={styles.progressText}>{completedCount}/3 완료</Text>
          <TouchableOpacity onPress={setDismissed} style={styles.dismissBtn}>
            <Text style={styles.dismissText}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>
      {items.map(item => (
        <TouchableOpacity
          key={item.key}
          style={[styles.row, item.done && styles.rowDone]}
          onPress={item.onPress}
          activeOpacity={0.7}
          disabled={item.done}
        >
          <Text style={styles.rowEmoji}>{item.done ? '✅' : item.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, item.done && styles.rowTitleDone]}>
              {item.title}
            </Text>
            <Text style={styles.rowSub}>{item.sub}</Text>
          </View>
          {!item.done && <Text style={styles.rowArrow}>›</Text>}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.base,
    borderWidth: 1.5,
    borderColor: colors.primary,
    gap: spacing.sm,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
  progressWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  progressText: { fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.bold },
  dismissBtn: { padding: 4 },
  dismissText: { fontSize: fontSize.sm, color: colors.textMuted },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.bg,
  },
  rowDone: { opacity: 0.55 },
  rowEmoji: { fontSize: 22 },
  rowTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text },
  rowTitleDone: { textDecorationLine: 'line-through' },
  rowSub: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  rowArrow: { fontSize: fontSize.lg, color: colors.textMuted },
});

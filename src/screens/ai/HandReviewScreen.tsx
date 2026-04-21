import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { StackScreenProps } from '@react-navigation/stack';
import { colors, spacing, fontSize, fontWeight, radius } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';
import { SUIT_COLORS, SUIT_SYMBOLS } from '../../constants/poker';
import type { Card } from '../../constants/poker';
import { useHand } from '../../hooks/useHands';
import { requestHandReview } from '../../services/claudeApi';
import { updateHand } from '../../services/hands';
import type { HandReview } from '../../types/database';
import type { Hand as DbHand } from '../../types/database';

type Props = StackScreenProps<RootStackParamList, 'HandReview'>;

function CardBadge({ card }: { card: Card }) {
  return (
    <View style={styles.cardBadge}>
      <Text style={[styles.cardBadgeText, { color: SUIT_COLORS[card.suit] }]}>
        {card.rank}{SUIT_SYMBOLS[card.suit]}
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
  won: '이겼다',
  lost: '졌다',
  chopped: '반반',
  folded: '폴드',
};

const SEVERITY_ICONS: Record<'high' | 'medium' | 'low', { symbol: string; color: string }> = {
  high: { symbol: '!', color: colors.danger },
  medium: { symbol: '△', color: colors.warning },
  low: { symbol: '○', color: colors.textMuted },
};

function ReviewSection({ review }: { review: HandReview }) {
  return (
    <View style={styles.reviewContainer}>
      {/* 총평 */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryBorder} />
        <View style={styles.summaryContent}>
          <Text style={styles.sectionLabel}>총평</Text>
          <Text style={styles.summaryText}>{review.summary}</Text>
        </View>
      </View>

      {/* 실수 분석 */}
      {review.mistakes.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>실수 분석</Text>
          {review.mistakes.map((m, i) => {
            const icon = SEVERITY_ICONS[m.severity];
            return (
              <View key={i} style={styles.mistakeRow}>
                <View style={[styles.severityIcon, { borderColor: icon.color }]}>
                  <Text style={[styles.severitySymbol, { color: icon.color }]}>{icon.symbol}</Text>
                </View>
                <View style={styles.mistakeContent}>
                  <Text style={styles.mistakeStreet}>{m.street.toUpperCase()}</Text>
                  <Text style={styles.mistakeNote}>{m.note}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* 추천 라인 */}
      {review.recommended_line.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>추천 라인</Text>
          {review.recommended_line.map((line, i) => (
            <View key={i} style={styles.lineRow}>
              <View style={styles.streetChip}>
                <Text style={styles.streetChipText}>{line.street.toUpperCase()}</Text>
              </View>
              <View style={styles.lineContent}>
                <Text style={styles.lineAction}>{line.action}</Text>
                <Text style={styles.lineRationale}>{line.rationale}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* 코치 노트 */}
      {review.coach_notes.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>코치 노트</Text>
          {review.coach_notes.map((note, i) => (
            <View key={i} style={styles.coachNoteRow}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.coachNoteText}>{note}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default function HandReviewScreen({ navigation, route }: Props) {
  const { handId } = route.params;
  const { data: hand, isLoading } = useHand(handId);
  const [isRequesting, setIsRequesting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  async function handleRequestReview() {
    if (!hand) return;
    setIsRequesting(true);
    setRequestError(null);
    try {
      const result = await requestHandReview(hand as unknown as DbHand);
      await updateHand(hand.id, {
        review_status: 'done',
        review: result as unknown as Record<string, unknown>,
        reviewed_at: new Date().toISOString(),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : '알 수 없는 오류가 발생했습니다.';
      setRequestError(msg);
    } finally {
      setIsRequesting(false);
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!hand) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>홀덤 알파고 리뷰</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <Text style={styles.emptyText}>핸드를 찾을 수 없습니다</Text>
        </View>
      </SafeAreaView>
    );
  }

  const date = new Date(hand.played_at).toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const resultColor = hand.result ? (RESULT_COLORS[hand.result] ?? colors.textMuted) : colors.textMuted;
  const review = hand.review as unknown as HandReview | null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>홀덤 알파고 리뷰</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* 핸드 요약 카드 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>핸드 정보</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>날짜</Text>
            <Text style={styles.infoValue}>{date}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>게임</Text>
            <Text style={styles.infoValue}>
              {hand.game_type}{hand.stakes ? ` · ${hand.stakes}` : ''}
            </Text>
          </View>

          {hand.hero_cards.length > 0 && (
            <View style={styles.cardsSection}>
              <Text style={styles.cardsLabel}>히어로 카드</Text>
              <View style={styles.cardsRow}>
                {hand.hero_cards.map((c, i) => <CardBadge key={i} card={c} />)}
              </View>
            </View>
          )}

          {hand.board && hand.board.length > 0 && (
            <View style={styles.cardsSection}>
              <Text style={styles.cardsLabel}>보드</Text>
              <View style={styles.cardsRow}>
                {hand.board.map((c, i) => <CardBadge key={i} card={c} />)}
              </View>
            </View>
          )}

          <View style={styles.positionRow}>
            <View style={styles.posBox}>
              <Text style={styles.posLabel}>히어로</Text>
              <Text style={styles.posValue}>{hand.hero_position ?? '-'}</Text>
            </View>
            <Text style={styles.vsText}>vs</Text>
            <View style={styles.posBox}>
              <Text style={styles.posLabel}>빌런</Text>
              <Text style={styles.posValue}>{hand.villain_position ?? '-'}</Text>
            </View>
          </View>

          {hand.result && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>결과</Text>
              <View style={[styles.resultBadge, { borderColor: resultColor }]}>
                <Text style={[styles.resultText, { color: resultColor }]}>
                  {RESULT_LABELS[hand.result] ?? hand.result}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* AI 리뷰 영역 */}
        {(hand.review_status === 'none' || hand.review_status === 'error') && (
          <View style={styles.card}>
            {hand.review_status === 'error' && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>이전 리뷰 요청에 실패했습니다. 다시 시도해주세요.</Text>
              </View>
            )}
            {requestError && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{requestError}</Text>
              </View>
            )}
            {isRequesting ? (
              <View style={styles.requestingBox}>
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.requestingText}>AI가 분석 중입니다...</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.reviewRequestBtn}
                onPress={handleRequestReview}
                activeOpacity={0.8}
              >
                <Text style={styles.reviewRequestBtnText}>홀덤 알파고 리뷰 요청</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {hand.review_status === 'pending' && (
          <View style={styles.card}>
            <View style={styles.requestingBox}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.requestingText}>리뷰 준비 중...</Text>
            </View>
          </View>
        )}

        {hand.review_status === 'done' && review && (
          <ReviewSection review={review} />
        )}

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: fontSize.md, color: colors.textMuted },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.bg,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  backText: { fontSize: fontSize.lg, color: colors.text },
  headerTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },

  content: { padding: spacing.base, gap: spacing.md },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing.sm,
  },
  cardTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  infoLabel: { fontSize: fontSize.sm, color: colors.textMuted },
  infoValue: { fontSize: fontSize.sm, color: colors.text, fontWeight: fontWeight.medium },

  cardsSection: { gap: 4 },
  cardsLabel: { fontSize: fontSize.xs, color: colors.textMuted },
  cardsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },

  cardBadge: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.line,
  },
  cardBadgeText: { fontSize: fontSize.base, fontWeight: fontWeight.bold },

  positionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: spacing.sm,
  },
  posBox: { alignItems: 'center', gap: 4 },
  posLabel: { fontSize: fontSize.xs, color: colors.textMuted },
  posValue: { fontSize: fontSize.lg, color: colors.text, fontWeight: fontWeight.bold },
  vsText: { fontSize: fontSize.sm, color: colors.textMuted },

  resultBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  resultText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },

  errorBox: {
    backgroundColor: `${colors.danger}18`,
    borderRadius: radius.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.danger}40`,
  },
  errorText: { fontSize: fontSize.sm, color: colors.danger },

  requestingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  requestingText: { fontSize: fontSize.sm, color: colors.textMuted },

  reviewRequestBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  reviewRequestBtnText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },

  reviewContainer: { gap: spacing.md },

  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  summaryBorder: {
    width: 4,
    backgroundColor: colors.primary,
  },
  summaryContent: {
    flex: 1,
    padding: spacing.base,
    gap: spacing.sm,
  },
  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryText: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 21,
  },

  mistakeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  severityIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  severitySymbol: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  mistakeContent: { flex: 1, gap: 2 },
  mistakeStreet: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.5,
  },
  mistakeNote: { fontSize: fontSize.sm, color: colors.text, lineHeight: 20 },

  lineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  streetChip: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    flexShrink: 0,
  },
  streetChipText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.5,
  },
  lineContent: { flex: 1, gap: 2 },
  lineAction: { fontSize: fontSize.sm, color: colors.text, fontWeight: fontWeight.bold },
  lineRationale: { fontSize: fontSize.sm, color: colors.textMuted, lineHeight: 20 },

  coachNoteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  bullet: { fontSize: fontSize.base, color: colors.primary, lineHeight: 21 },
  coachNoteText: { flex: 1, fontSize: fontSize.sm, color: colors.text, lineHeight: 21 },
});

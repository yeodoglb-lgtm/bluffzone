import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import type { StackScreenProps } from '@react-navigation/stack';
import { colors, spacing, fontSize, fontWeight, radius } from '../../theme';
import type { HandsStackParamList } from '../../navigation/types';
import { SUIT_COLORS, SUIT_SYMBOLS, STREETS } from '../../constants/poker';
import type { Card, Street, Position9Max, HandAction } from '../../constants/poker';
import { useHand, useDeleteHand, useUpdateHand } from '../../hooks/useHands';

type Props = StackScreenProps<HandsStackParamList, 'HandDetail'>;

// ── 색상 상수 ────────────────────────────────────────────────────────────────
const HERO_COLOR = '#3b82f6';
const VILLAIN_COLORS = ['#ef4444', '#22c55e', '#a855f7'] as const;


const RESULT_COLORS: Record<string, string> = {
  won: colors.success, lost: colors.danger, chopped: colors.warning, folded: colors.textMuted,
};
const RESULT_LABELS: Record<string, string> = {
  won: '이겼다', lost: '졌다', chopped: '반반', folded: '폴드',
};
const REVIEW_STATUS_LABELS: Record<string, string> = {
  none: '없음', pending: '분석 중...', done: '완료', error: '오류',
};

// ── 리플레이 유틸 ─────────────────────────────────────────────────────────────
function actionDisplayText(a: HandAction): string {
  const amt = a.amount != null ? ` ${a.amount.toLocaleString()}` : '';
  switch (a.action) {
    case 'fold':  return '폴드';
    case 'check': return '체크';
    case 'call':  return `콜${amt}`;
    case 'bet':   return `벳${amt}`;
    case 'raise': return `레이즈${amt}`;
    case 'allin': return `올인${amt}`;
    default: return a.action;
  }
}
function actionBubbleColor(action: string): string {
  switch (action) {
    case 'fold':  return '#4B5563';
    case 'check': return '#6B7280';
    case 'call':  return '#2563EB';
    case 'bet':
    case 'raise': return '#FF6B00';
    case 'allin': return '#DC2626';
    default:      return '#6B7280';
  }
}
function boardCountForStreet(street: string): number {
  switch (street) {
    case 'preflop': return 0;
    case 'flop':    return 3;
    case 'turn':    return 4;
    case 'river':   return 5;
    default:        return 5;
  }
}
function resolveActorPos(
  actor: string,
  heroPos: Position9Max | null,
  villainData: Array<{ pos: Position9Max | null; name?: string }>,
): Position9Max | null {
  if (actor === '나' || actor === 'hero') return heroPos;
  if (actor === 'villain') return villainData[0]?.pos ?? null;
  for (let i = 0; i < villainData.length; i++) {
    const v = villainData[i];
    const name = v.name?.trim() || `빌런 ${i + 1}`;
    if (actor === name || actor === `빌런 ${i + 1}`) return v.pos ?? null;
  }
  return null;
}
function resolveActorColor(
  actor: string,
  villainData: Array<{ pos: Position9Max | null; name?: string }>,
): string {
  if (actor === '나' || actor === 'hero') return HERO_COLOR;
  for (let i = 0; i < villainData.length; i++) {
    const v = villainData[i];
    const name = v.name?.trim() || `빌런 ${i + 1}`;
    if (actor === name || actor === `빌런 ${i + 1}`) return VILLAIN_COLORS[i];
  }
  return colors.textMuted;
}

// ── 카드 뱃지 ────────────────────────────────────────────────────────────────
function CardBadge({ card }: { card: Card }) {
  return (
    <View style={styles.cardBadge}>
      <Text style={[styles.cardBadgeText, { color: SUIT_COLORS[card.suit] }]}>
        {card.rank}{SUIT_SYMBOLS[card.suit]}
      </Text>
    </View>
  );
}

// ── 테이블 레이아웃 (360×355, 에디터와 동일) ────────────────────────────────
const SEAT_DEFS: { pos: Position9Max; cx: number; cy: number; dir: 'up' | 'down' }[] = [
  { pos: 'BTN',   cx: 180, cy: 272, dir: 'down' },
  { pos: 'CO',    cx: 285, cy: 268, dir: 'down' },
  { pos: 'HJ',    cx: 330, cy: 188, dir: 'up'   },
  { pos: 'MP',    cx: 285, cy:  95, dir: 'up'   },
  { pos: 'UTG+1', cx: 180, cy:  80, dir: 'up'   },
  { pos: 'UTG',   cx:  75, cy:  95, dir: 'up'   },
  { pos: 'BB',    cx:  32, cy: 175, dir: 'down' },
  { pos: 'SB',    cx:  75, cy: 268, dir: 'down' },
];

// ── 미니 카드 컴포넌트 ────────────────────────────────────────────────────────
function MiniCard({ card, faceDown }: { card?: Card; faceDown?: boolean }) {
  if (faceDown || !card) {
    return (
      <View style={mc.back}>
        <View style={mc.backInner} />
      </View>
    );
  }
  return (
    <View style={mc.card}>
      <Text style={[mc.rank, { color: SUIT_COLORS[card.suit] }]}>{card.rank}</Text>
      <Text style={[mc.suit, { color: SUIT_COLORS[card.suit] }]}>{SUIT_SYMBOLS[card.suit]}</Text>
    </View>
  );
}
const mc = StyleSheet.create({
  card: { width: 26, height: 36, backgroundColor: '#fff', borderRadius: 4, borderWidth: 0.5, borderColor: '#bbb', alignItems: 'center', justifyContent: 'center' },
  back: { width: 26, height: 36, backgroundColor: '#1a56a0', borderRadius: 4, borderWidth: 0.5, borderColor: '#1245a0', alignItems: 'center', justifyContent: 'center' },
  backInner: { width: 19, height: 27, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)', borderRadius: 2 },
  rank: { fontSize: 12, fontWeight: 'bold', lineHeight: 14 },
  suit: { fontSize: 12, lineHeight: 13 },
});

// ── 포커 테이블 뷰 (읽기 전용 + 리플레이) ──────────────────────────────────
function HandTableView({
  heroPos, heroCards, villainData, board,
  playbackIdx = -1, allActions = [], totalSteps = 0,
}: {
  heroPos: Position9Max | null;
  heroCards: Card[];
  villainData: Array<{ pos: Position9Max | null; cards: Card[]; cardsKnown: boolean; name?: string }>;
  board: Card[];
  playbackIdx?: number;
  allActions?: HandAction[];
  totalSteps?: number;
}) {
  const isReplaying = allActions.length > 0 && playbackIdx >= 0;
  // 액션 단계 vs 보드 공개 단계 구분
  const isActionStep = isReplaying && playbackIdx < allActions.length;
  const currentAction = isActionStep ? allActions[playbackIdx] : null;

  // 리플레이 중 스트리트에 따라 보드 카드 점진 공개
  let visibleBoardCount = board.length;
  if (isReplaying) {
    if (isActionStep) {
      visibleBoardCount = boardCountForStreet(currentAction!.street);
    } else {
      // 보드 공개 단계: 마지막 액션 스트리트 기준 + 추가 장 수
      const lastStreet = allActions[allActions.length - 1].street;
      const baseCount = boardCountForStreet(lastStreet);
      const extraStep = playbackIdx - allActions.length + 1;
      visibleBoardCount = Math.min(board.length, baseCount + extraStep);
    }
  }
  const visibleBoard = board.slice(0, visibleBoardCount);

  // 보드 공개 단계일 때 표시할 스트리트 이름
  const boardRevealLabel = !isActionStep && isReplaying
    ? (visibleBoardCount === 4 ? 'TURN 공개' : visibleBoardCount >= 5 ? 'RIVER 공개' : '보드 공개')
    : null;

  // 현재 액션 배우의 포지션 찾기 (액션 단계에서만)
  const actorPos = currentAction
    ? resolveActorPos(currentAction.actor, heroPos, villainData)
    : null;
  const actorSeat = actorPos ? SEAT_DEFS.find(s => s.pos === actorPos) : null;
  const actorColor = currentAction
    ? resolveActorColor(currentAction.actor, villainData)
    : colors.textMuted;

  function getSeatInfo(pos: Position9Max) {
    if (heroPos === pos) return { player: '나', color: HERO_COLOR, cards: heroCards, cardsKnown: true };
    const vIdx = villainData.findIndex(v => v.pos === pos);
    if (vIdx >= 0) {
      const v = villainData[vIdx];
      const displayName = v.name?.trim() || `빌런${vIdx + 1}`;
      return { player: displayName, color: VILLAIN_COLORS[vIdx], cards: v.cardsKnown ? v.cards : [], cardsKnown: v.cardsKnown };
    }
    return null;
  }

  return (
    <View style={{ alignItems: 'center' }}>
      {/* 리플레이 스트리트 배지 */}
      {isReplaying && (currentAction || boardRevealLabel) && (
        <View style={tv.streetBadge}>
          {currentAction
            ? <Text style={tv.streetText}>{currentAction.street.toUpperCase()}</Text>
            : <Text style={[tv.streetText, { color: '#facc15' }]}>{boardRevealLabel}</Text>
          }
          <Text style={tv.streetStep}> {playbackIdx + 1} / {totalSteps || allActions.length}</Text>
        </View>
      )}

      <View style={tv.tableContainer}>
        <View style={tv.tableOval} />

        {/* 보드 */}
        <View style={tv.boardArea}>
          {visibleBoard.length === 0 ? (
            <Text style={tv.boardEmpty}>BOARD</Text>
          ) : (
            <View style={{ flexDirection: 'row', gap: 3 }}>
              {visibleBoard.map((c, i) => <MiniCard key={i} card={c} />)}
            </View>
          )}
        </View>

        {/* 딜러 */}
        <View style={tv.dealerChip}><Text style={tv.dealerText}>D</Text></View>

        {/* 시트 */}
        {SEAT_DEFS.map(({ pos, cx, cy, dir }) => {
          const info = getSeatInfo(pos);
          const isActing = isReplaying && actorPos === pos;

          const groupTop  = dir === 'up' ? cy - 79 : cy - 11;
          const groupLeft = cx - 28;
          const groupW    = 56;
          const groupH    = 90;
          const chipLocalTop  = dir === 'up' ? 66 : 0;
          const badgeLocalTop = dir === 'up' ? 40 : 26;
          const cardsLocalTop = dir === 'up' ? 0  : 52;

          return (
            <View
              key={pos}
              style={[
                tv.seatGroup,
                { left: groupLeft, top: groupTop, width: groupW, height: groupH },
                isActing && { zIndex: 30 },
              ]}
            >
              {/* 액팅 중 하이라이트 링 */}
              {isActing && (
                <View style={[tv.actingRing, { borderColor: actorColor }]} />
              )}
              {/* 카드 */}
              {info && (
                <View style={[tv.cardsRowAbs, { top: cardsLocalTop, left: 2 }]}>
                  {info.cards.length > 0
                    ? info.cards.map((c, i) => <MiniCard key={i} card={c} />)
                    : [0, 1].map(i => <MiniCard key={i} faceDown />)
                  }
                </View>
              )}
              {/* 플레이어 뱃지 */}
              {info && (
                <View style={[tv.playerBadge, { top: badgeLocalTop, left: 4, backgroundColor: info.color }]}>
                  <Text style={tv.playerBadgeText} numberOfLines={1}>{info.player}</Text>
                </View>
              )}
              {/* 포지션 칩 */}
              <View style={[tv.posChip, { top: chipLocalTop, left: 4 }, info && { borderColor: info.color }]}>
                <Text style={[tv.posChipText, info && { color: info.color }]}>{pos}</Text>
              </View>
            </View>
          );
        })}

        {/* 액션 말풍선 */}
        {isReplaying && currentAction && actorSeat && (
          <View
            style={[
              tv.actionBubble,
              {
                backgroundColor: actionBubbleColor(currentAction.action),
                left: Math.max(2, Math.min(360 - 86, actorSeat.cx - 43)),
                top: actorSeat.dir === 'up'
                  ? Math.min(355 - 26, actorSeat.cy + 14)
                  : Math.max(2, actorSeat.cy - 40),
              },
            ]}
          >
            <Text style={tv.actionBubbleText}>{actionDisplayText(currentAction)}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ── 메인 화면 ────────────────────────────────────────────────────────────────
export default function HandDetailScreen({ navigation, route }: Props) {
  const { handId } = route.params;
  const { data: hand, isLoading } = useHand(handId);
  const deleteHand = useDeleteHand();
  const updateHand = useUpdateHand();

  // ── 리플레이 상태 ──
  const [playbackIdx, setPlaybackIdx] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const allActions: HandAction[] = Array.isArray(hand?.actions) ? (hand!.actions as HandAction[]) : [];

  // 액션 이후 남은 보드 카드 공개 단계 계산
  const boardCards = hand?.board ?? [];
  const lastAction = allActions.length > 0 ? allActions[allActions.length - 1] : null;
  const lastStreetBoardCount = lastAction ? boardCountForStreet(lastAction.street) : 0;
  const extraBoardSteps = Math.max(0, boardCards.length - lastStreetBoardCount);
  const totalSteps = allActions.length + extraBoardSteps;

  // 자동 재생 타이머 (액션: 1.5초, 보드 공개: 1초)
  useEffect(() => {
    if (!isPlaying) return;
    if (playbackIdx >= totalSteps - 1) {
      setIsPlaying(false);
      return;
    }
    const delay = playbackIdx >= allActions.length - 1 ? 1000 : 1500;
    const t = setTimeout(() => setPlaybackIdx(p => p + 1), delay);
    return () => clearTimeout(t);
  }, [isPlaying, playbackIdx, totalSteps, allActions.length]);

  function handlePlayPause() {
    if (isPlaying) { setIsPlaying(false); return; }
    if (playbackIdx >= totalSteps - 1) setPlaybackIdx(-1);
    setIsPlaying(true);
  }
  function handleFirst() { setIsPlaying(false); setPlaybackIdx(-1); }
  function handlePrev()  { setIsPlaying(false); setPlaybackIdx(p => Math.max(-1, p - 1)); }
  function handleNext()  { setIsPlaying(false); setPlaybackIdx(p => Math.min(totalSteps - 1, p + 1)); }
  function handleLast()  { setIsPlaying(false); setPlaybackIdx(totalSteps - 1); }

  function handleDelete() {
    Alert.alert('핸드 삭제', '이 핸드를 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive',
        onPress: async () => {
          try {
            await deleteHand.mutateAsync(handId);
            navigation.goBack();
          } catch {
            Alert.alert('오류', '핸드 삭제에 실패했습니다.');
          }
        },
      },
    ]);
  }

  async function handleShare() {
    try {
      const shareId = hand?.share_id ?? Math.random().toString(36).slice(2, 10);
      if (!hand?.share_id) {
        await updateHand.mutateAsync({ id: handId, data: { share_id: shareId, is_public: true } });
      }
      const url = `https://bluffzone.app/hand/${shareId}`;
      await Share.share({ title: '블러프존 핸드 공유', message: url, url });
    } catch (e) { console.error(e); }
  }

  async function handleRequestReview() {
    try {
      await updateHand.mutateAsync({ id: handId, data: { review_status: 'pending' } });
    } catch {
      Alert.alert('오류', '홀덤 알파고 리뷰 요청에 실패했습니다.');
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
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
          <Text style={styles.headerTitle}>핸드 상세</Text>
          <View style={{ width: 80 }} />
        </View>
        <View style={styles.center}><Text style={styles.emptyText}>핸드를 찾을 수 없습니다</Text></View>
      </SafeAreaView>
    );
  }

  const date = new Date(hand.played_at).toLocaleString('ko-KR', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  const resultColor = hand.result ? RESULT_COLORS[hand.result] : colors.textMuted;
  const plPrefix = hand.hero_pl != null && hand.hero_pl >= 0 ? '+' : '';

  // 빌런 데이터 파싱 (name 필드 포함)
  const villainData: Array<{ pos: Position9Max | null; cards: Card[]; cardsKnown: boolean; name?: string }> =
    Array.isArray((hand as any).villain_data) && (hand as any).villain_data.length > 0
      ? (hand as any).villain_data.slice(0, 3)
      : hand.villain_position
      ? [{ pos: hand.villain_position, cards: hand.villain_cards ?? [], cardsKnown: hand.villain_known, name: '' }]
      : [];

  const hasTableData = hand.hero_position || villainData.length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>핸드 상세</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => navigation.push('HandEditor', { handId })} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>편집</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShare} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>공유</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.headerBtn}>
            <Text style={[styles.headerBtnText, { color: colors.danger }]}>삭제</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* 포커 테이블 시각화 */}
        {hasTableData && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>테이블</Text>
            <HandTableView
              heroPos={hand.hero_position as Position9Max | null}
              heroCards={hand.hero_cards ?? []}
              villainData={villainData}
              board={hand.board ?? []}
              playbackIdx={playbackIdx}
              allActions={allActions}
              totalSteps={totalSteps}
            />
            {/* 범례 */}
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: HERO_COLOR }]} />
                <Text style={styles.legendText}>나</Text>
              </View>
              {villainData.map((v, i) => v.pos ? (
                <View key={i} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: VILLAIN_COLORS[i] }]} />
                  <Text style={styles.legendText}>{v.name?.trim() || `빌런 ${i + 1}`}</Text>
                </View>
              ) : null)}
            </View>
          </View>
        )}

        {/* 리플레이 컨트롤 (액션이 있을 때만) */}
        {totalSteps > 0 && (
          <PlaybackBar
            idx={playbackIdx}
            total={totalSteps}
            isPlaying={isPlaying}
            actorName={
              playbackIdx >= 0 && playbackIdx < allActions.length
                ? (allActions[playbackIdx].actor === '나' || allActions[playbackIdx].actor === 'hero'
                    ? '나' : allActions[playbackIdx].actor)
                : playbackIdx >= allActions.length
                  ? '🃏'
                  : ''
            }
            actionText={
              playbackIdx >= 0 && playbackIdx < allActions.length
                ? actionDisplayText(allActions[playbackIdx])
                : playbackIdx >= allActions.length
                  ? (() => {
                      const baseCount = lastStreetBoardCount;
                      const showing = baseCount + (playbackIdx - allActions.length + 1);
                      return showing === 4 ? 'TURN 공개' : showing >= 5 ? 'RIVER 공개' : '보드 공개';
                    })()
                  : ''
            }
            onFirst={handleFirst}
            onPrev={handlePrev}
            onPlayPause={handlePlayPause}
            onNext={handleNext}
            onLast={handleLast}
          />
        )}

        {/* 기본 정보 */}
        <View style={styles.card}>
          <Row label="날짜" value={date} />
          <Row label="게임" value={`${hand.game_type}${hand.stakes ? ` · ${hand.stakes}` : ''}`} />
        </View>

        {/* 카드 (텍스트 섹션) */}
        {(hand.hero_cards.length > 0 || (hand.board && hand.board.length > 0) || villainData.some(v => v.cardsKnown && v.cards.length > 0)) && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>카드</Text>
            {hand.hero_cards.length > 0 && (
              <View style={styles.cardsSection}>
                <Text style={[styles.cardsLabel, { color: HERO_COLOR }]}>나</Text>
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
            {villainData.map((v, i) => v.cardsKnown && v.cards.length > 0 ? (
              <View key={i} style={styles.cardsSection}>
                <Text style={[styles.cardsLabel, { color: VILLAIN_COLORS[i] }]}>{v.name?.trim() || `빌런 ${i + 1}`}</Text>
                <View style={styles.cardsRow}>
                  {v.cards.map((c, j) => <CardBadge key={j} card={c} />)}
                </View>
              </View>
            ) : null)}
          </View>
        )}

        {/* 액션 */}
        {hand.actions.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>액션</Text>
            {(STREETS as readonly Street[]).map(street => {
              const streetActions = hand.actions.filter(a => a.street === street);
              if (streetActions.length === 0) return null;
              return (
                <View key={street} style={styles.streetBlock}>
                  <Text style={styles.streetLabel}>{street.toUpperCase()}</Text>
                  {streetActions.map((a, i) => (
                    <View key={i} style={styles.actionLine}>
                      <Text style={[styles.actionActor, {
                        color: a.actor === 'hero' || a.actor === '나' ? HERO_COLOR
                          : a.actor === 'villain' || a.actor === '빌런 1' ? VILLAIN_COLORS[0]
                          : a.actor === '빌런 2' ? VILLAIN_COLORS[1]
                          : a.actor === '빌런 3' ? VILLAIN_COLORS[2]
                          : colors.primary,
                      }]}>
                        {a.actor === 'hero' ? '나' : a.actor === 'villain' ? '빌런 1' : a.actor}
                      </Text>
                      <Text style={styles.actionVerb}>{a.action}</Text>
                      {a.amount != null && <Text style={styles.actionAmount}>{a.amount.toLocaleString()}</Text>}
                    </View>
                  ))}
                </View>
              );
            })}
          </View>
        )}

        {/* 결과 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>결과</Text>
          {hand.result && (
            <View style={[styles.resultBadge, { borderColor: resultColor }]}>
              <Text style={[styles.resultText, { color: resultColor }]}>{RESULT_LABELS[hand.result]}</Text>
            </View>
          )}
          {hand.pot_size != null && <Row label="팟 사이즈" value={hand.pot_size.toLocaleString()} />}
          {hand.hero_pl != null && (
            <Row label="손익" value={`${plPrefix}${hand.hero_pl.toLocaleString()}`} valueColor={resultColor} />
          )}
        </View>

        {/* 메모 */}
        {hand.note && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>메모</Text>
            <Text style={styles.noteText}>{hand.note}</Text>
          </View>
        )}

        {/* 홀덤 알파고 리뷰 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>홀덤 알파고 리뷰</Text>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewStatus}>
              상태: <Text style={styles.reviewStatusValue}>{REVIEW_STATUS_LABELS[hand.review_status] ?? hand.review_status}</Text>
            </Text>
            {hand.review_status === 'none' && (
              <TouchableOpacity style={styles.reviewBtn} onPress={handleRequestReview} disabled={updateHand.isPending} activeOpacity={0.8}>
                {updateHand.isPending
                  ? <ActivityIndicator color={colors.text} size="small" />
                  : <Text style={styles.reviewBtnText}>홀덤 알파고 리뷰 요청</Text>
                }
              </TouchableOpacity>
            )}
          </View>
          {hand.review_status === 'done' && hand.review && (
            <Text style={styles.reviewContent}>
              {typeof hand.review === 'object' && 'content' in hand.review
                ? String(hand.review.content)
                : JSON.stringify(hand.review, null, 2)}
            </Text>
          )}
          {hand.reviewed_at && (
            <Text style={styles.reviewedAt}>
              {new Date(hand.reviewed_at).toLocaleDateString('ko-KR')} 분석됨
              {hand.review_model ? ` · ${hand.review_model}` : ''}
            </Text>
          )}
        </View>

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── 리플레이 컨트롤 바 ────────────────────────────────────────────────────────
function PlaybackBar({
  idx, total, isPlaying, actorName, actionText,
  onFirst, onPrev, onPlayPause, onNext, onLast,
}: {
  idx: number; total: number; isPlaying: boolean;
  actorName: string; actionText: string;
  onFirst: () => void; onPrev: () => void; onPlayPause: () => void;
  onNext: () => void; onLast: () => void;
}) {
  const atStart = idx < 0;
  const atEnd = idx >= total - 1;
  return (
    <View style={pb.container}>
      {/* 현재 액션 정보 */}
      <View style={pb.infoRow}>
        {idx >= 0 ? (
          <Text style={pb.infoText}>
            <Text style={{ color: colors.primary }}>{actorName}</Text>
            {'  '}{actionText}
          </Text>
        ) : (
          <Text style={pb.infoText}>재생 버튼을 눌러 시작하세요</Text>
        )}
        <Text style={pb.stepText}>{atStart ? '-' : idx + 1} / {total}</Text>
      </View>
      {/* 컨트롤 버튼 */}
      <View style={pb.controls}>
        <TouchableOpacity onPress={onFirst} style={pb.btn}>
          <Text style={pb.btnTxt}>⏮</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onPrev} style={[pb.btn, atStart && pb.btnOff]} disabled={atStart}>
          <Text style={[pb.btnTxt, atStart && pb.btnTxtOff]}>⏪</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onPlayPause} style={[pb.btn, pb.playBtn]}>
          <Text style={[pb.btnTxt, pb.playTxt]}>{isPlaying ? '⏸' : '▶'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onNext} style={[pb.btn, atEnd && pb.btnOff]} disabled={atEnd}>
          <Text style={[pb.btnTxt, atEnd && pb.btnTxtOff]}>⏩</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onLast} style={pb.btn}>
          <Text style={pb.btnTxt}>⏭</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const pb = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  infoText: { fontSize: fontSize.sm, color: colors.text, flex: 1 },
  stepText: { fontSize: fontSize.xs, color: colors.textMuted, marginLeft: spacing.sm },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  btn: {
    width: 44, height: 38,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1, borderColor: colors.line,
  },
  btnOff: { opacity: 0.4 },
  btnTxt: { fontSize: 18, color: colors.text },
  btnTxtOff: { color: colors.textMuted },
  playBtn: { backgroundColor: colors.primary, borderColor: colors.primary, width: 52, height: 42 },
  playTxt: { color: '#fff', fontWeight: fontWeight.bold },
});

function Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, valueColor ? { color: valueColor } : undefined]}>{value}</Text>
    </View>
  );
}

// ── 테이블 뷰 스타일 (360×355, 에디터와 동일) ───────────────────────────────
const tv = StyleSheet.create({
  tableContainer: { width: 360, height: 355, position: 'relative' },
  tableOval: { position: 'absolute', left: 60, top: 100, width: 240, height: 150, borderRadius: 999, backgroundColor: '#1a5c2e', borderWidth: 3, borderColor: '#2d8c4a' },
  boardArea: { position: 'absolute', left: 100, top: 158, width: 160, height: 44, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', zIndex: 10, overflow: 'visible' },
  boardEmpty: { fontSize: 9, color: 'rgba(255,255,255,0.4)' },
  dealerChip: { position: 'absolute', left: 222, top: 222, width: 24, height: 24, borderRadius: 12, backgroundColor: '#888', alignItems: 'center', justifyContent: 'center', zIndex: 5 },
  dealerText: { fontSize: 9, color: '#fff', fontWeight: fontWeight.bold },
  // 에디터와 동일한 group-based 레이아웃
  seatGroup: { position: 'absolute' },
  cardsRowAbs: { position: 'absolute', flexDirection: 'row', gap: 4 },
  playerBadge: { position: 'absolute', width: 48, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  playerBadgeText: { fontSize: 10, color: '#fff', fontWeight: fontWeight.bold },
  posChip: { position: 'absolute', width: 48, height: 22, borderRadius: 8, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  posChipText: { fontSize: 9, color: colors.textMuted, fontWeight: fontWeight.bold },
  // 리플레이 전용
  actingRing: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, borderWidth: 2, borderRadius: 8, borderColor: '#fff' },
  actionBubble: { position: 'absolute', width: 86, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', zIndex: 20 },
  actionBubbleText: { fontSize: 11, fontWeight: fontWeight.bold, color: '#fff' },
  streetBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, marginBottom: 4 },
  streetText: { fontSize: 10, color: '#fff', fontWeight: fontWeight.bold, letterSpacing: 1 },
  streetStep: { fontSize: 10, color: 'rgba(255,255,255,0.6)' },
});

// ── 메인 스타일 ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: fontSize.md, color: colors.textMuted },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.base,
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  backText: { fontSize: fontSize.lg, color: colors.text },
  headerTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
  headerActions: { flexDirection: 'row', gap: spacing.sm },
  headerBtn: { paddingHorizontal: spacing.xs, paddingVertical: 4 },
  headerBtnText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.medium },
  content: { padding: spacing.md, gap: spacing.sm },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.base,
    borderWidth: 1, borderColor: colors.line, gap: spacing.xs,
  },
  cardTitle: {
    fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.primary,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4,
  },
  legendRow: { flexDirection: 'row', gap: spacing.base, marginTop: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: fontSize.xs, color: colors.textMuted },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 2 },
  rowLabel: { fontSize: fontSize.sm, color: colors.textMuted },
  rowValue: { fontSize: fontSize.sm, color: colors.text, fontWeight: fontWeight.medium },
  cardsSection: { gap: 4, marginBottom: 6 },
  cardsLabel: { fontSize: fontSize.xs, color: colors.textMuted },
  cardsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  cardBadge: {
    backgroundColor: colors.surfaceAlt, borderRadius: radius.sm,
    paddingHorizontal: 7, paddingVertical: 4, borderWidth: 1, borderColor: colors.line,
  },
  cardBadgeText: { fontSize: fontSize.base, fontWeight: fontWeight.bold },
  streetBlock: { marginBottom: spacing.sm },
  streetLabel: { fontSize: fontSize.xs, color: colors.textMuted, fontWeight: fontWeight.bold, letterSpacing: 0.5, marginBottom: 4 },
  actionLine: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', paddingVertical: 2 },
  actionActor: { fontSize: fontSize.sm, color: colors.primary, width: 55 },
  actionVerb: { fontSize: fontSize.sm, color: colors.text, fontWeight: fontWeight.medium },
  actionAmount: { fontSize: fontSize.sm, color: colors.textMuted },
  resultBadge: {
    alignSelf: 'flex-start', borderWidth: 1, borderRadius: radius.sm,
    paddingHorizontal: spacing.sm, paddingVertical: 4, marginBottom: 4,
  },
  resultText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  noteText: { fontSize: fontSize.sm, color: colors.text, lineHeight: 20 },
  reviewRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reviewStatus: { fontSize: fontSize.sm, color: colors.textMuted },
  reviewStatusValue: { color: colors.text, fontWeight: fontWeight.medium },
  reviewBtn: {
    backgroundColor: colors.primary, borderRadius: radius.button,
    paddingHorizontal: spacing.base, paddingVertical: 6,
  },
  reviewBtnText: { fontSize: fontSize.sm, color: colors.text, fontWeight: fontWeight.medium },
  reviewContent: { fontSize: fontSize.sm, color: colors.text, lineHeight: 20, marginTop: spacing.sm },
  reviewedAt: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 4 },
});

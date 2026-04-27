import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Share,
} from 'react-native';
import { showConfirm, showAlert } from '../../utils/alert';
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

// ── KRW 금액을 "만" 단위로 짧게 ─────────────────────────────────────────────
// 5000 → "0.5만", 10000 → "1만", 240000 → "24만", 1100000 → "110만"
function formatAmountInMan(amount: number): string {
  if (amount === 0) return '0';
  const man = amount / 10000;
  if (Math.abs(man) >= 1) {
    // 1만 이상: 정수면 정수, 아니면 소수점 1자리
    return Number.isInteger(man) ? `${man}만` : `${(Math.round(man * 10) / 10)}만`;
  }
  // 1만 미만: 0.5만, 0.3만 등 소수점 1자리
  const rounded = Math.round(man * 10) / 10;
  return `${rounded}만`;
}

// 가로형 뷰 전용 액션 텍스트 (금액 짧게)
function actionDisplayShort(a: HandAction): string {
  const amt = a.amount != null ? ` ${formatAmountInMan(a.amount)}` : '';
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

// ── 가로형 액션 뷰 (스트리트별 컬럼 + 말풍선) ────────────────────────────────
function HorizontalActionView({
  actions,
  heroPos,
  villainData,
}: {
  actions: HandAction[];
  heroPos: Position9Max | null;
  villainData: Array<{ pos: Position9Max | null; name?: string }>;
}) {
  const STREET_LABEL: Record<string, string> = {
    preflop: 'Pre-Flop', flop: 'Flop', turn: 'Turn', river: 'River',
  };
  const STREET_ORDER: Street[] = ['preflop', 'flop', 'turn', 'river'];

  // 누적 팟 계산: 각 스트리트 종료 시점의 팟
  let running = 0;
  const potAtEnd: Record<string, number> = {};
  STREET_ORDER.forEach(s => {
    actions.filter(a => a.street === s).forEach(a => {
      if (a.amount) running += a.amount;
    });
    potAtEnd[s] = running;
  });

  // 액션이 있는 스트리트만 표시
  const visible = STREET_ORDER.filter(s => actions.some(a => a.street === s));
  if (visible.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator
      contentContainerStyle={hav.scroll}
    >
      {visible.map(street => {
        const streetActions = actions.filter(a => a.street === street);
        return (
          <View key={street} style={hav.column}>
            {/* 헤더: 스트리트 이름 + 팟 */}
            <View style={hav.header}>
              <Text style={hav.headerTitle}>{STREET_LABEL[street]}</Text>
              <Text style={hav.headerPot}>{potAtEnd[street].toLocaleString()}</Text>
            </View>
            {/* 액션 목록 */}
            <View style={hav.body}>
              {streetActions.map((a, i) => (
                <HorizontalActionRow
                  key={i}
                  action={a}
                  heroPos={heroPos}
                  villainData={villainData}
                />
              ))}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

function HorizontalActionRow({
  action,
  heroPos,
  villainData,
}: {
  action: HandAction;
  heroPos: Position9Max | null;
  villainData: Array<{ pos: Position9Max | null; name?: string }>;
}) {
  const pos = resolveActorPos(action.actor, heroPos, villainData);
  const color = resolveActorColor(action.actor, villainData);
  const isAggressive = action.action === 'raise' || action.action === 'bet' || action.action === 'allin';
  const isFold = action.action === 'fold';

  // 칩 두 줄: 위=포지션, 아래=액터 이름
  const actorName = action.actor === 'hero' || action.actor === '나' ? '나' : action.actor;
  // 액션 텍스트 (만 단위 짧게)
  const actionText = actionDisplayShort(action);

  return (
    <View style={hav.row}>
      {/* 좌측: 포지션 + 이름 두 줄 칩 */}
      <View style={[hav.posChip, { borderColor: color, backgroundColor: color + '22' }]}>
        <Text style={[hav.posChipPos, { color }]} numberOfLines={1}>
          {pos ?? '-'}
        </Text>
        <Text style={[hav.posChipName, { color }]} numberOfLines={1}>
          {actorName}
        </Text>
      </View>
      {/* 우측: 말풍선 */}
      <View
        style={[
          hav.bubble,
          isAggressive && hav.bubbleAggressive,
          isFold && hav.bubbleFold,
        ]}
      >
        <Text
          style={[
            hav.bubbleText,
            isAggressive && hav.bubbleTextAggressive,
            isFold && hav.bubbleTextFold,
          ]}
          numberOfLines={2}
        >
          {actionText}
        </Text>
      </View>
    </View>
  );
}

const hav = StyleSheet.create({
  scroll: { padding: spacing.xs, gap: spacing.xs },
  column: {
    width: 150,
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.line,
  },
  header: {
    backgroundColor: colors.surfaceAlt,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  headerPot: {
    fontSize: fontSize.xs,
    color: colors.warning,
    fontWeight: fontWeight.semibold,
    marginTop: 2,
  },
  body: { padding: 8, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  posChip: {
    minWidth: 44,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  posChipPos: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
    lineHeight: 13,
  },
  posChipName: {
    fontSize: 11,
    fontWeight: fontWeight.semibold,
    lineHeight: 13,
    marginTop: 1,
  },
  bubble: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
    minHeight: 28,
    justifyContent: 'center',
  },
  bubbleAggressive: {
    backgroundColor: '#FCD34D', // 노란색 — raise/bet/allin
  },
  bubbleFold: {
    backgroundColor: '#E5E7EB',
    opacity: 0.7,
  },
  bubbleText: {
    fontSize: 11,
    color: '#1F2937',
    fontWeight: fontWeight.semibold,
  },
  bubbleTextAggressive: {
    color: '#7C2D12',
    fontWeight: fontWeight.bold,
  },
  bubbleTextFold: {
    color: '#6B7280',
  },
});

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
  { pos: 'BTN',   cx: 195, cy: 272, dir: 'down' },
  { pos: 'CO',    cx: 300, cy: 268, dir: 'down' },
  { pos: 'HJ',    cx: 345, cy: 188, dir: 'up'   },
  { pos: 'MP',    cx: 300, cy:  95, dir: 'up'   },
  { pos: 'UTG+1', cx: 195, cy:  80, dir: 'up'   },
  { pos: 'UTG',   cx:  90, cy:  95, dir: 'up'   },
  { pos: 'BB',    cx:  47, cy: 175, dir: 'down' },
  { pos: 'SB',    cx:  90, cy: 268, dir: 'down' },
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
  card: { width: 22, height: 34, backgroundColor: '#fff', borderRadius: 3, borderWidth: 0.5, borderColor: '#bbb', alignItems: 'center', justifyContent: 'center' },
  back: { width: 22, height: 34, backgroundColor: '#1a56a0', borderRadius: 3, borderWidth: 0.5, borderColor: '#1245a0', alignItems: 'center', justifyContent: 'center' },
  backInner: { width: 15, height: 24, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)', borderRadius: 2 },
  rank: { fontSize: 17, fontWeight: 'bold', lineHeight: 17 },
  suit: { fontSize: 14, lineHeight: 14 },
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

          const groupH    = 86;
          const groupW    = 90;
          const groupTop  = dir === 'up' ? cy - 75 : cy - 11;
          const groupLeft = cx - 45;
          const chipLocalTop  = dir === 'up' ? 64 : 0;
          const badgeLocalTop = dir === 'up' ? 38 : 26;
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
    showConfirm({
      title: '핸드 삭제',
      message: '이 핸드를 삭제하시겠습니까?',
      confirmText: '삭제',
      destructive: true,
      onConfirm: async () => {
        try {
          await deleteHand.mutateAsync(handId);
          navigation.goBack();
        } catch {
          showAlert('오류', '핸드 삭제에 실패했습니다.');
        }
      },
    });
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

  const [isReviewing, setIsReviewing] = useState(false);

  async function handleRequestReview(forceRefresh = false) {
    setIsReviewing(true);
    try {
      await updateHand.mutateAsync({ id: handId, data: { review_status: 'pending' } });

      const { supabase } = await import('../../services/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('로그인이 필요합니다.');

      // 서버가 실제로 사용하는 필드만 명시적으로 추출 → React DOM 참조 등 노이즈 차단
      // (전체 hand를 JSON.stringify하면 React fiber 등이 섞여 circular structure 에러 발생할 수 있음)
      const handPayload = {
        game_type: hand.game_type,
        stakes: hand.stakes,
        hero_position: hand.hero_position,
        villain_position: hand.villain_position,
        villain_known: hand.villain_known,
        villain_cards: hand.villain_cards,
        villain_data: (hand as any).villain_data,
        hero_cards: hand.hero_cards,
        board: hand.board,
        actions: hand.actions,
        result: hand.result,
        pot_size: hand.pot_size,
        hero_pl: hand.hero_pl,
        preflop_aggressor: (hand as any).preflop_aggressor,
        effective_stack: (hand as any).effective_stack,
        villain_type: (hand as any).villain_type,
        note: hand.note,
      };

      const res = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/claude-proxy/hand-review-gpt`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          // force_refresh=true → 서버가 기존 캐시 삭제하고 GPT 새로 호출
          body: JSON.stringify({ hand: handPayload, force_refresh: forceRefresh }),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const detail = err?.message ?? err?.error ?? `HTTP ${res.status}`;
        console.error('[hand-review-gpt] failed:', res.status, err);
        throw new Error(`리뷰 요청 실패: ${detail}`);
      }

      const review = await res.json();
      await updateHand.mutateAsync({
        id: handId,
        data: {
          review_status: 'done',
          review,
          review_model: 'gpt-4o',
          reviewed_at: new Date().toISOString(),
        },
      });
    } catch (e: any) {
      await updateHand.mutateAsync({ id: handId, data: { review_status: 'error' } });
      showAlert('오류', e.message ?? '리뷰 요청에 실패했습니다.');
    } finally {
      setIsReviewing(false);
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
          {(hand as any).preflop_aggressor && (
            <Row
              label="프리플랍 어그레서"
              value={(hand as any).preflop_aggressor === 'hero' ? '나 (히어로)' : '빌런'}
            />
          )}
          {(hand as any).effective_stack != null && (
            <Row label="유효 스택" value={`${(hand as any).effective_stack.toLocaleString()}원`} />
          )}
          {(hand as any).villain_type && (
            <Row label="빌런 성향" value={(hand as any).villain_type} />
          )}
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

        {/* 액션 — 가로형 스트리트 컬럼 */}
        {hand.actions.length > 0 && (
          <View style={[styles.card, { paddingHorizontal: 0, paddingVertical: spacing.sm }]}>
            <Text style={[styles.cardTitle, { paddingHorizontal: spacing.base }]}>액션</Text>
            <HorizontalActionView
              actions={hand.actions as HandAction[]}
              heroPos={hand.hero_position as Position9Max | null}
              villainData={villainData}
            />
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
          <Text style={styles.cardTitle}>블러프존 홀덤 알파고 핸드리뷰</Text>

          {/* 리뷰 없음 → 요청 버튼 */}
          {(hand.review_status === 'none' || hand.review_status === 'error') && (
            <TouchableOpacity
              style={styles.reviewBtn}
              onPress={handleRequestReview}
              disabled={isReviewing}
              activeOpacity={0.8}
            >
              {isReviewing
                ? <><ActivityIndicator color={colors.text} size="small" /><Text style={[styles.reviewBtnText, { marginLeft: 8 }]}>분석 중...</Text></>
                : <Text style={styles.reviewBtnText}>리뷰 요청</Text>
              }
            </TouchableOpacity>
          )}

          {/* 분석 중 */}
          {hand.review_status === 'pending' && !isReviewing && (
            <View style={styles.reviewPending}>
              <ActivityIndicator color={colors.primary} size="small" />
              <Text style={styles.reviewPendingText}>분석 중...</Text>
            </View>
          )}

          {/* 리뷰 완료 */}
          {hand.review_status === 'done' && hand.review && (() => {
            const r = hand.review as any;
            const streetLabels: Record<string, string> = {
              preflop: '프리플랍', flop: '플랍', turn: '턴', river: '리버',
            };
            const streetOrder = ['preflop', 'flop', 'turn', 'river'];
            const streets = r.streets ?? {};
            const rating = Number(r.rating) || 0;
            return (
              <View style={styles.reviewResult}>
                {/* 한 줄 결론 + 평점 */}
                {(r.headline || rating > 0) && (
                  <View style={styles.headlineBox}>
                    {r.headline ? <Text style={styles.headlineText}>👉 {r.headline}</Text> : null}
                    {rating > 0 ? (
                      <Text style={styles.ratingText}>
                        {'⭐'.repeat(rating)}{'☆'.repeat(Math.max(0, 5 - rating))}
                      </Text>
                    ) : null}
                  </View>
                )}

                {/* 추천 vs 실제 라인 비교 */}
                {(r.recommended_line || r.actual_line) && (
                  <View style={styles.lineCompareBox}>
                    {r.recommended_line ? (
                      <View style={styles.lineCompareRow}>
                        <Text style={styles.lineCompareLabelGood}>✅ 추천</Text>
                        <Text style={styles.lineCompareValue}>{r.recommended_line}</Text>
                      </View>
                    ) : null}
                    {r.actual_line ? (
                      <View style={styles.lineCompareRow}>
                        <Text style={styles.lineCompareLabelBad}>❌ 실제</Text>
                        <Text style={styles.lineCompareValue}>{r.actual_line}</Text>
                      </View>
                    ) : null}
                    {r.ev_note ? (
                      <Text style={styles.evNoteText}>💰 {r.ev_note}</Text>
                    ) : null}
                  </View>
                )}

                {/* 스트리트별 카드 */}
                {streetOrder.map((s) => {
                  const st = streets[s];
                  if (!st || !st.action) return null;
                  const freq = Number(st.frequency) || 0;
                  const altFreq = Number(st.alt_frequency) || 0;
                  return (
                    <View key={s} style={styles.streetCard}>
                      <View style={styles.streetCardHeader}>
                        <Text style={styles.streetCardLabel}>{streetLabels[s]}</Text>
                        <View style={styles.streetCardActionWrap}>
                          <Text style={styles.streetCardAction}>{st.action}</Text>
                          <Text style={styles.streetCardFreq}>{freq}%</Text>
                        </View>
                      </View>
                      <View style={styles.streetCardBar}>
                        <View style={[styles.streetCardBarFill, { width: `${Math.max(0, Math.min(100, freq))}%` }]} />
                      </View>
                      {/* 대안 액션 (나머지 %) */}
                      {st.alt_action && altFreq > 0 ? (
                        <View style={styles.altActionRow}>
                          <Text style={styles.altActionLabel}>나머지</Text>
                          <Text style={styles.altActionValue}>{st.alt_action}</Text>
                          <Text style={styles.altActionFreq}>{altFreq}%</Text>
                          <View style={styles.altActionBar}>
                            <View style={[styles.altActionBarFill, { width: `${Math.max(0, Math.min(100, altFreq))}%` }]} />
                          </View>
                        </View>
                      ) : null}
                      {st.size ? (
                        <View style={styles.streetCardSizeRow}>
                          <Text style={styles.streetCardSizeLabel}>추천 사이즈</Text>
                          <Text style={styles.streetCardSizeValue}>{st.size}</Text>
                        </View>
                      ) : null}
                      {st.comment ? (
                        <Text style={styles.streetCardComment}>{st.comment}</Text>
                      ) : null}
                    </View>
                  );
                })}

                {/* 실수 */}
                {r.mistake && (
                  <View style={styles.reviewMistake}>
                    <Text style={styles.reviewMistakeLabel}>❌ 실수</Text>
                    <Text style={styles.reviewMistakeText}>{r.mistake}</Text>
                  </View>
                )}

                {/* 팁 */}
                {r.tip && (
                  <View style={styles.reviewTip}>
                    <Text style={styles.reviewTipText}>💡 {r.tip}</Text>
                  </View>
                )}

                {/* 재요청 버튼 — 캐시 우회하고 GPT 새로 호출 */}
                <TouchableOpacity
                  onPress={() => handleRequestReview(true)}
                  disabled={isReviewing}
                  style={styles.reviewRetryBtn}
                  activeOpacity={0.7}
                >
                  <Text style={styles.reviewRetryText}>다시 분석</Text>
                </TouchableOpacity>
              </View>
            );
          })()}
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
  tableOval: { position: 'absolute', left: 75, top: 100, width: 240, height: 150, borderRadius: 999, backgroundColor: '#1a5c2e', borderWidth: 3, borderColor: '#2d8c4a' },
  boardArea: { position: 'absolute', left: 115, top: 158, width: 160, height: 44, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', zIndex: 10, overflow: 'visible' },
  boardEmpty: { fontSize: 9, color: 'rgba(255,255,255,0.4)' },
  dealerChip: { position: 'absolute', left: 237, top: 222, width: 24, height: 24, borderRadius: 12, backgroundColor: '#888', alignItems: 'center', justifyContent: 'center', zIndex: 5 },
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primary, borderRadius: radius.button,
    paddingVertical: 10,
  },
  reviewBtnText: { fontSize: fontSize.sm, color: colors.text, fontWeight: fontWeight.medium },
  reviewPending: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 8 },
  reviewPendingText: { fontSize: fontSize.sm, color: colors.textMuted },
  reviewResult: { gap: spacing.sm, marginTop: 4 },
  streetCard: {
    backgroundColor: `${colors.primary}0D`,
    borderRadius: radius.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    padding: spacing.sm,
    gap: 6,
  },
  streetCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  streetCardLabel: { fontSize: fontSize.xs, color: colors.textMuted, fontWeight: fontWeight.bold, letterSpacing: 0.5 },
  streetCardActionWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  streetCardAction: { fontSize: fontSize.base, color: colors.text, fontWeight: fontWeight.bold },
  streetCardFreq: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.bold },
  streetCardBar: {
    height: 4, borderRadius: 2, backgroundColor: `${colors.textMuted}22`, overflow: 'hidden',
  },
  streetCardBarFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 2 },
  // 한 줄 결론 박스
  headlineBox: {
    backgroundColor: 'rgba(99,102,241,0.12)',
    borderRadius: radius.sm,
    padding: spacing.sm,
    borderLeftWidth: 4, borderLeftColor: colors.primary,
    marginBottom: spacing.sm,
    gap: 6,
  },
  headlineText: { fontSize: fontSize.md, color: colors.text, fontWeight: fontWeight.bold, lineHeight: 22 },
  ratingText: { fontSize: fontSize.sm, color: '#f59e0b', letterSpacing: 2 },
  // 추천 vs 실제 비교 박스
  lineCompareBox: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    gap: 6,
    borderWidth: 1, borderColor: colors.line,
  },
  lineCompareRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  lineCompareLabelGood: { fontSize: fontSize.xs, color: colors.success, fontWeight: fontWeight.bold, minWidth: 40 },
  lineCompareLabelBad: { fontSize: fontSize.xs, color: colors.danger, fontWeight: fontWeight.bold, minWidth: 40 },
  lineCompareValue: { flex: 1, fontSize: fontSize.sm, color: colors.text, lineHeight: 18 },
  evNoteText: {
    fontSize: fontSize.sm, color: '#f59e0b', fontWeight: fontWeight.medium,
    marginTop: 4, paddingTop: 6, borderTopWidth: 1, borderTopColor: colors.line,
  },
  // 대안 액션
  altActionRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  altActionLabel: { fontSize: fontSize.xs, color: colors.textMuted },
  altActionValue: { fontSize: fontSize.xs, color: colors.textMuted, fontWeight: fontWeight.medium },
  altActionFreq: { fontSize: fontSize.xs, color: colors.textMuted },
  altActionBar: { flex: 1, height: 3, borderRadius: 2, backgroundColor: `${colors.textMuted}15`, overflow: 'hidden' },
  altActionBarFill: { height: '100%', backgroundColor: colors.textMuted, borderRadius: 2, opacity: 0.6 },
  streetCardSizeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(99,102,241,0.10)',
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: radius.sm,
    borderLeftWidth: 3, borderLeftColor: colors.primary,
  },
  streetCardSizeLabel: { fontSize: fontSize.xs, color: colors.textMuted, fontWeight: fontWeight.medium },
  streetCardSizeValue: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.bold },
  streetCardComment: { fontSize: fontSize.sm, color: colors.text, lineHeight: 20 },
  reviewActionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reviewActionBadgeMain: {
    backgroundColor: colors.primary, borderRadius: radius.sm,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  reviewActionBadgeSub: {
    backgroundColor: `${colors.textMuted}33`, borderRadius: radius.sm,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  reviewActionBadgeText: { fontSize: fontSize.xs, color: colors.text, fontWeight: fontWeight.bold },
  reviewActionBadgeTextSub: { fontSize: fontSize.xs, color: colors.textMuted, fontWeight: fontWeight.bold },
  reviewActionName: { fontSize: fontSize.base, color: colors.text, fontWeight: fontWeight.bold, flex: 1 },
  reviewActionNameSub: { fontSize: fontSize.sm, color: colors.textMuted, flex: 1 },
  reviewActionFreq: { fontSize: fontSize.base, color: colors.primary, fontWeight: fontWeight.bold },
  reviewActionFreqSub: { fontSize: fontSize.sm, color: colors.textMuted, fontWeight: fontWeight.medium },
  reviewFreqBar: {
    flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden',
    backgroundColor: `${colors.textMuted}22`, marginVertical: 2,
  },
  reviewFreqBarMain: { backgroundColor: colors.primary },
  reviewFreqBarSub: { backgroundColor: `${colors.textMuted}66` },
  reviewSummary: { gap: 4, marginTop: 4 },
  reviewSummaryRow: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
  reviewSummaryBullet: { fontSize: fontSize.sm, color: colors.primary, lineHeight: 20 },
  reviewSummaryText: { fontSize: fontSize.sm, color: colors.text, lineHeight: 20, flex: 1 },
  reviewMistake: {
    backgroundColor: `${colors.danger}18`,
    borderRadius: radius.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.danger,
    padding: spacing.sm,
    marginTop: 4,
    gap: 2,
  },
  reviewMistakeLabel: { fontSize: fontSize.xs, color: colors.danger, fontWeight: fontWeight.bold },
  reviewMistakeText: { fontSize: fontSize.sm, color: colors.text, lineHeight: 20 },
  reviewTip: {
    backgroundColor: `${colors.primary}18`,
    borderRadius: radius.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    padding: spacing.sm,
    marginTop: 4,
  },
  reviewTipText: { fontSize: fontSize.sm, color: colors.text, lineHeight: 20 },
  reviewRetryBtn: { alignSelf: 'flex-end', paddingVertical: 4, paddingHorizontal: 8 },
  reviewRetryText: { fontSize: fontSize.xs, color: colors.textMuted },
  reviewContent: { fontSize: fontSize.sm, color: colors.text, lineHeight: 20, marginTop: spacing.sm },
  reviewedAt: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 4 },
});

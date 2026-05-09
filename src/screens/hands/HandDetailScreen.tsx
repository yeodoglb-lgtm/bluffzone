import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Share,
  Platform,
} from 'react-native';
import { showConfirm, showAlert } from '../../utils/alert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useRef } from 'react';
import type { StackScreenProps } from '@react-navigation/stack';
import { colors, spacing, fontSize, fontWeight, radius } from '../../theme';
import type { HandsStackParamList } from '../../navigation/types';
import { SUIT_COLORS, SUIT_SYMBOLS } from '../../constants/poker';
import type { Card, Street, Position9Max, HandAction } from '../../constants/poker';
import { useHand, useDeleteHand, useUpdateHand, useHands } from '../../hooks/useHands';
import { findBestFiveIndices, isInBestFive } from '../../utils/handEval';

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

  // 공유 카드 영역 ref (html2canvas 캡처 대상)
  const shareCardRef = useRef<any>(null);
  // 공유 카드 콘텐츠 변형 — V1: 심플(카드+평점) / V2: 빌런카드 포함 / V3: 결과+수익
  const [cardVariant, setCardVariant] = useState<'V1' | 'V2' | 'V3'>('V1');

  // 리뷰 결과 공유 — 카드를 PNG로 캡처해서 이미지 공유, 실패 시 텍스트 폴백
  async function handleShareReview(r: any) {
    const rating = Number(r?.rating) || 0;
    const stars = rating > 0 ? '⭐'.repeat(rating) : '';
    const headline = r?.headline ? `\n${r.headline}` : '';
    const text = `[블러프존 홀덤 알파고 핸드 리뷰] ${stars}${headline}\n\n무료 핸드 리뷰: https://bluffzone.kr`;

    // 웹: html2canvas로 카드 캡처 → 이미지 공유
    if (Platform.OS === 'web' && shareCardRef.current) {
      try {
        const html2canvas = (await import('html2canvas')).default;
        const node: HTMLElement = shareCardRef.current;
        const canvas = await html2canvas(node, {
          backgroundColor: '#1a1d29',
          scale: 2,                   // 고해상도
          useCORS: true,
          logging: false,
        });
        const blob: Blob | null = await new Promise(resolve =>
          canvas.toBlob(b => resolve(b), 'image/png', 0.95)
        );
        if (blob) {
          const file = new File([blob], 'bluffzone-review.png', { type: 'image/png' });
          // Web Share API (파일 지원 브라우저: 모바일 Chrome/Safari)
          const navAny = navigator as any;
          if (navAny.canShare && navAny.canShare({ files: [file] })) {
            await navAny.share({ title: '블러프존 홀덤 알파고 핸드 리뷰', text, files: [file] });
            return;
          }
          // 파일 공유 미지원 → 다운로드
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'bluffzone-review.png';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          showAlert('이미지 저장됨', '리뷰 이미지가 다운로드됐어요. 카톡·인스타에 첨부해보세요.');
          return;
        }
      } catch (e) {
        console.warn('[shareReview] 이미지 캡처 실패, 텍스트 폴백', e);
      }
    }
    // 폴백: 텍스트 공유
    try {
      if (Platform.OS === 'web' && (navigator as any).share) {
        await (navigator as any).share({ title: '블러프존 홀덤 알파고 핸드 리뷰', text });
      } else {
        await Share.share({ title: '블러프존 홀덤 알파고 핸드 리뷰', message: text });
      }
    } catch { /* 사용자 취소 등 무시 */ }
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
  const [reviewProgress, setReviewProgress] = useState<{ tokens: number; chars: number } | null>(null);
  // 신규 유저 자동 리뷰 — 첫 핸드(리뷰 0개)일 때 자동으로 리뷰 트리거
  // "와 자동으로 분석해주네" 즉각 임팩트 + 온보딩 가속
  const { data: allHands } = useHands();
  const autoReviewFiredRef = useRef(false);

  async function handleRequestReview(forceRefresh = false) {
    if (!hand) return;
    setIsReviewing(true);
    setReviewProgress(null);
    try {
      await updateHand.mutateAsync({ id: handId, data: { review_status: 'pending' } });

      const { supabase } = await import('../../services/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('로그인이 필요합니다.');

      // 서버가 실제로 사용하는 필드만 명시적으로 추출
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
        // 토너 컨텍스트 (AI 분기 + 푸시폴드 lookup용)
        is_tournament: (hand as any).is_tournament,
        sb_chips: (hand as any).sb_chips,
        bb_chips: (hand as any).bb_chips,
        ante_chips: (hand as any).ante_chips,
      };

      // 안전 직렬화: React fiber 키, DOM 노드, 순환 참조 모두 제거
      // (React Native Web 환경에서 가끔 데이터 객체에 __reactFiber 등이 붙는 케이스 회피)
      function safeStringify(obj: any): string {
        const seen = new WeakSet();
        return JSON.stringify(obj, (key, value) => {
          // React 내부 속성 제거
          if (typeof key === 'string' && (key.startsWith('__react') || key.startsWith('_react'))) {
            return undefined;
          }
          // 순환 참조 + DOM 노드 제거
          if (value !== null && typeof value === 'object') {
            if (seen.has(value)) return undefined;
            seen.add(value);
            // DOM Element / Node 제거 (브라우저 환경)
            if (typeof Element !== 'undefined' && value instanceof Element) return undefined;
            if (typeof Node !== 'undefined' && value instanceof Node) return undefined;
            if ('nodeType' in value && typeof value.nodeType === 'number') return undefined;
          }
          return value;
        });
      }

      const res = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/claude-proxy/hand-review-gpt`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: safeStringify({ hand: handPayload, force_refresh: forceRefresh, stream: true }),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const detail = err?.message ?? err?.error ?? `HTTP ${res.status}`;
        console.error('[hand-review-gpt] failed:', res.status, err);
        throw new Error(`리뷰 요청 실패: ${detail}`);
      }

      // 응답 형식 분기 — SSE 스트림 vs JSON
      const contentType = res.headers.get('content-type') ?? '';
      let review: any;

      if (contentType.includes('text/event-stream') && res.body) {
        // 스트리밍 — SSE 이벤트 파싱
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';
        let completed = false;
        let errorMsg: string | null = null;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const events = buf.split('\n\n');
          buf = events.pop() ?? '';
          for (const ev of events) {
            const lines = ev.split('\n');
            let eventType = 'message';
            let dataStr = '';
            for (const line of lines) {
              if (line.startsWith('event:')) eventType = line.slice(6).trim();
              else if (line.startsWith('data:')) dataStr = line.slice(5).trim();
            }
            if (!dataStr) continue;
            try {
              const data = JSON.parse(dataStr);
              if (eventType === 'progress') {
                setReviewProgress({ tokens: data.tokens ?? 0, chars: data.chars ?? 0 });
              } else if (eventType === 'complete') {
                review = data;
                completed = true;
              } else if (eventType === 'error') {
                errorMsg = data.error ?? '리뷰 생성 실패';
              }
            } catch (e) {
              console.warn('[review-stream] bad event:', ev);
            }
          }
        }
        if (errorMsg) throw new Error(errorMsg);
        if (!completed || !review) throw new Error('스트림이 끊어졌습니다 — 다시 시도해주세요');
      } else {
        review = await res.json();
      }
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
      setReviewProgress(null);
    }
  }

  // 신규 유저 자동 리뷰 트리거 — handleRequestReview 정의 뒤에서 사용
  useEffect(() => {
    if (autoReviewFiredRef.current) return;
    if (!hand || !allHands) return;
    if (hand.review_status !== 'none') return;
    // 다른 핸드 중 done인 게 하나도 없으면 = 신규 유저 첫 경험
    const hasAnyReviewed = allHands.some(h => h.review_status === 'done' || h.review_status === 'pending');
    if (hasAnyReviewed) return;
    // 의미있는 리뷰 가능한지 검증
    if (!hand.hero_cards || hand.hero_cards.length < 2) return;
    if (!hand.actions || hand.actions.length === 0) return;
    autoReviewFiredRef.current = true;
    // 살짝 지연 후 트리거 — 화면 렌더 후 자연스럽게
    const t = setTimeout(() => { handleRequestReview(); }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hand?.id, allHands?.length]);

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
            <Row
              label="유효 스택"
              value={`${(hand as any).effective_stack.toLocaleString()}${(hand as any).is_tournament ? '칩' : '원'}`}
            />
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

        {/* 토너 + 단스택(≤25bb) 핸드면 푸시폴드 차트 컨텍스트 링크 */}
        {(() => {
          const isT = (hand as any).is_tournament === true;
          const eff = (hand as any).effective_stack;
          const bb = (hand as any).bb_chips;
          const effBb = isT && eff && bb ? Math.round(Number(eff) / Number(bb)) : null;
          if (!isT || effBb == null || effBb > 25) return null;
          return (
            <TouchableOpacity
              style={styles.gtoLinkCard}
              onPress={() => (navigation as any).push('PushfoldChart')}
              activeOpacity={0.8}
            >
              <Text style={styles.gtoLinkEmoji}>🎯</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.gtoLinkTitle}>
                  단스택 {effBb}bb — 푸시폴드 차트로 확인
                </Text>
                <Text style={styles.gtoLinkDesc}>
                  Nash 차트상 이 핸드의 푸시·폴드 결정을 직접 비교해보세요
                </Text>
              </View>
              <Text style={styles.gtoLinkArrow}>›</Text>
            </TouchableOpacity>
          );
        })()}

        {/* 캐시 게임 (또는 토너 25bb 초과) 프리플랍 액션 있는 핸드면 프리플랍 차트 컨텍스트 링크 */}
        {(() => {
          const isT = (hand as any).is_tournament === true;
          const eff = (hand as any).effective_stack;
          const bb = (hand as any).bb_chips;
          const effBb = isT && eff && bb ? Math.round(Number(eff) / Number(bb)) : null;
          // 토너 단스택은 푸시폴드 차트가 우선이라 여기선 제외
          if (isT && effBb != null && effBb <= 25) return null;
          // 프리플랍 액션이 있어야만 의미 있음
          const preflopActions = (hand.actions ?? []).filter((a: any) => a.street === 'preflop');
          const heroPreflopExists = preflopActions.some((a: any) => a.actor === 'hero');
          if (!heroPreflopExists) return null;
          return (
            <TouchableOpacity
              style={styles.gtoLinkCard}
              onPress={() => (navigation as any).push('PreflopChart')}
              activeOpacity={0.8}
            >
              <Text style={styles.gtoLinkEmoji}>📖</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.gtoLinkTitle}>
                  프리플랍 차트로 확인
                </Text>
                <Text style={styles.gtoLinkDesc}>
                  GTO 차트상 이 핸드의 권장 액션과 비교해보세요
                </Text>
              </View>
              <Text style={styles.gtoLinkArrow}>›</Text>
            </TouchableOpacity>
          );
        })()}

        {/* 홀덤 알파고 리뷰 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>블러프존 홀덤 알파고 핸드리뷰</Text>

          {/* 리뷰 없음 → 요청 버튼 */}
          {(hand.review_status === 'none' || hand.review_status === 'error') && (
            <TouchableOpacity
              style={styles.reviewBtn}
              onPress={() => handleRequestReview()}
              disabled={isReviewing}
              activeOpacity={0.8}
            >
              {isReviewing
                ? <><ActivityIndicator color={colors.text} size="small" /><Text style={[styles.reviewBtnText, { marginLeft: 8 }]}>분석 중...</Text></>
                : <Text style={styles.reviewBtnText}>리뷰 요청</Text>
              }
            </TouchableOpacity>
          )}

          {/* 분석 중 — 큰 표시 + 안내 + 실시간 진행률 */}
          {(hand.review_status === 'pending' || isReviewing) && (
            <View style={styles.reviewPendingBig}>
              <ActivityIndicator color={colors.primary} size="large" />
              <Text style={styles.reviewPendingBigTitle}>홀덤 알파고가 분석 중입니다</Text>
              <Text style={styles.reviewPendingBigSub}>
                GTO 이론 + 솔버 데이터로 핸드를 분석하고 있어요{'\n'}
                보통 10~20초 정도 걸립니다 ☕
              </Text>
              {reviewProgress && reviewProgress.chars > 0 && (
                <Text style={styles.reviewProgressText}>
                  ✍️ {reviewProgress.chars}자 생성 중...
                </Text>
              )}
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
                {/* 콘텐츠 변형 토글 (3개) */}
                <View style={styles.themeToggle}>
                  <Text style={styles.themeToggleLabel}>카드 종류</Text>
                  <View style={styles.themeToggleBtns}>
                    {(['V1', 'V2', 'V3'] as const).map(v => (
                      <TouchableOpacity
                        key={v}
                        onPress={() => setCardVariant(v)}
                        style={[styles.themeBtn, cardVariant === v && styles.themeBtnActive]}
                      >
                        <Text style={[styles.themeBtnText, cardVariant === v && styles.themeBtnTextActive]}>
                          {v === 'V1' ? '심플' : v === 'V2' ? '한줄평' : '수익공개'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* 공유 카드 헤더 — 캡처해서 공유하기 좋게 디자인 */}
                {(() => {
                  const heroWon = hand.result === 'won';
                  const villainWon = hand.result === 'lost';
                  const boardArr = hand.board ?? [];

                  // 승자의 베스트 5장 인덱스 — 보드 + 하이라이트할 hole/board 카드 결정
                  // 히어로 승: 히어로 hole 2 + 보드 5 → 베스트 5
                  // 빌런 승 + 카드 공개: 빌런 hole 2 + 보드 5 → 베스트 5
                  // 그 외(폴드 / 빌런 카드 미공개): 단순 매칭 rank만
                  let winnerBest5: Set<number> | null = null;
                  if (heroWon && hand.hero_cards?.length === 2 && boardArr.length >= 3) {
                    winnerBest5 = findBestFiveIndices(hand.hero_cards, boardArr);
                  } else if (villainWon && hand.villain_known && hand.villain_cards?.length === 2 && boardArr.length >= 3) {
                    winnerBest5 = findBestFiveIndices(hand.villain_cards, boardArr);
                  }

                  // 폴백 로직 (winnerBest5 없을 때): 매칭 rank만 하이라이트
                  const heroRanks = new Set((hand.hero_cards ?? []).map(c => c.rank));
                  const villainRanks = new Set((hand.villain_known && hand.villain_cards ? hand.villain_cards : []).map(c => c.rank));
                  const boardRankCount: Record<string, number> = {};
                  boardArr.forEach(c => { boardRankCount[c.rank] = (boardRankCount[c.rank] || 0) + 1; });
                  const isBoardHighlight = (rank: string, idx: number) => {
                    if (winnerBest5) return isInBestFive(winnerBest5, null, idx);
                    return (heroRanks as Set<string>).has(rank) || (villainRanks as Set<string>).has(rank) || (boardRankCount[rank] ?? 0) >= 2;
                  };
                  const isHoleHighlight = (idx: number, isHero: boolean) => {
                    if (!winnerBest5) return false;
                    if (isHero && !heroWon) return false;
                    if (!isHero && !villainWon) return false;
                    return isInBestFive(winnerBest5, idx, null);
                  };

                  return (
                <View ref={shareCardRef} style={styles.reviewShareCard}>
                  <View style={styles.reviewShareHeader}>
                    <Text style={styles.reviewShareLogo}>♠ BluffZone</Text>
                    <Text style={styles.reviewShareSub}>홀덤 알파고 핸드 리뷰</Text>
                  </View>

                  {/* 카드 그리드 — 내 카드 + 빌런 카드 + 보드 (하이라이트) */}
                  <View style={styles.reviewShareCardsRow}>
                    {/* 내 카드 */}
                    {hand.hero_cards && hand.hero_cards.length > 0 && (
                      <View style={styles.reviewShareCardGroup}>
                        <Text style={[styles.reviewShareCardLabel, heroWon && { color: '#10b981' }]}>
                          {heroWon ? '🏆 내 카드' : '내 카드'}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 4 }}>
                          {hand.hero_cards.map((c, i) => {
                            const hl = winnerBest5 ? isHoleHighlight(i, true) : heroWon;
                            return (
                              <View key={i} style={[styles.reviewShareCardItem, hl && styles.reviewShareCardWinner]}>
                                <Text style={[styles.reviewShareCardText, { color: SUIT_COLORS[c.suit] }]}>
                                  {c.rank}{SUIT_SYMBOLS[c.suit]}
                                </Text>
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    )}
                    {/* 빌런 카드 — 오픈된 경우 항상 표시 */}
                    {hand.villain_known && hand.villain_cards && hand.villain_cards.length > 0 ? (
                      <View style={styles.reviewShareCardGroup}>
                        <Text style={[styles.reviewShareCardLabel, villainWon && { color: '#ef4444' }]}>
                          {villainWon ? '🏆 빌런' : '빌런'}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 4 }}>
                          {hand.villain_cards.map((c, i) => {
                            const hl = winnerBest5 ? isHoleHighlight(i, false) : villainWon;
                            return (
                              <View key={i} style={[styles.reviewShareCardItem, hl && styles.reviewShareCardWinner]}>
                                <Text style={[styles.reviewShareCardText, { color: SUIT_COLORS[c.suit] }]}>
                                  {c.rank}{SUIT_SYMBOLS[c.suit]}
                                </Text>
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    ) : (
                      <View style={styles.reviewShareCardGroup}>
                        <Text style={styles.reviewShareCardLabel}>빌런</Text>
                        <View style={{ flexDirection: 'row', gap: 4 }}>
                          <View style={[styles.reviewShareCardItem, { backgroundColor: '#3a3d4a' }]}>
                            <Text style={[styles.reviewShareCardText, { color: '#888' }]}>?</Text>
                          </View>
                          <View style={[styles.reviewShareCardItem, { backgroundColor: '#3a3d4a' }]}>
                            <Text style={[styles.reviewShareCardText, { color: '#888' }]}>?</Text>
                          </View>
                        </View>
                      </View>
                    )}
                  </View>

                  {/* 보드 카드 — 페어/매칭 카드 하이라이트 */}
                  {hand.board && hand.board.length > 0 && (
                    <View style={styles.reviewShareCardGroup}>
                      <Text style={styles.reviewShareCardLabel}>보드</Text>
                      <View style={{ flexDirection: 'row', gap: 4, justifyContent: 'center' }}>
                        {hand.board.map((c, i) => {
                          const hl = isBoardHighlight(c.rank, i);
                          return (
                            <View key={i} style={[styles.reviewShareCardItem, hl && styles.reviewShareCardHighlight]}>
                              <Text style={[styles.reviewShareCardText, { color: SUIT_COLORS[c.suit] }]}>
                                {c.rank}{SUIT_SYMBOLS[c.suit]}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  )}

                  {/* 평점 */}
                  {rating > 0 && (
                    <Text style={styles.reviewShareRating}>
                      {'⭐'.repeat(rating)}{'☆'.repeat(Math.max(0, 5 - rating))}
                    </Text>
                  )}

                  {/* V2: 한 줄 평 */}
                  {cardVariant === 'V2' && r.headline && (
                    <Text style={styles.reviewShareHeadline}>👉 {r.headline}</Text>
                  )}

                  {/* V3: 결과 + 수익 */}
                  {cardVariant === 'V3' && hand.result && (
                    <View style={styles.reviewShareResult}>
                      <Text style={styles.reviewShareResultLabel}>
                        {hand.result === 'won' ? '🏆 승리' : hand.result === 'lost' ? '😢 패배' : hand.result === 'chopped' ? '🤝 분배' : '🚪 폴드'}
                      </Text>
                      {hand.hero_pl != null && (
                        <Text
                          style={[
                            styles.reviewSharePl,
                            { color: hand.hero_pl >= 0 ? '#10b981' : '#ef4444' },
                          ]}
                        >
                          {hand.hero_pl >= 0 ? '+' : ''}{hand.hero_pl.toLocaleString()}원
                        </Text>
                      )}
                    </View>
                  )}

                  <Text style={styles.reviewShareFooter}>bluffzone.kr</Text>
                </View>
                  );
                })()}

                {/* 한 줄 결론 */}
                {r.headline && (
                  <View style={styles.headlineBox}>
                    <Text style={styles.headlineText}>👉 {r.headline}</Text>
                  </View>
                )}

                {/* 추천 vs 실제 라인 비교 — 강화 시각화 */}
                {(r.recommended_line || r.actual_line) && (
                  <View style={styles.compareV2Box}>
                    <Text style={styles.compareV2Title}>🎯 GTO 권장 vs 내 액션</Text>
                    {r.recommended_line ? (
                      <View style={styles.compareV2Good}>
                        <View style={styles.compareV2Header}>
                          <Text style={styles.compareV2HeaderGood}>✅ GTO 권장</Text>
                        </View>
                        <Text style={styles.compareV2Text}>{r.recommended_line}</Text>
                      </View>
                    ) : null}
                    {r.recommended_line && r.actual_line ? (
                      <View style={styles.compareV2Arrow}>
                        <Text style={styles.compareV2ArrowText}>vs</Text>
                      </View>
                    ) : null}
                    {r.actual_line ? (
                      <View style={styles.compareV2Bad}>
                        <View style={styles.compareV2Header}>
                          <Text style={styles.compareV2HeaderBad}>❌ 내 액션</Text>
                        </View>
                        <Text style={styles.compareV2Text}>{r.actual_line}</Text>
                      </View>
                    ) : null}
                    {r.ev_note ? (
                      <View style={styles.compareV2EvBadge}>
                        <Text style={styles.compareV2EvLabel}>💰 EV 영향</Text>
                        <Text style={styles.compareV2EvValue}>{r.ev_note}</Text>
                      </View>
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

                {/* 공유 + 다시 분석 버튼 — 가로 배치 */}
                <View style={styles.reviewActionsRow}>
                  <TouchableOpacity
                    onPress={() => handleShareReview(r)}
                    style={styles.reviewShareBtn}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.reviewShareBtnText}>📤 공유</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleRequestReview(true)}
                    disabled={isReviewing}
                    style={styles.reviewRetryBtn}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.reviewRetryText}>다시 분석</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.reviewBrandFooter}>
                  💡 친구에게 공유 → bluffzone.kr 에서 무료로 사용
                </Text>
              </View>
            );
          })()}

          {/* 포커 용어 사전 (전문용어 풀이) */}
          <View style={styles.glossary}>
            <Text style={styles.glossaryTitle}>📖 용어 풀이</Text>
            <Text style={styles.glossaryItem}>
              <Text style={styles.glossaryTerm}>EV (Expected Value)</Text> — 기댓값. 이 결정을 무한히 반복했을 때 평균적으로 얼마를 따거나 잃는지. +EV는 장기적으로 이득, -EV는 손해.
            </Text>
            <Text style={styles.glossaryItem}>
              <Text style={styles.glossaryTerm}>ICM (Independent Chip Model)</Text> — 토너 칩의 실제 상금 가치를 계산하는 모델. 입상권 근처에서는 칩EV(+)인 콜이 $EV(-)일 수 있어 더 보수적으로 플레이.
            </Text>
            <Text style={styles.glossaryItem}>
              <Text style={styles.glossaryTerm}>SPR (Stack-to-Pot Ratio)</Text> — 유효 스택 ÷ 팟 사이즈. 낮으면(&lt;4) 톱페어로도 올인 가능, 높으면(&gt;10) 넛츠/세트급 아니면 보수적.
            </Text>
            <Text style={styles.glossaryItem}>
              <Text style={styles.glossaryTerm}>GTO (Game Theory Optimal)</Text> — 게임 이론상 최적 전략. 빌런이 어떻게 플레이해도 손해 안 보는 균형점.
            </Text>
            <Text style={styles.glossaryItem}>
              <Text style={styles.glossaryTerm}>푸시폴드</Text> — 단스택(보통 ≤25bb)에서 사용하는 단순화 전략. "올인 vs 폴드" 두 가지로만 결정.
            </Text>
            <Text style={styles.glossaryItem}>
              <Text style={styles.glossaryTerm}>BB (Big Blind)</Text> — 빅 블라인드. 토너에서는 스택 크기를 BB 단위로 표현 (예: 12bb = 빅 블라인드의 12배).
            </Text>
          </View>
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
  gtoLinkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.base,
    marginVertical: spacing.sm,
    backgroundColor: `${colors.primary}11`,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: `${colors.primary}55`,
  },
  gtoLinkEmoji: { fontSize: 28 },
  gtoLinkTitle: { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.primary },
  gtoLinkDesc: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  gtoLinkArrow: { fontSize: 24, color: colors.primary, fontWeight: fontWeight.bold },
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
  reviewPendingBig: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    backgroundColor: `${colors.primary}11`,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: `${colors.primary}55`,
    gap: spacing.md,
  },
  reviewPendingBigTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    textAlign: 'center',
  },
  reviewPendingBigSub: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: fontSize.sm * 1.6,
  },
  reviewProgressText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.semibold,
    fontFamily: 'monospace',
  },
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
  glossary: {
    marginTop: spacing.lg,
    paddingTop: spacing.base,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    gap: 8,
  },
  glossaryTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
    marginBottom: 4,
  },
  glossaryItem: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 16,
  },
  glossaryTerm: {
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  reviewRetryBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.button, borderWidth: 1, borderColor: colors.line },
  reviewRetryText: { fontSize: fontSize.sm, color: colors.textMuted, fontWeight: fontWeight.medium },
  reviewActionsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  reviewShareBtn: { flex: 1, backgroundColor: colors.primary, paddingVertical: 10, borderRadius: radius.button, alignItems: 'center' },
  reviewShareBtnText: { fontSize: fontSize.sm, color: colors.bg, fontWeight: fontWeight.bold },
  reviewBrandFooter: { fontSize: fontSize.xs, color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm, fontStyle: 'italic' },

  // 공유 카드 헤더 (캡처용) — A: 다크 주황 (기본)
  reviewShareCard: {
    backgroundColor: '#1a1d29',
    borderRadius: radius.card,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.primary,
    gap: spacing.sm,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  // V2/V3 추가 표시 영역
  reviewShareNote: { fontSize: fontSize.xs, color: colors.textMuted, fontStyle: 'italic' },
  reviewShareResult: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: radius.sm,
  },
  reviewShareResultLabel: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
  reviewSharePl: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  // 디자인 토글
  themeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  themeToggleLabel: { fontSize: fontSize.xs, color: colors.textMuted, fontWeight: fontWeight.medium },
  themeToggleBtns: { flexDirection: 'row', gap: 4 },
  themeBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  themeBtnActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}22` },
  themeBtnText: { fontSize: 10, color: colors.textMuted, fontWeight: fontWeight.medium },
  themeBtnTextActive: { color: colors.primary, fontWeight: fontWeight.bold },
  reviewShareHeader: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  reviewShareLogo: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.primary },
  reviewShareSub: { fontSize: fontSize.sm, color: colors.textMuted, fontWeight: fontWeight.semibold },
  reviewShareCardsRow: { flexDirection: 'row', gap: spacing.lg, marginVertical: 4 },
  reviewShareCardGroup: { alignItems: 'center', gap: 4 },
  reviewShareCardLabel: { fontSize: fontSize.xs, color: colors.textMuted, fontWeight: fontWeight.semibold },
  reviewShareCardItem: { backgroundColor: colors.surface, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, borderWidth: 1, borderColor: colors.line, minWidth: 32, alignItems: 'center' },
  reviewShareCardHighlight: { borderWidth: 2, borderColor: '#fbbf24', backgroundColor: '#fbbf2422' },
  reviewShareCardWinner: { borderWidth: 2, borderColor: '#10b981', backgroundColor: '#10b98122' },
  reviewShareHeadline: {
    fontSize: fontSize.sm,
    color: colors.text,
    textAlign: 'center',
    fontWeight: fontWeight.semibold,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  reviewShareCardText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  reviewShareRating: { fontSize: 18, letterSpacing: 2 },
  reviewShareFooter: { fontSize: fontSize.xs, color: colors.textMuted, fontWeight: fontWeight.semibold },

  // GTO 권장 vs 내 액션 비교 — 강화 시각화
  compareV2Box: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.line,
  },
  compareV2Title: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: 4,
  },
  compareV2Good: {
    backgroundColor: `${colors.success}15`,
    borderWidth: 1.5,
    borderColor: colors.success,
    borderRadius: radius.sm,
    padding: spacing.sm,
    gap: 4,
  },
  compareV2Bad: {
    backgroundColor: `${colors.danger}15`,
    borderWidth: 1.5,
    borderColor: colors.danger,
    borderRadius: radius.sm,
    padding: spacing.sm,
    gap: 4,
  },
  compareV2Header: { flexDirection: 'row', alignItems: 'center' },
  compareV2HeaderGood: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.success, letterSpacing: 0.5 },
  compareV2HeaderBad: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.danger, letterSpacing: 0.5 },
  compareV2Text: {
    fontSize: fontSize.base,
    color: colors.text,
    fontWeight: fontWeight.medium,
    lineHeight: fontSize.base * 1.5,
  },
  compareV2Arrow: { alignItems: 'center', paddingVertical: 2 },
  compareV2ArrowText: { fontSize: fontSize.xs, color: colors.textMuted, fontWeight: fontWeight.bold, letterSpacing: 1 },
  compareV2EvBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: `${colors.warning}22`,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 4,
    marginTop: 4,
  },
  compareV2EvLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.warning,
  },
  compareV2EvValue: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  reviewContent: { fontSize: fontSize.sm, color: colors.text, lineHeight: 20, marginTop: spacing.sm },
  reviewedAt: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 4 },
});

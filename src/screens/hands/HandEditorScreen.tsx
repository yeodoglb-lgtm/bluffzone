import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import type { StackScreenProps } from '@react-navigation/stack';
import { colors, spacing, fontSize, fontWeight, radius } from '../../theme';
import type { HandsStackParamList } from '../../navigation/types';
import { RANKS, SUITS, STREETS, ACTIONS, RESULT_TYPES, SUIT_COLORS, SUIT_SYMBOLS } from '../../constants/poker';
import type { Card, HandAction, GameType, Position9Max, ResultType, Street, Action } from '../../constants/poker';
import { useHand, useCreateHand, useUpdateHand } from '../../hooks/useHands';
import { useAuthStore } from '../../store/authStore';

// ── 색상 ──────────────────────────────────────────────────────────────────────
const HERO_COLOR = '#3b82f6';
const VILLAIN_COLORS = ['#ef4444', '#22c55e', '#a855f7'] as const;

const EDITOR_GAME_TYPES: { label: string; value: GameType }[] = [
  { label: 'NLH', value: 'NLH' },
  { label: 'Tournament', value: 'Tournament' },
  { label: '기타', value: 'Mixed' },
];

// ── 테이블 레이아웃 (360×355 컨테이너) ──────────────────────────────────────
// 그룹 크기: 56×90. dir=up → 카드(top=0)→뱃지(40)→칩(66). dir=down → 칩(0)→뱃지(26)→카드(52)
// 인접 좌석 간 x 겹침이 있을 경우 y간격 ≥90 보장
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

// ── 타입 ──────────────────────────────────────────────────────────────────────
type CardTarget = 'hero' | 'v0' | 'v1' | 'v2' | 'board';
type TableMode  = 'hero' | 'v0' | 'v1' | 'v2';
type VillainState = { pos: Position9Max | null; cards: Card[]; cardsKnown: boolean; name: string };
const emptyVillain = (): VillainState => ({ pos: null, cards: [], cardsKnown: false, name: '' });
type Props = StackScreenProps<HandsStackParamList, 'HandEditor'>;

// ── 미니 카드 ────────────────────────────────────────────────────────────────
function MiniCard({ card, faceDown }: { card?: Card; faceDown?: boolean }) {
  if (faceDown || !card) {
    return <View style={mc.back}><View style={mc.backInner} /></View>;
  }
  return (
    <View style={mc.card}>
      <Text style={[mc.rank, { color: SUIT_COLORS[card.suit] }]}>{card.rank}</Text>
      <Text style={[mc.suit, { color: SUIT_COLORS[card.suit] }]}>{SUIT_SYMBOLS[card.suit]}</Text>
    </View>
  );
}
const mc = StyleSheet.create({
  card:      { width: 40, height: 54, backgroundColor: '#fff', borderRadius: 6, borderWidth: 0.5, borderColor: '#bbb', alignItems: 'center', justifyContent: 'center' },
  back:      { width: 40, height: 54, backgroundColor: '#1a56a0', borderRadius: 6, borderWidth: 0.5, borderColor: '#1245a0', alignItems: 'center', justifyContent: 'center' },
  backInner: { width: 29, height: 40, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)', borderRadius: 3 },
  rank:      { fontSize: 17, fontWeight: 'bold', lineHeight: 19 },
  suit:      { fontSize: 16, lineHeight: 17 },
});

// ── 카드 피커 ────────────────────────────────────────────────────────────────
function CardPicker({ onSelect, usedCards }: { onSelect: (c: Card) => void; usedCards: Card[] }) {
  const [rank, setRank] = useState<string | null>(null);
  const used = new Set(usedCards.map(c => `${c.rank}${c.suit}`));
  if (!rank) {
    return (
      <View style={styles.pickerBox}>
        <Text style={styles.pickerLabel}>랭크 선택</Text>
        <View style={styles.pickerRow}>
          {RANKS.map(r => (
            <TouchableOpacity key={r} style={styles.pickerChip} onPress={() => setRank(r)} activeOpacity={0.7}>
              <Text style={styles.pickerChipText}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }
  return (
    <View style={styles.pickerBox}>
      <Text style={styles.pickerLabel}>슈트 선택 ({rank})</Text>
      <View style={styles.pickerRow}>
        {SUITS.map(s => {
          const k = `${rank}${s}`, isUsed = used.has(k);
          return (
            <TouchableOpacity key={s} style={[styles.pickerChip, isUsed && styles.pickerChipDisabled]}
              onPress={() => { if (!isUsed) { onSelect({ rank: rank as Card['rank'], suit: s }); setRank(null); } }}
              activeOpacity={0.7} disabled={isUsed}>
              <Text style={[styles.pickerChipText, { color: SUIT_COLORS[s] }, isUsed && { opacity: 0.3 }]}>{SUIT_SYMBOLS[s]}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <TouchableOpacity onPress={() => setRank(null)}><Text style={styles.pickerBack}>← 랭크 다시 선택</Text></TouchableOpacity>
    </View>
  );
}

// ── 서브 컴포넌트 ─────────────────────────────────────────────────────────────
function Chip({ label, selected, onPress, color }: { label: string; selected: boolean; onPress: () => void; color?: string }) {
  const ac = color ?? colors.primary;
  return (
    <TouchableOpacity style={[styles.chip, selected && { backgroundColor: ac, borderColor: ac }]} onPress={onPress} activeOpacity={0.7}>
      <Text style={[styles.chipText, selected && { color: colors.text }]}>{label}</Text>
    </TouchableOpacity>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>;
}
function Label({ text }: { text: string }) {
  return <Text style={styles.label}>{text}</Text>;
}
function CardBadge({ card, onRemove }: { card: Card; onRemove?: () => void }) {
  const inner = (
    <View style={styles.cardBadge}>
      <Text style={[styles.cardBadgeText, { color: SUIT_COLORS[card.suit] }]}>{card.rank}{SUIT_SYMBOLS[card.suit]}</Text>
      {onRemove && <Text style={styles.cardRemoveX}>×</Text>}
    </View>
  );
  return onRemove ? <TouchableOpacity onPress={onRemove} activeOpacity={0.7}>{inner}</TouchableOpacity> : inner;
}
function ActionRow({ action, villainNames, activeVillainCount, onChange, onRemove }: {
  action: HandAction; villainNames: [string, string, string]; activeVillainCount: number;
  onChange: (p: Partial<HandAction>) => void; onRemove: () => void;
}) {
  const opts = ['나', ...Array.from({ length: activeVillainCount }, (_, i) => villainNames[i] || `빌런 ${i + 1}`)];
  const cur = (action.actor as string) || '나';
  const idx = opts.indexOf(cur);
  function actorColor(a: string) {
    if (a === '나') return HERO_COLOR;
    const vi = opts.indexOf(a) - 1;
    return VILLAIN_COLORS[vi >= 0 ? vi : 0];
  }
  const ac = actorColor(cur);
  return (
    <View style={styles.actionRow}>
      <TouchableOpacity style={[styles.actorChip, { borderColor: ac }]} onPress={() => onChange({ actor: opts[(idx + 1) % opts.length] as any })}>
        <Text style={[styles.actorText, { color: ac }]}>{cur}</Text>
      </TouchableOpacity>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.actionChips}>
        {ACTIONS.map(a => (
          <TouchableOpacity key={a} style={[styles.actionChip, action.action === a && styles.actionChipSelected]} onPress={() => onChange({ action: a as Action })}>
            <Text style={[styles.actionChipText, action.action === a && styles.actionChipTextSelected]}>{a}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {(['bet', 'raise', 'call', 'allin'] as Action[]).includes(action.action) && (
        <TextInput style={styles.amountInput} placeholder="금액" placeholderTextColor={colors.textMuted}
          keyboardType="numeric" value={action.amount != null ? String(action.amount) : ''}
          onChangeText={v => onChange({ amount: v ? Number(v) : undefined })} />
      )}
      <TouchableOpacity onPress={onRemove} style={styles.removeBtn}><Text style={styles.removeBtnText}>×</Text></TouchableOpacity>
    </View>
  );
}

// ── 메인 화면 ────────────────────────────────────────────────────────────────
export default function HandEditorScreen({ navigation, route }: Props) {
  const { handId, sessionId } = route.params ?? {};
  const { session } = useAuthStore();
  const userId = session?.user.id ?? 'dev-user';
  const { data: existingHand, isLoading: loadingHand } = useHand(handId);
  const createHand = useCreateHand();
  const updateHand = useUpdateHand();

  const [gameType, setGameType] = useState<GameType>('NLH');
  const [heroPos, setHeroPos] = useState<Position9Max | null>(null);
  const [villains, setVillains] = useState<[VillainState, VillainState, VillainState]>([emptyVillain(), emptyVillain(), emptyVillain()]);
  const [heroCards, setHeroCards] = useState<Card[]>([]);
  const [board, setBoard] = useState<Card[]>([]);
  const [actions, setActions] = useState<HandAction[]>([]);
  const [result, setResult] = useState<ResultType | null>(null);
  const [potSize, setPotSize] = useState('');
  const [heroPl, setHeroPl] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!existingHand) return;
    setGameType(existingHand.game_type);
    setHeroPos(existingHand.hero_position);
    setHeroCards(existingHand.hero_cards ?? []);
    setBoard(existingHand.board ?? []);
    setActions(existingHand.actions ?? []);
    setResult(existingHand.result);
    setPotSize(existingHand.pot_size != null ? String(existingHand.pot_size) : '');
    setHeroPl(existingHand.hero_pl != null ? String(existingHand.hero_pl) : '');
    setNote(existingHand.note ?? '');
    const vd = (existingHand as any).villain_data;
    if (Array.isArray(vd) && vd.length > 0) {
      const loaded: [VillainState, VillainState, VillainState] = [emptyVillain(), emptyVillain(), emptyVillain()];
      vd.slice(0, 3).forEach((v: any, i: number) => {
        loaded[i] = { pos: v.pos ?? null, cards: v.cards ?? [], cardsKnown: v.cardsKnown ?? false, name: v.name ?? '' };
      });
      setVillains(loaded);
    } else if (existingHand.villain_position) {
      setVillains([{ pos: existingHand.villain_position, cards: existingHand.villain_cards ?? [], cardsKnown: existingHand.villain_known, name: '' }, emptyVillain(), emptyVillain()]);
    }
  }, [existingHand]);

  const allUsedCards = [...heroCards, ...board, ...villains.flatMap(v => v.cards)];
  const activeVillainCount = villains.filter(v => v.pos !== null).length;
  const villainNames: [string, string, string] = [villains[0].name, villains[1].name, villains[2].name];

  async function handleSave() {
    setSaving(true);
    try {
      const av = villains.filter(v => v.pos);
      const payload = {
        user_id: userId, session_id: sessionId ?? null,
        played_at: existingHand?.played_at ?? new Date().toISOString(),
        game_type: gameType, stakes: existingHand?.stakes ?? null, hero_position: heroPos,
        villain_position: villains[0].pos, villain_known: villains[0].cardsKnown,
        villain_cards: villains[0].cardsKnown ? villains[0].cards : null,
        villain_data: av.map(v => ({ pos: v.pos, cards: v.cardsKnown ? v.cards : [], cardsKnown: v.cardsKnown, name: v.name })),
        hero_cards: heroCards, board: board.length > 0 ? board : null,
        actions, result,
        pot_size: potSize ? Number(potSize) : null, hero_pl: heroPl ? Number(heroPl) : null,
        note: note.trim() || null, raw_voice_text: null,
        review_status: 'none' as const, review: null, reviewed_at: null, review_model: null, share_id: null, is_public: false,
      };
      if (handId) {
        const u = await updateHand.mutateAsync({ id: handId, data: payload });
        navigation.navigate('HandDetail', { handId: u.id });
      } else {
        const c = await createHand.mutateAsync(payload);
        navigation.navigate('HandDetail', { handId: c.id });
      }
    } catch (err: any) {
      Alert.alert('저장 실패', err?.message ?? '알 수 없는 오류');
    } finally { setSaving(false); }
  }

  if (handId && loadingHand) {
    return <SafeAreaView style={styles.container} edges={['top']}><View style={styles.center}><ActivityIndicator color={colors.primary} /></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><Text style={styles.backText}>←</Text></TouchableOpacity>
        <Text style={styles.title}>{handId ? '핸드 편집' : '핸드 기록'}</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Section title="기본 정보">
          <Label text="게임 타입" />
          <View style={styles.chipRow}>
            {EDITOR_GAME_TYPES.map(g => <Chip key={g.value} label={g.label} selected={gameType === g.value} onPress={() => setGameType(g.value)} />)}
          </View>
        </Section>

        <Section title="포지션 & 카드">
          <PokerTableEditor
            heroPos={heroPos} onHeroSelect={setHeroPos}
            villains={villains} onVillainsChange={setVillains}
            heroCards={heroCards} onHeroCardsChange={setHeroCards}
            board={board} onBoardChange={setBoard}
            allUsedCards={allUsedCards}
          />
        </Section>

        <Section title="액션 (선택)">
          {STREETS.map(street => (
            <View key={street} style={styles.streetSection}>
              <Text style={styles.streetTitle}>{street.toUpperCase()}</Text>
              {actions.map((a, idx) => {
                if (a.street !== street) return null;
                return (
                  <ActionRow key={idx} action={a} villainNames={villainNames} activeVillainCount={activeVillainCount}
                    onChange={patch => setActions(prev => prev.map((x, i) => i === idx ? { ...x, ...patch } : x))}
                    onRemove={() => setActions(prev => prev.filter((_, i) => i !== idx))}
                  />
                );
              })}
              <TouchableOpacity style={styles.addActionBtn}
                onPress={() => setActions(prev => [...prev, { street, actor: '나' as any, action: 'check' }])}>
                <Text style={styles.addActionText}>+ 액션 추가</Text>
              </TouchableOpacity>
            </View>
          ))}
        </Section>

        <Section title="결과">
          <View style={styles.chipRow}>
            {RESULT_TYPES.map(r => (
              <Chip key={r}
                label={r === 'won' ? '이겼다' : r === 'lost' ? '졌다' : r === 'chopped' ? '반반' : '폴드'}
                selected={result === r} onPress={() => setResult(p => p === r ? null : r)}
                color={r === 'won' ? colors.success : r === 'lost' ? colors.danger : r === 'chopped' ? colors.warning : colors.textMuted}
              />
            ))}
          </View>
          <Label text="팟 사이즈" />
          <TextInput style={styles.input} placeholder="0" placeholderTextColor={colors.textMuted} keyboardType="numeric" value={potSize} onChangeText={setPotSize} />
          <Label text="손익" />
          <TextInput style={styles.input} placeholder="예: -500, +1200" placeholderTextColor={colors.textMuted} keyboardType="numeric" value={heroPl} onChangeText={setHeroPl} />
        </Section>

        <Section title="메모">
          <View style={styles.noteRow}>
            <TextInput style={[styles.input, styles.textArea, { flex: 1 }]}
              placeholder="핸드에 대한 메모를 입력하세요" placeholderTextColor={colors.textMuted}
              multiline numberOfLines={4} textAlignVertical="top" value={note} onChangeText={setNote} />
            <TouchableOpacity style={styles.micBtn}
              onPress={() => Alert.alert('음성 입력', Platform.OS === 'web' ? '웹에서는 텍스트로 입력해주세요.' : '네이티브 앱에서 지원됩니다.')}>
              <Text style={styles.micIcon}>🎙</Text>
            </TouchableOpacity>
          </View>
        </Section>

        <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleSave} disabled={saving} activeOpacity={0.8}>
          {saving ? <ActivityIndicator color={colors.text} /> : <Text style={styles.saveBtnText}>저장</Text>}
        </TouchableOpacity>
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── 포커 테이블 에디터 ────────────────────────────────────────────────────────
function PokerTableEditor({
  heroPos, onHeroSelect, villains, onVillainsChange,
  heroCards, onHeroCardsChange, board, onBoardChange, allUsedCards,
}: {
  heroPos: Position9Max | null; onHeroSelect: (p: Position9Max | null) => void;
  villains: [VillainState, VillainState, VillainState]; onVillainsChange: (v: [VillainState, VillainState, VillainState]) => void;
  heroCards: Card[]; onHeroCardsChange: (c: Card[]) => void;
  board: Card[]; onBoardChange: (c: Card[]) => void; allUsedCards: Card[];
}) {
  const [mainMode, setMainMode] = useState<'pos' | 'card'>('pos');
  const [posSubMode, setPosSubMode] = useState<TableMode>('hero');
  const [cardTarget, setCardTarget] = useState<CardTarget | null>(null);

  const POS_TABS = [
    { key: 'hero' as TableMode, label: '내 포지션', color: HERO_COLOR },
    { key: 'v0'   as TableMode, label: villains[0].name || '빌런 1', color: VILLAIN_COLORS[0] },
    { key: 'v1'   as TableMode, label: villains[1].name || '빌런 2', color: VILLAIN_COLORS[1] },
    { key: 'v2'   as TableMode, label: villains[2].name || '빌런 3', color: VILLAIN_COLORS[2] },
  ];

  function getDisplayName(idx: number) { return villains[idx].name || `빌런 ${idx + 1}`; }

  function getSeatInfo(pos: Position9Max) {
    if (heroPos === pos) return { player: '나', color: HERO_COLOR, cards: heroCards, target: 'hero' as CardTarget, cardsKnown: true };
    const vi = villains.findIndex(v => v.pos === pos);
    if (vi >= 0) return { player: getDisplayName(vi), color: VILLAIN_COLORS[vi], cards: villains[vi].cardsKnown ? villains[vi].cards : [], target: `v${vi}` as CardTarget, cardsKnown: villains[vi].cardsKnown };
    return null;
  }

  // 포지션 칩 탭 → 포지션 배정
  function handleSeatPosPress(pos: Position9Max) {
    if (posSubMode === 'hero') {
      onHeroSelect(heroPos === pos ? null : pos);
    } else {
      const idx = parseInt(posSubMode[1]);
      const next = [...villains] as [VillainState, VillainState, VillainState];
      next[idx] = { ...next[idx], pos: next[idx].pos === pos ? null : pos };
      onVillainsChange(next);
    }
  }

  // 카드 영역 탭 → 항상 카드 입력 (모드 무관)
  function handleSeatCardPress(pos: Position9Max) {
    const info = getSeatInfo(pos);
    if (!info) return;
    setMainMode('card');
    setCardTarget(ct => ct === info.target ? null : info.target);
  }

  function addCard(card: Card) {
    if (!cardTarget) return;
    if (cardTarget === 'hero' && heroCards.length < 2) { onHeroCardsChange([...heroCards, card]); }
    else if (cardTarget === 'board' && board.length < 5) { onBoardChange([...board, card]); }
    else if (cardTarget === 'v0' || cardTarget === 'v1' || cardTarget === 'v2') {
      const idx = parseInt(cardTarget[1]);
      if (villains[idx].cards.length < 2) {
        const next = [...villains] as [VillainState, VillainState, VillainState];
        next[idx] = { ...next[idx], cards: [...next[idx].cards, card] };
        onVillainsChange(next);
      }
    }
    setCardTarget(null);
  }

  function removeCard(target: CardTarget, i: number) {
    if (target === 'hero') onHeroCardsChange(heroCards.filter((_, j) => j !== i));
    else if (target === 'board') onBoardChange(board.filter((_, j) => j !== i));
    else {
      const vi = parseInt(target[1]);
      const next = [...villains] as [VillainState, VillainState, VillainState];
      next[vi] = { ...next[vi], cards: next[vi].cards.filter((_, j) => j !== i) };
      onVillainsChange(next);
    }
  }

  const targetCards = cardTarget === 'hero' ? heroCards : cardTarget === 'board' ? board
    : cardTarget === 'v0' ? villains[0].cards : cardTarget === 'v1' ? villains[1].cards : cardTarget === 'v2' ? villains[2].cards : [];
  const targetMax = cardTarget === 'board' ? 5 : 2;
  const targetLabel = cardTarget === 'hero' ? '내 카드' : cardTarget === 'board' ? '보드'
    : cardTarget ? `${getDisplayName(parseInt(cardTarget[1]))} 카드` : '';

  return (
    <View>
      {/* 메인 모드 토글 */}
      <View style={ts.mainModeRow}>
        <TouchableOpacity style={[ts.mainModeBtn, mainMode === 'pos' && ts.mainModeBtnActive]}
          onPress={() => { setMainMode('pos'); setCardTarget(null); }}>
          <Text style={[ts.mainModeBtnText, mainMode === 'pos' && ts.mainModeBtnActiveText]}>📍 포지션 설정</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[ts.mainModeBtn, mainMode === 'card' && ts.mainModeBtnActive]}
          onPress={() => { setMainMode('card'); setCardTarget(null); }}>
          <Text style={[ts.mainModeBtnText, mainMode === 'card' && ts.mainModeBtnActiveText]}>🃏 카드 입력</Text>
        </TouchableOpacity>
      </View>

      {/* 포지션 서브 탭 */}
      {mainMode === 'pos' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }}>
          <View style={ts.posTabRow}>
            {POS_TABS.map(t => (
              <TouchableOpacity key={t.key}
                style={[ts.posTab, posSubMode === t.key && { backgroundColor: t.color, borderColor: t.color }]}
                onPress={() => setPosSubMode(t.key)}>
                <Text style={[ts.posTabText, posSubMode === t.key && { color: '#fff', fontWeight: fontWeight.bold }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}

      {mainMode === 'card' && <Text style={ts.hint}>배정된 자리 또는 보드 영역을 탭하여 카드를 입력하세요</Text>}

      {/* ── 포커 테이블 ── */}
      <View style={ts.tableWrap}>
        <View style={ts.tableContainer}>
          {/* 오발 */}
          <View style={ts.tableOval} />

          {/* 보드 카드 영역 */}
          <TouchableOpacity
            style={[ts.boardArea, cardTarget === 'board' && ts.boardAreaActive]}
            onPress={() => {
              if (mainMode === 'card') setCardTarget(ct => ct === 'board' ? null : 'board');
            }}
            activeOpacity={mainMode === 'card' ? 0.7 : 1}
          >
            {board.length === 0 ? (
              <Text style={ts.boardHint}>{mainMode === 'card' ? '보드 탭' : 'BOARD'}</Text>
            ) : (
              <View style={{ flexDirection: 'row', gap: 3 }}>
                {board.map((c, i) => <MiniCard key={i} card={c} />)}
              </View>
            )}
          </TouchableOpacity>

          {/* 딜러 칩 */}
          <View style={ts.dealerChip}><Text style={ts.dealerText}>D</Text></View>

          {/* 시트 — 카드 영역·포지션칩 독립 TouchableOpacity */}
          {SEAT_DEFS.map(({ pos, cx, cy, dir }) => {
            const info = getSeatInfo(pos);
            const isCardActive = info && cardTarget === info.target;

            // 카드: 40×54, 두 카드 row = 84px (gap 4)
            // UP: 카드(h=54) → 뱃지(top=58,h=22) → 칩(top=84,h=22), 전체높이=110
            // DOWN: 칩(h=22) → 뱃지(top=26,h=22) → 카드(top=52,h=54), 전체높이=110
            const groupH    = 110;
            const groupW    = 90;
            const groupTop  = dir === 'up' ? cy - 95 : cy - 11;
            const groupLeft = cx - 45;

            const chipLocalTop  = dir === 'up' ? 84 : 0;
            const badgeLocalTop = dir === 'up' ? 58 : 26;
            const cardsLocalTop = dir === 'up' ? 0  : 52;

            return (
              <View
                key={pos}
                style={[ts.seatGroup, { left: groupLeft, top: groupTop, width: groupW, height: groupH }]}
              >
                {/* 카드 영역 — 항상 탭 가능, 카드 입력 열기 */}
                {info ? (
                  <TouchableOpacity
                    style={[ts.cardsRowAbs, { top: cardsLocalTop, left: 2 }, isCardActive && ts.activeGlow]}
                    onPress={() => handleSeatCardPress(pos)}
                    activeOpacity={0.7}
                  >
                    {info.cards.length > 0
                      ? info.cards.map((c, i) => <MiniCard key={i} card={c} />)
                      : [0, 1].map(i => <MiniCard key={i} faceDown />)
                    }
                  </TouchableOpacity>
                ) : null}
                {/* 플레이어 뱃지 */}
                {info && (
                  <View style={[ts.playerBadge, { top: badgeLocalTop, left: 4, backgroundColor: info.color }]}>
                    <Text style={ts.playerBadgeText} numberOfLines={1}>{info.player}</Text>
                  </View>
                )}
                {/* 포지션 칩 — 포지션 배정 */}
                <TouchableOpacity
                  style={[ts.posChip, { top: chipLocalTop, left: 4 }, info && { borderColor: info.color }]}
                  onPress={() => handleSeatPosPress(pos)}
                  activeOpacity={0.75}
                >
                  <Text style={[ts.posChipText, info && { color: info.color }]}>{pos}</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </View>

      {/* 카드 피커 */}
      {mainMode === 'card' && cardTarget && (
        <View style={ts.pickerArea}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={ts.pickerTitle}>{targetLabel} ({targetCards.length}/{targetMax})</Text>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {targetCards.map((c, i) => (
                <TouchableOpacity key={i} onPress={() => removeCard(cardTarget, i)} activeOpacity={0.7}>
                  <View style={styles.cardBadge}>
                    <Text style={[styles.cardBadgeText, { color: SUIT_COLORS[c.suit] }]}>{c.rank}{SUIT_SYMBOLS[c.suit]}</Text>
                    <Text style={styles.cardRemoveX}>×</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          {targetCards.length < targetMax && <CardPicker onSelect={addCard} usedCards={allUsedCards} />}
        </View>
      )}

      {/* 빌런 이름 편집 + 카드 공개 토글 */}
      {villains.map((v, idx) => {
        if (!v.pos) return null;
        return (
          <View key={idx} style={ts.villainRow}>
            <View style={[ts.villainColorBar, { backgroundColor: VILLAIN_COLORS[idx] }]} />
            <View style={{ flex: 1, gap: 6 }}>
              <View style={ts.villainNameRow}>
                <Text style={[ts.villainLabel, { color: VILLAIN_COLORS[idx] }]}>{v.pos}</Text>
                <TextInput
                  style={ts.villainNameInput}
                  placeholder={`빌런 ${idx + 1} 이름 (선택)`}
                  placeholderTextColor={colors.textMuted}
                  value={v.name}
                  onChangeText={text => {
                    const next = [...villains] as [VillainState, VillainState, VillainState];
                    next[idx] = { ...next[idx], name: text };
                    onVillainsChange(next);
                  }}
                />
              </View>
              <View style={ts.villainToggle}>
                <Text style={ts.villainToggleLabel}>카드 공개?</Text>
                <Switch value={v.cardsKnown} onValueChange={val => {
                  const next = [...villains] as [VillainState, VillainState, VillainState];
                  next[idx] = { ...next[idx], cardsKnown: val };
                  onVillainsChange(next);
                }} trackColor={{ true: VILLAIN_COLORS[idx] }} thumbColor={colors.text} />
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ── 스타일 ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.base, borderBottomWidth: 1, borderBottomColor: colors.line },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  backText: { fontSize: fontSize.lg, color: colors.text },
  title: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
  scroll: { flex: 1 },
  content: { padding: spacing.md },
  section: { marginBottom: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.base, borderWidth: 1, borderColor: colors.line },
  sectionTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.primary, marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  label: { fontSize: fontSize.xs, color: colors.textMuted, marginBottom: 4, marginTop: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: spacing.sm, paddingVertical: 5, borderRadius: radius.button, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surfaceAlt },
  chipText: { fontSize: fontSize.xs, color: colors.textMuted },
  input: { backgroundColor: colors.surfaceAlt, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, color: colors.text, fontSize: fontSize.base, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, marginTop: 4 },
  textArea: { minHeight: 80, paddingTop: spacing.sm },
  noteRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  micBtn: { width: 44, height: 44, borderRadius: radius.button, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  micIcon: { fontSize: 20 },
  cardBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceAlt, borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 4, borderWidth: 1, borderColor: colors.line, gap: 2 },
  cardBadgeText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  cardRemoveX: { fontSize: fontSize.xs, color: colors.textMuted },
  pickerBox: { marginTop: spacing.sm, backgroundColor: colors.surfaceAlt, borderRadius: radius.sm, padding: spacing.sm, borderWidth: 1, borderColor: colors.line },
  pickerLabel: { fontSize: fontSize.xs, color: colors.textMuted, marginBottom: 6 },
  pickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  pickerChip: { paddingHorizontal: 8, paddingVertical: 5, backgroundColor: colors.surface, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line },
  pickerChipDisabled: { opacity: 0.4 },
  pickerChipText: { fontSize: fontSize.sm, color: colors.text, fontWeight: fontWeight.medium },
  pickerBack: { fontSize: fontSize.xs, color: colors.primary, marginTop: 6 },
  streetSection: { marginBottom: spacing.sm },
  streetTitle: { fontSize: fontSize.xs, color: colors.textMuted, fontWeight: fontWeight.bold, marginBottom: 4, letterSpacing: 0.5 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' },
  actorChip: { paddingHorizontal: spacing.sm, paddingVertical: 4, backgroundColor: colors.surface, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.primary },
  actorText: { fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.medium },
  actionChips: { flexShrink: 1 },
  actionChip: { paddingHorizontal: 8, paddingVertical: 4, backgroundColor: colors.surface, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, marginRight: 4 },
  actionChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  actionChipText: { fontSize: fontSize.xs, color: colors.textMuted },
  actionChipTextSelected: { color: colors.text, fontWeight: fontWeight.medium },
  amountInput: { width: 70, backgroundColor: colors.surfaceAlt, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, color: colors.text, fontSize: fontSize.xs, paddingHorizontal: 6, paddingVertical: 3 },
  removeBtn: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  removeBtnText: { fontSize: fontSize.md, color: colors.danger },
  addActionBtn: { paddingVertical: 4 },
  addActionText: { fontSize: fontSize.xs, color: colors.primary },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radius.button, paddingVertical: spacing.base, alignItems: 'center', marginTop: spacing.sm },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
});

const ts = StyleSheet.create({
  mainModeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  mainModeBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.button, borderWidth: 1, borderColor: colors.line, alignItems: 'center', backgroundColor: colors.surface },
  mainModeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  mainModeBtnText: { fontSize: fontSize.xs, color: colors.textMuted, fontWeight: fontWeight.medium },
  mainModeBtnActiveText: { color: colors.bg, fontWeight: fontWeight.bold },
  posTabRow: { flexDirection: 'row', gap: spacing.xs },
  posTab: { paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, borderRadius: radius.button, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  posTabText: { fontSize: fontSize.xs, color: colors.textMuted, fontWeight: fontWeight.medium },
  hint: { fontSize: fontSize.xs, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.sm },
  tableWrap: { alignItems: 'center', marginBottom: spacing.sm },
  tableContainer: { width: 360, height: 355, position: 'relative' },
  tableOval: { position: 'absolute', left: 60, top: 100, width: 240, height: 150, borderRadius: 999, backgroundColor: '#1a5c2e', borderWidth: 3, borderColor: '#2d8c4a' },
  boardArea: {
    position: 'absolute', left: 100, top: 158, width: 160, height: 44,
    borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    zIndex: 10, overflow: 'visible',
  },
  boardAreaActive: { borderColor: '#fff', borderWidth: 2 },
  boardHint: { fontSize: 9, color: 'rgba(255,255,255,0.5)' },
  dealerChip: { position: 'absolute', left: 222, top: 222, width: 24, height: 24, borderRadius: 12, backgroundColor: '#888', alignItems: 'center', justifyContent: 'center', zIndex: 5 },
  dealerText: { fontSize: 9, color: '#fff', fontWeight: fontWeight.bold },
  // 각 시트 그룹: 독립 TouchableOpacity (올바른 위치와 크기만 커버)
  seatGroup: { position: 'absolute' },
  cardsRowAbs: { position: 'absolute', flexDirection: 'row', gap: 4 },
  activeGlow: { shadowColor: '#fff', shadowOpacity: 0.8, shadowRadius: 4, elevation: 4 },
  playerBadge: { position: 'absolute', width: 48, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  playerBadgeText: { fontSize: 10, color: '#fff', fontWeight: fontWeight.bold },
  posChip: { position: 'absolute', width: 48, height: 22, borderRadius: 8, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  posChipText: { fontSize: 9, color: colors.textMuted, fontWeight: fontWeight.bold },
  pickerArea: { marginTop: spacing.xs, backgroundColor: colors.surfaceAlt, borderRadius: radius.sm, padding: spacing.sm, borderWidth: 1, borderColor: colors.line, marginBottom: spacing.sm },
  pickerTitle: { fontSize: fontSize.xs, color: colors.textMuted },
  // 빌런 이름 편집
  villainRow: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.xs, borderTopWidth: 1, borderTopColor: colors.line, marginTop: spacing.xs },
  villainColorBar: { width: 3, borderRadius: 2 },
  villainNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  villainLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, minWidth: 40 },
  villainNameInput: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, color: colors.text, fontSize: fontSize.sm, paddingHorizontal: spacing.sm, paddingVertical: 5 },
  villainToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  villainToggleLabel: { fontSize: fontSize.xs, color: colors.textMuted },
});

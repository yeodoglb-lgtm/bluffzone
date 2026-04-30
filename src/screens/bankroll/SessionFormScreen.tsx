import { useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { showAlert } from '../../utils/alert';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { StackScreenProps } from '@react-navigation/stack';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Layers, Award } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, radius } from '../../theme';
import { useCreateSession, useUpdateSession } from '../../hooks/useSessions';
import { formatProfit } from '../../utils/currency';
import { today } from '../../utils/date';
import { useSettingsStore } from '../../store/settingsStore';
import type { BankrollStackParamList } from '../../navigation/types';
import { fetchSession } from '../../services/sessions';

type Props = StackScreenProps<BankrollStackParamList, 'SessionForm'>;

// 캐시·토너 양쪽 모두 사용 — Tournament 제거 (상단 토글로 분리됨)
const SESSION_GAME_TYPES = [
  { label: "Hold'em", value: 'NLH' },
  { label: 'Omaha', value: 'PLO' },
  { label: '기타', value: 'Mixed' },
] as const;

const schema = z.object({
  is_tournament: z.boolean(),
  played_on: z.string().min(1, '날짜를 입력하세요'),
  started_at: z.string().nullable(),
  ended_at: z.string().nullable(),
  place_name_snapshot: z.string().nullable(),
  game_type: z.enum(['NLH', 'PLO', 'Mixed']).nullable(),
  stakes: z.string().nullable(),
  buy_in: z.number({ error: '숫자를 입력하세요' }).min(0, '0 이상이어야 합니다'),
  cash_out: z.number({ error: '숫자를 입력하세요' }).min(0, '0 이상이어야 합니다'),
  reentry_count: z.number().int().min(0, '0 이상이어야 합니다'),
  finish_position: z.number().int().min(1, '1 이상이어야 합니다').nullable(),
  note: z.string().nullable(),
});

type FormValues = z.infer<typeof schema>;

export default function SessionFormScreen({ route, navigation }: Props) {
  const { sessionId, date } = route.params;
  const { currency } = useSettingsStore();
  const isEdit = !!sessionId;

  // KRW는 만원 단위 입력 (저장 시 ×10000, 로드 시 ÷10000)
  const isKRW = currency === 'KRW';
  const UNIT = isKRW ? 10000 : 1;

  const createSession = useCreateSession();
  const updateSession = useUpdateSession();

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      is_tournament: false,
      played_on: date ?? today(),
      started_at: null,
      ended_at: null,
      place_name_snapshot: null,
      game_type: null,
      stakes: null,
      buy_in: 0,
      cash_out: 0,
      reentry_count: 0,
      finish_position: null,
      note: null,
    },
  });

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    if (!sessionId) return;
    fetchSession(sessionId).then(session => {
      if (!session) return;
      reset({
        is_tournament: session.is_tournament ?? false,
        played_on: session.played_on,
        started_at: session.started_at,
        ended_at: session.ended_at,
        place_name_snapshot: session.place_name_snapshot,
        // 기존 데이터에 'Tournament' game_type이 있을 수 있음 — Mixed로 매핑
        game_type:
          session.game_type === 'Tournament' || session.game_type === 'PLO5'
            ? 'Mixed'
            : (session.game_type as 'NLH' | 'PLO' | 'Mixed' | null),
        stakes: session.stakes,
        buy_in: session.buy_in / UNIT,
        cash_out: session.cash_out / UNIT,
        reentry_count: session.reentry_count ?? 0,
        finish_position: session.finish_position ?? null,
        note: session.note,
      });
    });
  }, [sessionId, reset, UNIT]);

  const isTournament = watch('is_tournament');
  const buyIn = watch('buy_in') ?? 0;
  const cashOut = watch('cash_out') ?? 0;
  // 미리보기는 실제 금액(×UNIT)으로 표시
  const netProfit = (Number(cashOut) - Number(buyIn)) * UNIT;
  const netColor = netProfit > 0 ? colors.primary : netProfit < 0 ? colors.danger : colors.textMuted;

  function toTimestamp(date: string, time: string | null): string | null {
    if (!time) return null;
    const digits = time.replace(/\D/g, '').padStart(4, '0');
    const hh = digits.slice(0, 2);
    const mm = digits.slice(2, 4);
    const offset = -new Date().getTimezoneOffset();
    const sign = offset >= 0 ? '+' : '-';
    const oh = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0');
    const om = String(Math.abs(offset) % 60).padStart(2, '0');
    return `${date}T${hh}:${mm}:00${sign}${oh}:${om}`;
  }

  async function onSubmit(values: FormValues) {
    try {
      const input = {
        played_on: values.played_on,
        started_at: toTimestamp(values.played_on, values.started_at),
        ended_at: toTimestamp(values.played_on, values.ended_at),
        place_id: null,
        place_name_snapshot: values.place_name_snapshot,
        game_type: values.game_type,
        stakes: values.stakes,
        buy_in: values.buy_in * UNIT,
        cash_out: values.cash_out * UNIT,
        currency,
        note: values.note,
        is_tournament: values.is_tournament,
        reentry_count: values.is_tournament ? values.reentry_count : 0,
        finish_position: values.is_tournament ? values.finish_position : null,
      };

      if (isEdit && sessionId) {
        await updateSession.mutateAsync({ id: sessionId, input });
      } else {
        await createSession.mutateAsync(input);
      }
      navigation.goBack();
    } catch (e: any) {
      showAlert('오류', e?.message ?? JSON.stringify(e) ?? '저장 중 오류가 발생했습니다.');
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>취소</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEdit ? '세션 수정' : '세션 추가'}</Text>
        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <Text style={styles.saveText}>저장</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* 캐시 / 토너 큰 토글 — 가장 상단 */}
        <Controller
          control={control}
          name="is_tournament"
          render={({ field: { value, onChange } }) => (
            <View style={styles.typeToggleRow}>
              <TouchableOpacity
                style={[styles.typeToggleBtn, !value && styles.typeToggleBtnActive]}
                onPress={() => {
                  onChange(false);
                  setValue('reentry_count', 0);
                  setValue('finish_position', null);
                }}
                activeOpacity={0.8}
              >
                <Layers
                  color={!value ? colors.primary : colors.textMuted}
                  size={28}
                  strokeWidth={2}
                />
                <Text style={[styles.typeToggleTitle, !value && styles.typeToggleTitleActive]}>
                  캐시 게임
                </Text>
                <Text style={styles.typeToggleSub}>링게임·홈게임</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeToggleBtn, value && styles.typeToggleBtnActive]}
                onPress={() => onChange(true)}
                activeOpacity={0.8}
              >
                <Award
                  color={value ? colors.primary : colors.textMuted}
                  size={28}
                  strokeWidth={2}
                />
                <Text style={[styles.typeToggleTitle, value && styles.typeToggleTitleActive]}>
                  토너먼트
                </Text>
                <Text style={styles.typeToggleSub}>MTT · SNG · 새틀라이트</Text>
              </TouchableOpacity>
            </View>
          )}
        />

        {/* Net profit preview */}
        <View style={styles.netPreview}>
          <Text style={styles.netLabel}>수익</Text>
          <Text style={[styles.netValue, { color: netColor }]}>
            {formatProfit(netProfit, currency)}
          </Text>
        </View>

        {/* Date */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>날짜</Text>
          <Controller
            control={control}
            name="played_on"
            render={({ field: { value, onBlur, onChange } }) => (
              <TextInput
                style={[styles.input, errors.played_on && styles.inputError]}
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textMuted}
              />
            )}
          />
          {errors.played_on && (
            <Text style={styles.errorText}>{errors.played_on.message}</Text>
          )}
        </View>

        {/* Start / End time */}
        <View style={styles.row}>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={styles.label}>시작 시간</Text>
            <Controller
              control={control}
              name="started_at"
              render={({ field: { value, onBlur, onChange } }) => (
                <TextInput
                  style={styles.input}
                  value={value ?? ''}
                  onBlur={onBlur}
                  onChangeText={v => {
                    const digits = v.replace(/\D/g, '').slice(0, 4);
                    const formatted = digits.length > 2
                      ? `${digits.slice(0, 2)}:${digits.slice(2)}`
                      : digits;
                    onChange(formatted || null);
                  }}
                  placeholder="00:00"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  maxLength={5}
                />
              )}
            />
          </View>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={styles.label}>종료 시간</Text>
            <Controller
              control={control}
              name="ended_at"
              render={({ field: { value, onBlur, onChange } }) => (
                <TextInput
                  style={styles.input}
                  value={value ?? ''}
                  onBlur={onBlur}
                  onChangeText={v => {
                    const digits = v.replace(/\D/g, '').slice(0, 4);
                    const formatted = digits.length > 2
                      ? `${digits.slice(0, 2)}:${digits.slice(2)}`
                      : digits;
                    onChange(formatted || null);
                  }}
                  placeholder="00:00"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  maxLength={5}
                />
              )}
            />
          </View>
        </View>

        {/* Place / Tournament name */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>
            {isTournament ? '장소 또는 토너게임명' : '장소'}
          </Text>
          <Controller
            control={control}
            name="place_name_snapshot"
            render={({ field: { value, onBlur, onChange } }) => (
              <TextInput
                style={styles.input}
                value={value ?? ''}
                onBlur={onBlur}
                onChangeText={v => onChange(v || null)}
                placeholder={
                  isTournament
                    ? '예: 서울 위클리 / 서울 WSOP'
                    : '클럽명 또는 장소'
                }
                placeholderTextColor={colors.textMuted}
              />
            )}
          />
        </View>

        {/* Game type */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>게임 타입</Text>
          <Controller
            control={control}
            name="game_type"
            render={({ field: { value, onChange } }) => (
              <View style={styles.gameTypeRow}>
                {SESSION_GAME_TYPES.map(gt => (
                  <TouchableOpacity
                    key={gt.value}
                    style={[styles.gameTypeBtn, value === gt.value && styles.gameTypeBtnActive]}
                    onPress={() => onChange(value === gt.value ? null : gt.value)}
                  >
                    <Text
                      style={[
                        styles.gameTypeBtnText,
                        value === gt.value && styles.gameTypeBtnTextActive,
                      ]}
                    >
                      {gt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          />
        </View>

        {/* Stakes (캐시 게임만) */}
        {!isTournament && (
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>블라인드</Text>
            <Controller
              control={control}
              name="stakes"
              render={({ field: { value, onBlur, onChange } }) => (
                <TextInput
                  style={styles.input}
                  value={value ?? ''}
                  onBlur={onBlur}
                  onChangeText={v => onChange(v || null)}
                  placeholder="예: 1/2, 2/5 (만원)"
                  placeholderTextColor={colors.textMuted}
                />
              )}
            />
          </View>
        )}

        {/* Buy-in / Cash-out */}
        <View style={styles.row}>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={styles.label}>
              바이인 {isKRW ? <Text style={styles.unitHint}>(만원)</Text> : null}
            </Text>
            {isTournament && (
              <Text style={styles.subHint}>리바이인 금액 모두 포함 기재</Text>
            )}
            <Controller
              control={control}
              name="buy_in"
              render={({ field: { value, onBlur, onChange } }) => (
                <TextInput
                  style={[styles.input, errors.buy_in && styles.inputError]}
                  value={value === 0 ? '' : String(value)}
                  onBlur={onBlur}
                  onChangeText={v => onChange(v === '' ? 0 : Number(v))}
                  placeholder={isKRW ? '예: 20' : '0'}
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                />
              )}
            />
            {errors.buy_in && (
              <Text style={styles.errorText}>{errors.buy_in.message}</Text>
            )}
          </View>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={styles.label}>
              {isTournament ? '상금' : '아웃'} {isKRW ? <Text style={styles.unitHint}>(만원)</Text> : null}
            </Text>
            {isTournament && (
              <Text style={styles.subHint}>입상 시 상금, 아니면 0</Text>
            )}
            <Controller
              control={control}
              name="cash_out"
              render={({ field: { value, onBlur, onChange } }) => (
                <TextInput
                  style={[styles.input, errors.cash_out && styles.inputError]}
                  value={value === 0 ? '' : String(value)}
                  onBlur={onBlur}
                  onChangeText={v => onChange(v === '' ? 0 : Number(v))}
                  placeholder={isKRW ? '예: 23' : '0'}
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                />
              )}
            />
            {errors.cash_out && (
              <Text style={styles.errorText}>{errors.cash_out.message}</Text>
            )}
          </View>
        </View>

        {/* 토너 전용 필드: 리바이인 횟수 + 순위 */}
        {isTournament && (
          <View style={styles.row}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.label}>리바이인 횟수</Text>
              <Controller
                control={control}
                name="reentry_count"
                render={({ field: { value, onBlur, onChange } }) => (
                  <TextInput
                    style={[styles.input, errors.reentry_count && styles.inputError]}
                    value={value === 0 ? '' : String(value)}
                    onBlur={onBlur}
                    onChangeText={v => onChange(v === '' ? 0 : Number(v))}
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                  />
                )}
              />
              {errors.reentry_count && (
                <Text style={styles.errorText}>{errors.reentry_count.message}</Text>
              )}
            </View>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.label}>순위</Text>
              <Controller
                control={control}
                name="finish_position"
                render={({ field: { value, onBlur, onChange } }) => (
                  <TextInput
                    style={[styles.input, errors.finish_position && styles.inputError]}
                    value={value == null ? '' : String(value)}
                    onBlur={onBlur}
                    onChangeText={v => onChange(v === '' ? null : Number(v))}
                    placeholder="예: 8"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                  />
                )}
              />
              {errors.finish_position && (
                <Text style={styles.errorText}>{errors.finish_position.message}</Text>
              )}
            </View>
          </View>
        )}

        {/* Note */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>메모</Text>
          <Controller
            control={control}
            name="note"
            render={({ field: { value, onBlur, onChange } }) => (
              <TextInput
                style={[styles.input, styles.textArea]}
                value={value ?? ''}
                onBlur={onBlur}
                onChangeText={v => onChange(v || null)}
                placeholder="메모를 입력하세요"
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            )}
          />
        </View>
      </ScrollView>
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
  backText: { fontSize: fontSize.base, color: colors.textMuted },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  saveBtn: { padding: spacing.xs, minWidth: 40, alignItems: 'flex-end' },
  saveText: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.primary },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.base, gap: spacing.base },
  typeToggleRow: { flexDirection: 'row', gap: spacing.sm },
  typeToggleBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 2,
    borderColor: colors.line,
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    gap: 4,
  },
  typeToggleBtnActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}11`,
  },
  typeToggleTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
    marginTop: 4,
  },
  typeToggleTitleActive: { color: colors.primary },
  typeToggleSub: { fontSize: fontSize.xs, color: colors.textMuted },
  netPreview: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.base,
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: spacing.sm,
  },
  netLabel: { fontSize: fontSize.sm, color: colors.textMuted },
  netValue: { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  fieldGroup: { gap: spacing.xs },
  label: { fontSize: fontSize.sm, color: colors.textMuted, fontWeight: fontWeight.medium },
  unitHint: { fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.medium },
  subHint: { fontSize: fontSize.xs, color: colors.primary, marginTop: -2 },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    fontSize: fontSize.base,
    color: colors.text,
  },
  inputError: { borderColor: colors.danger },
  textArea: { minHeight: 80, paddingTop: spacing.md },
  errorText: { fontSize: fontSize.xs, color: colors.danger },
  row: { flexDirection: 'row', gap: spacing.base },
  gameTypeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  gameTypeBtn: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  gameTypeBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  gameTypeBtnText: { fontSize: fontSize.sm, color: colors.textMuted, fontWeight: fontWeight.medium },
  gameTypeBtnTextActive: { color: colors.text },
});

import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, fontWeight, radius } from '../../theme';
import { useSettingsStore } from '../../store/settingsStore';
import { useAuthStore } from '../../store/authStore';
import { Platform } from 'react-native';
import { signOut, updateProfile } from '../../services/auth';
import { AI_MODELS, CURRENCIES, STT_ENGINES } from '../../constants/poker';
import type { AiModel, Currency, SttEngine } from '../../constants/poker';

const AI_MODEL_LABELS: Record<AiModel, string> = {
  'claude-sonnet-4-6': 'Sonnet 4.6 (권장)',
  'claude-opus-4-7': 'Opus 4.7 (고성능)',
  'claude-haiku-4-5-20251001': 'Haiku 4.5 (빠름)',
};

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function SettingRow({ label, sub, right }: { label: string; sub?: string; right: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
      </View>
      {right}
    </View>
  );
}

function ChipGroup<T extends string>({
  options, value, onChange, labels,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  labels?: Partial<Record<T, string>>;
}) {
  return (
    <View style={styles.chipGroup}>
      {options.map(opt => (
        <TouchableOpacity
          key={opt}
          style={[styles.chip, value === opt && styles.chipActive]}
          onPress={() => onChange(opt)}
        >
          <Text style={[styles.chipText, value === opt && styles.chipTextActive]}>
            {labels?.[opt] ?? opt}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function SettingsScreen() {
  const {
    currency, setCurrency,
    locale, setLocale,
    aiModel, setAiModel,
    sttEngine, setSttEngine,
    autoReview, setAutoReview,
    monthlyGoal, setMonthlyGoal,
    lossProtect, setLossProtect,
  } = useSettingsStore();

  const { profile, setProfile, reset } = useAuthStore();
  const [goalInput, setGoalInput] = useState(monthlyGoal?.toString() ?? '');
  const [signingOut, setSigningOut] = useState(false);

  // 닉네임 편집 상태
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(profile?.display_name ?? '');
  const [savingName, setSavingName] = useState(false);

  function handleGoalBlur() {
    const n = parseInt(goalInput, 10);
    setMonthlyGoal(isNaN(n) || n <= 0 ? null : n);
  }

  async function handleSaveName() {
    const trimmed = nameInput.trim();
    if (!trimmed) { Alert.alert('오류', '닉네임을 입력해주세요.'); return; }
    if (!profile?.id) return;
    setSavingName(true);
    try {
      const updated = await updateProfile(profile.id, { display_name: trimmed });
      if (updated) setProfile(updated);
      setEditingName(false);
    } catch {
      Alert.alert('오류', '닉네임 저장에 실패했습니다.');
    } finally {
      setSavingName(false);
    }
  }

  async function handleSignOut() {
    // 웹에서는 Alert.alert 동작 불안정 → window.confirm 사용
    if (Platform.OS === 'web') {
      if (!window.confirm('로그아웃하시겠습니까?')) return;
      setSigningOut(true);
      try { await signOut(); } catch (e) { console.error(e); }
      finally { reset(); setSigningOut(false); }
      return;
    }
    Alert.alert('로그아웃', '정말 로그아웃하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          try { await signOut(); } catch (e) { console.error(e); }
          finally { reset(); setSigningOut(false); }
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>설정</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* 프로필 */}
        <SectionHeader title="프로필" />
        <View style={styles.card}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(editingName ? nameInput : profile?.display_name)?.[0]?.toUpperCase() ?? '?'}
              </Text>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              {editingName ? (
                <View style={styles.nameEditRow}>
                  <TextInput
                    style={styles.nameInput}
                    value={nameInput}
                    onChangeText={setNameInput}
                    placeholder="닉네임 입력"
                    placeholderTextColor={colors.textMuted}
                    autoFocus
                    maxLength={20}
                    returnKeyType="done"
                    onSubmitEditing={handleSaveName}
                  />
                  <TouchableOpacity style={styles.saveBtn} onPress={handleSaveName} disabled={savingName}>
                    {savingName
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={styles.saveBtnText}>저장</Text>
                    }
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => {
                    setEditingName(false);
                    setNameInput(profile?.display_name ?? '');
                  }}>
                    <Text style={styles.cancelBtnText}>취소</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity onPress={() => {
                  setNameInput(profile?.display_name ?? '');
                  setEditingName(true);
                }}>
                  <Text style={styles.displayName}>
                    {profile?.display_name ?? '닉네임 없음'}{'  '}
                    <Text style={styles.editHint}>✏️</Text>
                  </Text>
                </TouchableOpacity>
              )}
              <Text style={styles.rowSub}>{profile?.role === 'admin' ? '관리자' : '일반 사용자'}</Text>
            </View>
          </View>
        </View>

        {/* 일반 */}
        <SectionHeader title="일반" />
        <View style={styles.card}>
          <SettingRow
            label="통화"
            right={<ChipGroup<Currency> options={CURRENCIES} value={currency} onChange={setCurrency} />}
          />
          <View style={styles.divider} />
          <SettingRow
            label="언어"
            right={
              <ChipGroup<'ko' | 'en'>
                options={['ko', 'en']}
                value={locale}
                onChange={setLocale}
                labels={{ ko: '한국어', en: 'English' }}
              />
            }
          />
        </View>

        {/* 목표 */}
        <SectionHeader title="목표 & 보호" />
        <View style={styles.card}>
          <SettingRow
            label="월간 수익 목표"
            sub="0 입력 시 비활성화"
            right={
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.numInput}
                  value={goalInput}
                  onChangeText={setGoalInput}
                  onBlur={handleGoalBlur}
                  keyboardType="numeric"
                  placeholder="금액"
                  placeholderTextColor={colors.textMuted}
                />
                <Text style={styles.unitText}>{currency === 'KRW' ? '원' : '$'}</Text>
              </View>
            }
          />
          <View style={styles.divider} />
          <SettingRow
            label="손실 보호 알림"
            sub="목표액 50% 이상 손실 시 경고"
            right={
              <Switch
                value={lossProtect}
                onValueChange={setLossProtect}
                trackColor={{ false: colors.surfaceAlt, true: colors.primary }}
                thumbColor={colors.text}
              />
            }
          />
        </View>

        {/* AI 설정 */}
        <SectionHeader title="AI 설정" />
        <View style={styles.card}>
          <Text style={styles.rowLabel}>AI 모델</Text>
          <View style={{ gap: spacing.xs, marginTop: spacing.sm }}>
            {AI_MODELS.map(model => (
              <TouchableOpacity
                key={model}
                style={[styles.modelRow, aiModel === model && styles.modelRowActive]}
                onPress={() => setAiModel(model as AiModel)}
              >
                <View style={[styles.radio, aiModel === model && styles.radioActive]} />
                <Text style={[styles.modelLabel, aiModel === model && styles.modelLabelActive]}>
                  {AI_MODEL_LABELS[model as AiModel]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.divider} />
          <SettingRow
            label="자동 리뷰"
            sub="핸드 저장 시 자동으로 AI 분석"
            right={
              <Switch
                value={autoReview}
                onValueChange={setAutoReview}
                trackColor={{ false: colors.surfaceAlt, true: colors.primary }}
                thumbColor={colors.text}
              />
            }
          />
          <View style={styles.divider} />
          <SettingRow
            label="음성 입력 엔진"
            right={
              <ChipGroup<SttEngine>
                options={STT_ENGINES}
                value={sttEngine}
                onChange={setSttEngine}
                labels={{ device: '기기 STT', whisper: 'Whisper AI' }}
              />
            }
          />
        </View>

        {/* 계정 */}
        <SectionHeader title="계정" />
        <View style={styles.card}>
          <TouchableOpacity style={styles.dangerBtn} onPress={handleSignOut} disabled={signingOut}>
            <Text style={styles.dangerBtnText}>{signingOut ? '로그아웃 중...' : '로그아웃'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>BluffZone v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing.xl, paddingVertical: spacing.base,
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  headerTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  content: { padding: spacing.base, gap: spacing.xs, paddingBottom: spacing.xxl },
  sectionHeader: {
    fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textMuted,
    letterSpacing: 0.5, paddingHorizontal: spacing.sm, paddingTop: spacing.md,
    paddingBottom: spacing.xs, textTransform: 'uppercase',
  },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.card,
    borderWidth: 1, borderColor: colors.line, padding: spacing.base, gap: spacing.base,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.base },
  rowLeft: { flex: 1, gap: 2 },
  rowLabel: { fontSize: fontSize.base, color: colors.text, fontWeight: fontWeight.medium },
  rowSub: { fontSize: fontSize.xs, color: colors.textMuted },
  divider: { height: 1, backgroundColor: colors.line },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.base },
  avatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  displayName: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text },
  editHint: { fontSize: fontSize.sm, color: colors.textMuted },
  nameEditRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  nameInput: {
    flex: 1, height: 36, backgroundColor: colors.surfaceAlt, borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.primary, paddingHorizontal: spacing.sm,
    color: colors.text, fontSize: fontSize.base,
  },
  saveBtn: {
    paddingHorizontal: spacing.sm, paddingVertical: 6, backgroundColor: colors.primary,
    borderRadius: radius.sm, minWidth: 44, alignItems: 'center',
  },
  saveBtnText: { fontSize: fontSize.sm, color: '#fff', fontWeight: fontWeight.bold },
  cancelBtn: { paddingHorizontal: spacing.xs, paddingVertical: 6 },
  cancelBtnText: { fontSize: fontSize.sm, color: colors.textMuted },
  chipGroup: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.button,
    borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surfaceAlt,
  },
  chipActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}22` },
  chipText: { fontSize: fontSize.sm, color: colors.textMuted },
  chipTextActive: { color: colors.primary, fontWeight: fontWeight.semibold },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  numInput: {
    width: 80, height: 36, backgroundColor: colors.surfaceAlt, borderRadius: radius.button,
    borderWidth: 1, borderColor: colors.line, paddingHorizontal: spacing.sm,
    color: colors.text, fontSize: fontSize.base, textAlign: 'right',
  },
  unitText: { fontSize: fontSize.sm, color: colors.textMuted },
  modelRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm,
    borderRadius: radius.base, borderWidth: 1, borderColor: colors.line,
  },
  modelRowActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}11` },
  radio: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: colors.textMuted },
  radioActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  modelLabel: { fontSize: fontSize.sm, color: colors.textMuted },
  modelLabelActive: { color: colors.text, fontWeight: fontWeight.medium },
  dangerBtn: {
    paddingVertical: spacing.sm, alignItems: 'center', borderRadius: radius.button,
    borderWidth: 1, borderColor: colors.danger,
  },
  dangerBtnText: { fontSize: fontSize.base, color: colors.danger, fontWeight: fontWeight.semibold },
  version: { textAlign: 'center', fontSize: fontSize.xs, color: colors.textMuted, paddingTop: spacing.md },
});

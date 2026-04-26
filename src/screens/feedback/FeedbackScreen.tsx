import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { showAlert } from '../../utils/alert';
import { colors, spacing, fontSize, fontWeight, radius } from '../../theme';
import { useSubmitFeedback } from '../../hooks/useFeedback';
import type { FeedbackCategory } from '../../services/feedback';

const CATEGORIES: { value: FeedbackCategory; label: string; emoji: string }[] = [
  { value: 'general', label: '일반', emoji: '💬' },
  { value: 'bug', label: '버그', emoji: '🐛' },
  { value: 'feature', label: '기능제안', emoji: '💡' },
  { value: 'praise', label: '칭찬', emoji: '🙌' },
];

export default function FeedbackScreen() {
  const navigation = useNavigation();
  const submit = useSubmitFeedback();
  const [category, setCategory] = useState<FeedbackCategory>('general');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');

  const canSubmit = subject.trim().length > 0 && content.trim().length > 0 && !submit.isPending;

  async function handleSubmit() {
    if (!canSubmit) return;
    try {
      await submit.mutateAsync({
        category,
        subject: subject.trim(),
        content: content.trim(),
        user_agent: Platform.OS === 'web' && typeof navigator !== 'undefined' ? navigator.userAgent : null,
      });
      showAlert('의견 보내짐', '소중한 의견 감사합니다. 빠르게 검토하고 반영하겠습니다.');
      navigation.goBack();
    } catch (e: any) {
      showAlert('오류', e?.message ?? '의견 등록에 실패했습니다. 잠시 후 다시 시도해주세요.');
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.title}>의견 보내기</Text>
        <TouchableOpacity onPress={() => (navigation as any).navigate('MyFeedback')} style={styles.historyBtn}>
          <Text style={styles.historyText}>이력</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.intro}>
          버그, 개선 제안, 칭찬 무엇이든 환영합니다.{'\n'}
          소중한 의견은 다음 업데이트에 반영합니다.
        </Text>

        {/* 카테고리 */}
        <Text style={styles.label}>카테고리</Text>
        <View style={styles.chipRow}>
          {CATEGORIES.map(c => (
            <TouchableOpacity
              key={c.value}
              style={[styles.chip, category === c.value && styles.chipActive]}
              onPress={() => setCategory(c.value)}
              activeOpacity={0.75}
            >
              <Text style={[styles.chipText, category === c.value && styles.chipTextActive]}>
                {c.emoji} {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 제목 */}
        <Text style={styles.label}>제목</Text>
        <TextInput
          style={styles.input}
          value={subject}
          onChangeText={setSubject}
          placeholder="간단한 제목 (예: 음성 인식이 안 돼요)"
          placeholderTextColor={colors.textMuted}
          maxLength={100}
        />

        {/* 내용 */}
        <Text style={styles.label}>내용</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={content}
          onChangeText={setContent}
          placeholder={getCategoryPlaceholder(category)}
          placeholderTextColor={colors.textMuted}
          multiline
          textAlignVertical="top"
          maxLength={2000}
        />
        <Text style={styles.counter}>{content.length} / 2000</Text>

        {/* 제출 버튼 */}
        <TouchableOpacity
          style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
          activeOpacity={0.8}
        >
          {submit.isPending ? (
            <ActivityIndicator color={colors.bg} />
          ) : (
            <Text style={styles.submitText}>의견 보내기</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.hint}>
          답변은 가입 시 등록한 이메일로 받으실 수 있습니다.{'\n'}
          처리 상태는 "내 의견 이력"에서 확인 가능합니다.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function getCategoryPlaceholder(c: FeedbackCategory): string {
  switch (c) {
    case 'bug':
      return '어떤 상황에서 문제가 발생했나요? 가능하면 재현 순서를 적어주세요.\n\n예: 핸드 입력 시 음성 버튼을 눌렀는데 마이크 권한 안내가 안 나와요. 안드로이드 Chrome에서 발생.';
    case 'feature':
      return '어떤 기능이 추가되면 좋을까요? 그 기능이 왜 필요한지도 알려주세요.';
    case 'praise':
      return '어떤 점이 좋으셨나요? 더 발전시키는 데 큰 힘이 됩니다.';
    case 'general':
    default:
      return '자유롭게 의견을 남겨주세요.';
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.base, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  backBtn: { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
  backText: { color: colors.primary, fontSize: fontSize.base },
  title: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  historyBtn: { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
  historyText: { color: colors.primary, fontSize: fontSize.sm },
  content: { padding: spacing.base, gap: spacing.sm, paddingBottom: spacing.xxl },
  intro: { fontSize: fontSize.sm, color: colors.textMuted, lineHeight: 22, marginBottom: spacing.sm },
  label: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text, marginTop: spacing.sm, marginBottom: spacing.xs },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: spacing.base, paddingVertical: 8,
    borderRadius: radius.button, borderWidth: 1, borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: fontSize.sm, color: colors.text },
  chipTextActive: { color: colors.bg, fontWeight: fontWeight.semibold },
  input: {
    backgroundColor: colors.surface, borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.line, color: colors.text,
    fontSize: fontSize.base, paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  textArea: { minHeight: 140, paddingTop: spacing.sm },
  counter: { fontSize: fontSize.xs, color: colors.textMuted, textAlign: 'right' },
  submitBtn: {
    backgroundColor: colors.primary, borderRadius: radius.button,
    paddingVertical: 14, alignItems: 'center', marginTop: spacing.md,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.bg },
  hint: { fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 18, marginTop: spacing.sm, textAlign: 'center' },
});

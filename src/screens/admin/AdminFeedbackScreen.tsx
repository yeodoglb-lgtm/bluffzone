import { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { showAlert } from '../../utils/alert';
import { colors, spacing, fontSize, fontWeight, radius } from '../../theme';
import { useAllFeedbackAdmin, useUpdateFeedbackStatus } from '../../hooks/useFeedback';
import { useUserNameMap } from '../../hooks/useSessions';
import type { Feedback, FeedbackCategory, FeedbackStatus } from '../../services/feedback';

const CATEGORY_LABEL: Record<FeedbackCategory, string> = {
  general: '💬 일반',
  bug: '🐛 버그',
  feature: '💡 기능',
  praise: '🙌 칭찬',
};

const STATUS_OPTIONS: { value: FeedbackStatus; label: string; color: string }[] = [
  { value: 'new', label: '신규', color: colors.warning },
  { value: 'read', label: '검토중', color: colors.primary },
  { value: 'replied', label: '답변완료', color: colors.success },
  { value: 'closed', label: '종료', color: colors.textMuted },
];

const FILTERS: { value: FeedbackStatus | 'all'; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'new', label: '신규' },
  { value: 'read', label: '검토중' },
  { value: 'replied', label: '답변완료' },
  { value: 'closed', label: '종료' },
];

export default function AdminFeedbackScreen() {
  const navigation = useNavigation();
  const { data: items, isLoading } = useAllFeedbackAdmin();
  const { data: userNameMap = {} } = useUserNameMap();
  const updateStatus = useUpdateFeedbackStatus();
  const [filter, setFilter] = useState<FeedbackStatus | 'all'>('all');
  const [editing, setEditing] = useState<Feedback | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [editStatus, setEditStatus] = useState<FeedbackStatus>('read');

  const filtered = useMemo(() => {
    if (!items) return [];
    if (filter === 'all') return items;
    return items.filter(i => i.status === filter);
  }, [items, filter]);

  function openEditor(item: Feedback) {
    setEditing(item);
    setAdminNote(item.admin_note ?? '');
    setEditStatus(item.status === 'new' ? 'read' : item.status);
  }

  async function saveEdit() {
    if (!editing) return;
    try {
      await updateStatus.mutateAsync({
        id: editing.id,
        status: editStatus,
        adminNote: adminNote.trim() || null,
      });
      setEditing(null);
      showAlert('저장됨', '의견 상태가 업데이트됐습니다.');
    } catch (e: any) {
      showAlert('오류', e?.message ?? '업데이트 실패');
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.title}>의견 관리</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* 필터 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.value}
            style={[styles.filterChip, filter === f.value && styles.filterChipActive]}
            onPress={() => setFilter(f.value)}
          >
            <Text style={[styles.filterText, filter === f.value && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const stat = STATUS_OPTIONS.find(s => s.value === item.status)!;
            const userName = item.user_id ? (userNameMap[item.user_id] ?? item.user_id.slice(0, 6)) : '익명';
            const date = new Date(item.created_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            return (
              <TouchableOpacity style={styles.card} onPress={() => openEditor(item)} activeOpacity={0.75}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardCategory}>{CATEGORY_LABEL[item.category]}</Text>
                  <View style={[styles.statusBadge, { borderColor: stat.color }]}>
                    <Text style={[styles.statusText, { color: stat.color }]}>{stat.label}</Text>
                  </View>
                </View>
                <Text style={styles.cardSubject}>{item.subject}</Text>
                <Text style={styles.cardContent} numberOfLines={3}>{item.content}</Text>
                <View style={styles.cardFooter}>
                  <Text style={styles.cardMeta}>{userName}</Text>
                  <Text style={styles.cardMeta}>{date}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>의견이 없습니다</Text>
            </View>
          }
        />
      )}

      {/* 편집 모달 */}
      <Modal visible={!!editing} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {editing ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>{CATEGORY_LABEL[editing.category]}</Text>
                <Text style={styles.modalSubject}>{editing.subject}</Text>
                <Text style={styles.modalContent}>{editing.content}</Text>

                <View style={styles.modalMeta}>
                  <Text style={styles.modalMetaText}>
                    이메일: {editing.user_email ?? '없음'}
                  </Text>
                  {editing.user_agent ? (
                    <Text style={styles.modalMetaText} numberOfLines={2}>
                      UA: {editing.user_agent}
                    </Text>
                  ) : null}
                </View>

                <Text style={styles.modalLabel}>상태 변경</Text>
                <View style={styles.statusOptionsRow}>
                  {STATUS_OPTIONS.map(s => (
                    <TouchableOpacity
                      key={s.value}
                      style={[styles.statusOption, editStatus === s.value && { backgroundColor: s.color, borderColor: s.color }]}
                      onPress={() => setEditStatus(s.value)}
                    >
                      <Text style={[styles.statusOptionText, editStatus === s.value && { color: colors.bg, fontWeight: fontWeight.bold }]}>
                        {s.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.modalLabel}>운영자 메모 (사용자에게 답변으로 표시됨)</Text>
                <TextInput
                  style={[styles.modalInput, styles.modalTextArea]}
                  value={adminNote}
                  onChangeText={setAdminNote}
                  placeholder="답변 내용..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                  textAlignVertical="top"
                />

                <View style={styles.modalBtnRow}>
                  <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setEditing(null)}>
                    <Text style={styles.modalCancelText}>취소</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalSaveBtn, updateStatus.isPending && { opacity: 0.5 }]}
                    onPress={saveEdit}
                    disabled={updateStatus.isPending}
                  >
                    {updateStatus.isPending ? (
                      <ActivityIndicator color={colors.bg} size="small" />
                    ) : (
                      <Text style={styles.modalSaveText}>저장</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
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
  filterRow: { gap: 6, padding: spacing.base, paddingBottom: 0 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.button, borderWidth: 1, borderColor: colors.line },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontSize: fontSize.sm, color: colors.textMuted },
  filterTextActive: { color: colors.bg, fontWeight: fontWeight.bold },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: spacing.base, gap: spacing.sm },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.card,
    padding: spacing.base, borderWidth: 1, borderColor: colors.line, gap: 6,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  cardCategory: { fontSize: fontSize.xs, color: colors.textMuted },
  statusBadge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  statusText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  cardSubject: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text },
  cardContent: { fontSize: fontSize.sm, color: colors.textMuted, lineHeight: 20 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  cardMeta: { fontSize: fontSize.xs, color: colors.textMuted },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: fontSize.base, color: colors.textMuted },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: spacing.lg, maxHeight: '85%' },
  modalTitle: { fontSize: fontSize.sm, color: colors.textMuted, marginBottom: 4 },
  modalSubject: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, marginBottom: spacing.sm },
  modalContent: { fontSize: fontSize.base, color: colors.text, lineHeight: 22, marginBottom: spacing.md },
  modalMeta: { backgroundColor: colors.bg, padding: spacing.sm, borderRadius: radius.sm, marginBottom: spacing.md, gap: 4 },
  modalMetaText: { fontSize: fontSize.xs, color: colors.textMuted },
  modalLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text, marginTop: spacing.md, marginBottom: spacing.xs },
  statusOptionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  statusOption: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.button, borderWidth: 1, borderColor: colors.line },
  statusOptionText: { fontSize: fontSize.sm, color: colors.text },
  modalInput: { backgroundColor: colors.bg, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, color: colors.text, fontSize: fontSize.base, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
  modalTextArea: { minHeight: 100, paddingTop: spacing.sm },
  modalBtnRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  modalCancelBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: radius.button, borderWidth: 1, borderColor: colors.line },
  modalCancelText: { fontSize: fontSize.base, color: colors.textMuted },
  modalSaveBtn: { flex: 2, backgroundColor: colors.primary, paddingVertical: 14, alignItems: 'center', borderRadius: radius.button },
  modalSaveText: { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.bg },
});

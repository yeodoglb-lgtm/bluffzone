import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, fontSize, fontWeight, radius } from '../../theme';
import { useMyFeedback } from '../../hooks/useFeedback';
import type { Feedback, FeedbackCategory, FeedbackStatus } from '../../services/feedback';

const CATEGORY_LABEL: Record<FeedbackCategory, { emoji: string; label: string }> = {
  general: { emoji: '💬', label: '일반' },
  bug: { emoji: '🐛', label: '버그' },
  feature: { emoji: '💡', label: '기능제안' },
  praise: { emoji: '🙌', label: '칭찬' },
};

const STATUS_LABEL: Record<FeedbackStatus, { label: string; color: string }> = {
  new: { label: '대기', color: colors.warning },
  read: { label: '검토중', color: colors.primary },
  replied: { label: '답변완료', color: colors.success },
  closed: { label: '종료', color: colors.textMuted },
};

function FeedbackCard({ item }: { item: Feedback }) {
  const cat = CATEGORY_LABEL[item.category];
  const stat = STATUS_LABEL[item.status];
  const date = new Date(item.created_at).toLocaleDateString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardCategory}>
          <Text style={styles.cardCategoryText}>{cat.emoji} {cat.label}</Text>
        </View>
        <View style={[styles.statusBadge, { borderColor: stat.color }]}>
          <Text style={[styles.statusText, { color: stat.color }]}>{stat.label}</Text>
        </View>
      </View>
      <Text style={styles.cardSubject} numberOfLines={1}>{item.subject}</Text>
      <Text style={styles.cardContent} numberOfLines={2}>{item.content}</Text>
      <Text style={styles.cardDate}>{date}</Text>
      {item.admin_note ? (
        <View style={styles.adminNote}>
          <Text style={styles.adminNoteLabel}>운영자 답변</Text>
          <Text style={styles.adminNoteText}>{item.admin_note}</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function MyFeedbackListScreen() {
  const navigation = useNavigation();
  const { data: items, isLoading } = useMyFeedback();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.title}>내 의견 이력</Text>
        <View style={{ width: 60 }} />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={items ?? []}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <FeedbackCard item={item} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>📭</Text>
              <Text style={styles.emptyTitle}>아직 보낸 의견이 없습니다</Text>
              <TouchableOpacity
                style={styles.emptyCta}
                onPress={() => (navigation as any).navigate('Feedback')}
              >
                <Text style={styles.emptyCtaText}>의견 보내기</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: spacing.base, gap: spacing.sm },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.card,
    padding: spacing.base, borderWidth: 1, borderColor: colors.line,
    gap: spacing.xs,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardCategory: { backgroundColor: colors.surfaceAlt, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  cardCategoryText: { fontSize: fontSize.xs, color: colors.text },
  statusBadge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  statusText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  cardSubject: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text, marginTop: 4 },
  cardContent: { fontSize: fontSize.sm, color: colors.textMuted, lineHeight: 20 },
  cardDate: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 4 },
  adminNote: {
    marginTop: spacing.sm, padding: spacing.sm,
    backgroundColor: 'rgba(255, 107, 53, 0.08)',
    borderRadius: radius.sm, borderLeftWidth: 3, borderLeftColor: colors.primary,
  },
  adminNoteLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.primary, marginBottom: 4 },
  adminNoteText: { fontSize: fontSize.sm, color: colors.text, lineHeight: 20 },
  empty: { alignItems: 'center', paddingTop: 60, gap: spacing.md },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: fontSize.base, color: colors.textMuted },
  emptyCta: { backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: radius.button },
  emptyCtaText: { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.bg },
});

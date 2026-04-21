import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { colors, spacing, fontSize, fontWeight, radius } from '../theme';
import { useAdminUsers } from '../hooks/useAdmin';
import { useAuthStore } from '../store/authStore';

interface Props {
  selectedUid: string | null; // null = 전체
  onChange: (uid: string | null) => void;
}

/**
 * 어드민 전용 유저 필터 칩 바
 * - "전체" 칩 + 가입된 유저 칩들
 * - 어드민이 아닌 경우 null 반환 (렌더 안 함)
 */
export default function AdminUserFilter({ selectedUid, onChange }: Props) {
  const { profile } = useAuthStore();
  const { data: users = [] } = useAdminUsers();

  if (profile?.role !== 'admin') return null;

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {/* 전체 칩 */}
        <TouchableOpacity
          style={[styles.chip, selectedUid === null && styles.chipActive]}
          onPress={() => onChange(null)}
          activeOpacity={0.7}
        >
          <Text style={[styles.chipText, selectedUid === null && styles.chipTextActive]}>
            전체
          </Text>
        </TouchableOpacity>

        {/* 유저별 칩 */}
        {users.map(u => {
          const isSelected = selectedUid === u.id;
          const label = u.display_name ?? u.id.slice(0, 6);
          return (
            <TouchableOpacity
              key={u.id}
              style={[styles.chip, isSelected && styles.chipActive]}
              onPress={() => onChange(isSelected ? null : u.id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                👤 {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.surface,
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceAlt,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}22`,
  },
  chipText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: fontWeight.medium,
  },
  chipTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
});

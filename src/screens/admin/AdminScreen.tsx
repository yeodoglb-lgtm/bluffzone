import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { colors, spacing, fontSize, fontWeight, radius } from '../../theme';
import { useAdminOverview, useAdminUsers } from '../../hooks/useAdmin';
import { useAuthStore } from '../../store/authStore';
import type { AdminUserStat } from '../../services/admin';

// ── 통계 카드 ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <View style={s.statCard}>
      <Text style={s.statValue}>{value.toLocaleString()}</Text>
      <Text style={s.statLabel}>{label}</Text>
      {sub ? <Text style={s.statSub}>{sub}</Text> : null}
    </View>
  );
}

// ── 유저 행 ──────────────────────────────────────────────────────────────────
function UserRow({ user, index }: { user: AdminUserStat; index: number }) {
  const joinDate = new Date(user.created_at).toLocaleDateString('ko-KR', {
    year: '2-digit', month: 'short', day: 'numeric',
  });
  const isAdmin = user.role === 'admin';

  return (
    <View style={[s.userRow, index % 2 === 1 && s.userRowAlt]}>
      {/* 닉네임 + 뱃지 */}
      <View style={s.userNameCol}>
        <Text style={s.userName} numberOfLines={1}>
          {user.display_name ?? '(이름 없음)'}
        </Text>
        {isAdmin && (
          <View style={s.adminBadge}>
            <Text style={s.adminBadgeText}>어드민</Text>
          </View>
        )}
      </View>
      {/* 핸드 수 */}
      <Text style={s.userStat}>{user.hand_count}</Text>
      {/* 세션 수 */}
      <Text style={s.userStat}>{user.session_count}</Text>
      {/* 가입일 */}
      <Text style={s.userDate}>{joinDate}</Text>
    </View>
  );
}

// ── 메인 화면 ────────────────────────────────────────────────────────────────
export default function AdminScreen() {
  const { profile } = useAuthStore();
  const { data: overview, isLoading: overviewLoading } = useAdminOverview();
  const { data: users, isLoading: usersLoading } = useAdminUsers();
  const qc = useQueryClient();

  const isLoading = overviewLoading || usersLoading;

  function handleRefresh() {
    qc.invalidateQueries({ queryKey: ['admin'] });
  }

  // 어드민 아닌 경우 차단
  if (profile?.role !== 'admin') {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.center}>
          <Text style={s.errorText}>⛔ 접근 권한이 없습니다</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* 헤더 */}
      <View style={s.header}>
        <Text style={s.headerTitle}>🛠 어드민</Text>
        <TouchableOpacity onPress={handleRefresh} style={s.refreshBtn}>
          <Text style={s.refreshText}>새로고침</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      >
        {/* 전체 통계 */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>전체 현황</Text>
          {overviewLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.md }} />
          ) : (
            <>
              <View style={s.statsGrid}>
                <StatCard label="총 유저" value={overview?.total_users ?? 0} />
                <StatCard label="총 핸드" value={overview?.total_hands ?? 0} />
              </View>
              <View style={s.statsGrid}>
                <StatCard label="총 세션" value={overview?.total_sessions ?? 0} />
                <StatCard
                  label="신규 유저"
                  value={overview?.new_users_7d ?? 0}
                  sub="최근 7일"
                />
              </View>
              <View style={[s.statsGrid, { marginTop: 0 }]}>
                <StatCard
                  label="신규 핸드"
                  value={overview?.new_hands_7d ?? 0}
                  sub="최근 7일"
                />
                <View style={[s.statCard, { backgroundColor: 'transparent', borderColor: 'transparent' }]} />
              </View>
            </>
          )}
        </View>

        {/* 유저 목록 */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>유저 목록 ({users?.length ?? 0}명)</Text>
          {usersLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.md }} />
          ) : (
            <View style={s.table}>
              {/* 테이블 헤더 */}
              <View style={[s.userRow, s.tableHeader]}>
                <Text style={[s.userNameCol, s.thText]}>닉네임</Text>
                <Text style={[s.userStat, s.thText]}>핸드</Text>
                <Text style={[s.userStat, s.thText]}>세션</Text>
                <Text style={[s.userDate, s.thText]}>가입일</Text>
              </View>
              {/* 유저 행 */}
              {(users ?? []).map((u, i) => (
                <UserRow key={u.id} user={u} index={i} />
              ))}
              {(users ?? []).length === 0 && (
                <View style={s.emptyRow}>
                  <Text style={s.emptyText}>유저가 없습니다</Text>
                </View>
              )}
            </View>
          )}
        </View>

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── 스타일 ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: fontSize.md, color: colors.danger },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.base,
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  headerTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  refreshBtn: { paddingHorizontal: spacing.sm, paddingVertical: 4 },
  refreshText: { fontSize: fontSize.sm, color: colors.primary },
  content: { padding: spacing.md, gap: spacing.md },
  section: {
    backgroundColor: colors.surface, borderRadius: radius.card,
    padding: spacing.base, borderWidth: 1, borderColor: colors.line, gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.primary,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  // 통계 그리드
  statsGrid: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  statCard: {
    flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: radius.sm,
    padding: spacing.sm, borderWidth: 1, borderColor: colors.line,
    alignItems: 'center', gap: 2,
  },
  statValue: { fontSize: 28, fontWeight: fontWeight.bold, color: colors.primary },
  statLabel: { fontSize: fontSize.xs, color: colors.text, fontWeight: fontWeight.medium },
  statSub: { fontSize: 10, color: colors.textMuted },
  // 테이블
  table: { borderRadius: radius.sm, overflow: 'hidden', borderWidth: 1, borderColor: colors.line },
  tableHeader: { backgroundColor: colors.surfaceAlt },
  thText: { color: colors.textMuted, fontWeight: fontWeight.bold, fontSize: fontSize.xs },
  userRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.sm, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  userRowAlt: { backgroundColor: 'rgba(255,255,255,0.02)' },
  userNameCol: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, marginRight: 4 },
  userName: { fontSize: fontSize.sm, color: colors.text, flex: 1 },
  adminBadge: {
    backgroundColor: colors.primary, borderRadius: 4,
    paddingHorizontal: 4, paddingVertical: 1,
  },
  adminBadgeText: { fontSize: 9, color: '#fff', fontWeight: fontWeight.bold },
  userStat: { width: 40, textAlign: 'center', fontSize: fontSize.sm, color: colors.text },
  userDate: { width: 72, textAlign: 'right', fontSize: 11, color: colors.textMuted },
  emptyRow: { padding: spacing.md, alignItems: 'center' },
  emptyText: { fontSize: fontSize.sm, color: colors.textMuted },
});

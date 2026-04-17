import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fontSize } from '../../theme';

export default function DashboardScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>BluffZone</Text>
      </View>
      <View style={styles.center}>
        <Text style={styles.text}>대시보드 준비 중</Text>
        <Text style={styles.sub}>단계 6에서 완성됩니다</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  logo: { fontSize: fontSize.lg, fontWeight: '800', color: colors.primary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  text: { fontSize: fontSize.md, color: colors.text },
  sub: { fontSize: fontSize.sm, color: colors.textMuted },
});

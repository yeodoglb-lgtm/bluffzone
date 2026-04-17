import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fontSize } from '../../theme';

export default function DayDetailScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}>
        <Text style={styles.text}>날짜 상세</Text>
        <Text style={styles.sub}>단계 5에서 완성됩니다</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  text: { fontSize: fontSize.md, color: colors.text },
  sub: { fontSize: fontSize.sm, color: colors.textMuted },
});

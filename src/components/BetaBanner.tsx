import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, fontSize, fontWeight, radius } from '../theme';

// 베타 단계 배너 — 대시보드 하단에 노출.
// 정식 출시 후엔 props로 visible=false 전달하거나 컴포넌트 자체 제거.
export default function BetaBanner() {
  const navigation = useNavigation();
  return (
    <TouchableOpacity
      style={styles.banner}
      onPress={() => (navigation as any).navigate('Feedback')}
      activeOpacity={0.85}
    >
      <Text style={styles.emoji}>🧪</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>지금은 베타 테스트 중이에요</Text>
        <Text style={styles.desc}>버그·개선 의견 보내주시면 큰 도움이 됩니다</Text>
      </View>
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.sm,
    paddingHorizontal: spacing.base,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  emoji: { fontSize: 24 },
  title: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.text },
  desc: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  arrow: { fontSize: 20, color: colors.primary, fontWeight: fontWeight.bold },
});

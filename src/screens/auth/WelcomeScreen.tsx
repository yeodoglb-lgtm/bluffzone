import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, fontWeight } from '../../theme';

export default function WelcomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.logo}>BluffZone</Text>
        <Text style={styles.subtitle}>홀덤 플레이어를 위한{'\n'}스마트 포커 매니저</Text>
      </View>
      <View style={styles.buttons}>
        <TouchableOpacity style={styles.kakaoBtn}>
          <Text style={styles.kakaoBtnText}>카카오로 로그인</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.googleBtn}>
          <Text style={styles.googleBtnText}>구글로 로그인</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.appleBtn}>
          <Text style={styles.appleBtnText}>Apple로 로그인</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  logo: { fontSize: 40, fontWeight: fontWeight.extrabold, color: colors.primary },
  subtitle: { fontSize: fontSize.md, color: colors.textMuted, textAlign: 'center', lineHeight: 26 },
  buttons: { padding: spacing.xl, gap: spacing.md },
  kakaoBtn: { backgroundColor: '#FEE500', borderRadius: 12, padding: spacing.base, alignItems: 'center' },
  kakaoBtnText: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: '#000' },
  googleBtn: { backgroundColor: colors.surface, borderRadius: 12, padding: spacing.base, alignItems: 'center', borderWidth: 1, borderColor: colors.line },
  googleBtnText: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text },
  appleBtn: { backgroundColor: '#fff', borderRadius: 12, padding: spacing.base, alignItems: 'center' },
  appleBtnText: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: '#000' },
});

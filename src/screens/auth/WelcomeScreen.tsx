import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, spacing, fontSize, fontWeight, radius } from '../../theme';
import { supabase } from '../../services/supabase';

type Mode = 'login' | 'signup';

export default function WelcomeScreen() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  function switchMode(m: Mode) {
    setMode(m);
    setErrorMsg('');
    setSuccessMsg('');
  }

  async function handleSubmit() {
    setErrorMsg('');
    setSuccessMsg('');

    if (!email || !password) {
      setErrorMsg('이메일과 비밀번호를 입력해주세요.');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setErrorMsg(error.message);
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) {
          setErrorMsg(error.message);
        } else {
          setSuccessMsg('회원가입 완료! 이메일을 확인하고 인증 링크를 클릭한 뒤 로그인해주세요.');
        }
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#1A0A00', colors.bg]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.6 }}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* 로고 */}
          <View style={styles.hero}>
            <View style={styles.logoIcon}>
              <Text style={styles.spade}>♠</Text>
            </View>
            <Text style={styles.logoText}>BluffZone</Text>
            <Text style={styles.tagline}>홀덤 플레이어를 위한 스마트 포커 매니저</Text>
          </View>

          {/* 폼 */}
          <View style={styles.form}>
            <View style={styles.tabRow}>
              <TouchableOpacity
                style={[styles.tab, mode === 'login' && styles.tabActive]}
                onPress={() => switchMode('login')}
              >
                <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>로그인</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, mode === 'signup' && styles.tabActive]}
                onPress={() => switchMode('signup')}
              >
                <Text style={[styles.tabText, mode === 'signup' && styles.tabTextActive]}>회원가입</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="이메일"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="비밀번호 (6자 이상)"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
            />

            {/* 에러 메시지 */}
            {errorMsg !== '' && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
              </View>
            )}

            {/* 성공 메시지 */}
            {successMsg !== '' && (
              <View style={styles.successBox}>
                <Text style={styles.successText}>✅ {successMsg}</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={colors.bg} size="small" />
              ) : (
                <Text style={styles.submitText}>
                  {mode === 'login' ? '로그인' : '회원가입'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl },
  hero: { alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xxl },
  logoIcon: {
    width: 72, height: 72, borderRadius: 18,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  spade: { fontSize: 40, color: colors.bg },
  logoText: { fontSize: 32, fontWeight: fontWeight.extrabold, color: colors.primary },
  tagline: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center' },
  form: {
    backgroundColor: colors.surface, borderRadius: radius.card,
    borderWidth: 1, borderColor: colors.line, padding: spacing.base, gap: spacing.md,
  },
  tabRow: {
    flexDirection: 'row', backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm, padding: 3,
  },
  tab: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center', borderRadius: radius.sm - 2 },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: fontSize.sm, color: colors.textMuted, fontWeight: fontWeight.medium },
  tabTextActive: { color: colors.bg },
  input: {
    backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.line,
    borderRadius: radius.sm, paddingHorizontal: spacing.base,
    paddingVertical: spacing.md, fontSize: fontSize.base, color: colors.text,
  },
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.15)', borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.danger, padding: spacing.sm,
  },
  errorText: { fontSize: fontSize.sm, color: colors.danger },
  successBox: {
    backgroundColor: 'rgba(34,197,94,0.15)', borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.success, padding: spacing.sm,
  },
  successText: { fontSize: fontSize.sm, color: colors.success },
  submitBtn: {
    backgroundColor: colors.primary, borderRadius: radius.button,
    paddingVertical: 15, alignItems: 'center',
  },
  submitText: { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.bg },
});

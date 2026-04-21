import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
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

  async function handleSubmit() {
    if (!email || !password) {
      Alert.alert('입력 오류', '이메일과 비밀번호를 입력해주세요.');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) Alert.alert('로그인 실패', error.message);
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) Alert.alert('회원가입 실패', error.message);
        else Alert.alert('회원가입 완료', '이메일을 확인해주세요. (확인 후 로그인)');
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
                onPress={() => setMode('login')}
              >
                <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>로그인</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, mode === 'signup' && styles.tabActive]}
                onPress={() => setMode('signup')}
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
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spade: { fontSize: 40, color: colors.bg },
  logoText: {
    fontSize: 32,
    fontWeight: fontWeight.extrabold,
    color: colors.primary,
  },
  tagline: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
  form: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.base,
    gap: spacing.md,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radius.sm - 2,
  },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: fontSize.sm, color: colors.textMuted, fontWeight: fontWeight.medium },
  tabTextActive: { color: colors.bg },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    fontSize: fontSize.base,
    color: colors.text,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    paddingVertical: 15,
    alignItems: 'center',
  },
  submitText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.bg,
  },
});

import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, spacing, fontSize, fontWeight, radius } from '../../theme';
import { signInWithGoogle, signInWithKakao, signInWithApple } from '../../services/socialAuth';

type Provider = 'kakao' | 'google' | 'apple' | null;

export default function WelcomeScreen() {
  const [loading, setLoading] = useState<Provider>(null);

  async function handleLogin(provider: Provider, fn: () => Promise<{ error: string | null }>) {
    setLoading(provider);
    try {
      const { error } = await fn();
      if (error) Alert.alert('로그인 실패', error);
    } finally {
      setLoading(null);
    }
  }

  const isLoading = (p: Provider) => loading === p;
  const anyLoading = loading !== null;

  return (
    <SafeAreaView style={styles.container}>
      {/* 배경 그라디언트 */}
      <LinearGradient
        colors={['#1A0A00', colors.bg]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.6 }}
      />

      {/* 상단 로고 영역 */}
      <View style={styles.hero}>
        {/* 스페이드 아이콘 + BZ 텍스트 로고 (SVG 없이 텍스트로 표현) */}
        <View style={styles.logoIcon}>
          <Text style={styles.spade}>♠</Text>
        </View>
        <Text style={styles.logoText}>BluffZone</Text>
        <Text style={styles.logoKr}>블러프존</Text>
        <Text style={styles.tagline}>홀덤 플레이어를 위한{'\n'}스마트 포커 매니저</Text>

        {/* 특징 3개 */}
        <View style={styles.features}>
          {[
            { icon: '💰', label: '뱅크롤 관리' },
            { icon: '🤖', label: 'AI 핸드 리뷰' },
            { icon: '📍', label: '주변 홀덤 플레이스' },
          ].map(f => (
            <View key={f.label} style={styles.featureItem}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <Text style={styles.featureLabel}>{f.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 로그인 버튼 영역 */}
      <View style={styles.buttons}>
        {/* 카카오 로그인 */}
        <TouchableOpacity
          style={[styles.btn, styles.kakaoBtn]}
          onPress={() => handleLogin('kakao', signInWithKakao)}
          disabled={anyLoading}
          activeOpacity={0.8}
        >
          {isLoading('kakao') ? (
            <ActivityIndicator color="#000" size="small" />
          ) : (
            <>
              <Text style={styles.kakaoIcon}>💬</Text>
              <Text style={[styles.btnText, { color: '#191919' }]}>카카오로 로그인</Text>
            </>
          )}
        </TouchableOpacity>

        {/* 구글 로그인 */}
        <TouchableOpacity
          style={[styles.btn, styles.googleBtn]}
          onPress={() => handleLogin('google', signInWithGoogle)}
          disabled={anyLoading}
          activeOpacity={0.8}
        >
          {isLoading('google') ? (
            <ActivityIndicator color={colors.text} size="small" />
          ) : (
            <>
              <Text style={styles.googleG}>G</Text>
              <Text style={[styles.btnText, { color: colors.text }]}>구글로 로그인</Text>
            </>
          )}
        </TouchableOpacity>

        {/* 애플 로그인 — iOS 전용 */}
        {Platform.OS === 'ios' && (
          <TouchableOpacity
            style={[styles.btn, styles.appleBtn]}
            onPress={() => handleLogin('apple', signInWithApple)}
            disabled={anyLoading}
            activeOpacity={0.8}
          >
            {isLoading('apple') ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (
              <>
                <Text style={styles.appleLogo}></Text>
                <Text style={[styles.btnText, { color: '#000' }]}>Apple로 로그인</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        <Text style={styles.disclaimer}>
          로그인 시 서비스{' '}
          <Text style={styles.link}>이용약관</Text> 및{' '}
          <Text style={styles.link}>개인정보 처리방침</Text>에 동의합니다.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.base,
  },
  logoIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  spade: {
    fontSize: 44,
    color: colors.bg,
  },
  logoText: {
    fontSize: 36,
    fontWeight: fontWeight.extrabold,
    color: colors.primary,
    letterSpacing: -0.5,
  },
  logoKr: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    letterSpacing: 6,
    marginTop: -spacing.sm,
  },
  tagline: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 26,
    marginTop: spacing.sm,
  },
  features: {
    flexDirection: 'row',
    gap: spacing.base,
    marginTop: spacing.base,
  },
  featureItem: {
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.line,
  },
  featureIcon: { fontSize: 22 },
  featureLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
  },
  buttons: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.button,
    paddingVertical: 15,
    gap: spacing.sm,
    minHeight: 52,
  },
  btnText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  kakaoBtn: {
    backgroundColor: '#FEE500',
  },
  kakaoIcon: { fontSize: 18 },
  googleBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  googleG: {
    fontSize: 18,
    fontWeight: fontWeight.bold,
    color: '#4285F4',
  },
  appleBtn: {
    backgroundColor: '#FFFFFF',
  },
  appleLogo: {
    fontSize: 20,
    color: '#000',
  },
  disclaimer: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  link: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },
});

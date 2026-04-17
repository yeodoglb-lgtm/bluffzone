import { Platform } from 'react-native';
import { supabase } from './supabase';

// ────────────────────────────────────────────────────────────────────────────
// Google 로그인
// ────────────────────────────────────────────────────────────────────────────
export async function signInWithGoogle(): Promise<{ error: string | null }> {
  try {
    const { GoogleSignin } = await import('@react-native-google-signin/google-signin');

    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? 'PLACEHOLDER',
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? 'PLACEHOLDER',
      offlineAccess: true,
    });

    await GoogleSignin.hasPlayServices();
    await GoogleSignin.signIn();
    const tokens = await GoogleSignin.getTokens();
    const idToken = tokens.idToken;

    if (!idToken) return { error: '구글 ID 토큰을 가져올 수 없습니다.' };

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });

    if (error) return { error: error.message };
    return { error: null };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('Google sign-in error:', msg);
    return { error: msg };
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Apple 로그인 (iOS 전용)
// ────────────────────────────────────────────────────────────────────────────
export async function signInWithApple(): Promise<{ error: string | null }> {
  if (Platform.OS !== 'ios') {
    return { error: 'Apple 로그인은 iOS에서만 지원합니다.' };
  }

  try {
    const AppleAuth = await import('expo-apple-authentication');
    const credential = await AppleAuth.signInAsync({
      requestedScopes: [
        AppleAuth.AppleAuthenticationScope.FULL_NAME,
        AppleAuth.AppleAuthenticationScope.EMAIL,
      ],
    });

    const { identityToken } = credential;
    if (!identityToken) return { error: 'Apple identity token을 가져올 수 없습니다.' };

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: identityToken,
    });

    if (error) return { error: error.message };
    return { error: null };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    // 사용자가 취소한 경우 조용히 처리
    if (msg.includes('ERR_CANCELED')) return { error: null };
    console.error('Apple sign-in error:', msg);
    return { error: msg };
  }
}

// ────────────────────────────────────────────────────────────────────────────
// 카카오 로그인
// ────────────────────────────────────────────────────────────────────────────
export async function signInWithKakao(): Promise<{ error: string | null }> {
  try {
    const { login, getProfile } = await import('@react-native-seoul/kakao-login');

    const token = await login();
    if (!token.accessToken) return { error: '카카오 토큰을 가져올 수 없습니다.' };

    // 카카오는 OIDC ID 토큰 지원 — idToken이 있으면 signInWithIdToken 사용
    if (token.idToken) {
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'kakao',
        token: token.idToken,
        access_token: token.accessToken,
      });
      if (error) return { error: error.message };
      return { error: null };
    }

    // idToken이 없으면 액세스 토큰으로 Edge Function 통해 처리
    // (카카오 OIDC 미설정 환경 폴백)
    const profile = await getProfile();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        queryParams: {
          access_type: 'offline',
        },
      },
    });

    console.log('Kakao profile fetched:', profile.id);
    if (error) return { error: error.message };
    return { error: null };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('Kakao sign-in error:', msg);
    return { error: msg };
  }
}

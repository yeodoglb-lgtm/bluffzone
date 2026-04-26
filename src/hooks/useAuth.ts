import { useEffect, useCallback } from 'react';
import * as Sentry from '@sentry/react-native';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { fetchProfile } from '../services/auth';
import { supabase } from '../services/supabase';
import i18n from '../i18n';

export function useAuthInit() {
  const { setSession, setProfile, setLoading } = useAuthStore();
  const { setCurrency, setLocale, setAiModel, setSttEngine, setAutoReview, setMonthlyGoal } =
    useSettingsStore();

  const syncProfile = useCallback(
    async (userId: string) => {
      const profile = await fetchProfile(userId);
      if (!profile) return;

      setProfile(profile);
      setCurrency(profile.currency);
      setLocale(profile.locale);
      setAiModel(profile.ai_model);
      setSttEngine(profile.stt_engine);
      setAutoReview(profile.auto_review);
      setMonthlyGoal(profile.monthly_goal ?? null);

      // i18n 언어 동기화
      if (i18n.language !== profile.locale) {
        await i18n.changeLanguage(profile.locale);
      }
    },
    [setProfile, setCurrency, setLocale, setAiModel, setSttEngine, setAutoReview, setMonthlyGoal]
  );

  useEffect(() => {
    let loadingDone = false;

    // 2초 안에 인증이 완료되지 않으면 강제로 로딩 해제 (Web Locks 데드락 방지)
    const fallback = setTimeout(() => {
      if (!loadingDone) {
        loadingDone = true;
        setLoading(false);
      }
    }, 2000);

    // Supabase 프리 티어 슬립 대응: 가벼운 ping으로 DB 깨우기
    supabase.from('profiles').select('id', { count: 'exact', head: true }).limit(1).then(
      () => {},
      () => {}
    );

    // onAuthStateChange만 사용 (getSession + onAuthStateChange 동시 호출 시 데드락 발생)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        try {
          setSession(session);
          if (session?.user) {
            // Sentry user 컨텍스트 (어떤 유저가 에러 났는지 추적용. PII 최소화)
            Sentry.setUser({ id: session.user.id });
            await syncProfile(session.user.id);
          } else {
            // 로그아웃 시 Sentry user 정보 클리어
            Sentry.setUser(null);
            setProfile(null);
          }
        } catch (err) {
          console.error('Auth state change error:', err);
        } finally {
          if (!loadingDone) {
            loadingDone = true;
            clearTimeout(fallback);
            setLoading(false);
          }
        }
      }
    );

    return () => {
      subscription.unsubscribe();
      clearTimeout(fallback);
    };
  }, [setSession, setProfile, setLoading, syncProfile]);
}

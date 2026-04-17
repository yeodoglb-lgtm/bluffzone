import { useEffect, useCallback } from 'react';
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
    // 앱 시작 시 기존 세션 복원
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session?.user) await syncProfile(session.user.id);
      setLoading(false);
    });

    // 인증 상태 변경 리스너
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        if (session?.user) {
          await syncProfile(session.user.id);
        } else {
          setProfile(null);
        }
        if (event === 'INITIAL_SESSION') setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [setSession, setProfile, setLoading, syncProfile]);
}

import { useEffect, useCallback } from 'react';
import * as Sentry from '@sentry/browser';
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

    // Supabase 무료 티어 콜드 스타트가 30초까지 걸릴 수 있어서 fallback도 그만큼 길게.
    // 너무 짧으면(2초 등) 콜드 스타트 중에 setLoading(false) → 앱 노출 → 쿼리들 동시에 시작 →
    // auth가 아직 안 잡힌 상태로 RLS 거부되거나 무한 펜딩 → 무한 로딩 화면.
    const fallback = setTimeout(() => {
      if (!loadingDone) {
        loadingDone = true;
        setLoading(false);
      }
    }, 30000);

    // Supabase 프리 티어 슬립 대응: 깨우기 ping을 백오프로 재시도
    // (단발 ping은 콜드 스타트 시 자체가 timeout 걸림 → 재시도 필요)
    (async () => {
      for (let i = 0; i < 3; i++) {
        try {
          await supabase.from('profiles').select('id', { count: 'exact', head: true }).limit(1);
          return; // 성공: DB 깨어남
        } catch {
          await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
        }
      }
    })();

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

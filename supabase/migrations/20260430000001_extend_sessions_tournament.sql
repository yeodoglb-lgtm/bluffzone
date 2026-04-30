-- 세션 테이블 토너먼트 지원 확장
-- 캐시/토너 구분 + 리바이인 횟수 + 최종 순위

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS is_tournament BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reentry_count INT NOT NULL DEFAULT 0 CHECK (reentry_count >= 0),
  ADD COLUMN IF NOT EXISTS finish_position INT CHECK (finish_position IS NULL OR finish_position >= 1);

-- v_sessions 뷰 재정의 (새 컬럼 포함)
CREATE OR REPLACE VIEW public.v_sessions AS
  SELECT *, (cash_out - buy_in) AS net_profit
  FROM public.sessions;

COMMENT ON COLUMN public.sessions.is_tournament IS '세션 유형: false=캐시, true=토너';
COMMENT ON COLUMN public.sessions.reentry_count IS '토너 리바이인 횟수 (캐시는 항상 0)';
COMMENT ON COLUMN public.sessions.finish_position IS '토너 최종 순위 (캐시는 NULL)';

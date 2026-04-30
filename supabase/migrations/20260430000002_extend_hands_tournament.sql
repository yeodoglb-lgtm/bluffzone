-- 핸드 테이블에 토너 컨텍스트 컬럼 추가 (A단계: 스택 + 블라인드만)
-- AI 리뷰 분기 (캐시 vs 토너) + 푸시폴드 차트 lookup용

ALTER TABLE public.hands
  ADD COLUMN IF NOT EXISTS is_tournament BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sb_chips NUMERIC,
  ADD COLUMN IF NOT EXISTS bb_chips NUMERIC,
  ADD COLUMN IF NOT EXISTS ante_chips NUMERIC;

COMMENT ON COLUMN public.hands.is_tournament IS '토너 핸드 여부 (AI 분기 + 푸시폴드 차트 적용)';
COMMENT ON COLUMN public.hands.sb_chips IS '토너 SB 칩 단위';
COMMENT ON COLUMN public.hands.bb_chips IS '토너 BB 칩 단위 (effective_stack을 BB로 환산할 때 사용)';
COMMENT ON COLUMN public.hands.ante_chips IS '토너 앤티 칩 단위';

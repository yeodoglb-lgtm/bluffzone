-- 알파고 리뷰 품질 향상을 위한 선택 입력 필드
-- 모두 NULL 허용 (유저가 입력 안 해도 됨)

ALTER TABLE public.hands
  ADD COLUMN IF NOT EXISTS preflop_aggressor text
    CHECK (preflop_aggressor IN ('hero', 'villain') OR preflop_aggressor IS NULL),
  ADD COLUMN IF NOT EXISTS effective_stack numeric,
  ADD COLUMN IF NOT EXISTS villain_type text;

COMMENT ON COLUMN public.hands.preflop_aggressor IS '프리플랍 어그레서: hero|villain|null';
COMMENT ON COLUMN public.hands.effective_stack IS '유효 스택(원 단위, 히어로·빌런 중 작은 쪽)';
COMMENT ON COLUMN public.hands.villain_type IS '빌런 성향 자유 텍스트';

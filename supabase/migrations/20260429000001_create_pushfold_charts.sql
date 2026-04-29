-- 푸시/폴드 차트 (Nash equilibrium 기반)
-- 토너 단스택 상황에서 포지션·스택별 push/fold 권장 액션
-- 데이터 시드는 별도 스크립트 (scripts/seed-pushfold-charts.mjs)

CREATE TABLE IF NOT EXISTS pushfold_charts (
  id BIGSERIAL PRIMARY KEY,
  position TEXT NOT NULL,         -- 'UTG','UTG+1','MP','HJ','CO','BTN','SB'
  stack_bb INT NOT NULL,          -- 5, 8, 10, 12, 15, 20, 25
  hand TEXT NOT NULL,             -- 'AA','AKs','A5o','76s' 등 169가지
  action TEXT NOT NULL,           -- 'push' | 'fold'
  ev NUMERIC,                     -- (선택) 칩EV 기댓값 in bb
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(position, stack_bb, hand)
);

CREATE INDEX IF NOT EXISTS idx_pushfold_position_stack
  ON pushfold_charts (position, stack_bb);

CREATE INDEX IF NOT EXISTS idx_pushfold_lookup
  ON pushfold_charts (position, stack_bb, hand);

-- RLS: 모두에게 읽기 허용 (참고 자료)
ALTER TABLE pushfold_charts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pushfold_charts_read_all"
  ON pushfold_charts
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- 쓰기는 서비스 롤만 (시드 스크립트용)
COMMENT ON TABLE pushfold_charts IS 'Nash equilibrium push/fold 차트 (토너 단스택용)';

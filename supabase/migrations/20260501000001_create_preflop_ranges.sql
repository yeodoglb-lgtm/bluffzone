-- 프리플랍 차트 (오픈 레이즈, 3벳, 콜드콜)
-- 6-max 캐시 게임 100bb 기준. GTO 솔버 + 일반 통용 레인지 종합.

CREATE TABLE IF NOT EXISTS preflop_ranges (
  id BIGSERIAL PRIMARY KEY,
  position TEXT NOT NULL,    -- 'UTG', 'MP', 'CO', 'BTN', 'SB', 'BB'
  scenario TEXT NOT NULL,    -- 'open' (RFI), '3bet' (vs open), 'call' (vs open)
  hand TEXT NOT NULL,        -- 169 hands: 'AA', 'AKs', 'A5o' 등
  action TEXT NOT NULL,      -- 'raise', 'call', 'fold', 'mixed'
  frequency NUMERIC,         -- 0~1 (mixed 비율, 1이면 100%)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(position, scenario, hand)
);

CREATE INDEX IF NOT EXISTS idx_preflop_position_scenario
  ON preflop_ranges (position, scenario);
CREATE INDEX IF NOT EXISTS idx_preflop_lookup
  ON preflop_ranges (position, scenario, hand);

ALTER TABLE preflop_ranges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "preflop_ranges_read_all"
  ON preflop_ranges
  FOR SELECT
  TO authenticated, anon
  USING (true);

COMMENT ON TABLE preflop_ranges IS 'GTO 프리플랍 레인지 (6-max 캐시 100bb)';

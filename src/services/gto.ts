import { supabase } from './supabase';
import { withTimeout } from './queryTimeout';

export interface PushfoldEntry {
  position: string;
  stack_bb: number;
  hand: string;
  action: 'push' | 'fold';
}

export const PUSHFOLD_POSITIONS = ['UTG', 'UTG+1', 'MP', 'HJ', 'CO', 'BTN', 'SB'] as const;
export const PUSHFOLD_STACKS = [5, 8, 10, 12, 15, 20, 25] as const;

export type PushfoldPosition = typeof PUSHFOLD_POSITIONS[number];
export type PushfoldStack = typeof PUSHFOLD_STACKS[number];

// 특정 포지션·스택의 169핸드 결정 다 가져옴 (1회 호출 → 매트릭스 그리기)
export async function fetchPushfoldChart(
  position: PushfoldPosition,
  stackBb: PushfoldStack
): Promise<PushfoldEntry[]> {
  return withTimeout((async () => {
    const { data, error } = await supabase
      .from('pushfold_charts')
      .select('position, stack_bb, hand, action')
      .eq('position', position)
      .eq('stack_bb', stackBb);
    if (error) throw new Error(error.message ?? String(error));
    return (data ?? []) as PushfoldEntry[];
  })());
}

// 특정 핸드 1개 lookup (AI 리뷰용)
export async function lookupPushfold(
  position: PushfoldPosition,
  stackBb: PushfoldStack,
  hand: string
): Promise<'push' | 'fold' | null> {
  const { data, error } = await supabase
    .from('pushfold_charts')
    .select('action')
    .eq('position', position)
    .eq('stack_bb', stackBb)
    .eq('hand', hand)
    .maybeSingle();
  if (error) return null;
  return (data?.action as 'push' | 'fold') ?? null;
}

// ─── 프리플랍 차트 ──────────────────────────────────────────────────────────

export interface PreflopEntry {
  position: string;
  scenario: string;
  hand: string;
  action: 'raise' | 'call' | 'fold' | 'mixed';
  frequency: number;
}

export const PREFLOP_POSITIONS = ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB'] as const;
export const PREFLOP_SCENARIOS = [
  { key: 'open', label: '오픈 (RFI)', desc: '폴드되어 자기 차례에 처음 오픈' },
  { key: '3bet', label: '3벳 (vs 오픈)', desc: '앞 포지션 오픈에 3벳' },
  { key: 'call', label: '콜드콜 (vs 오픈)', desc: '앞 포지션 오픈에 콜만' },
] as const;

export type PreflopPosition = typeof PREFLOP_POSITIONS[number];
export type PreflopScenario = typeof PREFLOP_SCENARIOS[number]['key'];

export async function fetchPreflopChart(
  position: PreflopPosition,
  scenario: PreflopScenario
): Promise<PreflopEntry[]> {
  return withTimeout((async () => {
    const { data, error } = await supabase
      .from('preflop_ranges')
      .select('position, scenario, hand, action, frequency')
      .eq('position', position)
      .eq('scenario', scenario);
    if (error) throw new Error(error.message ?? String(error));
    return (data ?? []) as PreflopEntry[];
  })());
}

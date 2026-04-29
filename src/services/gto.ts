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
    if (error) throw error;
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

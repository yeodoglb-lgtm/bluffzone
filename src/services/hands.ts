import { supabase } from './supabase';
import { withTimeout } from './queryTimeout';
import type {
  Card,
  HandAction,
  GameType,
  Position9Max,
  ResultType,
  ReviewStatus,
} from '../constants/poker';

export interface Hand {
  id: string;
  user_id: string;
  session_id: string | null;
  played_at: string;
  game_type: GameType;
  stakes: string | null;
  hero_position: Position9Max | null;
  villain_position: Position9Max | null;
  hero_cards: Card[];
  villain_known: boolean;
  villain_cards: Card[] | null;
  board: Card[] | null;
  actions: HandAction[];
  result: ResultType | null;
  pot_size: number | null;
  hero_pl: number | null;
  note: string | null;
  raw_voice_text: string | null;
  review_status: ReviewStatus;
  review: Record<string, unknown> | null;
  reviewed_at: string | null;
  review_model: string | null;
  share_id: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export type HandInsert = Omit<Hand, 'id' | 'created_at' | 'updated_at'>;

// 핸드에 작성자 닉네임을 포함한 타입 (어드민 전용)
export interface HandWithUser extends Hand {
  display_name: string | null;
}

// ── 어드민 전용: 전체 유저 핸드 조회 (프로필 조인 없이 단순 조회)
// display_name 은 호출 측에서 userNameMap 으로 주입
export async function fetchAllHandsAdmin(limit = 200): Promise<Hand[]> {
  return withTimeout((async () => {
    const { data, error } = await supabase
      .from('hands')
      .select('*')
      .order('played_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as Hand[];
  })());
}

export async function fetchHands(limit = 50, offset = 0): Promise<Hand[]> {
  return withTimeout((async () => {
    const { data, error } = await supabase
      .from('hands')
      .select('*')
      .order('played_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    return (data ?? []) as Hand[];
  })());
}

export async function fetchHand(id: string): Promise<Hand | null> {
  return withTimeout((async () => {
    const { data, error } = await supabase
      .from('hands')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return null;
    return data as Hand;
  })());
}

export async function createHand(input: HandInsert): Promise<Hand> {
  const { data, error } = await supabase
    .from('hands')
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data as Hand;
}

export async function updateHand(id: string, input: Partial<HandInsert>): Promise<Hand> {
  const { data, error } = await supabase
    .from('hands')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Hand;
}

export async function deleteHand(id: string): Promise<void> {
  const { error } = await supabase.from('hands').delete().eq('id', id);
  if (error) throw error;
}

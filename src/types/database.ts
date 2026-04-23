import type { Card, HandAction, GameType, Currency, AiModel, SttEngine, ReviewStatus, ResultType } from '../constants/poker';

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  currency: Currency;
  locale: 'ko' | 'en';
  ai_model: AiModel;
  stt_engine: SttEngine;
  auto_review: boolean;
  role: 'user' | 'admin';
  monthly_goal?: number | null;
  created_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  played_on: string;
  started_at: string | null;
  ended_at: string | null;
  place_id: string | null;
  place_name_snapshot: string | null;
  game_type: GameType | null;
  stakes: string | null;
  buy_in: number;
  cash_out: number;
  currency: Currency;
  note: string | null;
  created_at: string;
}

export interface SessionWithProfit extends Session {
  net_profit: number;
}

export interface StreetReview {
  action: string;
  frequency: number;
  comment: string;
}

export interface HandReview {
  streets: {
    preflop?: StreetReview | null;
    flop?: StreetReview | null;
    turn?: StreetReview | null;
    river?: StreetReview | null;
  };
  mistake: string;
  tip: string;
  _cached?: boolean;
  _fallback?: boolean;
}

export interface Hand {
  id: string;
  user_id: string;
  session_id: string | null;
  played_at: string;
  game_type: GameType;
  stakes: string | null;
  hero_position: string | null;
  villain_position: string | null;
  hero_cards: Card[];
  villain_known: boolean;
  villain_cards: Card[] | null;
  board: Card[] | null;
  actions: HandAction[];
  result: ResultType | null;
  pot_size: number | null;
  hero_pl: number | null;
  // ── 알파고 리뷰용 선택 입력 ──────────────────────────────────────────────
  // 프리플랍 어그레서: 'hero' | 'villain' | null (null = 모름/없음)
  preflop_aggressor: 'hero' | 'villain' | null;
  // 유효 스택 (원 단위, 히어로·빌런 중 작은 쪽)
  effective_stack: number | null;
  // 빌런 성향 — 자유 텍스트 (예: "타이트-패시브", "루즈-어그레시브/LAG")
  villain_type: string | null;
  note: string | null;
  raw_voice_text: string | null;
  review_status: ReviewStatus;
  review: HandReview | null;
  reviewed_at: string | null;
  review_model: string | null;
  share_id: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface AiChat {
  id: string;
  user_id: string;
  title: string | null;
  created_at: string;
}

export interface AiMessage {
  id: string;
  chat_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  raw_voice_text: string | null;
  created_at: string;
}

export interface Place {
  id: string;
  name: string;
  address: string | null;
  road_address: string | null;
  lat: number;
  lng: number;
  phone: string | null;
  hours: Record<string, { open: string; close: string }> | null;
  games: string[] | null;
  min_buyin: number | null;
  max_buyin: number | null;
  amenities: string[] | null;
  photos: string[];
  description: string | null;
  is_active: boolean;
  featured: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

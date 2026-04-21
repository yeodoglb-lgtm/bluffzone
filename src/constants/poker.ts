export const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'] as const;
export const SUITS = ['s', 'h', 'd', 'c'] as const;
export const POSITIONS_9MAX = ['UTG', 'UTG+1', 'MP', 'HJ', 'CO', 'BTN', 'SB', 'BB'] as const;
export const POSITIONS_6MAX = ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB'] as const;
export const STREETS = ['preflop', 'flop', 'turn', 'river'] as const;
export const ACTIONS = ['fold', 'check', 'call', 'bet', 'raise', 'allin'] as const;
export const GAME_TYPES = ['NLH', 'PLO', 'Tournament', 'PLO5', 'Mixed'] as const;
export const RESULT_TYPES = ['won', 'lost', 'chopped', 'folded'] as const;

export type Rank = (typeof RANKS)[number];
export type Suit = (typeof SUITS)[number];
export type Position9Max = (typeof POSITIONS_9MAX)[number];
export type Position6Max = (typeof POSITIONS_6MAX)[number];
export type Position = Position9Max | Position6Max;
export type Street = (typeof STREETS)[number];
export type Action = (typeof ACTIONS)[number];
export type GameType = (typeof GAME_TYPES)[number];
export type ResultType = (typeof RESULT_TYPES)[number];

export interface Card {
  rank: Rank;
  suit: Suit;
}

export interface HandAction {
  street: Street;
  actor: 'hero' | 'villain' | string;
  action: Action;
  amount?: number;
}

export const SUIT_COLORS: Record<Suit, string> = {
  s: '#1a1a1a',
  h: '#EF4444',
  d: '#3B82F6',
  c: '#22C55E',
};

export const SUIT_SYMBOLS: Record<Suit, string> = {
  s: '♠',
  h: '♥',
  d: '♦',
  c: '♣',
};

export const CURRENCIES = ['KRW', 'USD'] as const;
export type Currency = (typeof CURRENCIES)[number];

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  KRW: '₩',
  USD: '$',
};

export const AI_MODELS = [
  'claude-sonnet-4-6',
  'claude-opus-4-7',
  'claude-haiku-4-5-20251001',
] as const;
export type AiModel = (typeof AI_MODELS)[number];

export const STT_ENGINES = ['device', 'whisper'] as const;
export type SttEngine = (typeof STT_ENGINES)[number];

export const REVIEW_STATUSES = ['none', 'pending', 'done', 'error'] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

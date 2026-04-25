import { create } from 'zustand';
import type { Currency, AiModel, SttEngine } from '../constants/poker';

interface SettingsState {
  currency: Currency;
  locale: 'ko' | 'en';
  aiModel: AiModel;
  sttEngine: SttEngine;
  autoReview: boolean;
  monthlyGoal: number | null;
  lossProtect: boolean;
  defaultBbKrw: number; // 음성 핸드 입력 시 기본 빅블라인드 (원 단위), 0=미설정
  setCurrency: (currency: Currency) => void;
  setLocale: (locale: 'ko' | 'en') => void;
  setAiModel: (model: AiModel) => void;
  setSttEngine: (engine: SttEngine) => void;
  setAutoReview: (value: boolean) => void;
  setMonthlyGoal: (goal: number | null) => void;
  setLossProtect: (value: boolean) => void;
  setDefaultBbKrw: (bb: number) => void;
}

export const useSettingsStore = create<SettingsState>(set => ({
  currency: 'KRW',
  locale: 'ko',
  aiModel: 'gpt-4o-mini',
  sttEngine: 'whisper',
  autoReview: false,
  monthlyGoal: null,
  lossProtect: true,
  defaultBbKrw: 10000, // 기본 1만원 BB
  setCurrency: currency => set({ currency }),
  setLocale: locale => set({ locale }),
  setAiModel: aiModel => set({ aiModel }),
  setSttEngine: sttEngine => set({ sttEngine }),
  setAutoReview: autoReview => set({ autoReview }),
  setMonthlyGoal: monthlyGoal => set({ monthlyGoal }),
  setLossProtect: lossProtect => set({ lossProtect }),
  setDefaultBbKrw: defaultBbKrw => set({ defaultBbKrw }),
}));

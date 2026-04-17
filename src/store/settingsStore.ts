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
  setCurrency: (currency: Currency) => void;
  setLocale: (locale: 'ko' | 'en') => void;
  setAiModel: (model: AiModel) => void;
  setSttEngine: (engine: SttEngine) => void;
  setAutoReview: (value: boolean) => void;
  setMonthlyGoal: (goal: number | null) => void;
  setLossProtect: (value: boolean) => void;
}

export const useSettingsStore = create<SettingsState>(set => ({
  currency: 'KRW',
  locale: 'ko',
  aiModel: 'claude-sonnet-4-6',
  sttEngine: 'device',
  autoReview: false,
  monthlyGoal: null,
  lossProtect: true,
  setCurrency: currency => set({ currency }),
  setLocale: locale => set({ locale }),
  setAiModel: aiModel => set({ aiModel }),
  setSttEngine: sttEngine => set({ sttEngine }),
  setAutoReview: autoReview => set({ autoReview }),
  setMonthlyGoal: monthlyGoal => set({ monthlyGoal }),
  setLossProtect: lossProtect => set({ lossProtect }),
}));

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';

import ko from './ko';
import en from './en';

const resources = {
  ko: { translation: ko },
  en: { translation: en },
};

const deviceLocale = getLocales()[0]?.languageCode ?? 'ko';
const defaultLang = deviceLocale.startsWith('ko') ? 'ko' : 'en';

i18n.use(initReactI18next).init({
  resources,
  lng: defaultLang,
  fallbackLng: 'ko',
  interpolation: { escapeValue: false },
  compatibilityJSON: 'v3',
});

export default i18n;
export type TranslationKeys = typeof ko;

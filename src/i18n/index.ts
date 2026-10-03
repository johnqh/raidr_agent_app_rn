/**
 * i18n Configuration for raidr agent
 *
 * Loads translations from assets/locales and configures i18next.
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'react-native-localize';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resources } from '@/assets/locales';

const SUPPORTED_LANGUAGES = [
  'en',
  'de',
  'es',
  'fr',
  'it',
  'ja',
  'ko',
  'pt',
  'ru',
  'sv',
  'th',
  'uk',
  'vi',
  'zh',
  'zh-Hant',
] as const;

const LANGUAGE_STORAGE_KEY = '@raidr_agent/language';

// Detect the best initial language
function getInitialLanguage(): string {
  try {
    const locales = getLocales();
    if (locales.length > 0) {
      const deviceLang = locales[0].languageCode;
      if (SUPPORTED_LANGUAGES.includes(deviceLang as any)) {
        return deviceLang;
      }
    }
  } catch {
    // Fallback to English
  }
  return 'en';
}

i18n.use(initReactI18next).init({
  resources,
  lng: getInitialLanguage(),
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

/**
 * Load stored language preference from AsyncStorage and apply it.
 * Called once at app startup.
 */
export async function loadStoredLanguagePreference(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored && SUPPORTED_LANGUAGES.includes(stored as any)) {
      await i18n.changeLanguage(stored);
    }
  } catch {
    // Ignore errors
  }
}

/**
 * Change language and persist the preference.
 */
export async function changeLanguage(lang: string): Promise<void> {
  await i18n.changeLanguage(lang);
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  } catch {
    // Ignore errors
  }
}

export default i18n;

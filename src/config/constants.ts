/**
 * App constants
 */

import { env } from './env';

export const APP_NAME = env.APP_NAME;
export const APP_DOMAIN = env.APP_DOMAIN;
export const COMPANY_NAME = env.COMPANY_NAME;

// Default language
export const DEFAULT_LANGUAGE = 'en';

// Supported languages
export const SUPPORTED_LANGUAGES = [
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
];

// Storage keys
export const STORAGE_KEYS = {
  LANGUAGE: '@raidr_agent/language',
  SETTINGS: '@raidr_agent/settings',
} as const;

// Tab names
export const TAB_NAMES = {
  SETTINGS: 'SettingsTab',
} as const;

/**
 * How the app looks: language and theme, each a `Select`, and the build
 * under them — music_app_rn's Appearance section.
 */

import React from 'react';
import { View } from 'react-native';
import { AppVersion, Select, Text } from '@sudobility/components-rn';
import { useTranslation } from 'react-i18next';
import { version as appVersion } from '../../../package.json';
import { changeLanguage } from '@/i18n';
import {
  APP_NAME,
  COMPANY_NAME,
  SUPPORTED_LANGUAGES,
} from '@/config/constants';
import { useSettingsStore, type ThemeMode } from '@/stores/settingsStore';
import { trackButtonClick } from '@/analytics';
import { SettingsGroup, SettingsRow } from './SettingsRows';

/** Each language's name in its own script. */
const LANGUAGE_LABELS: Record<string, string> = {
  en: 'English',
  de: 'Deutsch',
  es: 'Español',
  fr: 'Français',
  it: 'Italiano',
  ja: '日本語',
  ko: '한국어',
  pt: 'Português',
  ru: 'Русский',
  sv: 'Svenska',
  th: 'ไทย',
  uk: 'Українська',
  vi: 'Tiếng Việt',
  zh: '中文(简体)',
  'zh-Hant': '中文(繁體)',
};

/**
 * `system` is offered alongside the two overrides rather than being the
 * absence of one: "follow the OS again" is a choice, remembered like any other.
 */
const THEMES: readonly ThemeMode[] = ['system', 'light', 'dark'];

export default function AppearanceSection() {
  const { t, i18n } = useTranslation();
  const theme = useSettingsStore(s => s.theme);
  const setTheme = useSettingsStore(s => s.setTheme);

  return (
    <>
      <SettingsGroup>
        <SettingsRow
          label={t('settings.language')}
          description={t('settings.languageDescription')}
        >
          <Select
            value={i18n.language}
            // A select's visible label sits outside it, so without this a
            // screen reader announces only the value — "English", with no
            // word for what is English.
            accessibilityLabel={t('settings.language')}
            options={SUPPORTED_LANGUAGES.map(code => ({
              value: code,
              label: LANGUAGE_LABELS[code] ?? code,
            }))}
            onValueChange={(value: string) => {
              trackButtonClick('language_change');
              changeLanguage(value);
            }}
          />
        </SettingsRow>
        <SettingsRow
          label={t('settings.theme.label')}
          description={t('settings.themeDescription')}
        >
          <Select
            value={theme}
            accessibilityLabel={t('settings.theme.label')}
            options={THEMES.map(value => ({
              value,
              label: t(`settings.theme.${value}`),
            }))}
            onValueChange={(value: string) => {
              trackButtonClick('theme_change');
              setTheme(value as ThemeMode);
            }}
          />
        </SettingsRow>
      </SettingsGroup>

      {/* The build, which a bug report needs and nothing else states. */}
      <View className='px-1'>
        <AppVersion appName={APP_NAME} version={appVersion} />
        <Text size='xs' color='muted' className='mt-1'>
          {t('settings.copyright', { companyName: COMPANY_NAME })}
        </Text>
      </View>
    </>
  );
}

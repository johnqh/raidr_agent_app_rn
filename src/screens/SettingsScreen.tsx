/**
 * SettingsScreen - App settings and preferences
 *
 * Displays appearance settings (theme), account info with sign-in/sign-out,
 * and about section. Signing in is not this screen's job, so the Account
 * row opens `SignInModal` (the shared `LoginModal`) over it; on success the
 * modal closes and the row shows the signed-in account.
 *
 * Styling comes entirely from the design system: layout via NativeWind
 * `className`, colors via semantic tokens (bg-card, text-foreground,
 * text-muted-foreground, border-border, ...) and `@sudobility/components-rn`
 * components — no StyleSheet colors or hardcoded literals.
 */

import React, { useCallback, useState, useEffect } from 'react';
import { View, Pressable, ScrollView, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Spinner } from '@sudobility/components-rn';
import { useTabBarHeight } from '@/hooks/useTabBarHeight';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { useAuth } from '@/context/AuthContext';
import { useSettingsStore, type ThemeMode } from '@/stores/settingsStore';
import { changeLanguage } from '@/i18n';
import { SUPPORTED_LANGUAGES, COMPANY_NAME } from '@/config/constants';
import SignInModal from '@/components/SignInModal';
import type { SettingsScreenProps } from '@/navigation/types';
import { trackScreenView, trackButtonClick, trackEvent } from '@/analytics';

/** Display names for supported languages (in their native script). */
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

/** Available theme options for the theme picker. */
const themes: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

/** A bordered separator between rows inside a settings group. */
function RowSeparator() {
  return <View className='h-px ml-4 bg-border' />;
}

export default function SettingsScreen(_props: SettingsScreenProps) {
  const { t } = useTranslation();
  const { user, isLoading: authLoading, signOut } = useAuth();
  const { theme, setTheme } = useSettingsStore();

  const tabBarHeight = useTabBarHeight();

  useEffect(() => {
    trackScreenView('Settings');
  }, []);

  // Sign-in modal state
  const [showSignIn, setShowSignIn] = useState(false);

  /** Show an alert to pick a theme mode. */
  const handleThemeChange = useCallback(() => {
    trackButtonClick('theme_change');
    const currentIndex = themes.findIndex(th => th.value === theme);

    Alert.alert(t('settings.selectTheme'), undefined, [
      ...themes.map((th, index) => ({
        text: `${t(`settings.theme.${th.value}`, th.label)}${
          index === currentIndex ? ' ✓' : ''
        }`,
        onPress: () => setTheme(th.value),
      })),
      { text: t('common.cancel'), style: 'cancel' as const },
    ]);
  }, [theme, setTheme, t]);

  /** Show an alert to pick a language. */
  const handleLanguageChange = useCallback(() => {
    trackButtonClick('language_change');
    const activeLang = i18n.language;
    Alert.alert(t('settings.language'), undefined, [
      ...SUPPORTED_LANGUAGES.map(lang => ({
        text: `${LANGUAGE_LABELS[lang] ?? lang}${
          lang === activeLang ? ' ✓' : ''
        }`,
        onPress: () => changeLanguage(lang),
      })),
      { text: t('common.cancel'), style: 'cancel' as const },
    ]);
  }, [t]);

  /** Confirm and execute sign-out. */
  const handleSignOut = useCallback(async () => {
    trackButtonClick('sign_out');
    Alert.alert(t('auth.signOut'), t('auth.signOutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('auth.signOut'),
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
            trackEvent('signed_out');
          } catch (error) {
            console.error('Sign out error:', error);
          }
        },
      },
    ]);
  }, [signOut, t]);

  const currentTheme = themes.find(th => th.value === theme)?.label ?? 'System';

  return (
    <SafeAreaView className='flex-1 bg-background' edges={['left', 'right']}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: tabBarHeight + 16 },
        ]}
      >
        {/* Appearance Section */}
        <View className='mb-7'>
          <Text
            size='sm'
            weight='semibold'
            color='muted'
            transform='uppercase'
            className='mb-2 px-1 tracking-wide'
          >
            {t('settings.appearance')}
          </Text>
          <View className='rounded-lg overflow-hidden bg-card'>
            <Pressable
              className='flex-row justify-between items-center py-3 px-4'
              onPress={handleThemeChange}
              accessibilityRole='button'
              accessibilityLabel={`${t('settings.theme.label')}: ${t(
                `settings.theme.${theme}`,
                currentTheme
              )}`}
            >
              <View className='flex-1 mr-3'>
                <Text size='base'>{t('settings.theme.label')}</Text>
                <Text size='sm' color='muted' className='mt-0.5'>
                  {t('settings.themeDescription')}
                </Text>
              </View>
              <Text size='base' color='muted'>
                {t(`settings.theme.${theme}`, currentTheme)}
              </Text>
            </Pressable>
            <RowSeparator />
            <Pressable
              className='flex-row justify-between items-center py-3 px-4'
              onPress={handleLanguageChange}
              accessibilityRole='button'
              accessibilityLabel={`${t('settings.language')}: ${
                LANGUAGE_LABELS[i18n.language] ?? i18n.language
              }`}
            >
              <View className='flex-1 mr-3'>
                <Text size='base'>{t('settings.language')}</Text>
                <Text size='sm' color='muted' className='mt-0.5'>
                  {t('settings.languageDescription')}
                </Text>
              </View>
              <Text size='base' color='muted'>
                {LANGUAGE_LABELS[i18n.language] ?? i18n.language}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Account Section */}
        <View className='mb-7'>
          <Text
            size='sm'
            weight='semibold'
            color='muted'
            transform='uppercase'
            className='mb-2 px-1 tracking-wide'
          >
            {t('settings.account')}
          </Text>
          <View className='rounded-lg overflow-hidden bg-card'>
            {authLoading ? (
              <View className='flex-row justify-between items-center py-3 px-4'>
                <Spinner size='small' />
              </View>
            ) : user ? (
              <View className='flex-row justify-between items-center py-3 px-4'>
                <View className='flex-1 mr-3'>
                  <Text size='base'>{user.email || t('auth.signedIn')}</Text>
                  <Text size='sm' color='muted' className='mt-0.5'>
                    {user.displayName || user.uid.substring(0, 8)}
                  </Text>
                </View>
                <Pressable
                  onPress={handleSignOut}
                  accessibilityRole='button'
                  accessibilityLabel={t('auth.signOut')}
                >
                  <Text size='base' color='primary'>
                    {t('auth.signOut')}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                className='flex-row justify-between items-center py-3 px-4'
                onPress={() => {
                  trackButtonClick('sign_in');
                  setShowSignIn(true);
                }}
                accessibilityRole='button'
                accessibilityLabel={t('auth.signIn')}
              >
                <View className='flex-1 mr-3'>
                  <Text size='base'>{t('auth.signIn')}</Text>
                  <Text size='sm' color='muted' className='mt-0.5'>
                    {t('settings.signInDescription')}
                  </Text>
                </View>
                <Text size='xl' color='muted'>
                  {'›'}
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* About Section */}
        <View className='mb-7'>
          <Text
            size='sm'
            weight='semibold'
            color='muted'
            transform='uppercase'
            className='mb-2 px-1 tracking-wide'
          >
            {t('settings.about')}
          </Text>
          <Text size='sm' color='muted' className='px-1'>
            {t('settings.version')}
          </Text>
          <Text size='xs' color='muted' className='mt-1 px-1'>
            {t('settings.copyright', { companyName: COMPANY_NAME })}
          </Text>
        </View>
      </ScrollView>

      <SignInModal visible={showSignIn} onClose={() => setShowSignIn(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
});

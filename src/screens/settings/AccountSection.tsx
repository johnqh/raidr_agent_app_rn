/**
 * The app account (Firebase, through `AuthContext`). Signing in is not this
 * screen's job, so "Sign in" opens `SignInModal` (the shared `LoginModal`)
 * over it; on success the modal closes and the section shows the account.
 */

import React, { useCallback, useState } from 'react';
import { Alert, Pressable } from 'react-native';
import { Button, Spinner, Text } from '@sudobility/components-rn';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import SignInModal from '@/components/SignInModal';
import { trackButtonClick, trackEvent } from '@/analytics';
import { SettingsGroup, SettingsRow } from './SettingsRows';

export default function AccountSection() {
  const { t } = useTranslation();
  const { user, isLoading, signOut } = useAuth();
  const [showSignIn, setShowSignIn] = useState(false);

  const handleSignOut = useCallback(() => {
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

  if (isLoading) {
    return <Spinner size='small' />;
  }

  return (
    <>
      {user ? (
        <>
          <SettingsGroup>
            <SettingsRow label={t('settings.accountEmail')}>
              <Text size='base' color='muted'>
                {user.email || t('auth.signedIn')}
              </Text>
            </SettingsRow>
            {user.displayName ? (
              <SettingsRow label={t('settings.accountName')}>
                <Text size='base' color='muted'>
                  {user.displayName}
                </Text>
              </SettingsRow>
            ) : null}
          </SettingsGroup>
          <Button
            variant='outline'
            onPress={handleSignOut}
            accessibilityLabel={t('auth.signOut')}
            testID='settings-sign-out'
          >
            {t('auth.signOut')}
          </Button>
        </>
      ) : (
        <SettingsGroup footer={t('settings.signInDescription')}>
          <Pressable
            onPress={() => {
              trackButtonClick('sign_in');
              setShowSignIn(true);
            }}
            accessibilityRole='button'
            accessibilityLabel={t('auth.signIn')}
          >
            <SettingsRow label={t('auth.signIn')}>
              <Text size='xl' color='muted'>
                {'›'}
              </Text>
            </SettingsRow>
          </Pressable>
        </SettingsGroup>
      )}
      <SignInModal visible={showSignIn} onClose={() => setShowSignIn(false)} />
    </>
  );
}

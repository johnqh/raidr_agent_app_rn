/**
 * useSignInForm — what the shared sign-in form needs from this app.
 *
 * The form itself is `@sudobility/components-rn`'s `LoginView`, drawn either
 * by `LoginPage` (`@sudobility/building_blocks_rn`) on a screen somebody goes
 * to in order to sign in, or by `LoginModal` where sign-in interrupts
 * something else. Both take the same handlers and strings, so they come from
 * here: the AuthContext's sign-in calls wrapped with the app's analytics, the
 * providers this build offers, every string through i18n, and Apple's mark in
 * the tone the app's resolved theme calls for.
 */

import { useMemo } from 'react';
import { useTheme } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import type { LoginModalText } from '@sudobility/components-rn';
import type { LoginPageText } from '@sudobility/building_blocks_rn';
import {
  APPLE_SIGN_IN_OFFERED,
  GOOGLE_SIGN_IN_OFFERED,
  useAuth,
} from '@/context/AuthContext';
import { trackButtonClick, trackError, trackEvent } from '@/analytics';

/**
 * Whether a sign-in rejected because the person closed the provider's sheet.
 * auth_lib (0.0.105+) rejects a cancelled Google or Apple sign-in with
 * `auth/user-cancelled`, which `LoginView` already reads as backing out; the
 * popup codes are Firebase's own word for the same thing. This is auth_lib's
 * `isSignInCancelled`, restated: 0.0.105 defines it but does not export it
 * from any entry point its `exports` map opens (`.` or `./auth-js`). Import it
 * from there once a release does.
 */
const SIGN_IN_CANCELLED_CODES = [
  'auth/user-cancelled',
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
];

// TODO: import from @sudobility/auth_lib once its entry re-exports it
export function isSignInCancelled(error: unknown): boolean {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === 'string' && SIGN_IN_CANCELLED_CODES.includes(code);
}

function failureMessage(error: unknown): string {
  const failure = error as { message?: string } | null;
  return failure?.message || 'unknown';
}

export function useSignInForm() {
  const { t } = useTranslation();
  const { dark } = useTheme();
  const {
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signInWithApple,
    sendPasswordResetEmail,
  } = useAuth();

  const handlers = useMemo(
    () => ({
      onEmailSignIn: async (email: string, password: string) => {
        trackButtonClick('email_sign_in');
        try {
          await signInWithEmail(email, password);
          trackEvent('signed_in');
        } catch (error) {
          trackError(failureMessage(error), 'signin_error');
          throw error;
        }
      },
      onEmailSignUp: async (email: string, password: string) => {
        trackButtonClick('email_sign_up');
        try {
          await signUpWithEmail(email, password);
          trackEvent('signed_up');
        } catch (error) {
          trackError(failureMessage(error), 'signup_error');
          throw error;
        }
      },
      onPasswordReset: async (email: string) => {
        trackButtonClick('password_reset');
        try {
          await sendPasswordResetEmail(email);
          trackEvent('password_reset_sent');
        } catch (error) {
          trackError(failureMessage(error), 'password_reset_error');
          throw error;
        }
      },
      onGoogleSignIn: async () => {
        trackButtonClick('google_sign_in');
        try {
          await signInWithGoogle();
          trackEvent('signed_in_google');
        } catch (error) {
          // Backing out of Google's sheet is not a failure: record nothing,
          // and rethrow so the form stays open and says nothing either.
          if (!isSignInCancelled(error)) {
            trackError(failureMessage(error), 'google_sign_in_error');
          }
          throw error;
        }
      },
      onAppleSignIn: async () => {
        trackButtonClick('apple_sign_in');
        try {
          await signInWithApple();
          trackEvent('signed_in_apple');
        } catch (error) {
          if (!isSignInCancelled(error)) {
            trackError(failureMessage(error), 'apple_sign_in_error');
          }
          throw error;
        }
      },
    }),
    [
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      signInWithApple,
      sendPasswordResetEmail,
    ]
  );

  const text: LoginPageText = useMemo(
    () => ({
      signIn: t('auth.signIn'),
      signUp: t('auth.signUp'),
      emailLabel: t('auth.email'),
      emailPlaceholder: '',
      passwordLabel: t('auth.password'),
      passwordPlaceholder: '',
      orContinueWith: t('auth.orContinueWith'),
      signInWithGoogle: t('auth.signInWithGoogle'),
      signInWithApple: t('auth.signInWithApple'),
      alreadyHaveAccount: t('auth.alreadyHaveAccount'),
      dontHaveAccount: t('auth.dontHaveAccount'),
      missingFields: t('auth.missingFields'),
      genericError: t('auth.error'),
      forgotPassword: t('auth.forgotPassword'),
      resetPasswordHint: t('auth.resetPasswordHint'),
      sendResetLink: t('auth.sendResetLink'),
      resetEmailSent: t('auth.resetEmailSent'),
      backToSignIn: t('auth.backToSignIn'),
      missingEmail: t('auth.missingEmail'),
      signInToAccount: t('auth.signInToAccount'),
      createAccount: t('auth.createAccount'),
      resetPassword: t('auth.resetPassword'),
    }),
    [t]
  );

  const modalText: LoginModalText = useMemo(
    () => ({
      signInTitle: t('auth.signIn'),
      signUpTitle: t('auth.createAccount'),
      resetPasswordTitle: t('auth.resetPassword'),
      close: t('auth.close'),
    }),
    [t]
  );

  return {
    ...handlers,
    text,
    modalText,
    showGoogleSignIn: GOOGLE_SIGN_IN_OFFERED,
    showAppleSignIn: APPLE_SIGN_IN_OFFERED,
    appleLogoTone: dark ? ('white' as const) : ('black' as const),
  };
}

/**
 * SignInModal — `LoginModal` from `@sudobility/components-rn`, wired to this
 * app's auth.
 *
 * Use it where signing in interrupts something else (a "Sign in" row on a
 * screen whose job is not signing in, an action that needs an account): it
 * opens over the current screen and, on success, closes itself and leaves the
 * user where they were, now signed in. A screen somebody navigates to in
 * order to sign in renders `LoginPage` from `@sudobility/building_blocks_rn`
 * instead, with the same `useSignInForm()`.
 */

import React from 'react';
import { LoginModal } from '@sudobility/components-rn';
import { useSignInForm } from '@/hooks/useSignInForm';

export interface SignInModalProps {
  visible: boolean;
  onClose: () => void;
  /** Told once somebody has signed in, before the modal closes itself. */
  onSuccess?: () => void;
}

export default function SignInModal({
  visible,
  onClose,
  onSuccess,
}: SignInModalProps) {
  const form = useSignInForm();
  return (
    <LoginModal
      visible={visible}
      onClose={onClose}
      {...(onSuccess ? { onSuccess } : {})}
      modalText={form.modalText}
      text={form.text}
      onEmailSignIn={form.onEmailSignIn}
      onEmailSignUp={form.onEmailSignUp}
      onPasswordReset={form.onPasswordReset}
      {...(form.showGoogleSignIn
        ? { onGoogleSignIn: form.onGoogleSignIn }
        : {})}
      {...(form.showAppleSignIn ? { onAppleSignIn: form.onAppleSignIn } : {})}
      appleLogoTone={form.appleLogoTone}
    />
  );
}

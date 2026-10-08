/**
 * Settings is not a sign-in screen, so signing in from it opens the shared
 * `LoginModal` over it rather than navigating anywhere.
 */
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { LoginModal } from '@sudobility/components-rn';
import SettingsScreen from '../SettingsScreen';
import type { SettingsScreenProps } from '@/navigation/types';
import { trackError, trackEvent } from '@/analytics';

const mockAuth = {
  user: null as null | { uid: string; email: string; displayName: string },
  isLoading: false,
  signOut: jest.fn(),
  signInWithEmail: jest.fn(() => Promise.resolve()),
  signUpWithEmail: jest.fn(() => Promise.resolve()),
  signInWithGoogle: jest.fn(() => Promise.resolve()),
  signInWithApple: jest.fn(() => Promise.resolve()),
  sendPasswordResetEmail: jest.fn(() => Promise.resolve()),
};

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => mockAuth,
  GOOGLE_SIGN_IN_OFFERED: true,
  APPLE_SIGN_IN_OFFERED: false,
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('@/hooks/useLlmKeys', () => ({
  useLlmKeys: () => ({ effective: [], configured: [] }),
}));
jest.mock('@/hooks/useTabBarHeight', () => ({ useTabBarHeight: () => 0 }));
jest.mock('@/i18n', () => ({
  __esModule: true,
  default: { language: 'en' },
  changeLanguage: jest.fn(),
}));
jest.mock('@/analytics', () => ({
  trackScreenView: jest.fn(),
  trackButtonClick: jest.fn(),
  trackEvent: jest.fn(),
  trackError: jest.fn(),
}));
jest.mock('@/config/constants', () => ({
  SUPPORTED_LANGUAGES: ['en'],
  COMPANY_NAME: 'Test',
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('@react-navigation/native', () => ({
  useTheme: () => ({ dark: false }),
}));

const props = {} as SettingsScreenProps;

function render(): ReactTestRenderer {
  let tree: ReactTestRenderer | undefined;
  act(() => {
    tree = create(<SettingsScreen {...props} />);
  });
  return tree!;
}

describe('SettingsScreen sign-in', () => {
  beforeEach(() => {
    mockAuth.user = null;
  });

  it('opens LoginModal over the screen when signed out', () => {
    const tree = render();
    const modal = tree.root.findByType(LoginModal);
    expect(modal.props.visible).toBe(false);

    const row = tree.root.find(
      node =>
        node.props.accessibilityLabel === 'auth.signIn' &&
        typeof node.props.onPress === 'function'
    );
    act(() => {
      row.props.onPress();
    });

    const opened = tree.root.findByType(LoginModal);
    expect(opened.props.visible).toBe(true);
    expect(opened.props.modalText.signInTitle).toBe('auth.signIn');
    expect(opened.props.text.dontHaveAccount).toBe('auth.dontHaveAccount');
    expect(typeof opened.props.onPasswordReset).toBe('function');
    expect(typeof opened.props.onGoogleSignIn).toBe('function');
    expect(opened.props.onAppleSignIn).toBeUndefined();
  });

  it('wires the modal to the auth context', async () => {
    const tree = render();
    const modal = tree.root.findByType(LoginModal);
    await act(async () => {
      await modal.props.onEmailSignIn('a@b.c', 'pw');
      await modal.props.onPasswordReset('a@b.c');
    });
    expect(mockAuth.signInWithEmail).toHaveBeenCalledWith('a@b.c', 'pw');
    expect(mockAuth.sendPasswordResetEmail).toHaveBeenCalledWith('a@b.c');
  });

  it('treats a cancelled Google sign-in as backing out, not a failure', async () => {
    const cancelled = Object.assign(new Error('Sign in cancelled'), {
      code: 'auth/user-cancelled',
    });
    mockAuth.signInWithGoogle.mockImplementationOnce(() =>
      Promise.reject(cancelled)
    );
    (trackError as jest.Mock).mockClear();
    (trackEvent as jest.Mock).mockClear();

    const tree = render();
    const row = tree.root.find(
      node =>
        node.props.accessibilityLabel === 'auth.signIn' &&
        typeof node.props.onPress === 'function'
    );
    act(() => {
      row.props.onPress();
    });
    const modal = tree.root.findByType(LoginModal);

    // Rethrown untouched, so LoginView sees the cancel and keeps the modal up.
    await act(async () => {
      await expect(modal.props.onGoogleSignIn()).rejects.toBe(cancelled);
    });
    expect(trackError).not.toHaveBeenCalled();
    expect(trackEvent).not.toHaveBeenCalledWith('signed_in_google');
    expect(tree.root.findByType(LoginModal).props.visible).toBe(true);
  });

  it('records a Google sign-in that really failed', async () => {
    mockAuth.signInWithGoogle.mockImplementationOnce(() =>
      Promise.reject(
        Object.assign(new Error('boom'), { code: 'auth/internal-error' })
      )
    );
    (trackError as jest.Mock).mockClear();

    const modal = render().root.findByType(LoginModal);
    await act(async () => {
      await expect(modal.props.onGoogleSignIn()).rejects.toThrow('boom');
    });
    expect(trackError).toHaveBeenCalledWith('boom', 'google_sign_in_error');
  });

  it('shows the account, not the modal trigger, when signed in', () => {
    mockAuth.user = { uid: 'uid12345', email: 'me@x.y', displayName: 'Me' };
    const tree = render();
    expect(
      tree.root.findAll(n => n.props.accessibilityLabel === 'auth.signIn')
    ).toHaveLength(0);
  });
});

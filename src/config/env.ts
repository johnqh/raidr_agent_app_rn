/**
 * Environment configuration.
 *
 * Static `process.env.NAME` access only: babel's
 * `transform-inline-environment-variables` replaces each reference with its
 * build-time value, and matches nothing dynamic. A name added here must also
 * be added to the allow-list in `babel.config.js`, or it is always its
 * default. Which platforms read each value is documented in `.env.example`.
 *
 * Everything JavaScript reads is configured here, from `.env`: the Firebase
 * JS SDK (auth on every platform), the Firebase China proxy, Google sign-in.
 * `GoogleService-Info.plist` and `google-services.json` are read by native
 * Firebase alone — analytics, crashlytics, messaging, remote config — and
 * nothing in `src/` reads either.
 */

import { Platform } from 'react-native';
import type { FirebaseWebConfig } from '@sudobility/auth_lib/signin';

export const env = {
  // API URL
  API_URL: process.env.VITE_API_URL ?? 'http://localhost:8038',

  // App identity
  APP_NAME: process.env.VITE_APP_NAME ?? 'raidr agent',
  APP_DOMAIN: process.env.VITE_APP_DOMAIN ?? 'example.com',
  COMPANY_NAME: process.env.VITE_COMPANY_NAME ?? 'My Company',

  // Firebase, for the desktops' web apps: shared by the project's web apps
  FIREBASE_API_KEY: process.env.FIREBASE_API_KEY ?? '',
  FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN ?? '',
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID ?? '',
  FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET ?? '',
  FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID ?? '',
  // ...and each desktop's own web app
  FIREBASE_APP_ID_MACOS: process.env.FIREBASE_APP_ID_MACOS ?? '',
  FIREBASE_MEASUREMENT_ID_MACOS:
    process.env.FIREBASE_MEASUREMENT_ID_MACOS ?? '',
  FIREBASE_APP_ID_WINDOWS: process.env.FIREBASE_APP_ID_WINDOWS ?? '',
  FIREBASE_MEASUREMENT_ID_WINDOWS:
    process.env.FIREBASE_MEASUREMENT_ID_WINDOWS ?? '',

  // Firebase China proxy (a fetch wrapper over the JS SDK); blank is none
  FIREBASE_PROXY: process.env.FIREBASE_PROXY ?? '',

  // Google sign-in on the desktops (iOS and Android take theirs from the
  // services files). macOS: the iOS app's client, whose reversed id is the
  // redirect scheme. Windows: a "Desktop app" client and its secret (a
  // loopback redirect is only accepted for that type). See `.env.example`.
  GOOGLE_OAUTH_CLIENT_ID_MACOS: process.env.GOOGLE_OAUTH_CLIENT_ID_MACOS ?? '',
  GOOGLE_OAUTH_CLIENT_ID_WINDOWS:
    process.env.GOOGLE_OAUTH_CLIENT_ID_WINDOWS ?? '',
  GOOGLE_OAUTH_CLIENT_SECRET_WINDOWS:
    process.env.GOOGLE_OAUTH_CLIENT_SECRET_WINDOWS ?? '',

  // Development
  DEV_MODE: (process.env.VITE_DEV_MODE ?? 'false') === 'true',
};

const windows = Platform.OS === 'windows';

/**
 * This desktop's Firebase web app (macOS or Windows). Not used on iOS and
 * Android, which read their Google services files.
 */
export const FIREBASE_CONFIG: FirebaseWebConfig = {
  apiKey: env.FIREBASE_API_KEY,
  authDomain: env.FIREBASE_AUTH_DOMAIN,
  projectId: env.FIREBASE_PROJECT_ID,
  storageBucket: env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID,
  appId: windows ? env.FIREBASE_APP_ID_WINDOWS : env.FIREBASE_APP_ID_MACOS,
  measurementId: windows
    ? env.FIREBASE_MEASUREMENT_ID_WINDOWS
    : env.FIREBASE_MEASUREMENT_ID_MACOS,
};

/**
 * The sign-in client ids, in the shape `@sudobility/auth_lib/signin` takes.
 * Apple sign-in is not installed in this app, so its two values are blank
 * and `appleSignInAvailable` answers false everywhere.
 */
export const SIGN_IN_CONFIG = {
  googleIosClientId: env.GOOGLE_OAUTH_CLIENT_ID_MACOS,
  googleWindowsClientId: env.GOOGLE_OAUTH_CLIENT_ID_WINDOWS,
  googleWindowsClientSecret: env.GOOGLE_OAUTH_CLIENT_SECRET_WINDOWS,
  googleWebClientId: '',
  appleServiceId: '',
  appleRedirectUri: '',
};

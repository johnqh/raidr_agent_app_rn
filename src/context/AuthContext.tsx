/**
 * AuthContext — Firebase Authentication, on every platform.
 *
 * Firebase's **JS SDK** everywhere, through `@sudobility/auth_lib`'s
 * `useFirebaseAuthJs` with `platform` set: the China proxy is a `fetch`
 * wrapper, which the JS SDK's requests pass through on a phone exactly as in
 * a browser, and the native SDK's never do. Native Firebase stays for what
 * has no JS equivalent in React Native — analytics, crashlytics, messaging,
 * remote config — and is configured from `GoogleService-Info.plist` /
 * `google-services.json`; auth is configured from `.env` (`src/config/env`).
 *
 * How each platform signs in is auth_lib's (`@sudobility/auth_lib/signin`):
 * Google's SDK on iOS and Android, the system browser on macOS and Windows —
 * each borrowed for an ID token that goes to the JS SDK's
 * `signInWithCredential`. This file supplies what is this app's: the `.env`
 * values and the native module, `require`d inside a getter so a desktop
 * build loads without it. A way that is not configured for this platform is
 * not offered. Apple sign-in is off: its native module is not installed.
 */

import {
  createFirebaseAuthContext,
  useFirebaseAuthJs,
} from '@sudobility/auth_lib/auth-js';
import {
  googleSignInAvailable,
  type SignInPlatform,
} from '@sudobility/auth_lib/signin';
import { WebAuth } from '@sudobility/building_blocks_rn';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { FIREBASE_CONFIG, SIGN_IN_CONFIG } from '@/config/env';

export type { AuthUser, AuthContextValue } from '@sudobility/auth_lib/auth-js';

const platform = Platform.OS as SignInPlatform;
const mobile = platform === 'ios' || platform === 'android';

/**
 * The ways in this build offers, and the sign-in form shows: Google where it
 * is configured (iOS and Android take their client from the services files),
 * never Apple (its native module is not installed), email always.
 */
export const GOOGLE_SIGN_IN_OFFERED =
  mobile || googleSignInAvailable(platform, SIGN_IN_CONFIG);
export const APPLE_SIGN_IN_OFFERED = false;

export const { AuthProvider, useAuth } = createFirebaseAuthContext(
  useFirebaseAuthJs,
  {
    platform,
    // iOS and Android: what native Firebase read from the services files.
    serviceFiles: {
      nativeFirebaseOptions: () =>
        (
          require('@react-native-firebase/app') as typeof import('@react-native-firebase/app')
        ).getApp().options,
      googleServicesJson: require('../../android/app/google-services.json'),
    },
    // macOS and Windows: this desktop's Firebase web app.
    firebaseConfig: FIREBASE_CONFIG,
    asyncStorage: AsyncStorage,
    signIn: SIGN_IN_CONFIG,
    webAuth: WebAuth,
    getGoogleSignin: () =>
      (
        require('@react-native-google-signin/google-signin') as typeof import('@react-native-google-signin/google-signin')
      ).GoogleSignin,
    providers: {
      // iOS and Android take their Google client from the services files.
      google: GOOGLE_SIGN_IN_OFFERED,
      apple: APPLE_SIGN_IN_OFFERED,
      emailPassword: true,
    },
  }
);

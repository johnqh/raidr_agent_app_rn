const fs = require('fs');
const path = require('path');

/**
 * Disable a native Firebase package on the given desktop platforms (native
 * Firebase — analytics, crashlytics, messaging, remote config — is mobile
 * only; auth is the Firebase JS SDK everywhere) while keeping the package's
 * own iOS and Android settings.
 *
 * Autolinking merges this file over the library's config shallowly: a bare
 * `platforms: { macos: null }` REPLACES the library's `platforms`, which drops
 * settings the library declares for Android. Since react-native-firebase 26
 * that includes `cmakeListsPath`, the location of its pre-generated TurboModule
 * code, and without it the Android build fails in CMake with "not an existing
 * directory".
 */
function nativeFirebaseWithout(packageName, disabledPlatforms) {
  // Loaded by file path: the package's `exports` map does not expose this file.
  const libraryConfig = path.join(
    __dirname,
    'node_modules',
    packageName,
    'react-native.config.js'
  );
  const library = fs.existsSync(libraryConfig) ? require(libraryConfig) : {};
  const platforms = { ...(library.dependency?.platforms ?? {}) };
  for (const platform of disabledPlatforms) {
    platforms[platform] = null;
  }
  return { platforms };
}

module.exports = {
  dependencies: {
    // Disable native Firebase packages on macOS — there is no native Firebase
    // on desktop, and auth is the Firebase JS SDK on every platform
    '@react-native-firebase/app': nativeFirebaseWithout('@react-native-firebase/app', ['macos']),
    '@react-native-firebase/analytics': nativeFirebaseWithout('@react-native-firebase/analytics', ['macos']),
    '@react-native-firebase/crashlytics': nativeFirebaseWithout('@react-native-firebase/crashlytics', ['macos']),
    '@react-native-firebase/messaging': nativeFirebaseWithout('@react-native-firebase/messaging', ['macos']),
    '@react-native-firebase/perf': nativeFirebaseWithout('@react-native-firebase/perf', ['macos']),
    '@react-native-firebase/remote-config': nativeFirebaseWithout('@react-native-firebase/remote-config', ['macos']),
    // Google Sign-In native module doesn't support macOS — desktop uses WebAuth PKCE flow
    '@react-native-google-signin/google-signin': {
      platforms: { macos: null },
    },
  },
  project: {
    macos: {
      sourceDir: 'macos',
    },
  },
};

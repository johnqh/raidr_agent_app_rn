module.exports = {
  preset: 'react-native',
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|react-native-svg|react-native-heroicons|react-native-safe-area-context|react-native-screens|react-native-gesture-handler|react-native-css-interop|react-native-localize|nativewind|@react-native-async-storage|expo|expo-status-bar|@sudobility|firebase|@firebase)/)',
  ],
  // `@sudobility/auth_lib/signin` imports Firebase's JS SDK, whose default
  // (ESM) entries reach `.mjs` files the preset's transform does not cover.
  transform: {
    '^.+\\.mjs$': 'babel-jest',
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // signic_sdk's package.json exports only an ESM condition, which
    // jest-resolve will not match under CJS; point it at its built entry
    // (tests mock it, so the file is only resolved, not executed).
    '^@sudobility/signic_sdk$':
      '<rootDir>/node_modules/@sudobility/signic_sdk/dist/index.js',
  },
  setupFiles: ['./jest.setup.js'],
  testPathIgnorePatterns: ['/node_modules/'],
};

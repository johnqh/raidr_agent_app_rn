module.exports = {
  preset: 'react-native',
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|react-native-svg|react-native-heroicons|react-native-safe-area-context|react-native-screens|react-native-gesture-handler|@react-native-async-storage|react-native-localize|expo|expo-status-bar|@sudobility)/)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFiles: ['./jest.setup.js'],
  testPathIgnorePatterns: ['/node_modules/'],
};

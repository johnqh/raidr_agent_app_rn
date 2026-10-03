module.exports = {
  root: true,
  extends: '@react-native',
  env: {
    jest: true,
  },
  rules: {
    // Allow underscore-prefixed variables to be unused (convention for intentionally unused vars)
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],
  },
  overrides: [
    {
      files: [
        'jest.setup.js',
        '**/*.test.ts',
        '**/*.test.tsx',
        '__tests__/**/*',
      ],
      rules: {
        '@react-native/no-deep-imports': 'off',
      },
    },
  ],
};

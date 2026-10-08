/*
  `.env` is read here, and its values are written into the bundle.

  React Native's `process.env` is an empty object at run time: there is no
  process, and nothing reads a file. So `process.env.FIREBASE_API_KEY` in
  `src/config/env.ts` would always be undefined, however carefully `.env`
  had been filled in — the app would run as a build with no Firebase
  configured, where signing in reports itself unavailable and everything
  behind an account is quietly absent. Nothing fails, because an
  unconfigured build is a supported state.

  A variable already in the real environment wins over the file, which is
  what lets CI and a release build say where to point without editing it.
*/
require('dotenv').config({
  path: require('node:path').join(__dirname, '.env'),
  quiet: true,
});

/**
 * Every name the app's source reads from `process.env`. Listed, not
 * everything in the environment: whatever is inlined ships inside the app,
 * and a shell's environment holds things that must not.
 */
const INLINED_ENV = [
  'VITE_API_URL',
  'VITE_APP_NAME',
  'VITE_APP_DOMAIN',
  'VITE_COMPANY_NAME',
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET',
  'FIREBASE_MESSAGING_SENDER_ID',
  'FIREBASE_APP_ID_MACOS',
  'FIREBASE_MEASUREMENT_ID_MACOS',
  'FIREBASE_APP_ID_WINDOWS',
  'FIREBASE_MEASUREMENT_ID_WINDOWS',
  'FIREBASE_PROXY',
  'GOOGLE_OAUTH_CLIENT_ID_MACOS',
  'GOOGLE_OAUTH_CLIENT_ID_WINDOWS',
  'GOOGLE_OAUTH_CLIENT_SECRET_WINDOWS',
  'VITE_DEV_MODE',
];

/*
  A blank value is no value. `.env.example` lists every name with an empty
  right-hand side and promises "a value left blank means not configured" —
  but inlined as written, `NAME=` becomes `""`, which defeats every
  `?? default` in the code that reads it. Unset, it inlines as `undefined`
  and the default applies.
*/
for (const name of INLINED_ENV) {
  if (process.env[name] === '') delete process.env[name];
}

module.exports = function (api) {
  // NativeWind's JSX transform (jsxImportSource + nativewind/babel) must NOT run
  // under jest: it hoists a `nativewind/jsx-runtime` import to module scope, which
  // trips babel-plugin-jest-hoist's "no out-of-scope variables in jest.mock()"
  // rule and breaks every test transform. Apply it only when Metro is the caller.
  const isMetro = api.caller(
    caller =>
      !!caller && (caller.name === 'metro' || caller.bundler === 'metro')
  );
  api.cache.using(() => isMetro);

  return {
    presets: [
      'module:@react-native/babel-preset',
      // nativewind/babel sets jsxImportSource so `className` compiles to
      // styles; Metro only, for the reason given above.
      ...(isMetro ? ['nativewind/babel'] : []),
    ],
    plugins: [
      // zod 4 (used by raidr_agent_lib's run loop) ships `export * as ns`,
      // which the React Native preset does not transform.
      '@babel/plugin-transform-export-namespace-from',
      // Inline process.env.* references with their build-time values (see
      // INLINED_ENV above): React Native's runtime process.env is {}.
      [
        'transform-inline-environment-variables',
        {
          include: INLINED_ENV,
        },
      ],
      [
        'module-resolver',
        {
          root: ['./src'],
          // module-resolver is first-match: list SPECIFIC aliases BEFORE the
          // general '@' so e.g. '@/assets/*' resolves to './assets/*' and not
          // './src/assets/*'. A general-first order is a real bundle break that
          // tsconfig masks.
          alias: {
            '@/assets': './assets',
            '@/components': './src/components',
            '@/screens': './src/screens',
            '@/hooks': './src/hooks',
            '@/stores': './src/stores',
            '@/navigation': './src/navigation',
            '@/i18n': './src/i18n',
            '@/config': './src/config',
            '@/context': './src/context',
            '@/polyfills': './src/polyfills',
            '@/services': './src/services',
            '@/native': './src/native',
            '@/di': './src/di',
            '@': './src',
          },
        },
      ],
    ],
  };
};

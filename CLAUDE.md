# raidr agent (raidr_agent_app_rn)

> **Git policy — never auto-commit or auto-push.** Leave work in the working tree. Run git commit, git push, gh pr create or a release script only when the user explicitly asks in that turn.

Native agent app. The user types a request; the app turns it into an intent,
picks the sites that can fulfil it, signs the user in to those sites through a
web view (the session token stays in the Keychain / Keystore, never in JS
storage or on our server), and streams the results back through the Vercel AI
SDK.

Platforms: **iOS, iPadOS, Android phone and tablet, macOS, Windows**.

**Package**: `raidr_agent_app_rn` (private). Display name **raidr agent**,
registry/component name **`RaidrAgent`**, bundle/application ID
**`com.sudobility.raidragent`** everywhere.

> **Status: shell only.** Scaffolded 2026-10-02 from `mogulgame_app_rn` (itself the
> company starter template). There are two tabs: **Ask** (a text input and a
> disabled "Go" button — the entry point the feature will fill in) and
> **Settings**. No agent logic, web view, Keychain or AI SDK code exists yet;
> the dependencies are installed and the AI SDK polyfills are wired.

## Tech stack

- Bare React Native 0.81 + Expo SDK 54 modules (**not** Expo-managed, no Expo Router)
- `react-native-macos` / `react-native-windows` 0.81 for the desktops
- React Navigation 7 (bottom tabs on phone/tablet; custom sidebar on desktop)
- Zustand 5, TanStack Query 5, NativeWind 4 + Tailwind 3, i18next
- Auth: `@sudobility/auth_lib` (Firebase JS SDK on every platform; Google
  Sign-In via `auth_lib/signin`)
- For the coming feature: `react-native-webview`, `@react-native-cookies/cookies`,
  `react-native-keychain`, `ai` 7, `@ai-sdk/react` 4, `zod` 4
- Jest (not Vitest)
- **Bun only.** Never npm/yarn/pnpm.

## Commands

```bash
bun install
bun run start          # Metro on port 8090
bun run ios            # react-native run-ios     (scheme RaidrAgent)
bun run android        # react-native run-android (com.sudobility.raidragent)
bun run macos          # react-native run-macos   (scheme RaidrAgent-macOS)
bun run windows        # run-windows (windows/RaidrAgent.sln)
bun run typecheck      # tsc --noEmit
bun run lint           # eslint .
bun run test:unit      # jest --passWithNoTests   (what CI runs)
bun run verify         # typecheck + lint + test:unit
cd ios && pod install  # after adding a native dependency (same for macos/)

# JS bundle smoke test (no Xcode needed)
bunx react-native bundle --platform ios --dev false --entry-file index.ts \
  --bundle-output /tmp/raidr_agent_ios.jsbundle
```

Every `start`/`ios`/`android`/`macos`/`windows` script has a `pre*` hook that
runs `scripts/generate-theme-css.js` and clears the Metro cache.

CI: `.github/workflows/ci-cd.yml` calls
`johnqh/workflows/.github/workflows/unified-cicd.yml@main` with
`skip-npm-publish: true`. It runs `bun install`, `bun run typecheck`,
`bun run lint` and `bun run test:unit`; there is no `build` script, so the build
step is skipped.

## Native project names

| Platform | Location | Names |
| --- | --- | --- |
| iOS | `ios/RaidrAgent.xcworkspace` | scheme + target `RaidrAgent`, `ios/RaidrAgent/` sources |
| macOS | `macos/RaidrAgent.xcworkspace` | target + scheme `RaidrAgent-macOS` (what `run-macos` infers from the workspace name), `macos/RaidrAgent-macOS/` |
| Android | `android/app` | `namespace`/`applicationId` `com.sudobility.raidragent`, Kotlin in `java/com/sudobility/raidragent/` |
| Windows | `windows/RaidrAgent.sln` | `RaidrAgent.vcxproj`, `RaidrAgent.Package` (identity `com.sudobility.raidragent`) |

The JS component is registered as `RaidrAgent` (`app.json` `name`), and each
native host asks for that name: `SceneDelegate.swift`, `AppDelegate.mm`
(macOS), `MainActivity.kt`, `RaidrAgent.cpp`. Rename all five together.

## Project structure

```
index.ts                     # entry: AI SDK polyfills first, then AppRegistry
App.tsx                      # provider stack + splash gates (localStorage polyfill first)
src/
  analytics.ts
  components/                # SignInModal, ResultCard, ThemeVarsProvider
  config/                    # constants, env (only process.env reader), theme, designTheme
  context/                   # AuthContext (one file, every platform), ApiContext
  di/                        # initializeServices{,.ios,.android}.ts
  hooks/                     # useSignInForm, useAppColors, useTabBarHeight{,.ios,.android}
  i18n/
  navigation/                # AppNavigator, DesktopSidebar, AskStack, SettingsStack, types
  polyfills/                 # localStorage.ts, aiSdk.ts (+ tests)
  screens/                   # AskScreen, SettingsScreen, SplashScreen
  stores/settingsStore.ts
app_store/                   # store metadata + wrappers around ~/projects/workflows/app_store
```

Platform suffixes: the **unsuffixed** `.ts` is the desktop implementation;
`.ios.ts`/`.android.ts` are the mobile variants. There are no `.macos.*` or
`.windows.*` files.

## AI SDK on React Native

`src/polyfills/aiSdk.ts` (imported first in `index.ts`) installs, only where
missing: `ReadableStream`/`TransformStream`/`WritableStream`
(`web-streams-polyfill`), `TextDecoder`, `TextEncoderStream`/`TextDecoderStream`
(Expo SDK 54's `expo/src/winter` implementations), `structuredClone`
(`@ungap/structured-clone`), and `Symbol.asyncIterator`. Hermes already has
`TextEncoder`. Expo installs these itself only under `expo/metro-config`, which
this app does not use.

Still to solve when the feature lands: RN's built-in `fetch` cannot stream a
response body. On iOS/Android pass `expo/fetch` to the chat transport
(`new DefaultChatTransport({ api, fetch: expoFetch as unknown as typeof fetch })`);
macOS and Windows have no `expo/fetch` and need their own streaming fetch.

`@ai-sdk/react` 4 declares `react: ~19.1.2`, and RN 0.81 pins `react` 19.1.0
(the renderer must match exactly), so bun prints an "incorrect peer dependency"
warning. It is expected; do not bump `react` past what RN 0.81 ships.

## Sibling packages (not yet on npm)

`@sudobility/raidr_agent_types`, `@sudobility/raidr_agent_client` and
`@sudobility/raidr_agent_lib` (all `^0.0.1`, repos in
`~/projects/raidr_agent_{types,client,lib}`) are **not** in `package.json` yet:
they are unpublished, and `bun install` (locally and in CI) fails on a 404.
Add them back to `dependencies` once they are published. Nothing in `src/`
imports them. The backend is `raidr_agent_api` (port 8040, the
`VITE_API_URL` default).

## Configuration that needs real values

- `ios/RaidrAgent/GoogleService-Info.plist` — **placeholder**. Replace with the
  Firebase iOS app config for `com.sudobility.raidragent`.
- `android/app/google-services.json` — **placeholder**. Replace with the Firebase
  Android app config for `com.sudobility.raidragent`.
- URL scheme `com.googleusercontent.apps.REPLACE_WITH_IOS_CLIENT_ID` in
  `ios/RaidrAgent/Info.plist` and `macos/RaidrAgent-macOS/Info.plist` — set to
  the real `REVERSED_CLIENT_ID`.
- `.env` (copy `.env.example`) — `FIREBASE_*` for the desktop web apps,
  `GOOGLE_OAUTH_CLIENT_ID_MACOS`, `GOOGLE_OAUTH_CLIENT_ID_WINDOWS`,
  `GOOGLE_OAUTH_CLIENT_SECRET_WINDOWS`, `VITE_API_URL`. All names are listed in
  `babel.config.js` `INLINED_ENV`, which is the allow-list of what reaches the bundle.
- `app_store/.env` and `app_store/.keys/` — store API credentials (gitignored).
- `DEVELOPMENT_TEAM` / `teamID` (`3UP4MZRP69`) and the Windows publisher
  `CN=johnhuang` were carried over from the template.

## Coding patterns

- `import '@/polyfills/localStorage'` stays first in `App.tsx`, before any zustand store.
- `import './src/polyfills/aiSdk'` stays first in `index.ts`, before anything imports `ai`.
- All `process.env` reads go through `src/config/env.ts` and must be listed in `babel.config.js` `INLINED_ENV`.
- Prose goes in `assets/locales/en/translation.json` (only `en` is registered; other locales fall back).
- babel `module-resolver` aliases are first-match: specific aliases before `@`.

## Signing in to the app

The app's own sign-in (Firebase, through `AuthContext`) is the shared form —
`LoginView` from `@sudobility/components-rn` — never a hand-built one. Which
shell it gets follows one rule, the same as the web:

- **A screen whose job is signing in** — somewhere the user navigates to in
  order to sign in — renders `LoginPage` from `@sudobility/building_blocks_rn`.
  There is no such screen today.
- **Sign-in in the middle of something else** — an action that needs an
  account, or a "Sign in" row on a screen whose purpose is something else —
  opens `SignInModal` (`src/components/SignInModal.tsx`, the shared
  `LoginModal`) over the current screen. On success it closes itself and the
  user stays where they were. Never navigate away to a login route from such a
  place. Settings' Account row is one of these.

Both take their handlers, strings and providers from `useSignInForm()`
(`src/hooks/useSignInForm.ts`): email sign-in/up, password reset
(`sendPasswordResetEmail` from auth_lib, the same Firebase JS SDK), Google
where `GOOGLE_SIGN_IN_OFFERED` (from `AuthContext`), no Apple
(`APPLE_SIGN_IN_OFFERED` is false — its native module is not installed), the
analytics events the old form sent, every string from `auth.*` in every
locale, and Apple's mark toned from the navigation theme.
`src/hooks/__tests__/signInStrings.test.ts` holds the locales to the hook.

**`src/screens/LoginScreen.tsx` is not this.** It is the agent's _third-party
site_ sign-in — a `WebView` that captures a site's session token — and has
nothing to do with the app account.

## Gotchas

- Metro runs on port **8090**.
- NativeWind's JSX transform is Metro-only; JSX behaves differently under Jest.
- `jest.config.js` maps only `^@/(.*)$`; `@/assets/*` is not mapped, so tests that import `src/i18n` fail to resolve.
- `react-native.config.js` disables native Firebase and Google Sign-In on macOS; desktop auth is the Firebase JS SDK + WebAuth PKCE.
- The `localize` script still posts to the template's Whisperly endpoint (`.../jie9cytr/starter`) until a raidr agent endpoint exists.
- `i18n` is initialised in both `index.ts` and `App.tsx` (harmless, inherited).
- `macos/.xcode.env.local` is tracked (unlike iOS's); it only sets `NODE_BINARY=$(command -v node)`. The template's version pointed at a Homebrew node path and a missing `scripts/merge-env.js`.

## Related projects

- `raidr_agent_types` / `raidr_agent_client` / `raidr_agent_lib` — shared types, API client, business logic
- `raidr_agent_api` — backend
- `mogulgame_app_rn` — the app this was copied from
- `sudojo_app_rn` — source of `app_store/`
- `workflows` — reusable CI (`unified-cicd.yml`) and the `app_store` scripts

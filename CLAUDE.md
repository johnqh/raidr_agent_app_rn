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
**`com.sudobility.raidr.agent`** everywhere.

> **Status:** scaffolded 2026-10-02 from `mogulgame_app_rn`. Tabs: **Ask**
> (Ask → Sites → Login web view → Results → ResultDetail), **History** and
> **Settings** (→ **API Keys**). Runs go to the cloud (`POST /runs`) or, in
> local mode, run on the device (see "Local agent mode").

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
bun run start          # Metro on port 8094
bun run ios            # react-native run-ios     (scheme RaidrAgent)
bun run android        # react-native run-android (com.sudobility.raidr.agent)
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
| Android | `android/app` | `namespace`/`applicationId` `com.sudobility.raidr.agent`, Kotlin in `java/com/sudobility/raidr/agent/` |
| Windows | `windows/RaidrAgent.sln` | `RaidrAgent.vcxproj`, `RaidrAgent.Package` (identity `com.sudobility.raidr.agent`) |

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

**`react` 19.1.4, `react-native` 0.81.6 and `react-native-macos` 0.81.9 are a
locked trio** (with `react-test-renderer` 19.1.4). Each ships a renderer built
for one exact React version and asserts it at load: react-native-macos 0.81.2's
renderer was 19.1.4 while the app had 19.1.0, so macOS hung on "Loading…
100%" with "Incompatible React versions" in the JS console. Change all of them
together, and check `Libraries/Renderer/implementations/*-dev.js` in both
`react-native` and `react-native-macos` for the version they assert.

## Navigation and layout

iOS-style on every platform. Each step is its own screen in a native stack
(`AskStack`, `HistoryStack`, `SettingsStack`; bottom tabs on mobile, the
sidebar on desktop). Native headers are **off** (`headerShown: false`): they do
not render on macOS/Windows. Every screen renders `Screen`
(`src/components/layout/Screen.tsx`), whose `NavBar` shows a back chevron when
the stack can go back, the centred title, and an optional `headerRight`.

- `layout='list'` for list content, laid out by `TileGrid`: one column below
  700pt (iOS regular width, measured on the grid itself), else 2–4 tile
  columns (`columnsFor`). Sites, Results/All results/History cards, progress,
  Result sources.
- `layout='center'` (default) for everything else: a 640pt column in the
  middle; `valign='center'` also centres it vertically (Ask, permission
  screens), `top` (default) starts under the bar (Settings, forms, details).
- `layout='fill'` for web views/maps. `footer` holds a fixed Next/Run bar.
- **No SVG icons in chrome**: react-native-svg is not built for macOS, so
  heroicons draw nothing there (the sidebar's tab icons are blank on macOS).
  The back chevron is drawn with Views; permission screens use a glyph.

**Permission screens** (`PermissionScreen`, `src/lib/permissions.ts`): their
own screen with text and the call to action in the middle, never left in the
back stack. Go through `usePermissionGate().goWith(kind, next)`: the first time
it opens `Permission` with the route to continue to, which on success
*replaces* itself with it (screen 1 → permission → screen 2; back on screen 2
returns to screen 1); "Not now" goes back. Once allowed
(`settingsStore.grantedPermissions`) the permission is used in place and the
next screen opens directly; if it stopped working the screen shows again. Add
a kind in `src/lib/permissionKinds.ts` (pure, persisted), its `allow` in
`PERMISSIONS`, and strings under `permission.<kind>`.

## Agent flow

Ask → (Permission) → Sites → Prepare → Results → (All results) → Result
sources / Result detail (`src/navigation/AskStack.tsx`); transient
state in `src/stores/runFlowStore.ts` (request, intent, candidates, location,
`plan`, `inputs`). `src/lib/agentFlow.ts` picks cloud or local per call and is
the only place the cloud flow calls `RaidrAgentClient`.

- **Ask**: `understandRequest` with the device context (`src/lib/deviceContext.ts`:
  country via `react-native-localize`, locale, time zone, `now` with offset).
  Returns the six-W `AgentIntent` (incl. `selection`) and ranked candidates (with `reason`).
- **Sites**: `single` → radio (exactly one, top one preselected); `best`/`all` (top 3 preselected) →
  checkboxes (1–8). Rules in `src/lib/sites.ts`. Rows show the site's **domain**
  (`siteDomain`: first origin without `www.`, never the catalog's "… API" title)
  and its icon (`CandidateSite.iconUrl`, `SiteIcon` falls back to the first
  letter). Every screen that names a site (Prepare, Results progress, History,
  result cards) does the same through `useSiteBadges(apiHosts)`: seeded from the
  candidates, else `GET /sites/:apiHost/icon` (`{ domain, iconUrl }`), cached a day.
- **Prepare** (`PrepareScreen`): per-site plans (tools, `login`
  required/fallback/none, `unsupported`) and one merged `FormField[]` form
  (`src/components/PreparedFormField.tsx`). Run needs a valid form and every
  `required` site signed in. Rules (validation/coercion, readiness, run sites,
  401/403 retry) in `src/lib/prepare.ts`. Tokens go with `required` and
  `fallback` sites when stored, never with `none` sites.
- **Results**: `single`/`best` show the `data-best` pick in full with its reason
  and "See all N results"; `all` lists (map toggle for location intents). In an
  `all` run, `data-groups` (the `dedupe` step, after every site finished) merges
  the same thing from several sites into one row (`displayItems` in
  `src/lib/results.ts`); each card shows its sites' icons lower-left ("On N
  sites" when merged). A merged row opens **Result sources**
  (`ResultSourcesScreen`): one row per copy with icon, domain and what sets it
  apart (the step's note, else a price-like field) → that copy's detail. A
  one-site sign-in retry drops the groups. A
  `fallback` site whose calls all failed 401/403 offers "Sign in to <site> and
  retry" (re-runs that site only). Detail's "Open on <site>" opens `pageUrl`
  with `Linking.openURL`; hidden when `pageUrl` is ''. History renders runs the
  same way from `RunDetail.best`. Rules in `src/lib/results.ts`.
- **Login web view**: `window.open` popups open in a second `WebView` over the
  first (same cookie store, same capture script, a bridge shimming
  `window.opener.postMessage` / `window.close()`); Google sign-in pages switch
  that web view to a standard browser user agent by cancelling the load and
  remounting with a new `key` (sticky afterwards). Windows uses WebView2 for
  popups and skips the UA switch (no `userAgent` prop; Edge UA already passes).
  Pure helpers in `src/lib/webAuth.ts`.

## Local agent mode

Settings → API Keys (`ApiKeysScreen`) holds the user's own OpenAI / Anthropic /
DeepSeek / OpenRouter keys (Keychain service `raidr-agent-llm:<provider>`,
`src/lib/llmKeys.ts`), a drag-ordered provider list and a Cloud / Local switch
(`settingsStore.agentMode`, default cloud; local needs ≥1 key and falls back to
cloud when the last key is removed). Pure rules: `src/lib/agentMode.ts`,
`src/lib/reorder.ts`.

`src/lib/localAgent.ts` runs local mode: `understandLocally`
(`understandIntent` → `POST /candidates` → `rankSites`), `prepareLocally`
(`prepareSites` with site context from `GET /sites/:apiHost/context`) and
`startLocalRun` (`runSites` with tools/inputs, forwarding `data-best`). For each
model step (understand, rank-sites, prepare, plan, extract, pick-best) it gets the provider request from raidr_agent_api `POST /llm/payload`
(which proxies ShapeShyft `/prompt` with `llm_provider`), adds the user's key per
`request.auth`, calls the provider directly and parses the reply with
`parseProviderResponse` from `@sudobility/shapeshyft_engine/core` (the RN-safe
subpath — never import the engine root). Providers are tried in the user's
order; a failure falls through to the next. The run loop is
`raidr_agent_lib/runner` (the same one the server runs); site calls go straight
to the site (`DirectSiteConnector`), manifests come from the site context, and the finished run is uploaded to
`POST /runs/import` for History. The user's LLM key and site tokens stay on the
device; the step inputs (including site response excerpts) do pass through
raidr_agent_api and ShapeShyft to build each payload.

`babel.config.js` includes `@babel/plugin-transform-export-namespace-from`
because zod 4 (pulled in by the runner) uses `export * as`.

## Sibling packages

`@sudobility/raidr_agent_types`, `@sudobility/raidr_agent_client`,
`@sudobility/raidr_agent_lib` (repos in `~/projects/raidr_agent_{types,client,lib}`)
and `@sudobility/raidr_types` are on npm and in `dependencies`. Releases go
through `~/projects/raidr_app/scripts/push_all.sh`, which publishes them in
dependency order before this app. The backend is `raidr_agent_api` (port 8038,
the `VITE_API_URL` default).

## Configuration that needs real values

- `ios/RaidrAgent/GoogleService-Info.plist` and `android/app/google-services.json`
  are the real configs of Firebase project `raidr-agent` for
  `com.sudobility.raidr.agent` (the Android build fails, and iOS warns, if the
  app ID and these files disagree). The Google URL scheme in both
  `Info.plist`s is that plist's `REVERSED_CLIENT_ID`.
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

- Metro runs on port **8094**.
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

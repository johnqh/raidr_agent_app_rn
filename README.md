# raidr agent

A native agent app. You type what you want done; raidr agent works out the
intent, picks the sites that can do it, signs you in to them through a web view
(your session token stays in the device Keychain / Keystore), and streams the
results back through the Vercel AI SDK.

Runs on **iOS, iPadOS, Android (phone and tablet), macOS and Windows** from one
React Native 0.81 codebase (bare RN + Expo SDK 54 modules, `react-native-macos`,
`react-native-windows`).

> Status: app shell. The **Ask** tab has the request box and a disabled **Go**
> button; the agent flow is not implemented yet.

## Getting started

Requires [Bun](https://bun.sh), Node 20+, Xcode + CocoaPods (iOS/macOS),
Android Studio (Android), Visual Studio 2022 (Windows).

```bash
bun install
cp .env.example .env          # fill in the values you need
cd ios && pod install && cd ..
bun run ios                   # or: android | macos | windows
```

Metro runs on port 8094 (`bun run start`).

## Scripts

| Script | What it does |
| --- | --- |
| `bun run start` | Metro bundler on :8094 |
| `bun run ios` / `android` / `macos` / `windows` | Build and run on that platform |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run lint` | ESLint |
| `bun run test:unit` | Jest |
| `bun run verify` | typecheck + lint + tests |
| `bun run localize` | Machine-translate `assets/locales` |

## Configuration

Firebase / Google sign-in need real values before sign-in works:

- `ios/RaidrAgent/GoogleService-Info.plist` and `android/app/google-services.json`
  are the real Firebase configs (project `raidr-agent`) for
  `com.sudobility.raidr.agent`; the Google URL scheme in both `Info.plist`s is
  their `REVERSED_CLIENT_ID`.
- `.env` holds the desktop Firebase web-app values, desktop Google OAuth clients
  and `VITE_API_URL`; `.env.example` documents each one.

## Project layout

- `src/screens/AskScreen.tsx` — the entry point for the agent feature
- `src/polyfills/aiSdk.ts` — streams / TextDecoder / structuredClone for the AI SDK on Hermes
- `src/context/` — auth (`@sudobility/auth_lib`) and API contexts
- `src/navigation/` — tabs on phone/tablet, sidebar on desktop
- `app_store/` — store metadata and build/screenshot/submit wrappers
- `ios/`, `android/`, `macos/`, `windows/` — native projects (`RaidrAgent`)

See `CLAUDE.md` for architecture notes and gotchas.

## Related

- `raidr_agent_types`, `raidr_agent_client`, `raidr_agent_lib` — shared packages
- `raidr_agent_api` — backend

## License

BUSL-1.1

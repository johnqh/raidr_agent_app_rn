/**
 * Runtime theme CSS variables for NativeWind.
 *
 * NativeWind on native does NOT switch CSS-variable blocks defined in CSS
 * (`:root` / `.dark` / `@media`). Instead, variables are applied at runtime with
 * `vars()` on a wrapping View and swapped by color scheme. Semantic classes
 * (bg-background, text-foreground, ...) then resolve to the active theme AND flip
 * light/dark. Values come from the @sudobility/design theme tokens.
 */
import { vars } from 'nativewind';
import { defaultTheme } from '@sudobility/design/themes';
import type { ThemeTokens } from '@sudobility/design';

const activeTheme = defaultTheme; // keep in sync with tailwind.config.js / designTheme.ts

function toVars(tokens: ThemeTokens): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(tokens)) {
    const name = '--' + key.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
    out[name] = String(value);
  }
  return out;
}

export const lightThemeVars = vars(toVars(activeTheme.light));
export const darkThemeVars = vars(toVars(activeTheme.dark));

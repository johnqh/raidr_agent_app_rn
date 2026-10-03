/**
 * Theme configuration.
 *
 * Colors are derived from the @sudobility/design `defaultTheme` tokens — the same
 * source the design-system components and the NativeWind preset use — rather than
 * hardcoded literals. This keeps React Navigation chrome and `useAppColors()` in
 * lockstep with the active design theme (and its light/dark variants).
 *
 * Design tokens are HSL channel strings ("222.2 84% 4.9%"); `hsl()` converts them
 * to a `hsl(h, s%, l%)` string that React Native's color parser accepts.
 */
import type { Theme } from '@react-navigation/native';
import { defaultTheme } from '@sudobility/design/themes';

const light = defaultTheme.light;
const dark = defaultTheme.dark;

/** "222.2 84% 4.9%" -> "hsl(222.2, 84%, 4.9%)" (React-Native-parseable). */
const hsl = (channels: string): string => {
  const [h, s, l] = channels.trim().split(/\s+/);
  return `hsl(${h}, ${s}, ${l})`;
};

const fonts: Theme['fonts'] = {
  regular: { fontFamily: 'System', fontWeight: '400' },
  medium: { fontFamily: 'System', fontWeight: '500' },
  bold: { fontFamily: 'System', fontWeight: '700' },
  heavy: { fontFamily: 'System', fontWeight: '900' },
};

export const lightTheme: Theme = {
  dark: false,
  fonts,
  colors: {
    primary: hsl(light.primary),
    background: hsl(light.background),
    card: hsl(light.card),
    text: hsl(light.foreground),
    border: hsl(light.border),
    notification: hsl(light.destructive),
  },
};

export const darkTheme: Theme = {
  dark: true,
  fonts,
  colors: {
    primary: hsl(dark.primary),
    background: hsl(dark.background),
    card: hsl(dark.card),
    text: hsl(dark.foreground),
    border: hsl(dark.border),
    notification: hsl(dark.destructive),
  },
};

/** Extended semantic colors beyond React Navigation's built-in set. */
export interface AppColors {
  background: string;
  card: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  border: string;
  error: string;
  shadow: string;
}

export const lightAppColors: AppColors = {
  background: hsl(light.background),
  card: hsl(light.card),
  text: hsl(light.foreground),
  textSecondary: hsl(light.mutedForeground),
  textMuted: hsl(light.mutedForeground),
  primary: hsl(light.primary),
  border: hsl(light.border),
  error: hsl(light.destructive),
  // RN shadowColor is a fixed-black primitive tinted by elevation/opacity, not a
  // themed surface color — it stays #000 in both schemes.
  shadow: '#000000',
};

export const darkAppColors: AppColors = {
  background: hsl(dark.background),
  card: hsl(dark.card),
  text: hsl(dark.foreground),
  textSecondary: hsl(dark.mutedForeground),
  textMuted: hsl(dark.mutedForeground),
  primary: hsl(dark.primary),
  border: hsl(dark.border),
  error: hsl(dark.destructive),
  shadow: '#000000',
};

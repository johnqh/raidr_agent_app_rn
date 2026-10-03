import { useTheme } from '@react-navigation/native';
import { lightAppColors, darkAppColors } from '@/config/theme';
import type { AppColors } from '@/config/theme';

/**
 * Returns the semantic colour palette for the current theme.
 *
 * Uses React Navigation's `useTheme` hook to detect whether dark mode is
 * active and returns the corresponding {@link AppColors} object. The palette
 * includes colours for backgrounds, cards, text variants (primary, secondary,
 * muted), the brand primary colour, borders, errors, and shadows.
 *
 * Colour values change automatically when the user switches between light
 * and dark mode via the settings store or when the system appearance changes
 * (when the user's theme preference is "system").
 *
 * @returns An {@link AppColors} object matching the current theme.
 *
 * @example
 * ```tsx
 * const colors = useAppColors();
 * <View style={{ backgroundColor: colors.background }}>
 *   <Text style={{ color: colors.text }}>Hello</Text>
 * </View>
 * ```
 */
export function useAppColors(): AppColors {
  const { dark } = useTheme();
  return dark ? darkAppColors : lightAppColors;
}

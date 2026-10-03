import React from 'react';
import { StyleSheet, View, useColorScheme } from 'react-native';
import { useSettingsStore } from '@/stores/settingsStore';
import { lightThemeVars, darkThemeVars } from '@/config/themeVars';

/**
 * Applies the design-system theme CSS variables at runtime and swaps them by
 * color scheme. Wrap the app so all descendants resolve semantic classes
 * (bg-background, text-foreground, border-border, ...) and flip light/dark.
 *
 * The color scheme is resolved from the app's own settings + RN useColorScheme —
 * the same logic AppNavigator uses for the navigation theme — so the chrome and
 * content agree. AppNavigator keeps NativeWind's `colorScheme` in lockstep for
 * any leftover `dark:` variants.
 */
export function ThemeVarsProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useSettingsStore();
  const systemColorScheme = useColorScheme();
  const isDark =
    theme === 'dark' || (theme === 'system' && systemColorScheme === 'dark');
  return (
    <View style={[styles.fill, isDark ? darkThemeVars : lightThemeVars]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});

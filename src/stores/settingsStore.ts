/**
 * Settings store - Persisted app settings with Zustand
 *
 * Uses Zustand's `persist` middleware with AsyncStorage as the storage backend
 * to persist user preferences (currently just theme mode) across app restarts.
 *
 * The store is keyed under `'raidr-agent-settings'` in AsyncStorage.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

/** The user's preferred colour scheme. `'system'` follows the OS setting. */
export type ThemeMode = 'system' | 'light' | 'dark';

/** Shape of the settings Zustand store. */
interface SettingsState {
  /** The current theme mode preference. */
  theme: ThemeMode;
  /** Update the theme mode preference and persist it. */
  setTheme: (theme: ThemeMode) => void;
  /** Reset all settings to their initial defaults. */
  reset: () => void;
}

/** Default values for all settings fields. */
const initialState = {
  theme: 'system' as ThemeMode,
};

/**
 * Zustand store hook for app settings.
 *
 * Settings are automatically persisted to AsyncStorage under the key
 * `'raidr-agent-settings'` and rehydrated on app launch.
 *
 * @example
 * ```ts
 * const { theme, setTheme } = useSettingsStore();
 * setTheme('dark');
 * ```
 */
export const useSettingsStore = create<SettingsState>()(
  persist(
    set => ({
      ...initialState,
      setTheme: theme => set({ theme }),
      reset: () => set(initialState),
    }),
    {
      name: 'raidr-agent-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

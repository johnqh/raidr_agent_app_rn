/**
 * Settings store - Persisted app settings with Zustand
 *
 * Uses Zustand's `persist` middleware with AsyncStorage as the storage backend
 * to persist user preferences across app restarts: theme, agent mode
 * (cloud / local) and the local-mode provider preference order. Provider keys
 * are NOT here — they live in the Keychain (`src/lib/llmKeys.ts`).
 *
 * The store is keyed under `'raidr-agent-settings'` in AsyncStorage.
 * Version history:
 * - 0: `{ theme }`
 * - 1: adds `agentMode` and `providerOrder`
 * - 2: adds `grantedPermissions`
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LocalLlmProvider } from '@/config/llmProviders';
import {
  DEFAULT_PROVIDER_ORDER,
  normalizeAgentMode,
  normalizeProviderOrder,
  type AgentMode,
} from '@/lib/agentMode';
import {
  normalizePermissions,
  type PermissionKind,
} from '@/lib/permissionKinds';

export type { AgentMode } from '@/lib/agentMode';

/** The user's preferred colour scheme. `'system'` follows the OS setting. */
export type ThemeMode = 'system' | 'light' | 'dark';

/** The persisted fields. */
interface PersistedSettings {
  theme: ThemeMode;
  /** Where runs are planned. Local requires at least one saved provider key. */
  agentMode: AgentMode;
  /** Local-mode provider preference; the first one with a key is used. */
  providerOrder: LocalLlmProvider[];
  /**
   * Permissions the user allowed on a permission screen. Their screen is
   * skipped next time (the OS prompt has been answered); if using the
   * permission then fails, the screen is shown again.
   */
  grantedPermissions: PermissionKind[];
}

/** Shape of the settings Zustand store. */
interface SettingsState extends PersistedSettings {
  /** Update the theme mode preference and persist it. */
  setTheme: (theme: ThemeMode) => void;
  /** Switch between cloud and local agent mode. */
  setAgentMode: (agentMode: AgentMode) => void;
  /** Replace the provider preference order (normalised to every provider once). */
  setProviderOrder: (providerOrder: readonly LocalLlmProvider[]) => void;
  /** Record whether a permission was allowed. */
  setPermissionGranted: (kind: PermissionKind, granted: boolean) => void;
  /** Reset all settings to their initial defaults. */
  reset: () => void;
}

/** Default values for all settings fields. */
const initialState: PersistedSettings = {
  theme: 'system',
  agentMode: 'cloud',
  providerOrder: [...DEFAULT_PROVIDER_ORDER],
  grantedPermissions: [],
};

const THEMES: readonly ThemeMode[] = ['system', 'light', 'dark'];

/**
 * Bring any persisted value (any version, possibly hand-edited or partial) to
 * the current shape, filling defaults for missing or invalid fields.
 */
export function sanitizeSettings(persisted: unknown): PersistedSettings {
  const p = (
    persisted && typeof persisted === 'object' ? persisted : {}
  ) as Partial<Record<keyof PersistedSettings, unknown>>;
  return {
    theme: THEMES.includes(p.theme as ThemeMode)
      ? (p.theme as ThemeMode)
      : initialState.theme,
    agentMode: normalizeAgentMode(p.agentMode),
    providerOrder: normalizeProviderOrder(p.providerOrder),
    grantedPermissions: normalizePermissions(p.grantedPermissions),
  };
}

/**
 * Zustand store hook for app settings.
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
      setAgentMode: agentMode => set({ agentMode }),
      setProviderOrder: providerOrder =>
        set({ providerOrder: normalizeProviderOrder(providerOrder) }),
      setPermissionGranted: (kind, granted) =>
        set(state => ({
          grantedPermissions: granted
            ? [...new Set([...state.grantedPermissions, kind])]
            : state.grantedPermissions.filter(k => k !== kind),
        })),
      reset: () =>
        set({
          ...initialState,
          providerOrder: [...DEFAULT_PROVIDER_ORDER],
          grantedPermissions: [],
        }),
    }),
    {
      name: 'raidr-agent-settings',
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({
        theme: state.theme,
        agentMode: state.agentMode,
        providerOrder: state.providerOrder,
        grantedPermissions: state.grantedPermissions,
      }),
      // Older versions lack the agent fields; sanitizing fills the defaults.
      migrate: persisted => sanitizeSettings(persisted),
      merge: (persisted, current) => ({
        ...current,
        ...sanitizeSettings(persisted),
      }),
    }
  )
);

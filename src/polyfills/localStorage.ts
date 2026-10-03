/**
 * Minimal in-memory localStorage polyfill for React Native.
 *
 * Zustand's persist middleware defaults to `createJSONStorage(() => localStorage)`.
 * When localStorage is missing (React Native), createJSONStorage returns undefined,
 * and the persist middleware skips setting up `api.persist` entirely -- making
 * `.persist.setOptions()` / `.rehydrate()` unavailable.
 *
 * This polyfill provides a no-op in-memory shim so the middleware initialises
 * correctly. We immediately swap to AsyncStorage via settingsStore.
 *
 * **Important**: This module must be imported before any Zustand persist store
 * is created (i.e. at the top of the app entry point).
 *
 * @module polyfills/localStorage
 */

if (typeof globalThis.localStorage === 'undefined') {
  const store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    /** Retrieve a value from the in-memory store. */
    getItem: (key: string): string | null => store[key] ?? null,
    /** Set a value in the in-memory store. */
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    /** Remove a value from the in-memory store. */
    removeItem: (key: string) => {
      delete store[key];
    },
  };
}

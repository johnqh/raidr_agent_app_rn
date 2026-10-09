/**
 * The sites the user is signed in to (`SiteCredential`, no tokens), persisted
 * under `'raidr-agent-credentials'` in AsyncStorage. Written by
 * `src/lib/siteSessions.ts`, which keeps it in step with the Keychain.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  normalizeCredentials,
  withCredential,
  withoutCredential,
  type SiteCredential,
} from '@/lib/siteCredentials';

interface CredentialsState {
  sites: SiteCredential[];
  add: (entry: SiteCredential) => void;
  remove: (apiHost: string) => void;
  clear: () => void;
}

export const useCredentialsStore = create<CredentialsState>()(
  persist(
    set => ({
      sites: [],
      add: entry =>
        set(state => ({ sites: withCredential(state.sites, entry) })),
      remove: apiHost =>
        set(state => ({ sites: withoutCredential(state.sites, apiHost) })),
      clear: () => set({ sites: [] }),
    }),
    {
      name: 'raidr-agent-credentials',
      version: 0,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({ sites: state.sites }),
      merge: (persisted, current) => ({
        ...current,
        sites: normalizeCredentials(
          (persisted as { sites?: unknown } | undefined)?.sites
        ),
      }),
    }
  )
);

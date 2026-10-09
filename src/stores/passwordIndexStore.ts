/**
 * The directory of saved logins, so the password manager can list them — the
 * Keychain cannot enumerate its entries. One row per site, keyed by `apiHost`
 * (a catalog host for an agent login, or the domain itself for one typed by
 * hand). The password is NOT here; it lives in the Keychain
 * (`agentCredentialStore.ts`). The email is the username, shown in the list.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

/** How a login came to be saved. */
export type PasswordSource = 'agent' | 'manual';

export interface PasswordEntry {
  /** Keychain key: a catalog API host, or the domain for a manual login. */
  apiHost: string;
  /** The site's domain, shown in the list (e.g. `example.com`). */
  domain: string;
  /** The username / email saved for the site. */
  email: string;
  source: PasswordSource;
  updatedAt: number;
}

interface PasswordIndexState {
  entries: PasswordEntry[];
  upsert: (entry: PasswordEntry) => void;
  remove: (apiHost: string) => void;
  clear: () => void;
}

/** Newest first. */
function sortEntries(list: readonly PasswordEntry[]): PasswordEntry[] {
  return [...list].sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Any persisted value as a valid, de-duplicated list. */
export function sanitizePasswordEntries(value: unknown): PasswordEntry[] {
  const raw = (value as { entries?: unknown } | undefined)?.entries;
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: PasswordEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const { apiHost, domain, email, source, updatedAt } = item as Record<
      string,
      unknown
    >;
    if (typeof apiHost !== 'string' || apiHost === '') {
      continue;
    }
    if (out.some(e => e.apiHost === apiHost)) {
      continue;
    }
    out.push({
      apiHost,
      domain: typeof domain === 'string' ? domain : apiHost,
      email: typeof email === 'string' ? email : '',
      source: source === 'manual' ? 'manual' : 'agent',
      updatedAt:
        typeof updatedAt === 'number' && Number.isFinite(updatedAt)
          ? updatedAt
          : 0,
    });
  }
  return sortEntries(out);
}

export const usePasswordIndexStore = create<PasswordIndexState>()(
  persist(
    set => ({
      entries: [],
      upsert: entry =>
        set(state => ({
          entries: sortEntries([
            ...state.entries.filter(e => e.apiHost !== entry.apiHost),
            entry,
          ]),
        })),
      remove: apiHost =>
        set(state => ({
          entries: state.entries.filter(e => e.apiHost !== apiHost),
        })),
      clear: () => set({ entries: [] }),
    }),
    {
      name: 'raidr-agent-passwords',
      version: 0,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({ entries: state.entries }),
      merge: (persisted, current) => ({
        ...current,
        entries: sanitizePasswordEntries(persisted),
      }),
    }
  )
);

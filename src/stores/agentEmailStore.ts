/**
 * The non-secret facts about the agent email, persisted under
 * `'raidr-agent-email'` in AsyncStorage: the email address (cached for
 * display so the screen need not touch the Keychain) and whether the agent
 * may use it automatically. The seed phrase itself lives only in the
 * Keychain (`agentWalletStore.ts`).
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PersistedAgentEmail {
  /** The agent's email address, or null when none is set up. */
  emailAddress: string | null;
  /** May the agent fill this address into a site's sign-in when asked. */
  useAutomatically: boolean;
}

interface AgentEmailState extends PersistedAgentEmail {
  /** Record a created/restored email (turns automatic use on by default). */
  setEmail: (emailAddress: string) => void;
  /** Forget the email (automatic use goes off). */
  clearEmail: () => void;
  setUseAutomatically: (on: boolean) => void;
}

const initialState: PersistedAgentEmail = {
  emailAddress: null,
  useAutomatically: false,
};

/** Any persisted value (any version, hand-edited or partial) as the shape. */
export function sanitizeAgentEmail(value: unknown): PersistedAgentEmail {
  const p = (value && typeof value === 'object' ? value : {}) as Partial<
    Record<keyof PersistedAgentEmail, unknown>
  >;
  const emailAddress =
    typeof p.emailAddress === 'string' && p.emailAddress !== ''
      ? p.emailAddress
      : null;
  return {
    emailAddress,
    // Automatic use means nothing without an email.
    useAutomatically: emailAddress !== null && p.useAutomatically === true,
  };
}

export const useAgentEmailStore = create<AgentEmailState>()(
  persist(
    set => ({
      ...initialState,
      setEmail: emailAddress => set({ emailAddress, useAutomatically: true }),
      clearEmail: () => set({ emailAddress: null, useAutomatically: false }),
      setUseAutomatically: on =>
        set(state => (state.emailAddress ? { useAutomatically: on } : {})),
    }),
    {
      name: 'raidr-agent-email',
      version: 0,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({
        emailAddress: state.emailAddress,
        useAutomatically: state.useAutomatically,
      }),
      merge: (persisted, current) => ({
        ...current,
        ...sanitizeAgentEmail(persisted),
      }),
    }
  )
);

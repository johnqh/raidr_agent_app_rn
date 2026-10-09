/**
 * The agent email for the settings section: the current address and the
 * "use automatically" toggle (from the store), and create / restore / remove
 * / reveal actions with a single busy flag.
 */

import { useCallback, useState } from 'react';
import {
  createAgentEmail,
  removeAgentEmail,
  restoreAgentEmail,
  revealSeedPhrase,
  type AgentEmailIdentity,
} from '@/lib/agentEmailAccount';
import { useAgentEmailStore } from '@/stores/agentEmailStore';

export interface UseAgentEmail {
  emailAddress: string | null;
  useAutomatically: boolean;
  busy: boolean;
  setUseAutomatically: (on: boolean) => void;
  /** Create a new email; resolves with the phrase to show the user. */
  create: () => Promise<{ phrase: string; identity: AgentEmailIdentity }>;
  /** Restore from a phrase; rejects with `InvalidSeedPhraseError` if invalid. */
  restore: (phrase: string) => Promise<AgentEmailIdentity>;
  remove: () => Promise<void>;
  /** The stored phrase, to reveal a backup. */
  reveal: () => Promise<string | null>;
}

export function useAgentEmail(): UseAgentEmail {
  const emailAddress = useAgentEmailStore(s => s.emailAddress);
  const useAutomatically = useAgentEmailStore(s => s.useAutomatically);
  const setUseAutomatically = useAgentEmailStore(s => s.setUseAutomatically);
  const [busy, setBusy] = useState(false);

  const withBusy = useCallback(async function <T>(
    work: () => Promise<T>
  ): Promise<T> {
    setBusy(true);
    try {
      return await work();
    } finally {
      setBusy(false);
    }
  },
  []);

  return {
    emailAddress,
    useAutomatically,
    busy,
    setUseAutomatically,
    create: useCallback(() => withBusy(createAgentEmail), [withBusy]),
    restore: useCallback(
      (phrase: string) => withBusy(() => restoreAgentEmail(phrase)),
      [withBusy]
    ),
    remove: useCallback(() => withBusy(removeAgentEmail), [withBusy]),
    reveal: revealSeedPhrase,
  };
}

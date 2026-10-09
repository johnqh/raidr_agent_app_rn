/**
 * Creating, restoring and removing the agent email — the seed phrase into the
 * Keychain, the derived address into the store, and the Signic session reset
 * so the next read signs in as the new wallet.
 */

import { SIGNIC_CONFIG } from '@/config/agentEmail';
import {
  addressFromSeedPhrase,
  createSeedPhrase,
  emailAddressFor,
  isValidSeedPhrase,
  normalizeSeedPhrase,
} from '@/lib/agentWallet';
import {
  deleteSeedPhrase,
  getSeedPhrase,
  saveSeedPhrase,
} from '@/lib/agentWalletStore';
import { resetAgentEmailSession } from '@/lib/agentEmailService';
import { useAgentEmailStore } from '@/stores/agentEmailStore';

export interface AgentEmailIdentity {
  address: string;
  emailAddress: string;
}

/** The email address for a (valid) phrase, without storing anything. */
export function identityFor(phrase: string): AgentEmailIdentity {
  const address = addressFromSeedPhrase(phrase);
  return {
    address,
    emailAddress: emailAddressFor(address, SIGNIC_CONFIG.emailDomain),
  };
}

/** Generate a new agent email and store it. Returns the phrase to back up. */
export async function createAgentEmail(): Promise<{
  phrase: string;
  identity: AgentEmailIdentity;
}> {
  const phrase = createSeedPhrase();
  const identity = identityFor(phrase);
  await saveSeedPhrase(phrase);
  resetAgentEmailSession();
  useAgentEmailStore.getState().setEmail(identity.emailAddress);
  return { phrase, identity };
}

/** Thrown by {@link restoreAgentEmail} when the phrase is not a valid one. */
export class InvalidSeedPhraseError extends Error {
  constructor() {
    super('That is not a valid seed phrase');
    this.name = 'InvalidSeedPhraseError';
  }
}

/** Restore an agent email from a seed phrase the user entered. */
export async function restoreAgentEmail(
  input: string
): Promise<AgentEmailIdentity> {
  if (!isValidSeedPhrase(input)) {
    throw new InvalidSeedPhraseError();
  }
  const phrase = normalizeSeedPhrase(input);
  const identity = identityFor(phrase);
  await saveSeedPhrase(phrase);
  resetAgentEmailSession();
  useAgentEmailStore.getState().setEmail(identity.emailAddress);
  return identity;
}

/** Forget the agent email: Keychain, store and session. */
export async function removeAgentEmail(): Promise<void> {
  await deleteSeedPhrase();
  resetAgentEmailSession();
  useAgentEmailStore.getState().clearEmail();
}

/** The stored seed phrase, to show the user their backup. Null when none. */
export function revealSeedPhrase(): Promise<string | null> {
  return getSeedPhrase();
}

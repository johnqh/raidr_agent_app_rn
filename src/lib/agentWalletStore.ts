/**
 * The agent email's seed phrase, in the device Keychain / Keystore only —
 * never in JS storage, never on our server. It is read back to derive the
 * wallet for a Signic session and to show the user their backup phrase.
 *
 * As with site tokens (`secureStorage.ts`), the Keychain is not available on
 * every build (a simulator without the entitlement, a desktop with no secure
 * store wired), so each call falls back to a process-lifetime in-memory copy
 * and the reason is logged once. The fallback does not survive a relaunch.
 */

import * as Keychain from 'react-native-keychain';

const SERVICE = 'raidr-agent-email-wallet';
const USERNAME = 'seed-phrase';

let memory: string | null = null;
let loggedFallback = false;

function noteFallback(operation: string, error: unknown): void {
  if (loggedFallback) {
    return;
  }
  loggedFallback = true;
  console.warn(
    `[agentWalletStore] Keychain unavailable (${operation}); ` +
      'falling back to in-memory storage for this session.',
    error
  );
}

/** Store the seed phrase (replacing any existing one). */
export async function saveSeedPhrase(phrase: string): Promise<void> {
  memory = phrase;
  try {
    await Keychain.setGenericPassword(USERNAME, phrase, { service: SERVICE });
  } catch (error) {
    noteFallback('save', error);
  }
}

/** Read the stored seed phrase, or null when there is none. */
export async function getSeedPhrase(): Promise<string | null> {
  try {
    const credentials = await Keychain.getGenericPassword({ service: SERVICE });
    if (credentials && credentials.password) {
      return credentials.password;
    }
    return memory;
  } catch (error) {
    noteFallback('get', error);
    return memory;
  }
}

/** Remove the stored seed phrase. */
export async function deleteSeedPhrase(): Promise<void> {
  memory = null;
  try {
    await Keychain.resetGenericPassword({ service: SERVICE });
  } catch (error) {
    noteFallback('delete', error);
  }
}

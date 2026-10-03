/**
 * Per-site token storage, keyed by API host.
 *
 * Each site's signed-in token lives in the device Keychain / Keystore under its
 * own service name (`raidr-agent:<apiHost>`), never in JS storage and never on
 * our server. The token is read back only to hand it to a single run.
 *
 * The Keychain is not available everywhere a build runs — a simulator without
 * the keychain-sharing entitlement, or a desktop host that has no secure store
 * wired — so every call is wrapped in try/catch and falls back to a
 * process-lifetime in-memory map. The fallback keeps the sign-in flow working
 * (within one app session) instead of throwing; we log the reason once.
 */

import * as Keychain from 'react-native-keychain';

/** The fixed Keychain "username" slot; the token is the password. */
const USERNAME = 'token';

/** Keychain service name for a given API host. */
function serviceFor(apiHost: string): string {
  return `raidr-agent:${apiHost}`;
}

/**
 * In-memory fallback, used only when the Keychain is unavailable. Lives for the
 * lifetime of the JS context and is never persisted.
 */
const memoryStore = new Map<string, string>();

/** Whether the Keychain has already failed once (so we log only once). */
let loggedFallback = false;

/** Log the fallback reason a single time per app session. */
function noteFallback(operation: string, error: unknown): void {
  if (loggedFallback) {
    return;
  }
  loggedFallback = true;
  console.warn(
    `[secureStorage] Keychain unavailable (${operation}); ` +
      'falling back to in-memory token storage for this session.',
    error
  );
}

/** Persist a site token in the Keychain (or the in-memory fallback). */
export async function saveSiteToken(
  apiHost: string,
  token: string
): Promise<void> {
  const service = serviceFor(apiHost);
  try {
    await Keychain.setGenericPassword(USERNAME, token, { service });
    // Keep the fallback in sync so a later read in the same session still
    // resolves even if the Keychain read half fails.
    memoryStore.set(service, token);
  } catch (error) {
    noteFallback('save', error);
    memoryStore.set(service, token);
  }
}

/** Read a site token, or `null` when none is stored. */
export async function getSiteToken(apiHost: string): Promise<string | null> {
  const service = serviceFor(apiHost);
  try {
    const credentials = await Keychain.getGenericPassword({ service });
    if (credentials && credentials.password) {
      return credentials.password;
    }
    // No Keychain entry; the in-memory fallback may still hold it.
    return memoryStore.get(service) ?? null;
  } catch (error) {
    noteFallback('get', error);
    return memoryStore.get(service) ?? null;
  }
}

/** Remove a site token from both the Keychain and the fallback. */
export async function deleteSiteToken(apiHost: string): Promise<void> {
  const service = serviceFor(apiHost);
  memoryStore.delete(service);
  try {
    await Keychain.resetGenericPassword({ service });
  } catch (error) {
    noteFallback('delete', error);
  }
}

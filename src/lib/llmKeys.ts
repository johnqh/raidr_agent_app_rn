/**
 * The user's own LLM provider keys, used in local agent mode.
 *
 * Each provider's key lives in the device Keychain / Keystore under its own
 * service name (`raidr-agent-llm:<provider>`), never in JS storage and never
 * on our server. A key is read back only to make a provider call.
 *
 * Same robustness rules as `secureStorage.ts`: the Keychain is not available
 * on every build (simulator without the entitlement, a desktop host without a
 * secure store), so every call is wrapped in try/catch and falls back to a
 * process-lifetime in-memory map, and the reason is logged once.
 */

import * as Keychain from 'react-native-keychain';
import {
  LOCAL_LLM_PROVIDERS,
  type LocalLlmProvider,
} from '@/config/llmProviders';

/** The fixed Keychain "username" slot; the key is the password. */
const USERNAME = 'api-key';

/** Keychain service name for a provider. */
export function llmKeyService(provider: LocalLlmProvider): string {
  return `raidr-agent-llm:${provider}`;
}

/** In-memory fallback, used only when the Keychain is unavailable. */
const memoryStore = new Map<string, string>();

/** Whether the Keychain has already failed once (so we log only once). */
let loggedFallback = false;

function noteFallback(operation: string, error: unknown): void {
  if (loggedFallback) {
    return;
  }
  loggedFallback = true;
  console.warn(
    `[llmKeys] Keychain unavailable (${operation}); ` +
      'falling back to in-memory key storage for this session.',
    error
  );
}

/** Persist a provider key (trimmed). An empty key deletes the entry. */
export async function saveLlmKey(
  provider: LocalLlmProvider,
  key: string
): Promise<void> {
  const value = key.trim();
  if (!value) {
    await deleteLlmKey(provider);
    return;
  }
  const service = llmKeyService(provider);
  try {
    await Keychain.setGenericPassword(USERNAME, value, { service });
    memoryStore.set(service, value);
  } catch (error) {
    noteFallback('save', error);
    memoryStore.set(service, value);
  }
}

/** Read a provider key, or `null` when none is stored. */
export async function getLlmKey(
  provider: LocalLlmProvider
): Promise<string | null> {
  const service = llmKeyService(provider);
  try {
    const credentials = await Keychain.getGenericPassword({ service });
    if (credentials && credentials.password) {
      return credentials.password;
    }
    return memoryStore.get(service) ?? null;
  } catch (error) {
    noteFallback('get', error);
    return memoryStore.get(service) ?? null;
  }
}

/** Remove a provider key from both the Keychain and the fallback. */
export async function deleteLlmKey(provider: LocalLlmProvider): Promise<void> {
  const service = llmKeyService(provider);
  memoryStore.delete(service);
  try {
    await Keychain.resetGenericPassword({ service });
  } catch (error) {
    noteFallback('delete', error);
  }
}

/** Whether a key is stored for the provider. */
export async function hasLlmKey(provider: LocalLlmProvider): Promise<boolean> {
  return (await getLlmKey(provider)) !== null;
}

/** Providers that have a key, in `LOCAL_LLM_PROVIDERS` order. */
export async function listConfiguredProviders(): Promise<LocalLlmProvider[]> {
  const present = await Promise.all(LOCAL_LLM_PROVIDERS.map(hasLlmKey));
  return LOCAL_LLM_PROVIDERS.filter((_, i) => present[i]);
}

/**
 * A display-safe form of a key: a mask plus at most the last four characters.
 * Keys of eight characters or fewer show no characters at all.
 */
export function maskLlmKey(key: string): string {
  const value = key.trim();
  if (value.length <= 8) {
    return '••••';
  }
  return `••••${value.slice(-4)}`;
}

/**
 * The keys local mode should use, in the user's order: `order` filtered to
 * providers with a saved key. Empty when none is saved.
 */
export async function loadProviderKeys(
  order: readonly LocalLlmProvider[]
): Promise<{ provider: LocalLlmProvider; key: string }[]> {
  const keys = await Promise.all(order.map(getLlmKey));
  return order.flatMap((provider, i) => {
    const key = keys[i];
    return key ? [{ provider, key }] : [];
  });
}

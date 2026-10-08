/**
 * Pure rules for the agent mode and provider order (no React, no storage).
 *
 * - The effective provider list is `providerOrder` filtered to providers that
 *   have a key. The first is used; the rest are fallbacks, in order.
 * - Local mode is only possible with at least one key; with none, the mode
 *   falls back to cloud.
 */

import {
  LOCAL_LLM_PROVIDERS,
  isLocalLlmProvider,
  type LocalLlmProvider,
} from '@/config/llmProviders';

/** Where a run is planned: by raidr's server, or by the user's own provider. */
export type AgentMode = 'cloud' | 'local';

/** Default provider preference order. */
export const DEFAULT_PROVIDER_ORDER: readonly LocalLlmProvider[] =
  LOCAL_LLM_PROVIDERS;

/**
 * Turn any stored value into a full provider order: unknown and duplicate
 * entries are dropped, and providers missing from it are appended in default
 * order (so a provider added in a later release shows up at the end).
 */
export function normalizeProviderOrder(value: unknown): LocalLlmProvider[] {
  const seen = new Set<LocalLlmProvider>();
  if (Array.isArray(value)) {
    for (const item of value) {
      if (isLocalLlmProvider(item)) {
        seen.add(item);
      }
    }
  }
  for (const provider of DEFAULT_PROVIDER_ORDER) {
    seen.add(provider);
  }
  return Array.from(seen);
}

/** Turn any stored value into an agent mode (defaults to cloud). */
export function normalizeAgentMode(value: unknown): AgentMode {
  return value === 'local' ? 'local' : 'cloud';
}

/** Providers to try, in order: `order` filtered to those with a key. */
export function effectiveProviders(
  order: readonly LocalLlmProvider[],
  configured: Iterable<LocalLlmProvider>
): LocalLlmProvider[] {
  const have = new Set(configured);
  return order.filter(provider => have.has(provider));
}

/** Local mode needs at least one saved key. */
export function canUseLocal(configured: Iterable<LocalLlmProvider>): boolean {
  for (const _ of configured) {
    return true;
  }
  return false;
}

/** The mode to keep after the set of saved keys changed. */
export function modeAfterKeysChange(
  mode: AgentMode,
  configured: Iterable<LocalLlmProvider>
): AgentMode {
  return mode === 'local' && !canUseLocal(configured) ? 'cloud' : mode;
}

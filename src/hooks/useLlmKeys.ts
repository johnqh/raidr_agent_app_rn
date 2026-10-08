/**
 * Which local-mode providers have a saved key, plus save / remove.
 *
 * Loads from the Keychain on mount and every time the screen regains focus.
 * Only a masked form of each key (at most its last four characters) is held in
 * React state; the key itself is never kept here.
 *
 * Local mode needs at least one key: whenever a refresh finds none while the
 * mode is local (the last key was removed, or the Keychain was wiped), the
 * mode is switched back to cloud.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  LOCAL_LLM_PROVIDERS,
  type LocalLlmProvider,
} from '@/config/llmProviders';
import { deleteLlmKey, getLlmKey, maskLlmKey, saveLlmKey } from '@/lib/llmKeys';
import { effectiveProviders, modeAfterKeysChange } from '@/lib/agentMode';
import { useSettingsStore } from '@/stores/settingsStore';

export interface UseLlmKeysResult {
  /** Providers with a saved key, in `LOCAL_LLM_PROVIDERS` order. */
  configured: LocalLlmProvider[];
  /** `providerOrder` filtered to providers with a key; the first is used. */
  effective: LocalLlmProvider[];
  /** Masked key per provider (`••••abcd`), or `null` when none is saved. */
  masks: Record<LocalLlmProvider, string | null>;
  /** True until the first Keychain read finishes. */
  loading: boolean;
  /** Re-read the Keychain. */
  refresh: () => Promise<void>;
  /** Save (trimmed) a key for a provider. An empty key is ignored. */
  save: (provider: LocalLlmProvider, key: string) => Promise<void>;
  /** Remove a provider's key; falls back to cloud mode if it was the last. */
  remove: (provider: LocalLlmProvider) => Promise<void>;
}

function emptyMasks(): Record<LocalLlmProvider, string | null> {
  return { openai: null, anthropic: null, deepseek: null, openrouter: null };
}

export function useLlmKeys(): UseLlmKeysResult {
  const providerOrder = useSettingsStore(s => s.providerOrder);
  const [masks, setMasks] = useState(emptyMasks);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    const keys = await Promise.all(LOCAL_LLM_PROVIDERS.map(getLlmKey));
    const next = emptyMasks();
    const configured: LocalLlmProvider[] = [];
    LOCAL_LLM_PROVIDERS.forEach((provider, i) => {
      const key = keys[i];
      if (key) {
        next[provider] = maskLlmKey(key);
        configured.push(provider);
      }
    });
    const { agentMode, setAgentMode } = useSettingsStore.getState();
    const mode = modeAfterKeysChange(agentMode, configured);
    if (mode !== agentMode) {
      setAgentMode(mode);
    }
    if (mounted.current) {
      setMasks(next);
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const save = useCallback(
    async (provider: LocalLlmProvider, key: string) => {
      if (!key.trim()) {
        return;
      }
      await saveLlmKey(provider, key);
      await refresh();
    },
    [refresh]
  );

  const remove = useCallback(
    async (provider: LocalLlmProvider) => {
      await deleteLlmKey(provider);
      await refresh();
    },
    [refresh]
  );

  const configured = LOCAL_LLM_PROVIDERS.filter(p => masks[p] !== null);

  return {
    configured,
    effective: effectiveProviders(providerOrder, configured),
    masks,
    loading,
    refresh,
    save,
    remove,
  };
}

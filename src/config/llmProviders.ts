/**
 * Local-mode LLM providers.
 *
 * In local mode the agent's planning steps are sent to an AI provider using a
 * key the user saved on this device (see `src/lib/llmKeys.ts`). This module is
 * the static metadata for those providers: id, brand name, the key prefix the
 * key input hints at, and where to get a key.
 *
 * `LocalLlmProvider` and `LOCAL_LLM_PROVIDERS` come from
 * `@sudobility/raidr_agent_types`, so the server's `/llm/payload` validation
 * and this list cannot drift apart.
 *
 * Brand names and key prefixes are not translated; any prose about a provider
 * lives under `apiKeys.*` in the locale files.
 */

import {
  LOCAL_LLM_PROVIDERS,
  type LocalLlmProvider,
} from '@sudobility/raidr_agent_types';

export { LOCAL_LLM_PROVIDERS, type LocalLlmProvider };

/** Static display metadata for one provider. */
export interface LlmProviderInfo {
  id: LocalLlmProvider;
  /** Brand name, shown as-is in every locale. */
  name: string;
  /** What keys from this provider start with; used as the input placeholder. */
  keyPlaceholder: string;
  /** Page where the user can create a key. */
  keyUrl: string;
}

/** Metadata for every provider, keyed by id. */
export const LLM_PROVIDER_INFO: Readonly<
  Record<LocalLlmProvider, LlmProviderInfo>
> = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    keyPlaceholder: 'sk-…',
    keyUrl: 'https://platform.openai.com/api-keys',
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic Claude',
    keyPlaceholder: 'sk-ant-…',
    keyUrl: 'https://console.anthropic.com/settings/keys',
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    keyPlaceholder: 'sk-…',
    keyUrl: 'https://platform.deepseek.com/api_keys',
  },
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    keyPlaceholder: 'sk-or-…',
    keyUrl: 'https://openrouter.ai/keys',
  },
};

/** Whether a value is a known provider id. */
export function isLocalLlmProvider(value: unknown): value is LocalLlmProvider {
  return (
    typeof value === 'string' &&
    (LOCAL_LLM_PROVIDERS as readonly string[]).includes(value)
  );
}

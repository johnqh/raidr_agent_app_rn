/**
 * Tests for the LLM provider key store: Keychain service names, the in-memory
 * fallback, `listConfiguredProviders` and the display mask.
 */

const mockKeychain = new Map<string, string>();
let mockFail = false;

jest.mock('react-native-keychain', () => ({
  setGenericPassword: jest.fn(
    (_user: string, password: string, opts: { service: string }) => {
      if (mockFail) {
        return Promise.reject(new Error('no keychain'));
      }
      mockKeychain.set(opts.service, password);
      return Promise.resolve(true);
    }
  ),
  getGenericPassword: jest.fn((opts: { service: string }) => {
    if (mockFail) {
      return Promise.reject(new Error('no keychain'));
    }
    const password = mockKeychain.get(opts.service);
    return Promise.resolve(
      password ? { username: 'api-key', password } : false
    );
  }),
  resetGenericPassword: jest.fn((opts: { service: string }) => {
    if (mockFail) {
      return Promise.reject(new Error('no keychain'));
    }
    mockKeychain.delete(opts.service);
    return Promise.resolve(true);
  }),
}));

import * as Keychain from 'react-native-keychain';
import {
  saveLlmKey,
  getLlmKey,
  deleteLlmKey,
  hasLlmKey,
  listConfiguredProviders,
  maskLlmKey,
  llmKeyService,
} from '../llmKeys';
import { LOCAL_LLM_PROVIDERS } from '@/config/llmProviders';

beforeAll(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

beforeEach(async () => {
  mockFail = false;
  mockKeychain.clear();
  for (const p of LOCAL_LLM_PROVIDERS) {
    await deleteLlmKey(p);
  }
  jest.clearAllMocks();
});

describe('llmKeys with a working Keychain', () => {
  it('stores each provider under raidr-agent-llm:<provider>', async () => {
    await saveLlmKey('anthropic', '  sk-ant-secret  ');
    expect(Keychain.setGenericPassword).toHaveBeenCalledWith(
      'api-key',
      'sk-ant-secret',
      { service: 'raidr-agent-llm:anthropic' }
    );
    expect(llmKeyService('openrouter')).toBe('raidr-agent-llm:openrouter');
    await expect(getLlmKey('anthropic')).resolves.toBe('sk-ant-secret');
    await expect(getLlmKey('openai')).resolves.toBeNull();
  });

  it('reports has / list in canonical order', async () => {
    await saveLlmKey('openrouter', 'sk-or-1');
    await saveLlmKey('openai', 'sk-1');
    await expect(hasLlmKey('openai')).resolves.toBe(true);
    await expect(hasLlmKey('deepseek')).resolves.toBe(false);
    await expect(listConfiguredProviders()).resolves.toEqual([
      'openai',
      'openrouter',
    ]);
  });

  it('deletes a key', async () => {
    await saveLlmKey('deepseek', 'sk-d');
    await deleteLlmKey('deepseek');
    await expect(hasLlmKey('deepseek')).resolves.toBe(false);
    await expect(listConfiguredProviders()).resolves.toEqual([]);
  });

  it('treats saving an empty key as delete', async () => {
    await saveLlmKey('openai', 'sk-1');
    await saveLlmKey('openai', '   ');
    await expect(hasLlmKey('openai')).resolves.toBe(false);
  });
});

describe('llmKeys in-memory fallback', () => {
  it('keeps working when the Keychain rejects', async () => {
    mockFail = true;
    await saveLlmKey('openai', 'sk-mem');
    await expect(getLlmKey('openai')).resolves.toBe('sk-mem');
    await expect(listConfiguredProviders()).resolves.toEqual(['openai']);
    await deleteLlmKey('openai');
    await expect(getLlmKey('openai')).resolves.toBeNull();
  });
});

describe('maskLlmKey', () => {
  it('shows at most the last four characters', () => {
    expect(maskLlmKey('sk-ant-api03-abcdefWXYZ')).toBe('••••WXYZ');
  });

  it('shows nothing of a short key', () => {
    expect(maskLlmKey('sk-12345')).toBe('••••');
  });
});

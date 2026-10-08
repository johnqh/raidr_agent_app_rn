/**
 * `useLlmKeys` exposes only masked keys, and removing the last key while in
 * local mode switches the agent back to cloud.
 */
import React from 'react';
import { act, create } from 'react-test-renderer';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('react-native-keychain', () => ({
  setGenericPassword: jest.fn(() => Promise.reject(new Error('no keychain'))),
  getGenericPassword: jest.fn(() => Promise.reject(new Error('no keychain'))),
  resetGenericPassword: jest.fn(() => Promise.reject(new Error('no keychain'))),
}));
jest.mock('@react-navigation/native', () => {
  const { useEffect } = require('react');
  return {
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
  };
});

import { useLlmKeys, type UseLlmKeysResult } from '../useLlmKeys';
import { useSettingsStore } from '@/stores/settingsStore';

let latest: UseLlmKeysResult;
function Probe() {
  latest = useLlmKeys();
  return null;
}

async function mount() {
  await act(async () => {
    create(<Probe />);
  });
}

beforeAll(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('useLlmKeys', () => {
  it('saves, masks and removes keys; last removal falls back to cloud', async () => {
    useSettingsStore.getState().reset();
    await mount();
    expect(latest.loading).toBe(false);
    expect(latest.configured).toEqual([]);

    await act(async () => {
      await latest.save('anthropic', 'sk-ant-api03-secretKEY1');
      await latest.save('openai', 'sk-proj-secretKEY2');
    });
    expect(latest.configured).toEqual(['openai', 'anthropic']);
    expect(latest.masks.anthropic).toBe('••••KEY1');
    expect(JSON.stringify(latest.masks)).not.toContain('secret');

    act(() => {
      useSettingsStore
        .getState()
        .setProviderOrder(['anthropic', 'openai', 'deepseek', 'openrouter']);
      useSettingsStore.getState().setAgentMode('local');
    });
    expect(latest.effective).toEqual(['anthropic', 'openai']);

    await act(async () => {
      await latest.remove('anthropic');
    });
    expect(useSettingsStore.getState().agentMode).toBe('local');
    expect(latest.effective).toEqual(['openai']);

    await act(async () => {
      await latest.remove('openai');
    });
    expect(latest.configured).toEqual([]);
    expect(useSettingsStore.getState().agentMode).toBe('cloud');
  });

  it('ignores an empty key', async () => {
    await mount();
    await act(async () => {
      await latest.save('deepseek', '   ');
    });
    expect(latest.configured).toEqual([]);
  });
});

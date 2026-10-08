/**
 * The agent settings persist, and state saved by older versions (theme only)
 * rehydrates with the new defaults.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSettingsStore, sanitizeSettings } from '../settingsStore';

const KEY = 'raidr-agent-settings';

beforeEach(async () => {
  await AsyncStorage.clear();
  useSettingsStore.getState().reset();
});

describe('settingsStore agent settings', () => {
  it('defaults to cloud and the default provider order', () => {
    const s = useSettingsStore.getState();
    expect(s.agentMode).toBe('cloud');
    expect(s.providerOrder).toEqual([
      'openai',
      'anthropic',
      'deepseek',
      'openrouter',
    ]);
  });

  it('sets mode and order, normalising the order', () => {
    useSettingsStore.getState().setAgentMode('local');
    useSettingsStore.getState().setProviderOrder(['deepseek', 'openai']);
    const s = useSettingsStore.getState();
    expect(s.agentMode).toBe('local');
    expect(s.providerOrder).toEqual([
      'deepseek',
      'openai',
      'anthropic',
      'openrouter',
    ]);
  });

  it('migrates version-0 state (theme only) to the new defaults', async () => {
    useSettingsStore.getState().setAgentMode('local');
    await AsyncStorage.setItem(
      KEY,
      JSON.stringify({ state: { theme: 'dark' }, version: 0 })
    );
    await useSettingsStore.persist.rehydrate();
    const s = useSettingsStore.getState();
    expect(s.theme).toBe('dark');
    expect(s.agentMode).toBe('cloud');
    expect(s.providerOrder).toEqual([
      'openai',
      'anthropic',
      'deepseek',
      'openrouter',
    ]);
  });

  it('rehydrates current-version state', async () => {
    await AsyncStorage.setItem(
      KEY,
      JSON.stringify({
        state: {
          theme: 'light',
          agentMode: 'local',
          providerOrder: ['openrouter', 'anthropic', 'openai', 'deepseek'],
        },
        version: 1,
      })
    );
    await useSettingsStore.persist.rehydrate();
    const s = useSettingsStore.getState();
    expect(s.agentMode).toBe('local');
    expect(s.providerOrder).toEqual([
      'openrouter',
      'anthropic',
      'openai',
      'deepseek',
    ]);
  });

  it('sanitizes garbage', () => {
    expect(
      sanitizeSettings({ theme: 'neon', agentMode: 7, providerOrder: 'x' })
    ).toEqual({
      theme: 'system',
      agentMode: 'cloud',
      providerOrder: ['openai', 'anthropic', 'deepseek', 'openrouter'],
      grantedPermissions: [],
    });
  });

  it('keeps known granted permissions once (v1 had none)', () => {
    expect(
      sanitizeSettings({
        grantedPermissions: ['location', 'teleport', 'location'],
      }).grantedPermissions
    ).toEqual(['location']);
  });

  it('records a permission being allowed and taken back', () => {
    const { setPermissionGranted } = useSettingsStore.getState();
    setPermissionGranted('location', true);
    setPermissionGranted('location', true);
    expect(useSettingsStore.getState().grantedPermissions).toEqual(['location']);
    setPermissionGranted('location', false);
    expect(useSettingsStore.getState().grantedPermissions).toEqual([]);
  });
});

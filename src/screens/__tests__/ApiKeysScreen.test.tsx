/**
 * API Keys screen: Local is unavailable without a key, keys are only shown
 * masked, and rows reorder through their accessibility actions.
 */
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { TabsTrigger } from '@sudobility/components-rn';
import ApiKeysScreen from '../ApiKeysScreen';
import type { ApiKeysScreenProps } from '@/navigation/types';
import { useSettingsStore } from '@/stores/settingsStore';
import { trackButtonClick } from '@/analytics';

const mockKeys = {
  configured: [] as string[],
  effective: [] as string[],
  masks: {
    openai: null as string | null,
    anthropic: null as string | null,
    deepseek: null as string | null,
    openrouter: null as string | null,
  },
  loading: false,
  refresh: jest.fn(),
  save: jest.fn(() => Promise.resolve()),
  remove: jest.fn(() => Promise.resolve()),
};

jest.mock('@/hooks/useLlmKeys', () => ({ useLlmKeys: () => mockKeys }));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('@/hooks/useTabBarHeight', () => ({ useTabBarHeight: () => 0 }));
jest.mock('@/analytics', () => ({
  trackScreenView: jest.fn(),
  trackButtonClick: jest.fn(),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('@react-navigation/native', () => ({
  useTheme: () => ({ dark: false }),
  // The screen's NavBar: a stack root, nothing to go back to.
  useNavigation: () => ({ canGoBack: () => false, goBack: jest.fn() }),
}));

const props = {} as ApiKeysScreenProps;

const mounted: ReactTestRenderer[] = [];

function render(): ReactTestRenderer {
  let tree: ReactTestRenderer | undefined;
  act(() => {
    tree = create(<ApiKeysScreen {...props} />);
  });
  mounted.push(tree!);
  return tree!;
}

afterEach(() => {
  act(() => {
    mounted.splice(0).forEach(tree => tree.unmount());
  });
});

function localTrigger(tree: ReactTestRenderer) {
  return tree.root
    .findAllByType(TabsTrigger)
    .find(n => n.props.value === 'local')!;
}

beforeEach(() => {
  useSettingsStore.getState().reset();
  mockKeys.configured = [];
  mockKeys.masks = {
    openai: null,
    anthropic: null,
    deepseek: null,
    openrouter: null,
  };
  (trackButtonClick as jest.Mock).mockClear();
});

describe('ApiKeysScreen', () => {
  it('disables Local and explains why when no key is saved', () => {
    const tree = render();
    expect(localTrigger(tree).props.disabled).toBe(true);
    expect(
      tree.root.findAll(n => n.props.testID === 'api-keys-local-disabled')
        .length
    ).toBeGreaterThan(0);
  });

  it('enables Local once a key exists and shows only the mask', () => {
    mockKeys.configured = ['anthropic'];
    mockKeys.masks.anthropic = '••••WXYZ';
    const tree = render();
    expect(localTrigger(tree).props.disabled).toBe(false);
    expect(
      tree.root.findAll(n => n.props.testID === 'api-keys-local-disabled')
    ).toHaveLength(0);
    expect(JSON.stringify(tree.toJSON())).toContain('••••WXYZ');
  });

  it('lists providers in providerOrder and reorders via accessibility actions', () => {
    const tree = render();
    const row = tree.root.find(
      n =>
        n.props.testID === 'api-keys-row-openai' &&
        typeof n.props.onAccessibilityAction === 'function'
    );
    expect(
      row.props.accessibilityActions.map((a: { name: string }) => a.name)
    ).toEqual(['moveDown']);
    act(() => {
      row.props.onAccessibilityAction({
        nativeEvent: { actionName: 'moveDown' },
      });
    });
    expect(useSettingsStore.getState().providerOrder).toEqual([
      'anthropic',
      'openai',
      'deepseek',
      'openrouter',
    ]);
    expect(trackButtonClick).toHaveBeenCalledWith('api_keys_reorder', {
      method: 'button',
    });
  });

  it('saves a key from the row editor without tracking key material', async () => {
    const tree = render();
    const row = tree.root.find(
      n =>
        n.props.testID === 'api-keys-row-deepseek' &&
        typeof n.props.onPress === 'function'
    );
    act(() => {
      row.props.onPress();
    });
    const input = tree.root.find(
      n =>
        n.props.testID === 'api-keys-input-deepseek' &&
        typeof n.props.onChangeText === 'function'
    );
    expect(input.props.secureTextEntry).toBe(true);
    act(() => {
      input.props.onChangeText('sk-deep-secret');
    });
    const save = tree.root.find(
      n =>
        n.props.testID === 'api-keys-save-deepseek' &&
        typeof n.props.onPress === 'function'
    );
    await act(async () => {
      await save.props.onPress();
    });
    expect(mockKeys.save).toHaveBeenCalledWith('deepseek', 'sk-deep-secret');
    expect(
      JSON.stringify((trackButtonClick as jest.Mock).mock.calls)
    ).not.toContain('secret');
  });
});

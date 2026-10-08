/**
 * Permission screen: Allow runs the permission and replaces itself with the
 * next route (so it leaves the back stack); Not now goes back; a refusal
 * explains and offers Settings and another try.
 */
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Button } from '@sudobility/components-rn';
import PermissionScreen from '../PermissionScreen';
import type { PermissionScreenProps } from '@/navigation/types';
import { useSettingsStore } from '@/stores/settingsStore';

const mockAllow = jest.fn<Promise<boolean>, []>();
jest.mock('@/lib/permissions', () => ({
  PERMISSIONS: { location: { allow: () => mockAllow() } },
}));
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
  useNavigation: () => ({ canGoBack: () => true, goBack: jest.fn() }),
}));

const navigation = { replace: jest.fn(), goBack: jest.fn() };
const props = {
  navigation,
  route: { params: { kind: 'location', next: { name: 'Sites' } } },
} as unknown as PermissionScreenProps;

function render(): ReactTestRenderer {
  let tree: ReactTestRenderer | undefined;
  act(() => {
    tree = create(<PermissionScreen {...props} />);
  });
  return tree!;
}

function press(tree: ReactTestRenderer, label: string) {
  const button = tree.root
    .findAllByType(Button)
    .find(b => b.props.accessibilityLabel === label);
  if (!button) throw new Error(`no ${label} button`);
  return act(async () => {
    await button.props.onPress();
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  useSettingsStore.getState().reset();
});

it('replaces itself with the next screen once allowed, and remembers it', async () => {
  mockAllow.mockResolvedValueOnce(true);
  const tree = render();
  await press(tree, 'permission.location.allow');
  expect(navigation.replace).toHaveBeenCalledWith('Sites', undefined);
  expect(useSettingsStore.getState().grantedPermissions).toEqual(['location']);
});

it('goes back on Not now', async () => {
  const tree = render();
  await press(tree, 'permission.notNow');
  expect(navigation.goBack).toHaveBeenCalled();
  expect(navigation.replace).not.toHaveBeenCalled();
});

it('explains a refusal and offers Settings and another try', async () => {
  mockAllow.mockResolvedValueOnce(false);
  const tree = render();
  await press(tree, 'permission.location.allow');
  expect(navigation.replace).not.toHaveBeenCalled();
  const labels = tree.root
    .findAllByType(Button)
    .map(b => b.props.accessibilityLabel);
  expect(labels).toContain('permission.openSettings');
  expect(JSON.stringify(tree.toJSON())).toContain(
    'permission.location.refused'
  );
  expect(useSettingsStore.getState().grantedPermissions).toEqual([]);
});

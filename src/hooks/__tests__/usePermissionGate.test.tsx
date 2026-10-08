/**
 * usePermissionGate: the permission screen the first time; once allowed, the
 * permission is used in place and the next screen opens directly — unless it
 * stopped working, then the screen again.
 */
import React from 'react';
import { act, create } from 'react-test-renderer';
import { usePermissionGate } from '../usePermissionGate';
import { useSettingsStore } from '@/stores/settingsStore';

const mockAllow = jest.fn<Promise<boolean>, []>();
const mockNavigate = jest.fn();
jest.mock('@/lib/permissions', () => ({
  PERMISSIONS: { location: { allow: () => mockAllow() } },
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

function gate() {
  let value: ReturnType<typeof usePermissionGate> | undefined;
  function Probe() {
    value = usePermissionGate();
    return null;
  }
  act(() => {
    create(<Probe />);
  });
  return value!;
}

beforeEach(() => {
  jest.clearAllMocks();
  useSettingsStore.getState().reset();
});

it('opens the permission screen when not allowed yet', async () => {
  const { goWith } = gate();
  await act(() => goWith('location', { name: 'Sites' }));
  expect(mockAllow).not.toHaveBeenCalled();
  expect(mockNavigate).toHaveBeenCalledWith('Permission', {
    kind: 'location',
    next: { name: 'Sites' },
  });
});

it('goes straight on once allowed', async () => {
  useSettingsStore.getState().setPermissionGranted('location', true);
  mockAllow.mockResolvedValueOnce(true);
  const { goWith } = gate();
  await act(() => goWith('location', { name: 'Sites' }));
  expect(mockNavigate).toHaveBeenCalledWith('Sites', undefined);
  expect(mockNavigate).toHaveBeenCalledTimes(1);
});

it('asks again when an allowed permission stopped working', async () => {
  useSettingsStore.getState().setPermissionGranted('location', true);
  mockAllow.mockResolvedValueOnce(false);
  const { goWith } = gate();
  await act(() => goWith('location', { name: 'Sites' }));
  expect(mockNavigate).toHaveBeenCalledWith('Permission', {
    kind: 'location',
    next: { name: 'Sites' },
  });
  expect(useSettingsStore.getState().grantedPermissions).toEqual([]);
});

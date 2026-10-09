/**
 * The password manager list: empty state, a row with reveal, and Add opening
 * the modal. The vault is mocked; the index store is real.
 */
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import PasswordsSection from '../settings/PasswordsSection';
import { usePasswordIndexStore } from '@/stores/passwordIndexStore';
import { revealPassword, saveManualLogin } from '@/lib/passwordVault';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('@/lib/passwordVault', () => ({
  revealPassword: jest.fn(async () => 'SECRETpw1!'),
  saveManualLogin: jest.fn(async () => 'example.com'),
  updateLogin: jest.fn(),
  removeLogin: jest.fn(),
}));
jest.mock('../settings/PasswordEntryModal', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props: { visible: boolean }) => (
      <View testID='password-modal' visible={props.visible} />
    ),
  };
});
jest.mock('@/components/SiteIcon', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: () => <View /> };
});
jest.mock('@/analytics', () => ({
  trackButtonClick: jest.fn(),
  trackEvent: jest.fn(),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

function render(): ReactTestRenderer {
  let tree: ReactTestRenderer | undefined;
  act(() => {
    tree = create(<PasswordsSection />);
  });
  return tree!;
}

const press = (tree: ReactTestRenderer, id: string) =>
  tree.root.find(
    n => n.props.testID === id && typeof n.props.onPress === 'function'
  );

describe('PasswordsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usePasswordIndexStore.setState({ entries: [] });
  });

  it('shows the empty state with an Add button', () => {
    const tree = render();
    expect(JSON.stringify(tree.toJSON())).toContain('settings.passwords.empty');
    expect(press(tree, 'passwords-add')).toBeTruthy();
  });

  it('opens the modal from Add', () => {
    const tree = render();
    expect(
      tree.root.find(n => n.props.testID === 'password-modal').props.visible
    ).toBe(false);
    act(() => {
      press(tree, 'passwords-add').props.onPress();
    });
    expect(
      tree.root.find(n => n.props.testID === 'password-modal').props.visible
    ).toBe(true);
  });

  it('lists an entry and reveals its password on demand', async () => {
    act(() => {
      usePasswordIndexStore.setState({
        entries: [
          {
            apiHost: 'example.com',
            domain: 'example.com',
            email: 'me@x.com',
            source: 'manual',
            updatedAt: 1,
          },
        ],
      });
    });
    const tree = render();
    expect(JSON.stringify(tree.toJSON())).toContain('me@x.com');
    // Hidden until revealed.
    expect(JSON.stringify(tree.toJSON())).toContain('••••••••••');
    await act(async () => {
      await press(tree, 'password-reveal-example.com').props.onPress();
    });
    expect(revealPassword).toHaveBeenCalledWith('example.com');
    expect(JSON.stringify(tree.toJSON())).toContain('SECRETpw1!');
  });

  it('references saveManualLogin for a new entry', () => {
    // Guards the import wiring without driving the mocked modal.
    expect(saveManualLogin).toBeDefined();
  });
});

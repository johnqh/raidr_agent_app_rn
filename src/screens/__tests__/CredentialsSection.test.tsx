/**
 * Credentials lists the sites the user is signed in to; Sign out and Sign
 * out of all ask first, then sign out through `siteSessions`.
 */
import React from 'react';
import { Alert } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import CredentialsSection from '../settings/CredentialsSection';
import { useCredentialsStore } from '@/stores/credentialsStore';
import { signOutOfAllSites, signOutOfSite } from '@/lib/siteSessions';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('@/lib/siteSessions', () => ({
  signOutOfSite: jest.fn(() => Promise.resolve()),
  signOutOfAllSites: jest.fn(() => Promise.resolve()),
}));
jest.mock('@/hooks/useSiteBadges', () => ({
  useSiteBadges: (hosts: string[]) =>
    Object.fromEntries(
      hosts.map(h => [h, { apiHost: h, domain: h.replace(/^api\./, '') }])
    ),
}));
jest.mock('../settings/AddCredentialModal', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props: { visible: boolean }) => (
      <View testID='add-credential-modal' visible={props.visible} />
    ),
  };
});
jest.mock('@/analytics', () => ({
  trackButtonClick: jest.fn(),
  trackEvent: jest.fn(),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

const sites = [
  { apiHost: 'api.b.com', loginUrl: 'https://b.com/login', signedInAt: 2 },
  { apiHost: 'api.a.com', loginUrl: 'https://a.com/login', signedInAt: 1 },
];

function render(): ReactTestRenderer {
  let tree: ReactTestRenderer | undefined;
  act(() => {
    tree = create(<CredentialsSection />);
  });
  return tree!;
}

/** Press the destructive button of the last alert. */
async function confirmAlert(): Promise<void> {
  const buttons = (Alert.alert as jest.Mock).mock.calls.at(-1)[2];
  await act(async () => {
    await buttons
      .find((b: { style?: string }) => b.style === 'destructive')
      .onPress();
  });
}

function byTestId(tree: ReactTestRenderer, id: string) {
  return tree.root.find(
    n => n.props.testID === id && typeof n.props.onPress === 'function'
  );
}

describe('CredentialsSection', () => {
  beforeEach(() => {
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    (signOutOfSite as jest.Mock).mockClear();
    (signOutOfAllSites as jest.Mock).mockClear();
    act(() => {
      useCredentialsStore.setState({ sites });
    });
  });

  it('says so when no site is signed in', () => {
    act(() => {
      useCredentialsStore.setState({ sites: [] });
    });
    const tree = render();
    expect(JSON.stringify(tree.toJSON())).toContain(
      'settings.credentials.empty'
    );
  });

  it('signs out of one site after asking', async () => {
    const tree = render();
    act(() => {
      byTestId(tree, 'credential-sign-out-api.a.com').props.onPress();
    });
    expect(signOutOfSite).not.toHaveBeenCalled();
    await confirmAlert();
    expect(signOutOfSite).toHaveBeenCalledWith(sites[1]);
  });

  it('signs out of every site after asking', async () => {
    const tree = render();
    act(() => {
      byTestId(tree, 'credentials-sign-out-all').props.onPress();
    });
    await confirmAlert();
    expect(signOutOfAllSites).toHaveBeenCalledWith(sites);
  });

  it('opens Add Credential, with or without sites listed', () => {
    for (const listed of [sites, []]) {
      act(() => {
        useCredentialsStore.setState({ sites: listed });
      });
      const tree = render();
      const modal = () =>
        tree.root.find(n => n.props.testID === 'add-credential-modal');
      expect(modal().props.visible).toBe(false);
      act(() => {
        byTestId(tree, 'credentials-add').props.onPress();
      });
      expect(modal().props.visible).toBe(true);
    }
  });
});

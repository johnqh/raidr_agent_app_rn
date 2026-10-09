/**
 * Add credential, step one: what was typed is searched, and choosing a site
 * pushes the shared Login screen to store a credential (not to pick a site
 * for a run).
 */
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import FindSiteScreen from '../FindSiteScreen';
import { AddCredentialContext } from '../settings/addCredentialContext';
import { useSiteSearch } from '@/hooks/useSiteSearch';
import type { FindSiteScreenProps } from '@/navigation/types';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('@/hooks/useSiteSearch', () => ({ useSiteSearch: jest.fn() }));
jest.mock('@/hooks/useSiteBadges', () => ({ useSiteBadges: () => ({}) }));
jest.mock('@/hooks/useTabBarHeight', () => ({ useTabBarHeight: () => 0 }));
jest.mock('@/analytics', () => ({ trackButtonClick: jest.fn() }));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('@react-navigation/native', () => ({
  useTheme: () => ({ dark: false }),
  useNavigation: () => ({ canGoBack: () => false, goBack: jest.fn() }),
}));

const hit = {
  domain: 'suno.com',
  origin: 'https://suno.com',
  apiHost: 'studio-api.suno.com',
  title: 'Suno',
  authStyle: 'bearer' as const,
};
const navigate = jest.fn();
const close = jest.fn();

function render(): ReactTestRenderer {
  let tree: ReactTestRenderer | undefined;
  act(() => {
    tree = create(
      <AddCredentialContext.Provider value={{ close }}>
        <FindSiteScreen
          {...({ navigation: { navigate } } as unknown as FindSiteScreenProps)}
        />
      </AddCredentialContext.Provider>
    );
  });
  return tree!;
}

const pressable = (tree: ReactTestRenderer, id: string) =>
  tree.root.find(
    n => n.props.testID === id && typeof n.props.onPress === 'function'
  );

describe('FindSiteScreen', () => {
  beforeEach(() => {
    navigate.mockClear();
    close.mockClear();
    (useSiteSearch as jest.Mock).mockImplementation((text: string) => ({
      query: text,
      enabled: text.length >= 2,
      hits: text.length >= 2 ? [hit] : [],
      isLoading: false,
      isError: false,
    }));
  });

  it('asks for more letters, then lists the matching domains', () => {
    const tree = render();
    expect(JSON.stringify(tree.toJSON())).toContain(
      'settings.addCredential.hint'
    );
    const input = tree.root.find(
      n =>
        n.props.testID === 'add-credential-search' &&
        typeof n.props.onChangeText === 'function'
    );
    act(() => {
      input.props.onChangeText('sun');
    });
    expect(useSiteSearch).toHaveBeenLastCalledWith('sun');
    expect(JSON.stringify(tree.toJSON())).toContain('suno.com');
  });

  it('pushes the shared Login screen for the chosen site', () => {
    const tree = render();
    act(() => {
      tree.root
        .find(
          n =>
            n.props.testID === 'add-credential-search' &&
            typeof n.props.onChangeText === 'function'
        )
        .props.onChangeText('suno');
    });
    act(() => {
      pressable(tree, 'find-site-studio-api.suno.com').props.onPress();
    });
    expect(navigate).toHaveBeenCalledWith('Login', {
      apiHost: 'studio-api.suno.com',
      purpose: 'credential',
    });
  });

  it('closes the modal on Cancel', () => {
    const tree = render();
    act(() => {
      pressable(tree, 'add-credential-cancel').props.onPress();
    });
    expect(close).toHaveBeenCalled();
  });
});

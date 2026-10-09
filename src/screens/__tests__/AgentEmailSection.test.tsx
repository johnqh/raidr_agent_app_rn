/**
 * Agent Email section: no email → Create generates a phrase and shows the
 * backup modal; with an email → the address, the automatic toggle and Show
 * Seed Phrases. The hook and the two modals are mocked.
 */
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import AgentEmailSection from '../settings/AgentEmailSection';
import { useAgentEmail } from '@/hooks/useAgentEmail';

jest.mock('@/hooks/useAgentEmail', () => ({ useAgentEmail: jest.fn() }));
jest.mock('../settings/SeedPhraseModal', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props: { phrase: string | null; mode: string }) => (
      <View testID='seed-modal' phrase={props.phrase} mode={props.mode} />
    ),
  };
});
jest.mock('../settings/RestoreEmailModal', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props: { visible: boolean }) => (
      <View testID='restore-modal' visible={props.visible} />
    ),
  };
});
jest.mock('@/analytics', () => ({
  trackButtonClick: jest.fn(),
  trackEvent: jest.fn(),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const base = {
  emailAddress: null as string | null,
  useAutomatically: false,
  busy: false,
  setUseAutomatically: jest.fn(),
  create: jest.fn(),
  restore: jest.fn(),
  remove: jest.fn(),
  reveal: jest.fn(),
};

function mockHook(over: Partial<typeof base>) {
  (useAgentEmail as jest.Mock).mockReturnValue({ ...base, ...over });
}

function render(): ReactTestRenderer {
  let tree: ReactTestRenderer | undefined;
  act(() => {
    tree = create(<AgentEmailSection />);
  });
  return tree!;
}

const press = (tree: ReactTestRenderer, id: string) =>
  tree.root.find(
    n => n.props.testID === id && typeof n.props.onPress === 'function'
  );

describe('AgentEmailSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    base.setUseAutomatically = jest.fn();
  });

  it('creates an email and shows the backup phrase', async () => {
    const createFn = jest
      .fn()
      .mockResolvedValue({ phrase: 'alpha bravo', identity: {} });
    mockHook({ emailAddress: null, create: createFn });
    const tree = render();
    expect(
      tree.root.find(n => n.props.testID === 'seed-modal').props.phrase
    ).toBe(null);
    await act(async () => {
      await press(tree, 'agent-email-create').props.onPress();
    });
    expect(createFn).toHaveBeenCalled();
    const modal = tree.root.find(n => n.props.testID === 'seed-modal');
    expect(modal.props.phrase).toBe('alpha bravo');
    expect(modal.props.mode).toBe('backup');
  });

  it('opens the restore modal', () => {
    mockHook({ emailAddress: null });
    const tree = render();
    expect(
      tree.root.find(n => n.props.testID === 'restore-modal').props.visible
    ).toBe(false);
    act(() => {
      press(tree, 'agent-email-restore').props.onPress();
    });
    expect(
      tree.root.find(n => n.props.testID === 'restore-modal').props.visible
    ).toBe(true);
  });

  it('shows the address and toggles automatic use', () => {
    const setUseAutomatically = jest.fn();
    mockHook({
      emailAddress: '0xabc@signic.email',
      useAutomatically: false,
      setUseAutomatically,
    });
    const tree = render();
    expect(JSON.stringify(tree.toJSON())).toContain('0xabc@signic.email');
    const toggle = tree.root.find(
      n => n.props.testID === 'agent-email-auto' && 'onCheckedChange' in n.props
    );
    act(() => {
      toggle.props.onCheckedChange(true);
    });
    expect(setUseAutomatically).toHaveBeenCalledWith(true);
  });

  it('reveals the stored seed phrase', async () => {
    const reveal = jest.fn().mockResolvedValue('alpha bravo charlie');
    mockHook({ emailAddress: '0xabc@signic.email', reveal });
    const tree = render();
    await act(async () => {
      await press(tree, 'agent-email-show-seed').props.onPress();
    });
    const modal = tree.root.find(n => n.props.testID === 'seed-modal');
    expect(modal.props.phrase).toBe('alpha bravo charlie');
    expect(modal.props.mode).toBe('reveal');
  });
});

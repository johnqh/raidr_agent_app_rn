/**
 * CopyButton copies a value (given or fetched) and shows "Copied" briefly.
 */
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import CopyButton from '../CopyButton';
import { copySensitive, copyText } from '@/lib/clipboard';

jest.mock('@/lib/clipboard', () => ({
  copyText: jest.fn(async () => true),
  copySensitive: jest.fn(async () => true),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

function render(node: React.ReactElement): ReactTestRenderer {
  let tree: ReactTestRenderer | undefined;
  act(() => {
    tree = create(node);
  });
  return tree!;
}

const button = (tree: ReactTestRenderer) =>
  tree.root.find(
    n =>
      typeof n.props.onPress === 'function' && 'accessibilityLabel' in n.props
  );

describe('CopyButton', () => {
  beforeEach(() => {
    (copyText as jest.Mock).mockClear();
    (copySensitive as jest.Mock).mockClear();
    jest.useFakeTimers();
  });
  afterEach(() => jest.useRealTimers());

  it('copies a direct value and flips the label back after a moment', async () => {
    const tree = render(<CopyButton text='hello' testID='c' />);
    await act(async () => {
      await button(tree).props.onPress();
    });
    expect(copyText).toHaveBeenCalledWith('hello');
    expect(JSON.stringify(tree.toJSON())).toContain('common.copied');
    act(() => {
      jest.advanceTimersByTime(1500);
    });
    expect(JSON.stringify(tree.toJSON())).toContain('common.copy');
  });

  it('fetches the value on demand with onCopy', async () => {
    const onCopy = jest.fn(async () => 'secret');
    const tree = render(<CopyButton onCopy={onCopy} testID='c' />);
    await act(async () => {
      await button(tree).props.onPress();
    });
    expect(onCopy).toHaveBeenCalled();
    expect(copyText).toHaveBeenCalledWith('secret');
  });

  it('uses the auto-clearing copy for a sensitive value', async () => {
    const tree = render(<CopyButton text='s3cret' sensitive testID='c' />);
    await act(async () => {
      await button(tree).props.onPress();
    });
    expect(copySensitive).toHaveBeenCalledWith('s3cret');
    expect(copyText).not.toHaveBeenCalled();
  });

  it('does nothing when there is no value', async () => {
    const tree = render(<CopyButton onCopy={async () => null} testID='c' />);
    await act(async () => {
      await button(tree).props.onPress();
    });
    expect(copyText).not.toHaveBeenCalled();
  });
});

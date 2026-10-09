import React from 'react';
import { Text } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { useDebounced } from '../useSiteSearch';

jest.mock('@sudobility/raidr_agent_client', () => ({ QUERY_KEYS: {} }));
jest.mock('@/hooks/useAgentClient', () => ({ useAgentClient: () => ({}) }));
jest.mock('@/context/AuthContext', () => ({ useAuth: () => ({}) }));

function Probe({ value }: { value: string }) {
  return <Text>{useDebounced(value, 300)}</Text>;
}

describe('useDebounced', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('settles on the last value once typing stops', () => {
    let tree: ReactTestRenderer | undefined;
    act(() => {
      tree = create(<Probe value='s' />);
    });
    act(() => {
      tree!.update(<Probe value='su' />);
      jest.advanceTimersByTime(200);
      tree!.update(<Probe value='sun' />);
      jest.advanceTimersByTime(200);
    });
    expect(tree!.toJSON()).toMatchObject({ children: ['s'] });
    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(tree!.toJSON()).toMatchObject({ children: ['sun'] });
  });
});

import { sanitizeAgentEmail, useAgentEmailStore } from '../agentEmailStore';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

describe('sanitizeAgentEmail', () => {
  it('keeps a valid address and automatic flag', () => {
    expect(
      sanitizeAgentEmail({
        emailAddress: '0xabc@signic.email',
        useAutomatically: true,
      })
    ).toEqual({ emailAddress: '0xabc@signic.email', useAutomatically: true });
  });

  it('drops automatic use when there is no address', () => {
    expect(sanitizeAgentEmail({ useAutomatically: true })).toEqual({
      emailAddress: null,
      useAutomatically: false,
    });
    expect(sanitizeAgentEmail({ emailAddress: '' })).toEqual({
      emailAddress: null,
      useAutomatically: false,
    });
    expect(sanitizeAgentEmail(null)).toEqual({
      emailAddress: null,
      useAutomatically: false,
    });
  });
});

describe('useAgentEmailStore', () => {
  beforeEach(() => {
    useAgentEmailStore.setState({
      emailAddress: null,
      useAutomatically: false,
    });
  });

  it('setEmail records the address and turns automatic use on', () => {
    useAgentEmailStore.getState().setEmail('0xabc@signic.email');
    expect(useAgentEmailStore.getState()).toMatchObject({
      emailAddress: '0xabc@signic.email',
      useAutomatically: true,
    });
  });

  it('ignores a toggle while there is no email', () => {
    useAgentEmailStore.getState().setUseAutomatically(true);
    expect(useAgentEmailStore.getState().useAutomatically).toBe(false);
  });

  it('clearEmail forgets the address and the flag', () => {
    useAgentEmailStore.getState().setEmail('0xabc@signic.email');
    useAgentEmailStore.getState().clearEmail();
    expect(useAgentEmailStore.getState()).toMatchObject({
      emailAddress: null,
      useAutomatically: false,
    });
  });
});

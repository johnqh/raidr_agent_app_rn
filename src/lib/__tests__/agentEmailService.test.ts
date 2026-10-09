/**
 * The Signic session cache: null without a stored phrase, one connect per
 * session (cached), and inbox reads mapped through the connected client. A
 * fake factory + fake client stand in for viem and the network.
 */

jest.mock('@sudobility/signic_sdk', () => ({ SignicClient: class {} }));
jest.mock('@/config/agentEmail', () => ({
  SIGNIC_CONFIG: {
    indexerUrl: 'idx',
    wildduckUrl: 'wd',
    emailDomain: 'signic.email',
    chainId: 1,
  },
}));
jest.mock('@/lib/agentWallet', () => ({
  accountFromSeedPhrase: () => ({ address: '0xabc', signMessage: jest.fn() }),
  emailAddressFor: (address: string, domain: string) => `${address}@${domain}`,
}));

const mockGetSeedPhrase = jest.fn<Promise<string | null>, []>();
jest.mock('@/lib/agentWalletStore', () => ({
  getSeedPhrase: () => mockGetSeedPhrase(),
}));

import {
  getAgentEmailSession,
  listAgentEmails,
  resetAgentEmailSession,
  setSignicClientFactory,
} from '../agentEmailService';

function fakeClient() {
  const state = { connected: false, connectCount: 0 };
  return {
    isConnected: () => state.connected,
    connect: jest.fn(async () => {
      state.connected = true;
      state.connectCount += 1;
    }),
    getUnreadEmails: jest.fn(async () => ({
      emails: [{ id: 1, subject: 'hi' }],
      total: 1,
    })),
    get connectCount() {
      return state.connectCount;
    },
  };
}

describe('agentEmailService', () => {
  afterEach(() => {
    setSignicClientFactory(null);
    resetAgentEmailSession();
    mockGetSeedPhrase.mockReset();
  });

  it('is null when no seed phrase is stored', async () => {
    mockGetSeedPhrase.mockResolvedValue(null);
    setSignicClientFactory(() => {
      throw new Error('should not build a client');
    });
    expect(await getAgentEmailSession()).toBeNull();
    expect(await listAgentEmails()).toEqual([]);
  });

  it('connects once and caches the session', async () => {
    mockGetSeedPhrase.mockResolvedValue('alpha bravo charlie');
    const client = fakeClient();
    setSignicClientFactory(() => ({
      client: client as never,
      address: '0xabc',
    }));

    const first = await getAgentEmailSession();
    const second = await getAgentEmailSession();
    expect(first).toBe(second);
    expect(first?.emailAddress).toBe('0xabc@signic.email');
    expect(client.connectCount).toBe(1);

    const emails = await listAgentEmails(10);
    expect(emails).toEqual([{ id: 1, subject: 'hi' }]);
    expect(client.getUnreadEmails).toHaveBeenCalledWith(10);
  });

  it('does not cache a failed connect', async () => {
    mockGetSeedPhrase.mockResolvedValue('alpha bravo charlie');
    const client = fakeClient();
    client.connect.mockRejectedValueOnce(new Error('offline'));
    setSignicClientFactory(() => ({
      client: client as never,
      address: '0xabc',
    }));

    await expect(getAgentEmailSession()).rejects.toThrow('offline');
    // A second attempt tries again rather than returning a broken session.
    const ok = await getAgentEmailSession();
    expect(ok?.address).toBe('0xabc');
  });
});

/**
 * The vault ties the Keychain password store to the listable index. The
 * Keychain layer is mocked; the index store is the real zustand store.
 */

const mockCreds = new Map<
  string,
  { email: string; password: string; createdAt: number }
>();

jest.mock('@/lib/agentCredentialStore', () => ({
  getOrCreateSiteCredential: jest.fn(async (apiHost: string, email: string) => {
    const existing = mockCreds.get(apiHost);
    if (existing && existing.email === email) {
      return existing;
    }
    const cred = { email, password: 'GENERATED', createdAt: 1 };
    mockCreds.set(apiHost, cred);
    return cred;
  }),
  saveSiteCredential: jest.fn(
    async (apiHost: string, email: string, password: string) => {
      const cred = { email, password, createdAt: 1 };
      mockCreds.set(apiHost, cred);
      return cred;
    }
  ),
  getSiteCredential: jest.fn(
    async (apiHost: string) => mockCreds.get(apiHost) ?? null
  ),
  deleteSiteCredential: jest.fn(async (apiHost: string) => {
    mockCreds.delete(apiHost);
  }),
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import {
  getOrCreateAgentLogin,
  normalizeDomain,
  removeLogin,
  revealPassword,
  saveManualLogin,
  updateLogin,
} from '../passwordVault';
import { usePasswordIndexStore } from '@/stores/passwordIndexStore';

describe('normalizeDomain', () => {
  it('strips scheme, www, path and case', () => {
    expect(normalizeDomain('https://WWW.Example.com/signup?x=1')).toBe(
      'example.com'
    );
    expect(normalizeDomain('  Example.COM  ')).toBe('example.com');
  });
});

describe('passwordVault', () => {
  beforeEach(() => {
    mockCreds.clear();
    usePasswordIndexStore.setState({ entries: [] });
  });

  it('records an agent login in the directory', async () => {
    const cred = await getOrCreateAgentLogin(
      'api.suno.com',
      'suno.com',
      'me@signic.email'
    );
    expect(cred.password).toBe('GENERATED');
    const entries = usePasswordIndexStore.getState().entries;
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      apiHost: 'api.suno.com',
      domain: 'suno.com',
      email: 'me@signic.email',
      source: 'agent',
    });
  });

  it('saves a manual login keyed by domain', async () => {
    const key = await saveManualLogin({
      domain: 'https://www.Example.com/',
      email: 'typed@me.com',
      password: 'hunter2!A',
    });
    expect(key).toBe('example.com');
    expect(await revealPassword('example.com')).toBe('hunter2!A');
    expect(usePasswordIndexStore.getState().entries[0]).toMatchObject({
      domain: 'example.com',
      email: 'typed@me.com',
      source: 'manual',
    });
  });

  it('updates an entry in place, keeping its key and source', async () => {
    await saveManualLogin({
      domain: 'example.com',
      email: 'old@me.com',
      password: 'old',
    });
    const entry = usePasswordIndexStore.getState().entries[0]!;
    await updateLogin(entry, 'new@me.com', 'newpass');
    expect(await revealPassword('example.com')).toBe('newpass');
    const after = usePasswordIndexStore.getState().entries;
    expect(after).toHaveLength(1);
    expect(after[0]).toMatchObject({ email: 'new@me.com', source: 'manual' });
  });

  it('removes a login from both stores', async () => {
    await saveManualLogin({
      domain: 'example.com',
      email: 'a@b.c',
      password: 'p',
    });
    await removeLogin('example.com');
    expect(usePasswordIndexStore.getState().entries).toEqual([]);
    expect(await revealPassword('example.com')).toBeNull();
  });
});

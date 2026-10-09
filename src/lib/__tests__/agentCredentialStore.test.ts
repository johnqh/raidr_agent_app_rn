/**
 * Per-site credential: generated once and reused, regenerated when the agent
 * email changed. The Keychain is mocked with an in-memory map.
 */

const mockStore = new Map<string, { username: string; password: string }>();

jest.mock('react-native-keychain', () => ({
  setGenericPassword: jest.fn(
    async (username: string, password: string, opts: { service: string }) => {
      mockStore.set(opts.service, { username, password });
      return true;
    }
  ),
  getGenericPassword: jest.fn(async (opts: { service: string }) =>
    mockStore.has(opts.service) ? mockStore.get(opts.service) : false
  ),
  resetGenericPassword: jest.fn(async (opts: { service: string }) => {
    mockStore.delete(opts.service);
    return true;
  }),
}));

import {
  deleteSiteCredential,
  getOrCreateSiteCredential,
  getSiteCredential,
} from '../agentCredentialStore';

describe('agentCredentialStore', () => {
  beforeEach(() => mockStore.clear());

  it('generates once and reuses for the same email', async () => {
    const first = await getOrCreateSiteCredential(
      'api.x.com',
      'me@signic.email'
    );
    expect(first.email).toBe('me@signic.email');
    expect(first.password.length).toBeGreaterThanOrEqual(8);
    const again = await getOrCreateSiteCredential(
      'api.x.com',
      'me@signic.email'
    );
    expect(again.password).toBe(first.password);
  });

  it('regenerates when the agent email changed', async () => {
    const first = await getOrCreateSiteCredential(
      'api.x.com',
      'old@signic.email'
    );
    const next = await getOrCreateSiteCredential(
      'api.x.com',
      'new@signic.email'
    );
    expect(next.email).toBe('new@signic.email');
    expect(next.password).not.toBe(first.password);
  });

  it('reads back and deletes a stored credential', async () => {
    await getOrCreateSiteCredential('api.x.com', 'me@signic.email');
    expect(await getSiteCredential('api.x.com')).not.toBeNull();
    await deleteSiteCredential('api.x.com');
    expect(await getSiteCredential('api.x.com')).toBeNull();
  });
});

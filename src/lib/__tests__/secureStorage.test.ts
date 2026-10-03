/**
 * Tests for the per-site token store's in-memory fallback.
 *
 * The Keychain is mocked to always reject, which is the simulator/desktop case
 * the fallback exists for: saves and reads must still work within the session.
 */

jest.mock('react-native-keychain', () => ({
  setGenericPassword: jest.fn(() => Promise.reject(new Error('no keychain'))),
  getGenericPassword: jest.fn(() => Promise.reject(new Error('no keychain'))),
  resetGenericPassword: jest.fn(() => Promise.reject(new Error('no keychain'))),
}));

import { saveSiteToken, getSiteToken, deleteSiteToken } from '../secureStorage';

describe('secureStorage in-memory fallback', () => {
  // Keep the expected Keychain-failure warning out of the test output.
  beforeAll(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('stores and reads a token back when the Keychain is unavailable', async () => {
    await saveSiteToken('api.example.com', 'tok-123');
    await expect(getSiteToken('api.example.com')).resolves.toBe('tok-123');
  });

  it('returns null for a host with no stored token', async () => {
    await expect(getSiteToken('unknown.example.com')).resolves.toBeNull();
  });

  it('keeps tokens separate per host', async () => {
    await saveSiteToken('a.example.com', 'token-a');
    await saveSiteToken('b.example.com', 'token-b');
    await expect(getSiteToken('a.example.com')).resolves.toBe('token-a');
    await expect(getSiteToken('b.example.com')).resolves.toBe('token-b');
  });

  it('deletes a token', async () => {
    await saveSiteToken('api.example.com', 'tok-123');
    await deleteSiteToken('api.example.com');
    await expect(getSiteToken('api.example.com')).resolves.toBeNull();
  });
});

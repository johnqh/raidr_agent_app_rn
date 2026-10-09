import {
  sanitizePasswordEntries,
  usePasswordIndexStore,
  type PasswordEntry,
} from '../passwordIndexStore';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const entry = (over: Partial<PasswordEntry>): PasswordEntry => ({
  apiHost: 'api.a.com',
  domain: 'a.com',
  email: 'me@a.com',
  source: 'agent',
  updatedAt: 1,
  ...over,
});

describe('sanitizePasswordEntries', () => {
  it('keeps valid rows, de-duplicates by apiHost, drops junk', () => {
    const out = sanitizePasswordEntries({
      entries: [
        entry({ apiHost: 'api.a.com', updatedAt: 1 }),
        entry({ apiHost: 'api.a.com', updatedAt: 9 }),
        entry({ apiHost: 'b.com', source: 'manual', updatedAt: 2 }),
        { apiHost: '' },
        null,
      ],
    });
    expect(out.map(e => e.apiHost)).toEqual(['b.com', 'api.a.com']);
    expect(out.find(e => e.apiHost === 'b.com')?.source).toBe('manual');
  });

  it('is empty for a non-array', () => {
    expect(sanitizePasswordEntries(undefined)).toEqual([]);
  });
});

describe('usePasswordIndexStore', () => {
  beforeEach(() => usePasswordIndexStore.setState({ entries: [] }));

  it('upserts by apiHost and lists newest first', () => {
    const { upsert } = usePasswordIndexStore.getState();
    upsert(entry({ apiHost: 'a', updatedAt: 1 }));
    upsert(entry({ apiHost: 'b', updatedAt: 2 }));
    upsert(entry({ apiHost: 'a', email: 'new@a.com', updatedAt: 3 }));
    const { entries } = usePasswordIndexStore.getState();
    expect(entries.map(e => e.apiHost)).toEqual(['a', 'b']);
    expect(entries[0]!.email).toBe('new@a.com');
  });

  it('removes one entry', () => {
    const { upsert, remove } = usePasswordIndexStore.getState();
    upsert(entry({ apiHost: 'a' }));
    upsert(entry({ apiHost: 'b' }));
    remove('a');
    expect(
      usePasswordIndexStore.getState().entries.map(e => e.apiHost)
    ).toEqual(['b']);
  });
});

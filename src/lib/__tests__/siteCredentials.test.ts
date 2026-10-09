import {
  normalizeCredentials,
  withCredential,
  withoutCredential,
  type SiteCredential,
} from '../siteCredentials';

const a: SiteCredential = {
  apiHost: 'api.a.com',
  loginUrl: 'https://a.com/login',
  signedInAt: 1,
};
const b: SiteCredential = {
  apiHost: 'api.b.com',
  loginUrl: 'https://b.com/login',
  signedInAt: 2,
};

describe('siteCredentials', () => {
  it('lists the newest sign-in first', () => {
    expect(withCredential([a], b).map(c => c.apiHost)).toEqual([
      'api.b.com',
      'api.a.com',
    ]);
  });

  it('replaces an earlier sign-in to the same site', () => {
    const again = { ...a, signedInAt: 3 };
    expect(withCredential([a, b], again)).toEqual([again, b]);
  });

  it('removes one site', () => {
    expect(withoutCredential([a, b], 'api.a.com')).toEqual([b]);
  });

  it('keeps only valid, distinct entries from storage', () => {
    expect(
      normalizeCredentials([
        a,
        { ...a, signedInAt: 9 },
        { apiHost: '' },
        null,
        'x',
        { apiHost: 'api.c.com' },
        b,
      ])
    ).toEqual([b, a, { apiHost: 'api.c.com', loginUrl: '', signedInAt: 0 }]);
    expect(normalizeCredentials(undefined)).toEqual([]);
  });
});

jest.mock('react-native-localize', () => ({
  __esModule: true,
  getCountry: jest.fn(() => 'us'),
  getLocales: jest.fn(() => [{ languageTag: 'en-US' }]),
  getTimeZone: jest.fn(() => 'America/Los_Angeles'),
}));

import { getDeviceContext, isoWithOffset } from '../deviceContext';

const mockLocalize = jest.requireMock('react-native-localize') as {
  getCountry: jest.Mock;
  getTimeZone: jest.Mock;
};

describe('isoWithOffset', () => {
  it('formats local time with the offset', () => {
    const date = new Date(2026, 9, 8, 9, 5, 7);
    const text = isoWithOffset(date);
    expect(text).toMatch(/^2026-10-08T09:05:07[+-]\d{2}:\d{2}$/);
    // Same instant as the Date.
    expect(new Date(text).getTime()).toBe(date.getTime());
  });
});

describe('getDeviceContext', () => {
  it('reads country, locale and time zone', () => {
    const ctx = getDeviceContext(new Date(2026, 0, 1));
    expect(ctx).toMatchObject({
      country: 'US',
      locale: 'en-US',
      timeZone: 'America/Los_Angeles',
    });
    expect(ctx.now).toMatch(/^2026-01-01T00:00:00/);
  });

  it('drops what it cannot read and never throws', () => {
    mockLocalize.getCountry.mockImplementation(() => {
      throw new Error('no native module');
    });
    mockLocalize.getTimeZone.mockImplementation(() => {
      throw new Error('no native module');
    });
    const ctx = getDeviceContext();
    expect(ctx.country).toBeUndefined();
    expect(typeof ctx.timeZone).toBe('string'); // from Intl
    expect(ctx.now).toBeTruthy();
  });
});

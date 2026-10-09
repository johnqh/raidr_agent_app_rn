/**
 * Auto-clear: a sensitive copy wipes the clipboard after the delay, but only
 * if it still holds exactly what was copied, and a later copy cancels it.
 */

let mockBoard = '';
const mockSetString = jest.fn((value: string) => {
  mockBoard = value;
});
const mockGetString = jest.fn(async () => mockBoard);

jest.mock('@react-native-clipboard/clipboard', () => ({
  __esModule: true,
  default: {
    setString: (v: string) => mockSetString(v),
    getString: () => mockGetString(),
  },
}));

import { copySensitive, copyText, SENSITIVE_CLEAR_MS } from '../clipboard';

describe('clipboard auto-clear', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockBoard = '';
    mockSetString.mockClear();
    mockGetString.mockClear();
  });
  afterEach(() => jest.useRealTimers());

  it('clears a sensitive value after the delay when unchanged', async () => {
    await copySensitive('s3cret');
    expect(mockBoard).toBe('s3cret');
    await jest.advanceTimersByTimeAsync(SENSITIVE_CLEAR_MS);
    expect(mockBoard).toBe('');
  });

  it('leaves the clipboard alone if it changed in the meantime', async () => {
    await copySensitive('s3cret');
    mockBoard = 'something the user copied later';
    await jest.advanceTimersByTimeAsync(SENSITIVE_CLEAR_MS);
    expect(mockBoard).toBe('something the user copied later');
  });

  it('a later copy cancels the pending clear', async () => {
    await copySensitive('s3cret');
    await copyText('kept on purpose');
    await jest.advanceTimersByTimeAsync(SENSITIVE_CLEAR_MS);
    expect(mockBoard).toBe('kept on purpose');
  });
});

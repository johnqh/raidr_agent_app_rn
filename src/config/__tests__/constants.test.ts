/**
 * Tests for app constants.
 *
 * Verifies that exported constant values are defined and well-formed.
 */

import {
  APP_NAME,
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  STORAGE_KEYS,
  TAB_NAMES,
} from '../constants';

describe('constants', () => {
  it('should export a non-empty APP_NAME', () => {
    expect(APP_NAME).toBeTruthy();
    expect(typeof APP_NAME).toBe('string');
  });

  it('should export a valid DEFAULT_LANGUAGE', () => {
    expect(DEFAULT_LANGUAGE).toBe('en');
  });

  it('should include the default language in SUPPORTED_LANGUAGES', () => {
    expect(SUPPORTED_LANGUAGES).toContain(DEFAULT_LANGUAGE);
  });

  it('should have at least one supported language', () => {
    expect(SUPPORTED_LANGUAGES.length).toBeGreaterThan(0);
  });

  it('should export STORAGE_KEYS with expected keys', () => {
    expect(STORAGE_KEYS.LANGUAGE).toBeDefined();
    expect(STORAGE_KEYS.SETTINGS).toBeDefined();
    expect(typeof STORAGE_KEYS.LANGUAGE).toBe('string');
    expect(typeof STORAGE_KEYS.SETTINGS).toBe('string');
  });

  it('should export TAB_NAMES with expected keys', () => {
    expect(TAB_NAMES.SETTINGS).toBeDefined();
    expect(typeof TAB_NAMES.SETTINGS).toBe('string');
  });
});

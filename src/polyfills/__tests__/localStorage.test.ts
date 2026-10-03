/**
 * Tests for the localStorage polyfill.
 *
 * Verifies that the in-memory shim correctly implements getItem, setItem,
 * and removeItem, and that it only installs when localStorage is absent.
 */

describe('localStorage polyfill', () => {
  // Save a reference so we can restore after tests
  const originalLocalStorage = globalThis.localStorage;

  beforeEach(() => {
    // Remove localStorage so the polyfill can install fresh
    delete (globalThis as any).localStorage;
    // Clear the module cache so the polyfill re-executes each time
    jest.resetModules();
  });

  afterEach(() => {
    // Restore original or remove so other tests are clean
    if (originalLocalStorage) {
      (globalThis as any).localStorage = originalLocalStorage;
    } else {
      delete (globalThis as any).localStorage;
    }
  });

  it('should install localStorage when it is undefined', () => {
    expect(globalThis.localStorage).toBeUndefined();
    jest.isolateModules(() => {
      require('../localStorage');
    });
    expect(globalThis.localStorage).toBeDefined();
  });

  it('should implement getItem returning null for missing keys', () => {
    jest.isolateModules(() => {
      require('../localStorage');
    });
    expect(globalThis.localStorage.getItem('nonexistent')).toBeNull();
  });

  it('should implement setItem and getItem roundtrip', () => {
    jest.isolateModules(() => {
      require('../localStorage');
    });
    globalThis.localStorage.setItem('testKey', 'testValue');
    expect(globalThis.localStorage.getItem('testKey')).toBe('testValue');
  });

  it('should implement removeItem', () => {
    jest.isolateModules(() => {
      require('../localStorage');
    });
    globalThis.localStorage.setItem('toRemove', 'value');
    expect(globalThis.localStorage.getItem('toRemove')).toBe('value');
    globalThis.localStorage.removeItem('toRemove');
    expect(globalThis.localStorage.getItem('toRemove')).toBeNull();
  });

  it('should overwrite existing values on setItem', () => {
    jest.isolateModules(() => {
      require('../localStorage');
    });
    globalThis.localStorage.setItem('key', 'first');
    globalThis.localStorage.setItem('key', 'second');
    expect(globalThis.localStorage.getItem('key')).toBe('second');
  });

  it('should not overwrite an existing localStorage', () => {
    const mockStorage = {
      getItem: jest.fn(() => 'mock'),
      setItem: jest.fn(),
      removeItem: jest.fn(),
    };
    (globalThis as any).localStorage = mockStorage;

    // Re-require the polyfill - it should see localStorage already exists
    jest.isolateModules(() => {
      require('../localStorage');
    });

    expect(globalThis.localStorage).toBe(mockStorage);
  });
});

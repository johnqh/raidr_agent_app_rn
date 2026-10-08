import {
  canUseLocal,
  effectiveProviders,
  modeAfterKeysChange,
  normalizeAgentMode,
  normalizeProviderOrder,
} from '../agentMode';

describe('effectiveProviders', () => {
  it('keeps the user order, filtered to providers with a key', () => {
    expect(
      effectiveProviders(
        ['deepseek', 'openai', 'anthropic', 'openrouter'],
        ['openai', 'deepseek']
      )
    ).toEqual(['deepseek', 'openai']);
  });

  it('is empty with no keys', () => {
    expect(
      effectiveProviders(['openai', 'anthropic', 'deepseek', 'openrouter'], [])
    ).toEqual([]);
  });
});

describe('canUseLocal / modeAfterKeysChange', () => {
  it('needs at least one key', () => {
    expect(canUseLocal([])).toBe(false);
    expect(canUseLocal(['anthropic'])).toBe(true);
    expect(canUseLocal(new Set(['openai'] as const))).toBe(true);
  });

  it('falls back to cloud when the last key goes', () => {
    expect(modeAfterKeysChange('local', [])).toBe('cloud');
    expect(modeAfterKeysChange('local', ['openai'])).toBe('local');
    expect(modeAfterKeysChange('cloud', [])).toBe('cloud');
  });
});

describe('normalizers', () => {
  it('fills a full, de-duplicated provider order', () => {
    expect(normalizeProviderOrder(undefined)).toEqual([
      'openai',
      'anthropic',
      'deepseek',
      'openrouter',
    ]);
    expect(
      normalizeProviderOrder(['openrouter', 'bogus', 'openrouter', 'deepseek'])
    ).toEqual(['openrouter', 'deepseek', 'openai', 'anthropic']);
  });

  it('defaults the mode to cloud', () => {
    expect(normalizeAgentMode('local')).toBe('local');
    expect(normalizeAgentMode('whatever')).toBe('cloud');
    expect(normalizeAgentMode(undefined)).toBe('cloud');
  });
});

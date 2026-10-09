/**
 * The pure seed-phrase helpers. viem and @scure are mocked so the test needs
 * no real crypto; it checks normalization, word splitting, address formatting
 * and that validation is handed the normalized phrase.
 */

const mockValidateMnemonic = jest.fn(
  (_phrase: string, _wordlist: string[]) => true
);

jest.mock('viem/accounts', () => ({
  generateMnemonic: () => 'alpha bravo charlie',
  english: ['alpha', 'bravo', 'charlie'],
  mnemonicToAccount: (phrase: string) => ({
    address: `0xADDR_${phrase.replace(/\s/g, '_')}`,
  }),
}));
jest.mock('@scure/bip39', () => ({
  validateMnemonic: (phrase: string, wordlist: string[]) =>
    mockValidateMnemonic(phrase, wordlist),
}));

import {
  addressFromSeedPhrase,
  createSeedPhrase,
  emailAddressFor,
  isValidSeedPhrase,
  normalizeSeedPhrase,
  seedPhraseWords,
} from '../agentWallet';

describe('agentWallet', () => {
  beforeEach(() => mockValidateMnemonic.mockClear());

  it('normalizes case and whitespace', () => {
    expect(normalizeSeedPhrase('  Alpha   BRAVO\ncharlie ')).toBe(
      'alpha bravo charlie'
    );
  });

  it('splits a phrase into words, or none when empty', () => {
    expect(seedPhraseWords(' One  Two ')).toEqual(['one', 'two']);
    expect(seedPhraseWords('   ')).toEqual([]);
  });

  it('validates the normalized phrase against the wordlist', () => {
    mockValidateMnemonic.mockReturnValueOnce(false);
    expect(isValidSeedPhrase('  Bad Phrase ')).toBe(false);
    expect(mockValidateMnemonic).toHaveBeenCalledWith('bad phrase', [
      'alpha',
      'bravo',
      'charlie',
    ]);
  });

  it('derives an address and email from a phrase', () => {
    expect(addressFromSeedPhrase(' Alpha Bravo ')).toBe('0xADDR_alpha_bravo');
    expect(emailAddressFor('0xabc', 'signic.email')).toBe('0xabc@signic.email');
  });

  it('creates a phrase from the generator', () => {
    expect(createSeedPhrase()).toBe('alpha bravo charlie');
  });
});

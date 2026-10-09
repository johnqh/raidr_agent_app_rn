/**
 * The agent email's wallet: a standard Ethereum key held as a BIP-39 seed
 * phrase (the "seed phrases" the user backs up). The phrase is the only
 * secret; the address and the `signMessage` the Signic client needs are
 * derived from it, never stored.
 *
 * `react-native-get-random-values` must be installed before this runs, so
 * `crypto.getRandomValues` exists for key generation (imported first in
 * `index.ts`).
 */

import { generateMnemonic, english, mnemonicToAccount } from 'viem/accounts';
import { validateMnemonic } from '@scure/bip39';
import type { HDAccount } from 'viem';

/** Words in a freshly created phrase (128 bits of entropy). */
export const SEED_PHRASE_WORDS = 12;

/** A new 12-word seed phrase. */
export function createSeedPhrase(): string {
  return generateMnemonic(english);
}

/** Lower-cased, single-spaced, trimmed — how a phrase is compared and stored. */
export function normalizeSeedPhrase(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** The phrase's words, for showing one per cell. */
export function seedPhraseWords(phrase: string): string[] {
  const normalized = normalizeSeedPhrase(phrase);
  return normalized === '' ? [] : normalized.split(' ');
}

/** True when `input` is a valid BIP-39 English phrase (checksum included). */
export function isValidSeedPhrase(input: string): boolean {
  return validateMnemonic(normalizeSeedPhrase(input), english);
}

/**
 * The Ethereum account for a phrase, on the standard path
 * (`m/44'/60'/0'/0/0`). Throws on an invalid phrase, so callers check
 * {@link isValidSeedPhrase} first.
 */
export function accountFromSeedPhrase(phrase: string): HDAccount {
  return mnemonicToAccount(normalizeSeedPhrase(phrase));
}

/** The wallet address (`0x…`) a phrase derives to. */
export function addressFromSeedPhrase(phrase: string): string {
  return accountFromSeedPhrase(phrase).address;
}

/** The Signic email address for a wallet address on `domain`. */
export function emailAddressFor(address: string, domain: string): string {
  return `${address}@${domain}`;
}

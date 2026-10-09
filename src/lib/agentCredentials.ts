/**
 * A per-site login the agent email can use: a strong generated password to go
 * with the agent's address. Generation is `crypto.getRandomValues` (polyfilled
 * in `index.ts`); storage is `agentCredentialStore.ts`.
 */

const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER = 'abcdefghijkmnopqrstuvwxyz';
const DIGITS = '23456789';
const SYMBOLS = '!@#$%^&*-_=+';
const ALL = UPPER + LOWER + DIGITS + SYMBOLS;

export const DEFAULT_PASSWORD_LENGTH = 20;

/** A uniform integer in [0, max) from crypto, without modulo bias. */
function randomInt(max: number): number {
  const limit = Math.floor(0xffffffff / max) * max;
  const buf = new Uint32Array(1);
  let n = 0;
  do {
    crypto.getRandomValues(buf);
    n = buf[0]!;
  } while (n >= limit);
  return n % max;
}

/** One random character of `set`. */
function pick(set: string): string {
  return set[randomInt(set.length)]!;
}

/**
 * A password of `length` with at least one upper, lower, digit and symbol.
 * Ambiguous characters (O/0, l/1) are left out of the pools.
 */
export function generatePassword(length = DEFAULT_PASSWORD_LENGTH): string {
  const size = Math.max(length, 8);
  const chars = [pick(UPPER), pick(LOWER), pick(DIGITS), pick(SYMBOLS)];
  while (chars.length < size) {
    chars.push(pick(ALL));
  }
  // Fisher–Yates, so the four seeded categories are not in fixed positions.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j]!, chars[i]!];
  }
  return chars.join('');
}

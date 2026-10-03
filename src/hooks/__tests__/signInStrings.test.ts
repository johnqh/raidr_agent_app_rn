/**
 * Every string the shared sign-in form shows comes from `auth.*` in each
 * locale, translated rather than copied from English.
 */
import fs from 'fs';
import path from 'path';

const LOCALES = path.join(__dirname, '../../../assets/locales');
const source = fs.readFileSync(
  path.join(__dirname, '../useSignInForm.ts'),
  'utf8'
);
const KEYS = Array.from(
  new Set(Array.from(source.matchAll(/t\('auth\.(\w+)'\)/g), m => m[1]))
);

function auth(lang: string): Record<string, string> {
  return JSON.parse(
    fs.readFileSync(path.join(LOCALES, lang, 'translation.json'), 'utf8')
  ).auth;
}

const en = auth('en');
const langs = fs.readdirSync(LOCALES).filter(l => l !== 'en');

describe('sign-in strings', () => {
  it('reads keys from the form hook', () => {
    expect(KEYS.length).toBeGreaterThan(15);
  });

  it.each(['en', ...langs])('%s has every key', lang => {
    const strings = auth(lang);
    for (const key of KEYS) {
      expect(typeof strings[key]).toBe('string');
      expect(strings[key].length).toBeGreaterThan(0);
    }
  });

  it.each(langs)('%s translates the new form strings', lang => {
    const strings = auth(lang);
    for (const key of [
      'alreadyHaveAccount',
      'dontHaveAccount',
      'forgotPassword',
      'resetPasswordHint',
      'resetEmailSent',
      'signInToAccount',
    ]) {
      expect(strings[key]).not.toBe(en[key]);
    }
  });
});

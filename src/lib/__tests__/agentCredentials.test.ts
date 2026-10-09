import { generatePassword } from '../agentCredentials';

describe('generatePassword', () => {
  it('has the requested length and one of each category', () => {
    for (let i = 0; i < 50; i++) {
      const pw = generatePassword(20);
      expect(pw).toHaveLength(20);
      expect(pw).toMatch(/[A-Z]/);
      expect(pw).toMatch(/[a-z]/);
      expect(pw).toMatch(/[0-9]/);
      expect(pw).toMatch(/[!@#$%^&*\-_=+]/);
    }
  });

  it('is at least 8 characters even when asked for fewer', () => {
    expect(generatePassword(2).length).toBeGreaterThanOrEqual(8);
  });

  it('differs between calls', () => {
    const seen = new Set(Array.from({ length: 20 }, () => generatePassword()));
    expect(seen.size).toBe(20);
  });
});

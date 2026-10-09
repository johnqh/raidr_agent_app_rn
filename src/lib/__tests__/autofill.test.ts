import {
  AUTOFILL_RESULT_KIND,
  buildAutofillScript,
  isAutofillResult,
} from '../autofill';

describe('buildAutofillScript', () => {
  it('embeds the values safely and never submits', () => {
    const script = buildAutofillScript('0xabc@signic.email', 'p"a\'s\\sw');
    // JSON.stringify escapes the quotes/backslash so they cannot break out.
    expect(script).toContain('"0xabc@signic.email"');
    expect(script).toContain(JSON.stringify('p"a\'s\\sw'));
    // Sets values and fires input/change, but issues no submit/click.
    expect(script).toContain("dispatchEvent(new Event('input'");
    expect(script).toContain("querySelectorAll('input[type=password]')");
    expect(script).not.toMatch(/\.submit\(|\.click\(/);
  });

  it('targets email-like and password fields', () => {
    const script = buildAutofillScript('a@b.c', 'pw');
    expect(script).toContain('input[type=email]');
    expect(script).toContain('input[autocomplete=username]');
  });
});

describe('isAutofillResult', () => {
  it('recognises the result message only', () => {
    expect(
      isAutofillResult({ kind: AUTOFILL_RESULT_KIND, email: true, password: 2 })
    ).toBe(true);
    expect(isAutofillResult({ kind: 'raidr-agent/observed-request' })).toBe(
      false
    );
    expect(isAutofillResult(null)).toBe(false);
    expect(isAutofillResult('x')).toBe(false);
  });
});

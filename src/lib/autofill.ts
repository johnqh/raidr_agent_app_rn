/**
 * The script that fills the agent email and its generated password into a
 * site's sign-up / sign-in form, run in the login web view when the user taps
 * "Use Agent Email". It only sets field values and fires the input/change
 * events a form framework listens for — it never submits. The user presses
 * the site's own button.
 *
 * Both values are injected with `JSON.stringify`, so quotes and backslashes in
 * a password cannot break out of the script.
 */

/** postMessage kind the web view reports the fill result with. */
export const AUTOFILL_RESULT_KIND = 'raidr-agent/autofill-result';

/** What the web view posts back after a fill attempt. */
export interface AutofillResult {
  kind: typeof AUTOFILL_RESULT_KIND;
  /** Whether an email field was filled. */
  email: boolean;
  /** How many password fields were filled (0, 1, or 2 incl. a confirm field). */
  password: number;
  /** Set instead of the counts when the script threw. */
  error?: string;
}

/** True when `message` (already parsed) is an autofill result. */
export function isAutofillResult(message: unknown): message is AutofillResult {
  return (
    typeof message === 'object' &&
    message !== null &&
    (message as { kind?: unknown }).kind === AUTOFILL_RESULT_KIND
  );
}

/**
 * A self-invoking script string for `WebView.injectJavaScript`. Fills the
 * first visible email-like field and up to two visible password fields (the
 * password and a confirm-password), then posts an {@link AutofillResult}.
 */
export function buildAutofillScript(email: string, password: string): string {
  const e = JSON.stringify(email);
  const p = JSON.stringify(password);
  const kind = JSON.stringify(AUTOFILL_RESULT_KIND);
  return `(function () {
  function post(payload) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify(payload));
    }
  }
  try {
    var email = ${e};
    var password = ${p};
    function setValue(el, value) {
      var setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      );
      if (setter && setter.set) {
        setter.set.call(el, value);
      } else {
        el.value = value;
      }
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
    function visible(el) {
      var r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && !el.disabled && !el.readOnly;
    }
    var emailSel = [
      'input[type=email]',
      'input[autocomplete=email]',
      'input[autocomplete=username]',
      'input[name*=email i]',
      'input[id*=email i]',
      'input[name*=user i]'
    ].join(',');
    var emailEls = Array.prototype.slice
      .call(document.querySelectorAll(emailSel))
      .filter(visible);
    var filledEmail = false;
    if (emailEls.length) {
      setValue(emailEls[0], email);
      filledEmail = true;
    }
    var pwEls = Array.prototype.slice
      .call(document.querySelectorAll('input[type=password]'))
      .filter(visible);
    var filledPw = 0;
    for (var i = 0; i < pwEls.length && i < 2; i++) {
      setValue(pwEls[i], password);
      filledPw++;
    }
    post({ kind: ${kind}, email: filledEmail, password: filledPw });
  } catch (err) {
    post({ kind: ${kind}, email: false, password: 0, error: String(err) });
  }
  true;
})();`;
}

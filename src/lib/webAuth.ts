/**
 * Pure helpers for the site sign-in web view (`LoginScreen`):
 *
 * - Google sign-in: Google refuses embedded web views (`disallowed_useragent`)
 *   by their user agent (iOS WKWebView omits `Safari/…`; Android WebView adds
 *   `; wv`). When a web view goes to a Google sign-in page it switches to a
 *   standard browser user agent for the platform ({@link googleSignInUserAgent}).
 * - Popups: `window.open` pages open in a second web view. That web view has no
 *   real `window.opener`, so {@link buildPopupBridgeScript} shims
 *   `window.opener.postMessage` and `window.close()` over the React Native
 *   bridge; {@link buildOpenerDeliveryScript} replays an opener message as a
 *   `message` event in the main web view.
 *
 * No React Native imports: the platform is passed in, so this is testable.
 */

/** Hosts the app runs on (`Platform.OS`); anything else is treated as iOS. */
export type WebAuthPlatform = 'ios' | 'android' | 'macos' | 'windows';

/**
 * Standard browser user agents that Google accepts for sign-in:
 * mobile Safari (iOS), desktop Safari (macOS), mobile Chrome (Android),
 * desktop Edge (Windows, which is WebView2 = Chromium already).
 */
export const GOOGLE_SIGN_IN_USER_AGENTS: Readonly<
  Record<WebAuthPlatform, string>
> = {
  ios: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1',
  macos:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Safari/605.1.15',
  android:
    'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
  windows:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0',
};

/** The Google-accepted user agent for a platform (`Platform.OS`). */
export function googleSignInUserAgent(os: string): string {
  return (
    GOOGLE_SIGN_IN_USER_AGENTS[os as WebAuthPlatform] ??
    GOOGLE_SIGN_IN_USER_AGENTS.ios
  );
}

const URL_RE = /^(https?):\/\/(?:[^@/?#]*@)?([^/?#:]+)(?::\d+)?([^?#]*)/i;

/** Scheme, lowercase host and path of an http(s) URL, or `null`. */
export function parseHttpUrl(
  url: string
): { scheme: string; host: string; path: string } | null {
  const match = URL_RE.exec(url.trim());
  if (!match) {
    return null;
  }
  return {
    scheme: match[1].toLowerCase(),
    host: match[2].toLowerCase().replace(/\.$/, ''),
    path: match[3] || '/',
  };
}

/** The origin (`https://host[:port]`) of an http(s) URL, or `null`. */
export function originOf(url: string): string | null {
  const match = /^(https?:\/\/[^/?#]+)/i.exec(url.trim());
  return match ? match[1].replace(/^[^:]+/, s => s.toLowerCase()) : null;
}

/**
 * Whether a URL is a Google sign-in page: anything on `accounts.google.com`,
 * or a `google.com` host's OAuth (`/o/oauth2…`) or Identity Services
 * (`/gsi/…`) path.
 */
export function isGoogleSignInUrl(url: string): boolean {
  const parsed = parseHttpUrl(url);
  if (!parsed || parsed.scheme !== 'https') {
    return false;
  }
  const { host, path } = parsed;
  if (host === 'accounts.google.com') {
    return true;
  }
  const onGoogle = host === 'google.com' || host.endsWith('.google.com');
  return onGoogle && /^\/(o\/oauth2|gsi)(\/|$)/.test(path);
}

/**
 * The user agent a web view should use after navigating to `url`. Once a web
 * view has gone to Google sign-in it keeps the browser user agent ("sticky"):
 * switching back means reloading, which would replay the OAuth callback
 * without its POST body.
 */
export function userAgentAfterNavigation(
  url: string,
  current: string | undefined,
  os: string
): string | undefined {
  if (current) {
    return current;
  }
  return isGoogleSignInUrl(url) ? googleSignInUserAgent(os) : undefined;
}

/** Messages the popup bridge posts (JSON over `ReactNativeWebView.postMessage`). */
export const WINDOW_CLOSE_KIND = 'raidr-agent/window-close';
export const OPENER_MESSAGE_KIND = 'raidr-agent/opener-message';

export type BridgeMessage =
  | { kind: typeof WINDOW_CLOSE_KIND }
  | {
      kind: typeof OPENER_MESSAGE_KIND;
      /** The posted data, JSON-encoded. */
      data: string;
      /** The popup's origin. */
      origin: string;
      targetOrigin: string;
    };

/** Read a popup bridge message out of a `WebViewMessageEvent` payload. */
export function parseBridgeMessage(raw: string): BridgeMessage | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') {
    return null;
  }
  const message = parsed as Record<string, unknown>;
  if (message.kind === WINDOW_CLOSE_KIND) {
    return { kind: WINDOW_CLOSE_KIND };
  }
  if (
    message.kind === OPENER_MESSAGE_KIND &&
    typeof message.data === 'string' &&
    typeof message.origin === 'string'
  ) {
    return {
      kind: OPENER_MESSAGE_KIND,
      data: message.data,
      origin: message.origin,
      targetOrigin:
        typeof message.targetOrigin === 'string' ? message.targetOrigin : '*',
    };
  }
  return null;
}

/**
 * Injected (before content) into every popup page: `window.close()` and
 * `window.opener.postMessage(…)` report over the bridge instead of doing
 * nothing in a web view that has no opener.
 */
export function buildPopupBridgeScript(): string {
  return `(function () {
  if (window.__raidrAgentPopup) { return; }
  window.__raidrAgentPopup = true;
  function post(message) {
    try { window.ReactNativeWebView.postMessage(JSON.stringify(message)); } catch (e) {}
  }
  window.close = function () { post({ kind: ${JSON.stringify(
    WINDOW_CLOSE_KIND
  )} }); };
  var opener = {
    closed: false,
    focus: function () {},
    postMessage: function (data, targetOrigin) {
      var encoded;
      try { encoded = JSON.stringify(data); } catch (e) { return; }
      if (encoded === undefined) { return; }
      post({
        kind: ${JSON.stringify(OPENER_MESSAGE_KIND)},
        data: encoded,
        origin: window.location.origin,
        targetOrigin: String(targetOrigin || '*')
      });
    }
  };
  try {
    Object.defineProperty(window, 'opener', { configurable: true, get: function () { return opener; } });
  } catch (e) {}
})();
true;`;
}

/**
 * Whether an opener message may be delivered to the main page: the target
 * origin is `*` or the main page's origin (as a browser would check).
 */
export function shouldDeliverOpenerMessage(
  targetOrigin: string,
  mainUrl: string
): boolean {
  if (targetOrigin === '*') {
    return true;
  }
  const main = originOf(mainUrl);
  return !!main && main === originOf(targetOrigin);
}

/** Script for the main web view that dispatches the popup's message as a `message` event. */
export function buildOpenerDeliveryScript(
  message: Extract<BridgeMessage, { kind: typeof OPENER_MESSAGE_KIND }>
): string {
  return `(function () {
  try {
    var data = JSON.parse(${JSON.stringify(message.data)});
    window.dispatchEvent(new MessageEvent('message', { data: data, origin: ${JSON.stringify(
      message.origin
    )} }));
  } catch (e) {}
})();
true;`;
}

/** A popup is closed when it navigates to `about:blank` (some flows do instead of `close()`). */
export function isPopupDoneUrl(url: string): boolean {
  return url.trim().toLowerCase() === 'about:blank';
}

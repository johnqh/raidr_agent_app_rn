import {
  buildOpenerDeliveryScript,
  buildPopupBridgeScript,
  GOOGLE_SIGN_IN_USER_AGENTS,
  googleSignInUserAgent,
  isGoogleSignInUrl,
  isPopupDoneUrl,
  OPENER_MESSAGE_KIND,
  originOf,
  parseBridgeMessage,
  parseHttpUrl,
  shouldDeliverOpenerMessage,
  userAgentAfterNavigation,
  WINDOW_CLOSE_KIND,
} from '../webAuth';

describe('isGoogleSignInUrl', () => {
  it.each([
    'https://accounts.google.com/v3/signin/identifier?flowName=x',
    'https://accounts.google.com/o/oauth2/v2/auth?client_id=1',
    'https://ACCOUNTS.google.com/',
    'https://www.google.com/o/oauth2/auth',
    'https://accounts.google.com.:443/signin',
    'https://google.com/gsi/select',
  ])('matches %s', url => {
    expect(isGoogleSignInUrl(url)).toBe(true);
  });

  it.each([
    'https://www.google.com/search?q=o/oauth2',
    'https://accounts.google.com.evil.example/',
    'https://evilgoogle.com/o/oauth2/auth',
    'http://accounts.google.com/',
    'https://example.com/?next=https://accounts.google.com/',
    'https://mail.google.com/gsix',
    'about:blank',
  ])('does not match %s', url => {
    expect(isGoogleSignInUrl(url)).toBe(false);
  });
});

describe('user agents', () => {
  it('uses a browser UA per platform', () => {
    expect(googleSignInUserAgent('ios')).toContain('Mobile/');
    expect(googleSignInUserAgent('ios')).toContain('Safari/');
    expect(googleSignInUserAgent('macos')).toContain('Macintosh');
    expect(googleSignInUserAgent('android')).toContain('Chrome/');
    expect(googleSignInUserAgent('android')).not.toContain('; wv');
    expect(googleSignInUserAgent('windows')).toContain('Edg/');
    expect(googleSignInUserAgent('web')).toBe(GOOGLE_SIGN_IN_USER_AGENTS.ios);
  });

  it('switches on Google and then stays switched', () => {
    expect(
      userAgentAfterNavigation('https://site.example/login', undefined, 'ios')
    ).toBeUndefined();
    const ua = userAgentAfterNavigation(
      'https://accounts.google.com/signin',
      undefined,
      'android'
    );
    expect(ua).toBe(GOOGLE_SIGN_IN_USER_AGENTS.android);
    expect(
      userAgentAfterNavigation('https://site.example/callback', ua, 'android')
    ).toBe(ua);
  });
});

describe('URL helpers', () => {
  it('parses http(s) URLs', () => {
    expect(parseHttpUrl('https://User@Example.com:8443/a/b?x#y')).toEqual({
      scheme: 'https',
      host: 'example.com',
      path: '/a/b',
    });
    expect(parseHttpUrl('ftp://x')).toBeNull();
    expect(originOf('HTTPS://a.example:8443/x')).toBe('https://a.example:8443');
  });

  it('checks the opener target origin', () => {
    expect(shouldDeliverOpenerMessage('*', 'https://a.example/x')).toBe(true);
    expect(
      shouldDeliverOpenerMessage('https://a.example', 'https://a.example/x')
    ).toBe(true);
    expect(
      shouldDeliverOpenerMessage('https://b.example', 'https://a.example/x')
    ).toBe(false);
  });

  it('treats about:blank as a finished popup', () => {
    expect(isPopupDoneUrl('about:blank')).toBe(true);
    expect(isPopupDoneUrl('https://a.example')).toBe(false);
  });
});

describe('bridge messages', () => {
  it('parses close and opener messages, ignores anything else', () => {
    expect(
      parseBridgeMessage(JSON.stringify({ kind: WINDOW_CLOSE_KIND }))
    ).toEqual({ kind: WINDOW_CLOSE_KIND });
    expect(
      parseBridgeMessage(
        JSON.stringify({
          kind: OPENER_MESSAGE_KIND,
          data: '{"a":1}',
          origin: 'https://p.example',
        })
      )
    ).toEqual({
      kind: OPENER_MESSAGE_KIND,
      data: '{"a":1}',
      origin: 'https://p.example',
      targetOrigin: '*',
    });
    expect(parseBridgeMessage('nope')).toBeNull();
    expect(
      parseBridgeMessage(
        JSON.stringify({ kind: 'raidr-agent/observed-request' })
      )
    ).toBeNull();
  });

  it('popup script shims close and opener.postMessage', () => {
    const posted: string[] = [];
    const win: Record<string, unknown> = {
      location: { origin: 'https://p.example' },
      ReactNativeWebView: { postMessage: (m: string) => posted.push(m) },
    };
    // eslint-disable-next-line no-new-func -- runs the generated web-view script
    new Function('window', buildPopupBridgeScript())(win);
    (
      win.opener as { postMessage: (d: unknown, o: string) => void }
    ).postMessage({ token: 'x' }, 'https://a.example');
    (win.close as () => void)();
    expect(posted.map(p => JSON.parse(p))).toEqual([
      {
        kind: OPENER_MESSAGE_KIND,
        data: '{"token":"x"}',
        origin: 'https://p.example',
        targetOrigin: 'https://a.example',
      },
      { kind: WINDOW_CLOSE_KIND },
    ]);
  });

  it('delivery script dispatches a message event with the data', () => {
    const events: { type: string; init: { data: unknown; origin: string } }[] =
      [];
    class FakeMessageEvent {
      constructor(
        public type: string,
        public init: { data: unknown; origin: string }
      ) {}
    }
    const win = { dispatchEvent: (e: FakeMessageEvent) => events.push(e) };
    // eslint-disable-next-line no-new-func -- runs the generated web-view script
    new Function(
      'window',
      'MessageEvent',
      buildOpenerDeliveryScript({
        kind: OPENER_MESSAGE_KIND,
        data: '{"a":"</script>\\u2028"}',
        origin: 'https://p.example',
        targetOrigin: '*',
      })
    )(win, FakeMessageEvent);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('message');
    expect(events[0].init).toEqual({
      data: { a: '</script>\u2028' },
      origin: 'https://p.example',
    });
  });
});

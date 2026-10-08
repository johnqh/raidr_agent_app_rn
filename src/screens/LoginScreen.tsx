/**
 * Login screen — sign in to a site in a web view and capture its token.
 *
 * The site's login page is opened in a `WebView` with an injected capture
 * script ({@link buildCaptureScript}) that reports each request the page makes
 * to the site's API host. Those reports feed a {@link TokenWatcher}, which
 * recognises the signed-in token:
 *
 *  - bearer / header styles: the token rides in a request header, so the watcher
 *    reads it straight from an observed request to a signed-in-only endpoint;
 *  - cookie style: browsers hide the `Cookie` header from page scripts, so after
 *    each navigation we read the cookie with `@react-native-cookies/cookies` and
 *    hand it to the watcher together with whether a signed-in-only call has
 *    succeeded.
 *
 * On a captured credential the token is stored for the host, the site is marked
 * authorized + selected, and the screen closes. `@react-native-cookies/cookies`
 * is iOS/Android only; on desktop cookie-style sign-in falls back to whatever
 * the injected script can see.
 *
 * ## Popups
 *
 * A page's `window.open` (e.g. "Sign in with Google" popups) arrives through
 * `onOpenWindow` (with `setSupportMultipleWindows` and
 * `javaScriptCanOpenWindowsAutomatically`) and opens in a second web view
 * layered over the first. Both share the app's cookie store (iOS/macOS: the
 * default WKWebsiteDataStore + shared process pool with `sharedCookiesEnabled`;
 * Android: the process-wide CookieManager; Windows: one WebView2 profile), and
 * the popup gets the same capture script, so a token seen in either is caught.
 * The popup has no real `window.opener`; the bridge script from
 * `@/lib/webAuth` shims `window.opener.postMessage` (replayed as a `message`
 * event in the main page) and `window.close()`. The popup closes on
 * `window.close()`, on navigating to `about:blank`, on Close, and on capture.
 *
 * ## Google user agent
 *
 * Google blocks sign-in inside embedded web views by user agent. When either
 * web view is about to load a Google sign-in page, the load is cancelled, the
 * web view is remounted (new `key`) with a standard browser user agent for
 * the platform, and the same URL is loaded. Remounting is used because a
 * `userAgent` change alone only applies to later requests. The UA then stays
 * for that web view (switching back would reload the OAuth callback). On
 * Windows, WebView2 has no `userAgent` prop, but its own Edge user agent is
 * already accepted by Google, so nothing is switched there.
 */

import React, {
  useCallback,
  useMemo,
  useRef,
  useEffect,
  useState,
} from 'react';
import { View, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import type {
  WebViewMessageEvent,
  WebViewNavigation,
} from 'react-native-webview';
import type {
  ShouldStartLoadRequest,
  WebViewOpenWindowEvent,
} from 'react-native-webview/lib/WebViewTypes';
import type { CookieManagerStatic } from '@react-native-cookies/cookies';
import { Text, Button, Spinner } from '@sudobility/components-rn';
import { useTranslation } from 'react-i18next';
import {
  buildCaptureScript,
  TokenWatcher,
  useSelectionStore,
  type ObservedRequest,
} from '@sudobility/raidr_agent_lib';
import { matchesPathTemplate } from '@sudobility/raidr_types';
import type { CapturedCredential } from '@sudobility/raidr_types';
import { useSiteAuth } from '@sudobility/raidr_agent_client';
import { useApi } from '@/context/ApiContext';
import { useAuth } from '@/context/AuthContext';
import { saveSiteToken } from '@/lib/secureStorage';
import {
  buildOpenerDeliveryScript,
  buildPopupBridgeScript,
  isGoogleSignInUrl,
  isPopupDoneUrl,
  OPENER_MESSAGE_KIND,
  parseBridgeMessage,
  parseHttpUrl,
  shouldDeliverOpenerMessage,
  userAgentAfterNavigation,
  WINDOW_CLOSE_KIND,
} from '@/lib/webAuth';
import { trackScreenView, trackEvent } from '@/analytics';
import type { LoginScreenProps } from '@/navigation/types';

/** Lazily load the cookie manager; it is iOS/Android only. */
function getCookieManager(): CookieManagerStatic | null {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return null;
  }
  try {
    return require('@react-native-cookies/cookies')
      .default as CookieManagerStatic;
  } catch {
    return null;
  }
}

/** What a web view shows; a new `key` remounts it (to apply a user agent). */
interface WebViewPage {
  uri: string;
  userAgent?: string;
  key: number;
}

/** Windows' WebView2 takes no `userAgent`; its Edge UA already passes Google. */
const SWITCHES_USER_AGENT = Platform.OS !== 'windows';

/**
 * Props both web views share: the cookie store, popups, and WebView2 on
 * Windows (the legacy Windows web view has no popups or script injection).
 */
const SHARED_WEBVIEW_PROPS = {
  sharedCookiesEnabled: true,
  thirdPartyCookiesEnabled: true,
  javaScriptCanOpenWindowsAutomatically: true,
  setSupportMultipleWindows: true,
  ...(Platform.OS === 'windows' ? { useWebView2: true } : {}),
} as const;

export default function LoginScreen({ route, navigation }: LoginScreenProps) {
  const { apiHost } = route.params;
  const { t } = useTranslation();

  const { networkClient, baseUrl } = useApi();
  const { getToken } = useAuth();
  const siteAuthQuery = useSiteAuth(networkClient, baseUrl, getToken, apiHost);
  const siteAuth = siteAuthQuery.data;

  const setAuthorized = useSelectionStore(s => s.setAuthorized);
  const select = useSelectionStore(s => s.select);

  // One watcher per resolved site-auth; recreated if the auth info changes.
  const watcher = useMemo(
    () =>
      siteAuth
        ? new TokenWatcher(apiHost, siteAuth.auth, siteAuth.userPaths)
        : null,
    [apiHost, siteAuth]
  );

  const finishedRef = useRef(false);
  const sawSignedInCallRef = useRef(false);

  const mainRef = useRef<WebView>(null);
  const mainUrlRef = useRef('');
  const [main, setMain] = useState<WebViewPage | null>(null);
  const [popup, setPopup] = useState<WebViewPage | null>(null);
  /** The popup has loaded a real page (so a later `about:blank` means done). */
  const popupLoadedRef = useRef(false);

  useEffect(() => {
    if (siteAuth) {
      mainUrlRef.current = siteAuth.loginUrl;
      setMain(
        prev =>
          prev ?? {
            uri: siteAuth.loginUrl,
            userAgent: SWITCHES_USER_AGENT
              ? userAgentAfterNavigation(
                  siteAuth.loginUrl,
                  undefined,
                  Platform.OS
                )
              : undefined,
            key: 0,
          }
      );
    }
  }, [siteAuth]);

  const captureScript = useMemo(() => buildCaptureScript(apiHost), [apiHost]);
  const popupScript = useMemo(
    () => `${captureScript}\n${buildPopupBridgeScript()}`,
    [captureScript]
  );

  useEffect(() => {
    trackScreenView('Login');
  }, []);

  const finish = useCallback(
    (credential: CapturedCredential | null) => {
      if (!credential || finishedRef.current) {
        return;
      }
      finishedRef.current = true;
      (async () => {
        await saveSiteToken(apiHost, credential.token);
        setAuthorized(apiHost, true);
        select(apiHost, true);
        navigation.goBack();
      })();
    },
    [apiHost, setAuthorized, select, navigation]
  );

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      if (!watcher || finishedRef.current) {
        return;
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(event.nativeEvent.data);
      } catch {
        return;
      }
      if (
        !parsed ||
        typeof parsed !== 'object' ||
        (parsed as { kind?: string }).kind !== 'raidr-agent/observed-request'
      ) {
        return;
      }
      const observed = parsed as ObservedRequest;
      // Track successful signed-in calls (used by cookie-style capture).
      if (observed.status >= 200 && observed.status < 300 && siteAuth) {
        try {
          const path = new URL(observed.url).pathname;
          const signedInOnly =
            siteAuth.userPaths.length === 0 ||
            siteAuth.userPaths.some(tpl => matchesPathTemplate(tpl, path));
          if (signedInOnly) {
            sawSignedInCallRef.current = true;
          }
        } catch {
          // Ignore an unparseable URL.
        }
      }
      finish(watcher.observe(observed));
    },
    [watcher, siteAuth, finish]
  );

  const handleNavigationStateChange = useCallback(
    (_navState: WebViewNavigation) => {
      // We re-read cookies from the configured login URL on every navigation,
      // so the navigation state itself is not needed here.
      if (!watcher || !siteAuth || finishedRef.current) {
        return;
      }
      if (siteAuth.auth.style !== 'cookie' || !siteAuth.auth.cookieName) {
        return;
      }
      const manager = getCookieManager();
      if (!manager) {
        return;
      }
      const cookieName = siteAuth.auth.cookieName;
      (async () => {
        try {
          const cookies = await manager.get(siteAuth.loginUrl, true);
          const cookie = cookies[cookieName];
          if (cookie && cookie.value) {
            finish(
              watcher.observeCookieToken(
                cookie.value,
                sawSignedInCallRef.current
              )
            );
          }
        } catch {
          // Ignore cookie read failures; capture can still happen via headers.
        }
      })();
    },
    [watcher, siteAuth, finish]
  );

  /**
   * Cancel a top-frame load of a Google sign-in page and reload it in a
   * remounted web view with a browser user agent.
   */
  const guardUserAgent = useCallback(
    (
        page: WebViewPage | null,
        setPage: React.Dispatch<React.SetStateAction<WebViewPage | null>>,
        target: 'main' | 'popup'
      ) =>
      (request: ShouldStartLoadRequest): boolean => {
        if (!SWITCHES_USER_AGENT || !page || request.isTopFrame === false) {
          return true;
        }
        const next = userAgentAfterNavigation(
          request.url,
          page.userAgent,
          Platform.OS
        );
        if (!next || next === page.userAgent) {
          return true;
        }
        setPage({ uri: request.url, userAgent: next, key: page.key + 1 });
        trackEvent('login_google_user_agent', { target });
        return false;
      },
    []
  );

  const openPopup = useCallback((event: WebViewOpenWindowEvent) => {
    const url = event.nativeEvent.targetUrl;
    if (!url || !parseHttpUrl(url)) {
      // `window.open('')` then scripting the window is not supported: the
      // popup web view has no handle back to the opener's window object.
      return;
    }
    popupLoadedRef.current = false;
    setPopup(prev => ({
      uri: url,
      userAgent: SWITCHES_USER_AGENT
        ? userAgentAfterNavigation(url, undefined, Platform.OS)
        : undefined,
      key: (prev?.key ?? 0) + 1,
    }));
    trackEvent('login_popup_opened', { google: isGoogleSignInUrl(url) });
  }, []);

  const closePopup = useCallback(() => {
    popupLoadedRef.current = false;
    setPopup(null);
  }, []);

  const handleMainNavigation = useCallback(
    (navState: WebViewNavigation) => {
      if (navState.url) {
        mainUrlRef.current = navState.url;
      }
      handleNavigationStateChange(navState);
    },
    [handleNavigationStateChange]
  );

  const handlePopupMessage = useCallback(
    (event: WebViewMessageEvent) => {
      const bridge = parseBridgeMessage(event.nativeEvent.data);
      if (bridge?.kind === WINDOW_CLOSE_KIND) {
        closePopup();
        return;
      }
      if (bridge?.kind === OPENER_MESSAGE_KIND) {
        if (
          shouldDeliverOpenerMessage(bridge.targetOrigin, mainUrlRef.current)
        ) {
          mainRef.current?.injectJavaScript(buildOpenerDeliveryScript(bridge));
        }
        return;
      }
      handleMessage(event);
    },
    [closePopup, handleMessage]
  );

  const handlePopupNavigation = useCallback(
    (navState: WebViewNavigation) => {
      if (isPopupDoneUrl(navState.url)) {
        if (popupLoadedRef.current) {
          closePopup();
        }
        return;
      }
      popupLoadedRef.current = true;
      handleNavigationStateChange(navState);
    },
    [closePopup, handleNavigationStateChange]
  );

  const handleClose = useCallback(() => {
    if (finishedRef.current) {
      return;
    }
    // Last chance: a cookie-only site with no signed-in-only paths accepts the
    // last token it saw when the window closes.
    if (watcher) {
      const credential = watcher.onClosed();
      if (credential) {
        finish(credential);
        return;
      }
    }
    navigation.goBack();
  }, [watcher, finish, navigation]);

  return (
    <SafeAreaView
      className='flex-1 bg-background'
      edges={['top', 'left', 'right']}
    >
      <View className='flex-row items-center justify-between px-4 py-3 border-b border-foreground/10'>
        <View className='flex-1 mr-3'>
          <Text size='base' weight='semibold'>
            {t('login.title')}
          </Text>
          <Text size='sm' color='muted'>
            {t('login.subtitle', { host: apiHost })}
          </Text>
        </View>
        <Button
          variant='ghost'
          size='sm'
          onPress={handleClose}
          accessibilityLabel={t('login.close')}
        >
          {t('login.close')}
        </Button>
      </View>

      {siteAuthQuery.isLoading ? (
        <View className='flex-1 items-center justify-center'>
          <Spinner size='large' />
        </View>
      ) : siteAuthQuery.isError || !siteAuth ? (
        <View className='flex-1 items-center justify-center px-6'>
          <Text size='base' color='danger' align='center'>
            {t('login.error')}
          </Text>
          <Button
            variant='outline'
            className='mt-4'
            onPress={() => navigation.goBack()}
            accessibilityLabel={t('common.back')}
          >
            {t('common.back')}
          </Button>
        </View>
      ) : main ? (
        <View className='flex-1'>
          <WebView
            key={`main-${main.key}`}
            ref={mainRef}
            source={{ uri: main.uri }}
            {...(main.userAgent ? { userAgent: main.userAgent } : {})}
            injectedJavaScriptBeforeContentLoaded={captureScript}
            {...(Platform.OS === 'windows'
              ? { injectedJavaScript: captureScript }
              : {})}
            onMessage={handleMessage}
            onNavigationStateChange={handleMainNavigation}
            onShouldStartLoadWithRequest={guardUserAgent(main, setMain, 'main')}
            onOpenWindow={openPopup}
            {...SHARED_WEBVIEW_PROPS}
          />
          {popup ? (
            <View
              style={StyleSheet.absoluteFill}
              className='bg-background'
              accessibilityViewIsModal
            >
              <View className='flex-row items-center justify-between px-4 py-2 border-b border-foreground/10'>
                <Text
                  size='sm'
                  color='muted'
                  className='flex-1 mr-3'
                  numberOfLines={1}
                >
                  {t('login.popupTitle', {
                    host: parseHttpUrl(popup.uri)?.host ?? '',
                  })}
                </Text>
                <Button
                  variant='ghost'
                  size='sm'
                  onPress={closePopup}
                  accessibilityLabel={t('login.closePopup')}
                >
                  {t('login.closePopup')}
                </Button>
              </View>
              <WebView
                key={`popup-${popup.key}`}
                source={{ uri: popup.uri }}
                {...(popup.userAgent ? { userAgent: popup.userAgent } : {})}
                injectedJavaScriptBeforeContentLoaded={popupScript}
                {...(Platform.OS === 'windows'
                  ? { injectedJavaScript: popupScript }
                  : {})}
                onMessage={handlePopupMessage}
                onNavigationStateChange={handlePopupNavigation}
                onShouldStartLoadWithRequest={guardUserAgent(
                  popup,
                  setPopup,
                  'popup'
                )}
                onOpenWindow={openPopup}
                {...SHARED_WEBVIEW_PROPS}
              />
            </View>
          ) : null}
        </View>
      ) : null}
    </SafeAreaView>
  );
}

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
 */

import React, { useCallback, useMemo, useRef, useEffect } from 'react';
import { View, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import type {
  WebViewMessageEvent,
  WebViewNavigation,
} from 'react-native-webview';
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
import { trackScreenView } from '@/analytics';
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
      ) : (
        <WebView
          source={{ uri: siteAuth.loginUrl }}
          injectedJavaScriptBeforeContentLoaded={buildCaptureScript(apiHost)}
          onMessage={handleMessage}
          onNavigationStateChange={handleNavigationStateChange}
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
        />
      )}
    </SafeAreaView>
  );
}

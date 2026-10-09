/**
 * Signing in to and out of third-party sites, as a whole: the token in the
 * Keychain, the entry in the credentials list, the run flow's "authorized"
 * mark, and the web view's cookies for the site.
 *
 * Cookies matter because the login web view shares one cookie store: with
 * the site's session cookie left behind, "Sign in" would sign straight back
 * in. They can be cleared only where `@react-native-cookies/cookies` exists
 * (iOS, Android); on macOS and Windows a sign-out removes the token only.
 */

import { Platform } from 'react-native';
import type { CookieManagerStatic } from '@react-native-cookies/cookies';
import { useSelectionStore } from '@sudobility/raidr_agent_lib';
import { deleteSiteToken, saveSiteToken } from '@/lib/secureStorage';
import { useCredentialsStore } from '@/stores/credentialsStore';
import type { SiteCredential } from '@/lib/siteCredentials';

/** The cookie manager, iOS/Android only. */
export function getCookieManager(): CookieManagerStatic | null {
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

/** iOS's web views keep cookies in WebKit's store, not NSHTTPCookieStorage. */
const USE_WEBKIT = Platform.OS === 'ios';

/** Store a captured token and list the site under Credentials. */
export async function saveSiteSession(
  apiHost: string,
  token: string,
  loginUrl: string
): Promise<void> {
  await saveSiteToken(apiHost, token);
  useCredentialsStore
    .getState()
    .add({ apiHost, loginUrl, signedInAt: Date.now() });
}

/** Expire every cookie the web view would send to `url`. Never throws. */
async function clearCookiesFor(url: string): Promise<void> {
  const manager = getCookieManager();
  if (!manager || !url) {
    return;
  }
  try {
    const cookies = await manager.get(url, USE_WEBKIT);
    const names = Object.keys(cookies);
    if (Platform.OS === 'ios') {
      await Promise.all(
        names.map(name => manager.clearByName(url, name, true))
      );
      return;
    }
    // Android has no per-name clear: overwrite each with an expired copy.
    const expired = new Date(0).toISOString();
    await Promise.all(
      names.map(name => {
        const cookie = cookies[name]!;
        return manager.set(url, {
          name,
          value: '',
          path: cookie.path ?? '/',
          ...(cookie.domain ? { domain: cookie.domain } : {}),
          expires: expired,
        });
      })
    );
    await manager.flush();
  } catch (error) {
    console.warn(`[siteSessions] could not clear cookies for ${url}`, error);
  }
}

/** Sign out of one site. */
export async function signOutOfSite(site: SiteCredential): Promise<void> {
  await deleteSiteToken(site.apiHost);
  useCredentialsStore.getState().remove(site.apiHost);
  useSelectionStore.getState().setAuthorized(site.apiHost, false);
  await clearCookiesFor(site.loginUrl);
}

/** Sign out of every listed site, and clear the web view's cookies. */
export async function signOutOfAllSites(
  sites: readonly SiteCredential[]
): Promise<void> {
  const selection = useSelectionStore.getState();
  await Promise.all(sites.map(site => deleteSiteToken(site.apiHost)));
  sites.forEach(site => selection.setAuthorized(site.apiHost, false));
  useCredentialsStore.getState().clear();
  const manager = getCookieManager();
  if (manager) {
    try {
      await manager.clearAll(USE_WEBKIT);
    } catch (error) {
      console.warn('[siteSessions] could not clear cookies', error);
    }
  }
}

/**
 * Which sites the user is signed in to — the list Settings → Credentials shows.
 *
 * The Keychain cannot list its entries, so each sign-in is also recorded
 * here: the API host, the login page it was captured from (whose cookies a
 * sign-out clears) and when. Never the token: that stays in the Keychain
 * (`secureStorage.ts`). Pure; the store is `credentialsStore.ts`.
 */

export interface SiteCredential {
  apiHost: string;
  /** The login page the web view opened; its cookies are the site's session. */
  loginUrl: string;
  /** Epoch ms of the sign-in. */
  signedInAt: number;
}

/** `list` with `entry` in it (a second sign-in replaces the first), newest first. */
export function withCredential(
  list: readonly SiteCredential[],
  entry: SiteCredential
): SiteCredential[] {
  return sortCredentials([
    ...list.filter(c => c.apiHost !== entry.apiHost),
    entry,
  ]);
}

/** `list` without `apiHost`. */
export function withoutCredential(
  list: readonly SiteCredential[],
  apiHost: string
): SiteCredential[] {
  return list.filter(c => c.apiHost !== apiHost);
}

/** Newest sign-in first. */
export function sortCredentials(
  list: readonly SiteCredential[]
): SiteCredential[] {
  return [...list].sort((a, b) => b.signedInAt - a.signedInAt);
}

/** Any persisted value (possibly hand-edited) as a valid list. */
export function normalizeCredentials(value: unknown): SiteCredential[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const out: SiteCredential[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const { apiHost, loginUrl, signedInAt } = item as Record<string, unknown>;
    if (typeof apiHost !== 'string' || apiHost === '') {
      continue;
    }
    if (out.some(c => c.apiHost === apiHost)) {
      continue;
    }
    out.push({
      apiHost,
      loginUrl: typeof loginUrl === 'string' ? loginUrl : '',
      signedInAt:
        typeof signedInAt === 'number' && Number.isFinite(signedInAt)
          ? signedInAt
          : 0,
    });
  }
  return sortCredentials(out);
}

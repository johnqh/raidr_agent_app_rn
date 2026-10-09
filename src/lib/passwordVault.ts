/**
 * The password manager: saved logins (email + password) per site, whether the
 * email was typed by the user or is the agent's Signic address. The password
 * lives only in the Keychain (`agentCredentialStore`); the listable directory
 * is `passwordIndexStore`. This module keeps the two in step.
 */

import {
  deleteSiteCredential,
  getOrCreateSiteCredential,
  getSiteCredential,
  saveSiteCredential,
  type SiteLoginCredential,
} from '@/lib/agentCredentialStore';
import {
  usePasswordIndexStore,
  type PasswordEntry,
  type PasswordSource,
} from '@/stores/passwordIndexStore';

/** A typed website reduced to a bare domain: no scheme, `www.`, path or case. */
export function normalizeDomain(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//, '')
    .replace(/^www\./, '')
    .replace(/[/?#].*$/, '')
    .replace(/\s+/g, '');
}

function upsertEntry(entry: Omit<PasswordEntry, 'updatedAt'>): void {
  usePasswordIndexStore.getState().upsert({ ...entry, updatedAt: Date.now() });
}

/**
 * The agent login for a site, generating a password the first time, and
 * recording it in the directory so it shows in the password manager. Used by
 * the sign-up autofill.
 */
export async function getOrCreateAgentLogin(
  apiHost: string,
  domain: string,
  email: string
): Promise<SiteLoginCredential> {
  const credential = await getOrCreateSiteCredential(apiHost, email);
  upsertEntry({ apiHost, domain, email, source: 'agent' });
  return credential;
}

/**
 * Save a login the user entered (or edited). The site is keyed by its domain.
 * Returns the directory entry's key.
 */
export async function saveManualLogin(input: {
  domain: string;
  email: string;
  password: string;
}): Promise<string> {
  const domain = normalizeDomain(input.domain);
  // A manual login is keyed by its domain (it has no catalog API host).
  await saveSiteCredential(domain, input.email, input.password);
  upsertEntry({
    apiHost: domain,
    domain,
    email: input.email,
    source: 'manual',
  });
  return domain;
}

/** Update the email/password of an existing entry, keeping its key and source. */
export async function updateLogin(
  entry: PasswordEntry,
  email: string,
  password: string
): Promise<void> {
  await saveSiteCredential(entry.apiHost, email, password);
  upsertEntry({
    apiHost: entry.apiHost,
    domain: entry.domain,
    email,
    source: entry.source,
  });
}

/** The password stored for a site, read on demand to reveal it. */
export async function revealPassword(apiHost: string): Promise<string | null> {
  const credential = await getSiteCredential(apiHost);
  return credential?.password ?? null;
}

/** Forget a saved login: the Keychain password and the directory row. */
export async function removeLogin(apiHost: string): Promise<void> {
  await deleteSiteCredential(apiHost);
  usePasswordIndexStore.getState().remove(apiHost);
}

export type { PasswordEntry, PasswordSource };

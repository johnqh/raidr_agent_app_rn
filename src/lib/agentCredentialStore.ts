/**
 * The agent email login the app generated for one site, stored only in the
 * device Keychain / Keystore — the "domain credentials, local and encrypted".
 * One entry per API host: the email that was filled and the password
 * generated for it, so a return visit fills the same pair.
 *
 * Like the other secure stores, each call falls back to a process-lifetime
 * in-memory copy when the Keychain is unavailable, logging the reason once.
 */

import * as Keychain from 'react-native-keychain';
import { generatePassword } from '@/lib/agentCredentials';

export interface SiteLoginCredential {
  /** The agent email address filled into the site. */
  email: string;
  /** The generated password for this site. */
  password: string;
  /** Epoch ms the credential was generated. */
  createdAt: number;
}

const USERNAME = 'agent-login';
const memory = new Map<string, SiteLoginCredential>();
let loggedFallback = false;

function serviceFor(apiHost: string): string {
  return `raidr-agent-cred:${apiHost}`;
}

function noteFallback(operation: string, error: unknown): void {
  if (loggedFallback) {
    return;
  }
  loggedFallback = true;
  console.warn(
    `[agentCredentialStore] Keychain unavailable (${operation}); ` +
      'falling back to in-memory storage for this session.',
    error
  );
}

async function write(
  apiHost: string,
  credential: SiteLoginCredential
): Promise<void> {
  const service = serviceFor(apiHost);
  memory.set(service, credential);
  try {
    await Keychain.setGenericPassword(USERNAME, JSON.stringify(credential), {
      service,
    });
  } catch (error) {
    noteFallback('save', error);
  }
}

/** Store an explicit email + password for a site (a manually entered login). */
export async function saveSiteCredential(
  apiHost: string,
  email: string,
  password: string
): Promise<SiteLoginCredential> {
  const credential: SiteLoginCredential = {
    email,
    password,
    createdAt: Date.now(),
  };
  await write(apiHost, credential);
  return credential;
}

/** The stored credential for a site, or null when there is none. */
export async function getSiteCredential(
  apiHost: string
): Promise<SiteLoginCredential | null> {
  const service = serviceFor(apiHost);
  try {
    const stored = await Keychain.getGenericPassword({ service });
    if (stored && stored.password) {
      return JSON.parse(stored.password) as SiteLoginCredential;
    }
    return memory.get(service) ?? null;
  } catch (error) {
    noteFallback('get', error);
    return memory.get(service) ?? null;
  }
}

/**
 * The credential for a site, generating and storing a password the first time
 * (or when the stored one was for a different email, e.g. after the agent
 * email was replaced).
 */
export async function getOrCreateSiteCredential(
  apiHost: string,
  email: string
): Promise<SiteLoginCredential> {
  const existing = await getSiteCredential(apiHost);
  if (existing && existing.email === email) {
    return existing;
  }
  const credential: SiteLoginCredential = {
    email,
    password: generatePassword(),
    createdAt: Date.now(),
  };
  await write(apiHost, credential);
  return credential;
}

/** Remove the stored credential for a site. */
export async function deleteSiteCredential(apiHost: string): Promise<void> {
  const service = serviceFor(apiHost);
  memory.delete(service);
  try {
    await Keychain.resetGenericPassword({ service });
  } catch (error) {
    noteFallback('delete', error);
  }
}

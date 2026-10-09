/**
 * Reading the agent email's mailbox through signic_sdk: build a client from
 * the stored seed phrase, sign in (SIWE) once, and keep it for the session.
 *
 * The seed phrase never leaves `agentWalletStore`; the client is given only
 * a `signMessage` callback that derives the wallet on demand. The connected
 * client is cached per address, and `resetAgentEmailSession()` drops it when
 * the email is removed or replaced.
 *
 * The inbox UI is not built yet — these are the operations it will read.
 */

import { SignicClient } from '@sudobility/signic_sdk';
import type {
  SignicEmail,
  SignicEmailDetail,
  SendEmailParams,
  SendEmailResult,
} from '@sudobility/signic_sdk';
import { SIGNIC_CONFIG } from '@/config/agentEmail';
import { accountFromSeedPhrase, emailAddressFor } from '@/lib/agentWallet';
import { getSeedPhrase } from '@/lib/agentWalletStore';

/** A connected client plus the addresses it is for. */
export interface AgentEmailSession {
  client: SignicClient;
  address: string;
  emailAddress: string;
}

/**
 * How a client is built from a seed phrase. Injectable so tests need neither
 * viem nor the network; the default derives the wallet and signs with it.
 */
export type SignicClientFactory = (phrase: string) => {
  client: SignicClient;
  address: string;
};

let factory: SignicClientFactory = defaultFactory;

function defaultFactory(phrase: string): {
  client: SignicClient;
  address: string;
} {
  const account = accountFromSeedPhrase(phrase);
  const client = new SignicClient({
    indexerUrl: SIGNIC_CONFIG.indexerUrl,
    wildduckUrl: SIGNIC_CONFIG.wildduckUrl,
    emailDomain: SIGNIC_CONFIG.emailDomain,
    chainId: SIGNIC_CONFIG.chainId,
    signMessage: async (message: string) => ({
      address: account.address,
      signature: await account.signMessage({ message }),
    }),
  });
  return { client, address: account.address };
}

/** Replace the client factory (tests). Also drops any cached session. */
export function setSignicClientFactory(next: SignicClientFactory | null): void {
  factory = next ?? defaultFactory;
  session = null;
  connecting = null;
}

let session: AgentEmailSession | null = null;
let connecting: Promise<AgentEmailSession> | null = null;

/** Forget the connected client (on sign-out / replacement). */
export function resetAgentEmailSession(): void {
  session = null;
  connecting = null;
}

/**
 * The connected session, building and signing in once. Null when there is no
 * agent email set up. A failed connect is not cached.
 */
export async function getAgentEmailSession(): Promise<AgentEmailSession | null> {
  if (session) {
    return session;
  }
  if (connecting) {
    return connecting;
  }
  connecting = (async () => {
    const phrase = await getSeedPhrase();
    if (!phrase) {
      throw new NoAgentEmailError();
    }
    const { client, address } = factory(phrase);
    if (!client.isConnected()) {
      await client.connect(address);
    }
    session = {
      client,
      address,
      emailAddress: emailAddressFor(address, SIGNIC_CONFIG.emailDomain),
    };
    return session;
  })();
  try {
    return await connecting;
  } catch (error) {
    if (error instanceof NoAgentEmailError) {
      return null;
    }
    throw error;
  } finally {
    connecting = null;
  }
}

/** Thrown internally when no seed phrase is stored; surfaced as `null`. */
class NoAgentEmailError extends Error {
  constructor() {
    super('No agent email is set up');
    this.name = 'NoAgentEmailError';
  }
}

/** Unread emails in the agent inbox (empty when no email is set up). */
export async function listAgentEmails(limit = 50): Promise<SignicEmail[]> {
  const active = await getAgentEmailSession();
  if (!active) {
    return [];
  }
  const { emails } = await active.client.getUnreadEmails(limit);
  return emails;
}

/** One full email by id. Throws when no email is set up. */
export async function getAgentEmail(
  id: number,
  mailboxId?: string
): Promise<SignicEmailDetail> {
  const active = await requireSession();
  return active.client.getEmail(id, mailboxId);
}

/** Mark one email read. Throws when no email is set up. */
export async function markAgentEmailRead(
  id: number,
  mailboxId?: string
): Promise<void> {
  const active = await requireSession();
  await active.client.markAsRead(id, mailboxId);
}

/** Send an email from the agent address. Throws when no email is set up. */
export async function sendAgentEmail(
  params: SendEmailParams
): Promise<SendEmailResult> {
  const active = await requireSession();
  return active.client.sendEmail(params);
}

async function requireSession(): Promise<AgentEmailSession> {
  const active = await getAgentEmailSession();
  if (!active) {
    throw new Error('No agent email is set up');
  }
  return active;
}

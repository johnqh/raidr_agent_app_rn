/**
 * Agent Email (Signic) configuration, read from `env`. The agent's address
 * is a standard Ethereum key held only on the device; these are the service
 * endpoints its mailbox lives on.
 */

import { env } from './env';

export const SIGNIC_CONFIG = {
  indexerUrl: env.SIGNIC_INDEXER_URL,
  wildduckUrl: env.SIGNIC_WILDDUCK_URL,
  emailDomain: env.SIGNIC_EMAIL_DOMAIN,
  /** SIWE chain id: Ethereum mainnet. The key is chain-agnostic. */
  chainId: 1,
} as const;

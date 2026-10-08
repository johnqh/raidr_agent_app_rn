/**
 * The agent flow's server-or-device switch. Each step runs in the cloud
 * (raidr_agent_api) or, in local mode with at least one saved AI key, on this
 * device ({@link understandLocally}, {@link prepareLocally},
 * {@link startLocalRun}). Local mode is decided per call: with no saved key it
 * runs in the cloud.
 *
 * Every raidr_agent_client call of the cloud flow is made here, so a change in
 * the client's API touches this file only.
 */

import type {
  RaidrAgentClient,
  TokenGetter,
} from '@sudobility/raidr_agent_client';
import type {
  IntentRequest,
  IntentResponse,
  PrepareRequest,
  PrepareResponse,
  RunRequest,
} from '@sudobility/raidr_agent_types';
import type { BaseResponse } from '@sudobility/types';
import { useSettingsStore } from '@/stores/settingsStore';
import { loadProviderKeys } from './llmKeys';
import {
  prepareLocally,
  startLocalRun,
  understandLocally,
  type ProviderCredential,
} from './localAgent';
import { startRun, type RunCallbacks, type RunHandle } from './runTransport';

function unwrap<T>(response: BaseResponse<T>, what: string): T {
  if (!response.success || response.data == null) {
    throw new Error(response.error || `${what} failed`);
  }
  return response.data as T;
}

async function requiredToken(getToken: TokenGetter): Promise<string> {
  const token = await getToken();
  if (!token) {
    throw new Error('Sign in first');
  }
  return token;
}

/** The providers to use when local mode is on and keys exist; `[]` means cloud. */
export async function localProviders(): Promise<ProviderCredential[]> {
  const { agentMode, providerOrder } = useSettingsStore.getState();
  return agentMode === 'local' ? loadProviderKeys(providerOrder) : [];
}

/** Ask step: the intent and the ranked candidate sites (`POST /intent`). */
export async function understandRequest(
  client: RaidrAgentClient,
  getToken: TokenGetter,
  body: IntentRequest
): Promise<IntentResponse> {
  const providers = await localProviders();
  if (providers.length > 0) {
    return understandLocally(client, getToken, providers, body);
  }
  return unwrap(
    await client.understandIntent(body, await requiredToken(getToken)),
    'Understanding the request'
  );
}

/** Prepare step: per-site plans and the merged form (`POST /prepare`). */
export async function prepareRequest(
  client: RaidrAgentClient,
  getToken: TokenGetter,
  body: PrepareRequest
): Promise<PrepareResponse> {
  const providers = await localProviders();
  if (providers.length > 0) {
    return prepareLocally(client, getToken, providers, body);
  }
  return unwrap(
    await client.prepare(body, await requiredToken(getToken)),
    'Preparing the sites'
  );
}

/** Run step: stream the run (`POST /runs`, or on the device). */
export async function startAgentRun(
  client: RaidrAgentClient,
  getToken: TokenGetter,
  runRequest: RunRequest,
  callbacks: RunCallbacks
): Promise<RunHandle> {
  const providers = await localProviders();
  return providers.length > 0
    ? startLocalRun(client, getToken, providers, runRequest, callbacks)
    : startRun(client, getToken, runRequest, callbacks);
}

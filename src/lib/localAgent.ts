/**
 * Local agent mode: the agent loop runs on this device with the user's own
 * LLM key, and site calls go straight from the device to the site.
 *
 * The steps mirror the cloud's: understand the request
 * ({@link understandLocally}: `understandIntent` → `POST /candidates` →
 * `rankSites`), prepare the chosen sites ({@link prepareLocally}:
 * `prepareSites` with site context from `GET /sites/:apiHost/context`), then
 * run them ({@link startLocalRun}: `runSites` with the prepared tools and the
 * user's form inputs, including the `data-best` pick).
 *
 * For every model decision the app asks raidr_agent_api for the provider
 * request (`POST /llm/payload`, which proxies ShapeShyft `/prompt` with the
 * server's key), adds the user's key to it, sends it to the provider itself,
 * and parses the reply here. The user's LLM key and site tokens never reach
 * our servers. Providers are tried in the user's order; a failed call
 * (network, non-2xx, unparseable reply) falls through to the next one.
 *
 * The run loop itself is the one the server uses (`raidr_agent_lib/runner`);
 * a finished run is uploaded to `POST /runs/import` so it shows in History.
 */

import type {
  RaidrAgentClient,
  TokenGetter,
} from '@sudobility/raidr_agent_client';
import type {
  AgentStep,
  AiProviderRequest,
  BestData,
  IntentRequest,
  IntentResponse,
  LocalLlmProvider,
  PrepareRequest,
  PrepareResponse,
  RunRequest,
  SiteContext,
} from '@sudobility/raidr_agent_types';
import type { BaseResponse } from '@sudobility/types';
import type { McpManifest } from '@sudobility/raidr_types';
import {
  createLocalRunRecorder,
  DirectSiteConnector,
  prepareSites,
  randomId,
  rankSites,
  runSites,
  understandIntent,
  type AiTransport,
  type FetchLike,
  type SiteCatalog,
  type SiteContextSource,
} from '@sudobility/raidr_agent_lib/runner';
import { parseProviderResponse } from '@sudobility/shapeshyft_engine/core';
import type { LlmProvider } from '@sudobility/shapeshyft_engine/types';
import type { RunCallbacks, RunHandle } from './runTransport';

/** A provider the user has a key for, in the order to try them. */
export interface ProviderCredential {
  provider: LocalLlmProvider;
  key: string;
}

/** Per-request timeout for one provider call. */
const PROVIDER_TIMEOUT_MS = 90_000;

/** Unwrap a `BaseResponse`, turning a failure into an `Error`. */
function unwrap<T>(response: BaseResponse<T>, what: string): T {
  if (!response.success || response.data == null) {
    throw new Error(response.error || `${what} failed`);
  }
  return response.data as T;
}

/** Add the user's key to a provider request, as `request.auth` says. */
export function withAuth(
  request: AiProviderRequest,
  key: string
): Record<string, string> {
  return {
    ...request.headers,
    [request.auth.header]: `${request.auth.prefix}${key}`,
  };
}

/** Pull a readable message out of a provider's error body. */
function providerError(status: number, body: string): string {
  try {
    const parsed = JSON.parse(body) as {
      error?: { message?: string } | string;
      message?: string;
    };
    const message =
      typeof parsed.error === 'string'
        ? parsed.error
        : parsed.error?.message ?? parsed.message;
    if (message) {
      return `HTTP ${status}: ${message}`;
    }
  } catch {
    // Not JSON; fall through.
  }
  return `HTTP ${status}`;
}

export interface LocalAiTransportOptions {
  client: RaidrAgentClient;
  getToken: TokenGetter;
  /** Providers with keys, most preferred first. Must not be empty. */
  providers: ProviderCredential[];
  fetch?: typeof fetch;
  /** Stops in-flight provider calls. */
  signal?: AbortSignal;
}

/**
 * An {@link AiTransport} that calls the user's own provider. Each step tries
 * the providers in order and returns the first parsed structured output.
 */
export function createLocalAiTransport(
  options: LocalAiTransportOptions
): AiTransport {
  const doFetch = options.fetch ?? globalThis.fetch;

  const callProvider = async (
    step: AgentStep,
    input: Record<string, unknown>,
    { provider, key }: ProviderCredential
  ): Promise<unknown> => {
    const token = await options.getToken();
    const payload = unwrap(
      await options.client.getLlmPayload(
        { step, input, provider },
        token ?? ''
      ),
      'Preparing the AI request'
    );
    const request = payload.request;

    const controller = new AbortController();
    const onAbort = () => controller.abort();
    options.signal?.addEventListener('abort', onAbort);
    const timer = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
    try {
      const response = await doFetch(request.url, {
        method: request.method,
        headers: withAuth(request, key),
        body: JSON.stringify(request.body),
        signal: controller.signal,
      });
      const text = await response.text();
      if (!response.ok) {
        throw new Error(providerError(response.status, text));
      }
      const parsed = parseProviderResponse(
        request.provider as LlmProvider,
        JSON.parse(text)
      );
      if (parsed.content == null || typeof parsed.content !== 'object') {
        throw new Error(
          parsed.finishReason === 'length'
            ? 'The model ran out of output tokens'
            : 'The model did not return structured output'
        );
      }
      return parsed.content;
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener('abort', onAbort);
    }
  };

  return {
    async invoke(step, input) {
      if (options.providers.length === 0) {
        throw new Error('No AI provider key is set up for local mode');
      }
      const failures: string[] = [];
      for (const credential of options.providers) {
        if (options.signal?.aborted) {
          throw new Error('Cancelled');
        }
        try {
          return await callProvider(step, input, credential);
        } catch (error) {
          if (options.signal?.aborted) {
            throw error;
          }
          failures.push(
            `${credential.provider}: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }
      throw new Error(failures.join('; '));
    },
  };
}

/**
 * Understand a request on this device: the six-W intent (with the device's
 * country / locale / time zone / clock), the catalog sites for its labels
 * (`POST /candidates`), then those sites ranked for the request, with reasons.
 */
export async function understandLocally(
  client: RaidrAgentClient,
  getToken: TokenGetter,
  providers: ProviderCredential[],
  body: IntentRequest
): Promise<IntentResponse> {
  const ai = createLocalAiTransport({ client, getToken, providers });
  const intent = await understandIntent(ai, {
    request: body.request,
    ...(body.country ? { country: body.country } : {}),
    ...(body.locale ? { locale: body.locale } : {}),
    ...(body.timeZone ? { timeZone: body.timeZone } : {}),
    ...(body.now ? { now: body.now } : {}),
  });
  const token = await getToken();
  const candidates = unwrap(
    await client.getCandidates(intent.labels, token ?? ''),
    'Finding sites'
  );
  if (candidates.length === 0) {
    return { intent, candidates };
  }
  const ranked = await rankSites(ai, {
    request: body.request,
    intent,
    ...(body.country ? { country: body.country } : {}),
    candidates,
  });
  return { intent, candidates: ranked };
}

/** Site context (and its manifest) through raidr_agent_api, cached per run. */
export type LocalSiteSource = SiteContextSource & SiteCatalog;

export function createSiteSource(
  client: RaidrAgentClient,
  getToken: TokenGetter
): LocalSiteSource {
  const cache = new Map<string, Promise<SiteContext>>();
  const context = (apiHost: string): Promise<SiteContext> => {
    let pending = cache.get(apiHost);
    if (!pending) {
      pending = (async () => {
        const token = await getToken();
        return unwrap(
          await client.getSiteContext(apiHost, token ?? ''),
          `Loading ${apiHost}`
        );
      })();
      pending.catch(() => cache.delete(apiHost));
      cache.set(apiHost, pending);
    }
    return pending;
  };
  return {
    context,
    manifest: async (apiHost: string): Promise<McpManifest> =>
      (await context(apiHost)).manifest,
  };
}

/** Prepare the chosen sites on this device (tools, sign-in need, the form). */
export async function prepareLocally(
  client: RaidrAgentClient,
  getToken: TokenGetter,
  providers: ProviderCredential[],
  body: PrepareRequest
): Promise<PrepareResponse> {
  const ai = createLocalAiTransport({ client, getToken, providers });
  return prepareSites(ai, createSiteSource(client, getToken), {
    request: body.request,
    intent: body.intent,
    sites: body.sites,
    ...(body.location ? { location: body.location } : {}),
  });
}

/**
 * Run the agent on this device. Reports through the same callbacks as the
 * cloud {@link startRun}, so the Results screen renders both alike.
 */
export function startLocalRun(
  client: RaidrAgentClient,
  getToken: TokenGetter,
  providers: ProviderCredential[],
  runRequest: RunRequest,
  callbacks: RunCallbacks
): RunHandle {
  const controller = new AbortController();
  const runId = `local-${randomId()}`;
  const emit = callbacks.onPart;

  let best: BestData | null = null;

  const run = async (): Promise<void> => {
    const recorder = createLocalRunRecorder({
      request: runRequest.request,
      intent: runRequest.intent,
      forward: {
        write: part => {
          if (controller.signal.aborted) {
            return;
          }
          switch (part.type) {
            case 'data-site-status':
              emit({ type: 'site-status', data: part.data });
              break;
            case 'data-call':
              emit({ type: 'call', data: part.data });
              break;
            case 'data-result':
              emit({ type: 'result', data: part.data });
              break;
            case 'data-run':
              emit({ type: 'run', data: part.data });
              break;
            case 'data-best':
              best = part.data;
              emit({ type: 'best', data: part.data });
              break;
          }
        },
      },
    });

    emit({ type: 'run', data: { runId, status: 'running' } });
    let status: 'done' | 'failed' = 'done';
    let resultCount = 0;
    const catalog = createSiteSource(client, getToken);
    try {
      const outcome = await runSites(
        runRequest,
        recorder.writer,
        {
          ai: createLocalAiTransport({
            client,
            getToken,
            providers,
            signal: controller.signal,
          }),
          catalog,
          connector: new DirectSiteConnector({
            catalog,
            fetch: globalThis.fetch as unknown as FetchLike,
          }),
        },
        { signal: controller.signal }
      );
      resultCount = outcome.results.length;
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }
      status = 'failed';
      callbacks.onError?.(
        error instanceof Error ? error : new Error(String(error))
      );
    }
    if (controller.signal.aborted) {
      return;
    }
    emit({
      type: 'run',
      data: { runId, status, ...(status === 'done' ? { resultCount } : {}) },
    });

    // History upload. A failure here does not fail the run the user just saw.
    try {
      const token = await getToken();
      await client.importRun(
        { ...recorder.toImportRequest(status), best },
        token ?? ''
      );
    } catch (error) {
      console.warn('[localAgent] Could not save the run to History', error);
    }
    if (status === 'done') {
      callbacks.onFinish?.();
    }
  };

  run();
  return { abort: () => controller.abort() };
}

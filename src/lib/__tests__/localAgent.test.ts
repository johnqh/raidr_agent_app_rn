import type { AiProviderRequest } from '@sudobility/raidr_agent_types';

jest.mock('@sudobility/raidr_agent_lib/runner', () => ({
  createLocalRunRecorder: jest.fn(
    (options: { forward: { write: (p: unknown) => void } }) => ({
      writer: { write: (part: unknown) => options.forward.write(part) },
      toImportRequest: (status: string) => ({ request: 'r', status }),
    })
  ),
  DirectSiteConnector: jest.fn(),
  randomId: () => 'id',
  runSites: jest.fn(),
  understandIntent: jest.fn(),
  rankSites: jest.fn(),
  prepareSites: jest.fn(),
}));

jest.mock('@sudobility/shapeshyft_engine/core', () => ({
  parseProviderResponse: (_provider: string, raw: { content?: unknown }) => ({
    content: raw.content ?? null,
    finishReason: raw.content ? 'stop' : 'length',
  }),
}));

import * as runner from '@sudobility/raidr_agent_lib/runner';
import {
  createLocalAiTransport,
  createSiteSource,
  prepareLocally,
  startLocalRun,
  understandLocally,
  withAuth,
} from '../localAgent';
import type { RunStreamPart } from '../runTransport';

const mocked = runner as unknown as Record<string, jest.Mock>;

function payload(provider: string): AiProviderRequest {
  return {
    provider,
    model: 'm',
    method: 'POST',
    url: `https://${provider}.example/chat`,
    headers: { 'content-type': 'application/json' },
    auth:
      provider === 'anthropic'
        ? { header: 'x-api-key', prefix: '' }
        : { header: 'Authorization', prefix: 'Bearer ' },
    body: { hello: provider },
  };
}

function makeClient() {
  return {
    getLlmPayload: jest.fn(async (body: { provider: string }) => ({
      success: true,
      data: { request: payload(body.provider) },
    })),
  };
}

function response(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  };
}

const getToken = async () => 'firebase-token';

describe('withAuth', () => {
  it('adds a bearer key', () => {
    expect(withAuth(payload('openai'), 'sk-1')).toEqual({
      'content-type': 'application/json',
      Authorization: 'Bearer sk-1',
    });
  });

  it('adds an anthropic key without a prefix', () => {
    expect(withAuth(payload('anthropic'), 'sk-ant')).toMatchObject({
      'x-api-key': 'sk-ant',
    });
  });
});

describe('createLocalAiTransport', () => {
  it('sends the payload with the key and returns the parsed output', async () => {
    const client = makeClient();
    const fetch = jest.fn(async () => response(200, { content: { ok: 1 } }));
    const ai = createLocalAiTransport({
      client: client as never,
      getToken,
      providers: [{ provider: 'openai', key: 'sk-1' }],
      fetch: fetch as never,
    });

    await expect(ai.invoke('plan', { a: 1 })).resolves.toEqual({ ok: 1 });
    expect(client.getLlmPayload).toHaveBeenCalledWith(
      { step: 'plan', input: { a: 1 }, provider: 'openai' },
      'firebase-token'
    );
    const [url, init] = fetch.mock.calls[0] as unknown as [
      string,
      { headers: Record<string, string>; body: string }
    ];
    expect(url).toBe('https://openai.example/chat');
    expect(init.headers.Authorization).toBe('Bearer sk-1');
    expect(JSON.parse(init.body)).toEqual({ hello: 'openai' });
  });

  it('falls back to the next provider when one fails', async () => {
    const client = makeClient();
    const fetch = jest
      .fn()
      .mockResolvedValueOnce(response(401, { error: { message: 'bad key' } }))
      .mockResolvedValueOnce(response(200, { content: { from: 'b' } }));
    const ai = createLocalAiTransport({
      client: client as never,
      getToken,
      providers: [
        { provider: 'openai', key: 'k1' },
        { provider: 'anthropic', key: 'k2' },
      ],
      fetch: fetch as never,
    });

    await expect(ai.invoke('extract', {})).resolves.toEqual({ from: 'b' });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('reports every provider failure when all fail', async () => {
    const fetch = jest
      .fn()
      .mockResolvedValueOnce(response(401, { error: { message: 'bad key' } }))
      .mockResolvedValueOnce(response(200, {}));
    const ai = createLocalAiTransport({
      client: makeClient() as never,
      getToken,
      providers: [
        { provider: 'openai', key: 'k1' },
        { provider: 'deepseek', key: 'k2' },
      ],
      fetch: fetch as never,
    });

    await expect(ai.invoke('understand', { request: 'x' })).rejects.toThrow(
      'openai: HTTP 401: bad key; deepseek: The model ran out of output tokens'
    );
  });

  it('never sends the user key to raidr', async () => {
    const client = makeClient();
    const fetch = jest.fn(async () => response(200, { content: {} }));
    const ai = createLocalAiTransport({
      client: client as never,
      getToken,
      providers: [{ provider: 'openai', key: 'sk-secret' }],
      fetch: fetch as never,
    });
    await ai.invoke('plan', {});
    expect(JSON.stringify(client.getLlmPayload.mock.calls)).not.toContain(
      'sk-secret'
    );
  });
});

const intent = { labels: ['events'], selection: 'all' } as never;
const site = (apiHost: string) => ({ apiHost, title: apiHost } as never);

describe('understandLocally', () => {
  it('understands with the device context, then ranks the label candidates', async () => {
    mocked.understandIntent.mockResolvedValueOnce(intent);
    mocked.rankSites.mockResolvedValueOnce([site('b')]);
    const client: Record<string, jest.Mock> = {
      getCandidates: jest.fn(async () => ({
        success: true,
        data: [site('a'), site('b')],
      })),
    };
    const result = await understandLocally(
      client as never,
      getToken,
      [{ provider: 'openai', key: 'k' }],
      {
        request: 'jazz tonight',
        country: 'US',
        timeZone: 'America/New_York',
        now: 'n',
      }
    );
    expect(mocked.understandIntent.mock.calls[0][1]).toEqual({
      request: 'jazz tonight',
      country: 'US',
      timeZone: 'America/New_York',
      now: 'n',
    });
    expect(client.getCandidates).toHaveBeenCalledWith(
      ['events'],
      'firebase-token'
    );
    expect(mocked.rankSites.mock.calls[0][1]).toEqual({
      request: 'jazz tonight',
      intent,
      country: 'US',
      candidates: [site('a'), site('b')],
    });
    expect(result).toEqual({ intent, candidates: [site('b')] });
    // Ranking reads each candidate's manifest through the API.
    client.getSiteManifest = jest.fn(async () => ({
      success: true,
      data: { apiHost: 'a' },
    }));
    const manifests = mocked.rankSites.mock.calls[0][2];
    await expect(manifests.manifest('a')).resolves.toEqual({ apiHost: 'a' });
    expect(client.getSiteManifest).toHaveBeenCalledWith('a', 'firebase-token');
  });

  it('skips ranking when no site matches', async () => {
    mocked.understandIntent.mockResolvedValueOnce(intent);
    mocked.rankSites.mockClear();
    const client = {
      getCandidates: jest.fn(async () => ({ success: true, data: [] })),
    };
    const result = await understandLocally(
      client as never,
      getToken,
      [{ provider: 'openai', key: 'k' }],
      { request: 'x' }
    );
    expect(result.candidates).toEqual([]);
    expect(mocked.rankSites).not.toHaveBeenCalled();
  });
});

describe('createSiteSource', () => {
  it('loads each context once and serves its manifest', async () => {
    const context = {
      manifest: { apiHost: 'api.a' },
      toolAuth: {},
      routes: [],
    };
    const client = {
      getSiteContext: jest.fn(async () => ({ success: true, data: context })),
    };
    const source = createSiteSource(client as never, getToken);
    await expect(source.context('api.a')).resolves.toBe(context);
    await expect(source.manifest('api.a')).resolves.toBe(context.manifest);
    expect(client.getSiteContext).toHaveBeenCalledTimes(1);
  });

  it('forgets a failed load', async () => {
    const client = {
      getSiteContext: jest
        .fn()
        .mockResolvedValueOnce({ success: false, error: 'nope' })
        .mockResolvedValueOnce({ success: true, data: { manifest: {} } }),
    };
    const source = createSiteSource(client as never, getToken);
    await expect(source.context('api.a')).rejects.toThrow('nope');
    await expect(source.context('api.a')).resolves.toEqual({ manifest: {} });
  });
});

describe('prepareLocally', () => {
  it('prepares through the lib with a site-context source', async () => {
    const prepared = { sites: [], form: [] };
    mocked.prepareSites.mockResolvedValueOnce(prepared);
    const body = { request: 'r', intent, sites: ['api.a'] };
    await expect(
      prepareLocally(
        {} as never,
        getToken,
        [{ provider: 'openai', key: 'k' }],
        body
      )
    ).resolves.toBe(prepared);
    const [, source, input] = mocked.prepareSites.mock.calls[0];
    expect(typeof source.context).toBe('function');
    expect(input).toEqual(body);
  });
});

describe('startLocalRun', () => {
  it('forwards data-best and saves it with the run', async () => {
    mocked.runSites.mockImplementationOnce(
      async (_req: unknown, writer: { write: (p: unknown) => void }) => {
        writer.write({ type: 'data-result', data: { id: 'r1' } });
        writer.write({
          type: 'data-best',
          data: { resultId: 'r1', reason: 'why' },
        });
        return { sites: [], results: [{ id: 'r1' }] };
      }
    );
    const client = { importRun: jest.fn(async () => ({ success: true })) };
    const parts: RunStreamPart[] = [];
    await new Promise<void>(resolve => {
      startLocalRun(
        client as never,
        getToken,
        [{ provider: 'openai', key: 'k' }],
        {
          request: 'r',
          intent,
          sites: [{ apiHost: 'api.a', tools: ['t'] }],
          inputs: { q: 'x' },
        },
        { onPart: p => parts.push(p), onFinish: resolve }
      );
    });
    expect(parts.map(p => p.type)).toEqual(['run', 'result', 'best', 'run']);
    expect(mocked.runSites.mock.calls[0][0]).toMatchObject({
      sites: [{ apiHost: 'api.a', tools: ['t'] }],
      inputs: { q: 'x' },
    });
    expect(client.importRun).toHaveBeenCalledWith(
      { request: 'r', status: 'done', best: { resultId: 'r1', reason: 'why' } },
      'firebase-token'
    );
  });
});

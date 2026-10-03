/**
 * Tests for the AI SDK polyfills.
 *
 * Removes each global, re-runs the polyfill module, and checks it was
 * installed and works for the streaming path the AI SDK uses.
 */

const NAMES = [
  'ReadableStream',
  'TransformStream',
  'WritableStream',
  'TextDecoder',
  'TextDecoderStream',
  'TextEncoderStream',
  'structuredClone',
] as const;

describe('AI SDK polyfills', () => {
  const g = globalThis as Record<string, unknown>;
  const originals: Record<string, unknown> = {};

  beforeEach(() => {
    for (const name of NAMES) {
      originals[name] = g[name];
      delete g[name];
    }
    jest.resetModules();
  });

  afterEach(() => {
    for (const name of NAMES) {
      if (originals[name] === undefined) {
        delete g[name];
      } else {
        g[name] = originals[name];
      }
    }
  });

  it('installs every missing global', () => {
    jest.isolateModules(() => {
      require('../aiSdk');
    });
    for (const name of NAMES) {
      expect(typeof g[name]).toBe('function');
    }
  });

  it('does not replace a global that already exists', () => {
    const existing = () => 'native';
    g.structuredClone = existing;
    jest.isolateModules(() => {
      require('../aiSdk');
    });
    expect(g.structuredClone).toBe(existing);
  });

  it('structuredClone deep-copies', () => {
    jest.isolateModules(() => {
      require('../aiSdk');
    });
    const clone = (g.structuredClone as (v: unknown) => any)({
      a: [1, { b: 2 }],
    });
    expect(clone).toEqual({ a: [1, { b: 2 }] });
  });

  it('decodes a UTF-8 byte stream through TextDecoderStream', async () => {
    jest.isolateModules(() => {
      require('../aiSdk');
    });
    const RS = g.ReadableStream as typeof ReadableStream;
    const TDS = g.TextDecoderStream as typeof TextDecoderStream;
    const bytes = new TextEncoder().encode('héllo wörld');
    const source = new RS<BufferSource>({
      start(controller) {
        controller.enqueue(bytes.slice(0, 3));
        controller.enqueue(bytes.slice(3));
        controller.close();
      },
    });
    const reader = source.pipeThrough(new TDS()).getReader();
    let text = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      text += value;
    }
    expect(text).toBe('héllo wörld');
  });
});

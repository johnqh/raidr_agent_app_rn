import type {
  CallData,
  FormField,
  PrepareResponse,
  SitePlan,
} from '@sudobility/raidr_agent_types';
import {
  buildRunSites,
  checkField,
  checkForm,
  initialDraft,
  initialDraftValue,
  isIsoDate,
  isIsoDateTime,
  isRunReady,
  sitesRequiringSignIn,
  sitesToRetryWithSignIn,
  supportedSites,
  unsupportedSites,
} from '../prepare';

function field(overrides: Partial<FormField>): FormField {
  return {
    name: 'keyword',
    label: 'Keyword',
    type: 'text',
    required: false,
    ...overrides,
  };
}

function plan(overrides: Partial<SitePlan>): SitePlan {
  return {
    apiHost: 'api.a',
    title: 'A',
    tools: ['search'],
    login: 'none',
    ...overrides,
  };
}

function call(overrides: Partial<CallData>): CallData {
  return {
    callId: 'c',
    apiHost: 'api.a',
    tool: 'search',
    arguments: {},
    status: 'error',
    ...overrides,
  };
}

const options = [
  { value: 'music', label: 'Music' },
  { value: 'tech', label: 'Tech' },
];

describe('date checks', () => {
  it('accepts real ISO dates only', () => {
    expect(isIsoDate('2026-10-08')).toBe(true);
    expect(isIsoDate('2026-02-30')).toBe(false);
    expect(isIsoDate('10/08/2026')).toBe(false);
  });

  it('accepts ISO date-times with optional seconds and zone', () => {
    expect(isIsoDateTime('2026-10-08T19:30')).toBe(true);
    expect(isIsoDateTime('2026-10-08 19:30:00-07:00')).toBe(true);
    expect(isIsoDateTime('2026-10-08T19:30:00.000Z')).toBe(true);
    expect(isIsoDateTime('2026-10-08T25:00')).toBe(false);
    expect(isIsoDateTime('2026-10-08')).toBe(false);
  });
});

describe('initialDraftValue', () => {
  it('prefills from the default, shaped per type', () => {
    expect(initialDraftValue(field({ default: 'jazz' }))).toBe('jazz');
    expect(initialDraftValue(field({ type: 'number', default: 2 }))).toBe('2');
    expect(initialDraftValue(field({ type: 'boolean' }))).toBe(false);
    expect(initialDraftValue(field({ type: 'boolean', default: true }))).toBe(
      true
    );
    expect(
      initialDraftValue(
        field({ type: 'date', default: '2026-10-10T19:00:00-07:00' })
      )
    ).toBe('2026-10-10');
    expect(
      initialDraftValue(field({ type: 'select', options, default: 'nope' }))
    ).toBe('');
    expect(
      initialDraftValue(
        field({ type: 'multiselect', options, default: ['tech', 'x'] })
      )
    ).toEqual(['tech']);
    expect(
      initialDraftValue(field({ type: 'multiselect', default: 'music' }))
    ).toEqual(['music']);
  });

  it('builds a draft for every field', () => {
    expect(
      initialDraft([field({ name: 'a' }), field({ name: 'b', default: 'x' })])
    ).toEqual({ a: '', b: 'x' });
  });
});

describe('checkField', () => {
  it('enforces required', () => {
    expect(checkField(field({ required: true }), '  ')).toEqual({
      error: 'required',
    });
    expect(checkField(field({}), '')).toEqual({});
    expect(
      checkField(field({ type: 'multiselect', required: true }), [])
    ).toEqual({ error: 'required' });
  });

  it('coerces numbers', () => {
    expect(checkField(field({ type: 'number' }), '2.5')).toEqual({
      value: 2.5,
    });
    expect(checkField(field({ type: 'number' }), 'two')).toEqual({
      error: 'number',
    });
  });

  it('validates dates and date-times', () => {
    expect(checkField(field({ type: 'date' }), '2026-10-08')).toEqual({
      value: '2026-10-08',
    });
    expect(checkField(field({ type: 'date' }), 'tomorrow')).toEqual({
      error: 'date',
    });
    expect(checkField(field({ type: 'datetime' }), '2026-10-08 19:30')).toEqual(
      { value: '2026-10-08T19:30' }
    );
    expect(checkField(field({ type: 'datetime' }), '19:30')).toEqual({
      error: 'datetime',
    });
  });

  it('checks options', () => {
    expect(checkField(field({ type: 'select', options }), 'tech')).toEqual({
      value: 'tech',
    });
    expect(checkField(field({ type: 'select', options }), 'x')).toEqual({
      error: 'option',
    });
    expect(
      checkField(field({ type: 'multiselect', options }), ['music'])
    ).toEqual({ value: ['music'] });
  });

  it('always has a boolean value', () => {
    expect(
      checkField(field({ type: 'boolean', required: true }), false)
    ).toEqual({ value: false });
  });
});

describe('checkForm', () => {
  it('collects inputs and errors', () => {
    const fields = [
      field({ name: 'keyword', required: true }),
      field({ name: 'party_size', type: 'number' }),
      field({ name: 'note' }),
    ];
    const ok = checkForm(fields, {
      keyword: 'jazz',
      party_size: '2',
      note: '',
    });
    expect(ok).toEqual({
      inputs: { keyword: 'jazz', party_size: 2 },
      errors: {},
      valid: true,
    });
    const bad = checkForm(fields, { keyword: '', party_size: 'x' });
    expect(bad.valid).toBe(false);
    expect(bad.errors).toEqual({ keyword: 'required', party_size: 'number' });
  });
});

describe('plan readiness', () => {
  const response: PrepareResponse = {
    sites: [
      plan({ apiHost: 'api.a', login: 'required' }),
      plan({ apiHost: 'api.b', login: 'fallback' }),
      plan({ apiHost: 'api.c', unsupported: 'No events here' }),
    ],
    form: [],
  };
  const valid = { inputs: {}, errors: {}, valid: true };

  it('splits supported and unsupported', () => {
    expect(supportedSites(response).map(s => s.apiHost)).toEqual([
      'api.a',
      'api.b',
    ]);
    expect(unsupportedSites(response).map(s => s.apiHost)).toEqual(['api.c']);
    expect(sitesRequiringSignIn(response).map(s => s.apiHost)).toEqual([
      'api.a',
    ]);
  });

  it('needs required sites signed in and a valid form', () => {
    expect(isRunReady(response, valid, new Set())).toBe(false);
    expect(isRunReady(response, valid, new Set(['api.a']))).toBe(true);
    expect(
      isRunReady(
        response,
        { ...valid, valid: false, errors: { a: 'required' } },
        new Set(['api.a'])
      )
    ).toBe(false);
  });

  it('is not ready with no supported site', () => {
    expect(
      isRunReady(
        { sites: [plan({ unsupported: 'no' })], form: [] },
        valid,
        new Set()
      )
    ).toBe(false);
  });
});

describe('buildRunSites', () => {
  it('sends tools, and tokens only to sites that sign in', () => {
    expect(
      buildRunSites(
        [
          plan({ apiHost: 'api.a', login: 'required' }),
          plan({ apiHost: 'api.b', login: 'none', tools: [] }),
          plan({ apiHost: 'api.c', login: 'fallback' }),
        ],
        { 'api.a': 'ta', 'api.b': 'tb', 'api.c': null }
      )
    ).toEqual([
      { apiHost: 'api.a', tools: ['search'], token: 'ta' },
      { apiHost: 'api.b' },
      { apiHost: 'api.c', tools: ['search'] },
    ]);
  });
});

describe('sitesToRetryWithSignIn', () => {
  const plans = [
    plan({ apiHost: 'api.a', login: 'fallback' }),
    plan({ apiHost: 'api.b', login: 'none' }),
    plan({ apiHost: 'api.c', login: 'fallback' }),
    plan({ apiHost: 'api.d', login: 'fallback' }),
  ];

  it('offers fallback sites whose calls all failed with 401/403', () => {
    const calls = [
      call({ callId: '1', apiHost: 'api.a', httpStatus: 401 }),
      call({ callId: '2', apiHost: 'api.a', httpStatus: 403 }),
      call({ callId: '3', apiHost: 'api.b', httpStatus: 401 }),
      call({ callId: '4', apiHost: 'api.c', httpStatus: 401 }),
      call({ callId: '5', apiHost: 'api.c', status: 'ok', httpStatus: 200 }),
      call({ callId: '6', apiHost: 'api.d', status: 'running' }),
    ];
    expect(sitesToRetryWithSignIn(plans, calls).map(p => p.apiHost)).toEqual([
      'api.a',
    ]);
  });
});

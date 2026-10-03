/**
 * Tests for the pure Sites-step helpers: grouping, checkbox gating and the
 * "Next" enabled rule.
 */

import type { CandidateSite } from '@sudobility/raidr_agent_types';
import { groupByLabel, needsSignIn, canSelect, isNextEnabled } from '../sites';

function site(overrides: Partial<CandidateSite>): CandidateSite {
  return {
    apiHost: 'api.example.com',
    title: 'Example',
    description: '',
    labels: ['recipes'],
    siteOrigins: ['https://example.com'],
    toolCount: 1,
    authStyle: 'none',
    ...overrides,
  };
}

describe('groupByLabel', () => {
  it('groups candidates by their first label, in first-seen order', () => {
    const groups = groupByLabel([
      site({ apiHost: 'a', labels: ['recipes'] }),
      site({ apiHost: 'b', labels: ['travel'] }),
      site({ apiHost: 'c', labels: ['recipes'] }),
    ]);
    expect(groups.map(g => g.label)).toEqual(['recipes', 'travel']);
    expect(groups[0].sites.map(s => s.apiHost)).toEqual(['a', 'c']);
  });
});

describe('needsSignIn', () => {
  it('is false only for authStyle "none"', () => {
    expect(needsSignIn(site({ authStyle: 'none' }))).toBe(false);
    expect(needsSignIn(site({ authStyle: 'bearer' }))).toBe(true);
    expect(needsSignIn(site({ authStyle: 'cookie' }))).toBe(true);
  });
});

describe('canSelect', () => {
  it('always allows a no-sign-in site', () => {
    expect(canSelect(site({ authStyle: 'none' }), new Set())).toBe(true);
  });

  it('blocks a sign-in site until its host is authorized', () => {
    const s = site({ apiHost: 'api.x', authStyle: 'bearer' });
    expect(canSelect(s, new Set())).toBe(false);
    expect(canSelect(s, new Set(['api.x']))).toBe(true);
  });
});

describe('isNextEnabled', () => {
  it('is disabled with nothing selected and enabled once one is', () => {
    expect(isNextEnabled(new Set())).toBe(false);
    expect(isNextEnabled(new Set(['api.x']))).toBe(true);
  });
});

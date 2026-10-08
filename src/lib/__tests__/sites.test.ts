/**
 * Tests for the pure Sites-step helpers: grouping and the selection rules per
 * selection mode.
 */

import type { CandidateSite } from '@sudobility/raidr_agent_types';
import {
  canAddMore,
  groupByLabel,
  initialSelection,
  isNextEnabled,
  isSingleSelection,
  MAX_SELECTED_SITES,
  nextSelection,
  selectedInOrder,
  siteDomain,
} from '../sites';

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

const hosts = (n: number) => Array.from({ length: n }, (_, i) => `h${i}`);

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

describe('nextSelection', () => {
  it('single: picking a site replaces the choice', () => {
    expect([...nextSelection('single', new Set(['a']), 'b')]).toEqual(['b']);
    expect([...nextSelection('single', new Set(['a']), 'a')]).toEqual(['a']);
  });

  it('best/all: toggles', () => {
    expect([...nextSelection('all', new Set(['a']), 'b')]).toEqual(['a', 'b']);
    expect([...nextSelection('best', new Set(['a', 'b']), 'a')]).toEqual(['b']);
  });

  it('best/all: never exceeds the cap', () => {
    const full = new Set(hosts(MAX_SELECTED_SITES));
    expect(nextSelection('all', full, 'extra').size).toBe(MAX_SELECTED_SITES);
    expect(canAddMore('all', full)).toBe(false);
    expect(canAddMore('single', full)).toBe(true);
  });
});

describe('isNextEnabled', () => {
  it('single needs exactly one', () => {
    expect(isNextEnabled('single', new Set())).toBe(false);
    expect(isNextEnabled('single', new Set(['a']))).toBe(true);
    expect(isNextEnabled('single', new Set(['a', 'b']))).toBe(false);
  });

  it('best/all need 1..8', () => {
    expect(isNextEnabled('all', new Set())).toBe(false);
    expect(isNextEnabled('best', new Set(['a', 'b']))).toBe(true);
    expect(isNextEnabled('all', new Set(hosts(9)))).toBe(false);
  });
});

describe('initialSelection / selectedInOrder', () => {
  const candidates = [site({ apiHost: 'a' }), site({ apiHost: 'b' })];

  it('preselects the top site for single and the top three otherwise', () => {
    const many = ['a', 'b', 'c', 'd'].map(apiHost => site({ apiHost }));
    expect([...initialSelection('single', many)]).toEqual(['a']);
    expect([...initialSelection('all', many)]).toEqual(['a', 'b', 'c']);
    expect([...initialSelection('best', candidates)]).toEqual(['a', 'b']);
    expect(initialSelection('single', []).size).toBe(0);
    expect(isSingleSelection('best')).toBe(false);
  });

  it('keeps candidate order', () => {
    expect(
      selectedInOrder(candidates, new Set(['b', 'a'])).map(s => s.apiHost)
    ).toEqual(['a', 'b']);
  });
});

describe('siteDomain', () => {
  it('uses the first site origin without www, else the API host', () => {
    expect(
      siteDomain({
        apiHost: 'api.humanitix.com',
        siteOrigins: [
          'https://www.humanitix.com',
          'https://events.humanitix.com',
        ],
      })
    ).toBe('humanitix.com');
    expect(siteDomain({ apiHost: 'www.vividseats.com', siteOrigins: [] })).toBe(
      'vividseats.com'
    );
    expect(
      siteDomain({ apiHost: 'localhost:8080', siteOrigins: ['nope'] })
    ).toBe('localhost');
  });
});

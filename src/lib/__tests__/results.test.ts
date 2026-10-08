import type { ResultItem } from '@sudobility/raidr_agent_types';
import { bestResult, replaceSiteResults, showsBest } from '../results';

function item(id: string, apiHost = 'api.a'): ResultItem {
  return {
    id,
    apiHost,
    siteTitle: 'A',
    title: id,
    summary: '',
    imageUrl: '',
    sourceUrl: '',
    pageUrl: '',
    recipe: null,
    fields: [],
  };
}

describe('showsBest', () => {
  it('is true for single and best', () => {
    expect(showsBest('single')).toBe(true);
    expect(showsBest('best')).toBe(true);
    expect(showsBest('all')).toBe(false);
    expect(showsBest(undefined)).toBe(false);
  });
});

describe('bestResult', () => {
  const results = [item('a'), item('b')];

  it('returns the picked result with its reason', () => {
    expect(bestResult(results, { resultId: 'b', reason: 'cheapest' })).toEqual({
      item: results[1],
      reason: 'cheapest',
    });
  });

  it('falls back to the first result', () => {
    expect(bestResult(results, null)).toEqual({ item: results[0], reason: '' });
    expect(bestResult(results, { resultId: 'zz', reason: 'x' })).toEqual({
      item: results[0],
      reason: '',
    });
    expect(bestResult([], null)).toBeNull();
  });
});

describe('replaceSiteResults', () => {
  it('swaps one site', () => {
    expect(
      replaceSiteResults([item('a1', 'api.a'), item('b1', 'api.b')], 'api.a', [
        item('a2', 'api.a'),
      ]).map(r => r.id)
    ).toEqual(['b1', 'a2']);
  });
});

import type { ResultItem } from '@sudobility/raidr_agent_types';
import {
  bestResult,
  copyDetail,
  copySites,
  displayItems,
  replaceSiteResults,
  showsBest,
} from '../results';

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

describe('displayItems', () => {
  const results = [
    item('a', 'api.a'),
    item('b', 'api.b'),
    item('c', 'api.c'),
    item('d', 'api.a'),
  ];

  it('shows each result alone when nothing is merged', () => {
    const rows = displayItems(results, undefined);
    expect(rows.map(r => r.key)).toEqual(['a', 'b', 'c', 'd']);
    expect(rows[0].copies).toEqual([{ item: results[0], note: '' }]);
  });

  it('shows a group once, at its first result, with copies in result order', () => {
    const rows = displayItems(results, [
      {
        members: [
          { resultId: 'c', note: '$90' },
          { resultId: 'b', note: '$85' },
        ],
      },
    ]);
    expect(rows.map(r => r.key)).toEqual(['a', 'group:b', 'd']);
    expect(rows[1].item).toBe(results[1]);
    expect(rows[1].copies).toEqual([
      { item: results[1], note: '$85' },
      { item: results[2], note: '$90' },
    ]);
    expect(copySites(rows[1].copies)).toEqual(['api.b', 'api.c']);
  });

  it('ignores unknown members, a result already grouped, and groups left with one copy', () => {
    const rows = displayItems(results, [
      {
        members: [
          { resultId: 'a', note: '' },
          { resultId: 'd', note: '' },
        ],
      },
      {
        members: [
          { resultId: 'd', note: '' },
          { resultId: 'ghost', note: '' },
        ],
      },
      {
        members: [
          { resultId: 'b', note: '' },
          { resultId: 'gone', note: '' },
        ],
      },
    ]);
    expect(rows.map(r => r.key)).toEqual(['group:a', 'b', 'c']);
    // One site twice is still one icon.
    expect(copySites(rows[0].copies)).toEqual(['api.a']);
  });
});

describe('copyDetail', () => {
  it('prefers the note, then a price-like field', () => {
    const priced = {
      ...item('a'),
      fields: [
        { label: 'Venue', value: 'Arena' },
        { label: 'Price', value: '$85' },
      ],
    };
    expect(copyDetail({ item: priced, note: '$85 · GA' })).toBe('$85 · GA');
    expect(copyDetail({ item: priced, note: '' })).toBe('Price: $85');
    expect(copyDetail({ item: item('b'), note: '' })).toBe('');
  });
});

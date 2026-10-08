import { clampDrag, indexFromDrag, moveItem, shiftForRow } from '../reorder';

describe('moveItem', () => {
  const list = ['a', 'b', 'c', 'd'];

  it('moves down and up', () => {
    expect(moveItem(list, 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(moveItem(list, 3, 1)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('returns an unchanged copy for no-op or out-of-range moves', () => {
    const same = moveItem(list, 1, 1);
    expect(same).toEqual(list);
    expect(same).not.toBe(list);
    expect(moveItem(list, -1, 2)).toEqual(list);
    expect(moveItem(list, 0, 4)).toEqual(list);
  });
});

describe('indexFromDrag', () => {
  const even = [50, 50, 50, 50];

  it('stays put for small moves', () => {
    expect(indexFromDrag(even, 1, 0)).toBe(1);
    expect(indexFromDrag(even, 1, 24)).toBe(1);
    expect(indexFromDrag(even, 1, -24)).toBe(1);
  });

  it('passes a neighbour after half its height', () => {
    expect(indexFromDrag(even, 1, 26)).toBe(2);
    expect(indexFromDrag(even, 1, 76)).toBe(3);
    expect(indexFromDrag(even, 2, -26)).toBe(1);
    expect(indexFromDrag(even, 2, -76)).toBe(0);
  });

  it('clamps at the ends', () => {
    expect(indexFromDrag(even, 0, 1000)).toBe(3);
    expect(indexFromDrag(even, 3, -1000)).toBe(0);
  });

  it('uses each row height (an expanded row is taller)', () => {
    const mixed = [50, 200, 50, 50];
    expect(indexFromDrag(mixed, 0, 90)).toBe(0);
    expect(indexFromDrag(mixed, 0, 110)).toBe(1);
    expect(indexFromDrag(mixed, 3, -26)).toBe(2);
    expect(indexFromDrag(mixed, 3, -140)).toBe(2);
    expect(indexFromDrag(mixed, 3, -160)).toBe(1);
  });
});

describe('shiftForRow', () => {
  it('opens a gap between from and to', () => {
    // Dragging row 0 (height 50) down to 2: rows 1 and 2 move up.
    expect([0, 1, 2, 3].map(i => shiftForRow(i, 0, 2, 50))).toEqual([
      0, -50, -50, 0,
    ]);
    // Dragging row 3 up to 1: rows 1 and 2 move down.
    expect([0, 1, 2, 3].map(i => shiftForRow(i, 3, 1, 50))).toEqual([
      0, 50, 50, 0,
    ]);
  });
});

describe('clampDrag', () => {
  it('keeps the row inside the list', () => {
    const h = [50, 60, 70];
    expect(clampDrag(h, 0, -10)).toBe(0);
    expect(clampDrag(h, 0, 500)).toBe(130);
    expect(clampDrag(h, 2, -500)).toBe(-110);
    expect(clampDrag(h, 1, 20)).toBe(20);
  });
});

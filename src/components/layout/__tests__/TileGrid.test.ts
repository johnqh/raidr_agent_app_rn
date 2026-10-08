/** TileGrid: a list below iOS's regular width, 2–4 columns above it. */
import { columnsFor } from '../TileGrid';

describe('columnsFor', () => {
  it('is one column (a list) when narrow', () => {
    expect(columnsFor(375)).toBe(1);
    expect(columnsFor(699)).toBe(1);
  });

  it('fits as many tiles as the width holds, between 2 and the max', () => {
    expect(columnsFor(700)).toBe(2);
    expect(columnsFor(1000)).toBe(3);
    expect(columnsFor(1400)).toBe(4);
    expect(columnsFor(3000)).toBe(4);
    expect(columnsFor(3000, 300, 12, 6)).toBe(6);
    expect(columnsFor(800, 260)).toBe(2);
    expect(columnsFor(1100, 260)).toBe(4);
  });
});

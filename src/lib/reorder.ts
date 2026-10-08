/**
 * Pure math for drag-to-reorder lists (no React).
 *
 * Rows may have different heights (a row can be expanded), so positions are
 * computed from the measured height of every row rather than a fixed row size.
 */

/** A copy of `list` with the item at `from` moved to index `to`. */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const result = list.slice();
  if (
    from < 0 ||
    from >= list.length ||
    to < 0 ||
    to >= list.length ||
    from === to
  ) {
    return result;
  }
  const [item] = result.splice(from, 1);
  result.splice(to, 0, item);
  return result;
}

/**
 * The index a dragged row lands on after moving `dy` pixels from index `from`.
 *
 * The row takes a neighbour's place once it has travelled more than half of
 * that neighbour's height (plus the full height of every row already
 * passed). `heights[i]` is the rendered height of row `i`.
 */
export function indexFromDrag(
  heights: readonly number[],
  from: number,
  dy: number
): number {
  if (from < 0 || from >= heights.length) {
    return from;
  }
  let index = from;
  if (dy > 0) {
    let travelled = 0;
    for (let j = from + 1; j < heights.length; j++) {
      if (dy > travelled + heights[j] / 2) {
        index = j;
        travelled += heights[j];
      } else {
        break;
      }
    }
  } else if (dy < 0) {
    let travelled = 0;
    for (let j = from - 1; j >= 0; j--) {
      if (-dy > travelled + heights[j] / 2) {
        index = j;
        travelled += heights[j];
      } else {
        break;
      }
    }
  }
  return index;
}

/**
 * How far row `index` should shift while the row at `from` is held over `to`:
 * rows between them move by the dragged row's height to open a gap.
 */
export function shiftForRow(
  index: number,
  from: number,
  to: number,
  draggedHeight: number
): number {
  if (index === from) {
    return 0;
  }
  if (from < to && index > from && index <= to) {
    return -draggedHeight;
  }
  if (from > to && index < from && index >= to) {
    return draggedHeight;
  }
  return 0;
}

/**
 * Clamp a drag offset so the row cannot be pulled past the ends of the list.
 */
export function clampDrag(
  heights: readonly number[],
  from: number,
  dy: number
): number {
  let above = 0;
  for (let j = 0; j < from; j++) {
    above += heights[j];
  }
  let below = 0;
  for (let j = from + 1; j < heights.length; j++) {
    below += heights[j];
  }
  const clamped = Math.max(-above, Math.min(below, dy));
  // Normalise -0 so callers can compare with 0 safely.
  return clamped === 0 ? 0 : clamped;
}

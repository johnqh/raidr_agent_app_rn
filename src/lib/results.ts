/**
 * Pure rules for showing a run's results by the intent's selection mode:
 * `single` / `best` show one best result (the `data-best` pick, or the only /
 * first result when no pick was made) with "See all N results"; `all` lists
 * everything, with the duplicates the `dedupe` step found shown once.
 */

import type {
  BestData,
  ResultGroup,
  ResultItem,
  SelectionMode,
} from '@sudobility/raidr_agent_types';

/** Whether the results open on one best result rather than the list. */
export function showsBest(mode: SelectionMode | undefined): boolean {
  return mode === 'single' || mode === 'best';
}

/**
 * The best result and why. `best` names a result by id; when it does not
 * match (or is absent) the first result stands in with no reason.
 */
export function bestResult(
  results: ResultItem[],
  best: BestData | null | undefined
): { item: ResultItem; reason: string } | null {
  if (results.length === 0) {
    return null;
  }
  const picked = best ? results.find(r => r.id === best.resultId) : undefined;
  return picked
    ? { item: picked, reason: best?.reason ?? '' }
    : { item: results[0], reason: '' };
}

/** Replace a site's results with a retry's (other sites keep theirs). */
export function replaceSiteResults(
  results: ResultItem[],
  apiHost: string,
  next: ResultItem[]
): ResultItem[] {
  return [...results.filter(r => r.apiHost !== apiHost), ...next];
}

/** One copy of a list item: a result, and what sets it apart from the others. */
export interface ResultCopy {
  item: ResultItem;
  note: string;
}

/** One row of the results list: the result it shows, and every copy of it. */
export interface DisplayItem {
  key: string;
  item: ResultItem;
  /** One for a result with no duplicate; two or more for a merged one. */
  copies: ResultCopy[];
}

/**
 * The results list with each group of duplicates as one row, at the position
 * of its first result. Copies keep the results' order; group members that are
 * not (or no longer) among the results are skipped, and a group left with
 * fewer than two copies falls apart into plain rows.
 */
export function displayItems(
  results: ResultItem[],
  groups: ResultGroup[] | null | undefined
): DisplayItem[] {
  const position = new Map(results.map((r, i) => [r.id, i]));
  const groupOf = new Map<string, ResultCopy[]>();
  for (const group of groups ?? []) {
    const copies = group.members
      .filter(m => position.has(m.resultId) && !groupOf.has(m.resultId))
      .map(m => ({ item: results[position.get(m.resultId)!], note: m.note }))
      .sort((a, b) => position.get(a.item.id)! - position.get(b.item.id)!);
    if (copies.length < 2) {
      continue;
    }
    for (const copy of copies) {
      groupOf.set(copy.item.id, copies);
    }
  }
  const out: DisplayItem[] = [];
  for (const item of results) {
    const copies = groupOf.get(item.id);
    if (!copies) {
      out.push({ key: item.id, item, copies: [{ item, note: '' }] });
    } else if (copies[0].item.id === item.id) {
      out.push({ key: `group:${item.id}`, item, copies });
    }
  }
  return out;
}

/** The distinct sites of a row's copies, in order. */
export function copySites(copies: ResultCopy[]): string[] {
  return [...new Set(copies.map(c => c.item.apiHost))];
}

/** Field labels that usually tell copies of one thing apart, most telling first. */
const TELLING_FIELDS = /price|cost|fee|rent|fare|total|ticket|section|seat/i;

/**
 * What sets a copy apart, for the sources list: the `dedupe` note, else its
 * first price-like field ("Price: $85"), else ''.
 */
export function copyDetail(copy: ResultCopy): string {
  if (copy.note) {
    return copy.note;
  }
  const field = copy.item.fields.find(f => TELLING_FIELDS.test(f.label));
  return field ? `${field.label}: ${field.value}` : '';
}

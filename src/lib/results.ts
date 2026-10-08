/**
 * Pure rules for showing a run's results by the intent's selection mode:
 * `single` / `best` show one best result (the `data-best` pick, or the only /
 * first result when no pick was made) with "See all N results"; `all` lists
 * everything.
 */

import type {
  BestData,
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

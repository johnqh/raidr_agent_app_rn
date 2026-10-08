/**
 * Pure helpers for the Sites step: grouping candidates by label, and the
 * selection rules that follow the intent's {@link SelectionMode}:
 *
 * - `single`: a radio list — exactly one site;
 * - `best` / `all`: checkboxes — at least one, at most {@link MAX_SELECTED_SITES}.
 *
 * Signing in is no longer decided here: the Prepare step works out which
 * chosen sites need it. Kept free of React, i18n and navigation imports so the
 * logic is unit-testable in isolation (the Jest config does not resolve
 * `@/assets/*`, so anything that reaches i18n cannot be imported from a test).
 */

import type {
  CandidateSite,
  SelectionMode,
} from '@sudobility/raidr_agent_types';

/** Most sites one run may call (the server's `POST /runs` cap). */
export const MAX_SELECTED_SITES = 8;

/** A set of candidates sharing a first label. */
export interface SiteGroup {
  label: string;
  sites: CandidateSite[];
}

/**
 * Group candidates by their first label, preserving the order in which labels
 * are first seen. Candidates with no label fall into an empty-string group.
 */
export function groupByLabel(candidates: CandidateSite[]): SiteGroup[] {
  const groups: SiteGroup[] = [];
  const byLabel = new Map<string, SiteGroup>();
  for (const site of candidates) {
    const label = site.labels[0] ?? '';
    let group = byLabel.get(label);
    if (!group) {
      group = { label, sites: [] };
      byLabel.set(label, group);
      groups.push(group);
    }
    group.sites.push(site);
  }
  return groups;
}

/** Whether the list is a radio list (`single`) rather than checkboxes. */
export function isSingleSelection(mode: SelectionMode): boolean {
  return mode === 'single';
}

/**
 * The selection after the user taps a site:
 * - `single`: that site alone (tapping the chosen one keeps it chosen);
 * - `best`/`all`: toggled, but never more than {@link MAX_SELECTED_SITES}.
 */
export function nextSelection(
  mode: SelectionMode,
  selected: ReadonlySet<string>,
  apiHost: string
): Set<string> {
  if (isSingleSelection(mode)) {
    return new Set([apiHost]);
  }
  const next = new Set(selected);
  if (next.has(apiHost)) {
    next.delete(apiHost);
  } else if (next.size < MAX_SELECTED_SITES) {
    next.add(apiHost);
  }
  return next;
}

/** Whether a not-yet-chosen checkbox can still be ticked (cap not reached). */
export function canAddMore(
  mode: SelectionMode,
  selected: ReadonlySet<string>
): boolean {
  return isSingleSelection(mode) || selected.size < MAX_SELECTED_SITES;
}

/** The selection the Sites step opens with: the top-ranked site for `single`, none otherwise. */
export function initialSelection(
  mode: SelectionMode,
  candidates: CandidateSite[]
): Set<string> {
  return isSingleSelection(mode) && candidates[0]
    ? new Set([candidates[0].apiHost])
    : new Set();
}

/** "Next" is enabled for exactly one site (`single`) or 1–8 sites (`best`/`all`). */
export function isNextEnabled(
  mode: SelectionMode,
  selected: ReadonlySet<string>
): boolean {
  return isSingleSelection(mode)
    ? selected.size === 1
    : selected.size > 0 && selected.size <= MAX_SELECTED_SITES;
}

/** The chosen sites in candidate (ranked) order. */
export function selectedInOrder(
  candidates: CandidateSite[],
  selected: ReadonlySet<string>
): CandidateSite[] {
  return candidates.filter(c => selected.has(c.apiHost));
}

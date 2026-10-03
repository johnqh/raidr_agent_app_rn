/**
 * Pure helpers for the Sites step: grouping candidates by label, and the rules
 * that drive the per-row checkbox and the "Next" button.
 *
 * Kept free of React, i18n and navigation imports so the logic is unit-testable
 * in isolation (the Jest config does not resolve `@/assets/*`, so anything that
 * reaches i18n cannot be imported from a test).
 */

import type { CandidateSite } from '@sudobility/raidr_agent_types';

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

/** A site needs sign-in when its auth style is anything other than `none`. */
export function needsSignIn(site: CandidateSite): boolean {
  return site.authStyle !== 'none';
}

/**
 * Whether a site's checkbox may be toggled: sites that need no sign-in are
 * always selectable; sites that do become selectable once a token is stored
 * (their `apiHost` is in the `authorized` set).
 */
export function canSelect(
  site: CandidateSite,
  authorized: ReadonlySet<string>
): boolean {
  return !needsSignIn(site) || authorized.has(site.apiHost);
}

/** "Next" is enabled once at least one site is selected. */
export function isNextEnabled(selected: ReadonlySet<string>): boolean {
  return selected.size > 0;
}

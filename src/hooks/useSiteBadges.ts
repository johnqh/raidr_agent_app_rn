/**
 * The domain and icon of each site a run's results came from.
 *
 * Seeded from the run's candidates (the Sites step already has `iconUrl`
 * and `siteOrigins`), and otherwise loaded once per site from
 * `GET /sites/:apiHost/icon` and cached for a day — so History, where no
 * candidates are at hand, shows the same icons.
 */

import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { QUERY_KEYS } from '@sudobility/raidr_agent_client';
import type {
  CandidateSite,
  SiteIconResponse,
} from '@sudobility/raidr_agent_types';
import { useAgentClient } from '@/hooks/useAgentClient';
import { useAuth } from '@/context/AuthContext';
import { useRunFlowStore } from '@/stores/runFlowStore';
import { siteDomain } from '@/lib/sites';

export interface SiteBadge {
  apiHost: string;
  domain: string;
  iconUrl?: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** What the candidates already say about a site, if it was one of them. */
function fromCandidate(
  candidate: CandidateSite | undefined
): SiteIconResponse | undefined {
  return candidate?.iconUrl
    ? { domain: siteDomain(candidate), iconUrl: candidate.iconUrl }
    : undefined;
}

export function useSiteBadges(apiHosts: string[]): Record<string, SiteBadge> {
  const client = useAgentClient();
  const { getToken } = useAuth();
  const candidates = useRunFlowStore(s => s.candidates);
  const byHost = useMemo(
    () => new Map(candidates.map(c => [c.apiHost, c])),
    [candidates]
  );

  const queries = useQueries({
    queries: apiHosts.map(apiHost => {
      const seeded = fromCandidate(byHost.get(apiHost));
      return {
        queryKey: QUERY_KEYS.siteIcon(apiHost),
        queryFn: async (): Promise<SiteIconResponse> => {
          const response = await client.getSiteIcon(
            apiHost,
            (await getToken()) ?? ''
          );
          if (!response.success || !response.data) {
            throw new Error(response.error || 'Could not load the site icon');
          }
          return response.data;
        },
        ...(seeded ? { initialData: seeded } : {}),
        staleTime: DAY_MS,
        gcTime: DAY_MS,
        retry: 1,
      };
    }),
  });

  return useMemo(() => {
    const out: Record<string, SiteBadge> = {};
    apiHosts.forEach((apiHost, i) => {
      const data = queries[i]?.data;
      const candidate = byHost.get(apiHost);
      out[apiHost] = {
        apiHost,
        domain:
          data?.domain ??
          (candidate
            ? siteDomain(candidate)
            : siteDomain({ apiHost, siteOrigins: [] })),
        ...(data?.iconUrl ? { iconUrl: data.iconUrl } : {}),
      };
    });
    return out;
  }, [apiHosts, queries, byHost]);
}

/**
 * Sites whose domain contains what was typed, and that have a sign-in
 * (`GET /sites/search`). The text is debounced, and nothing is asked for
 * below {@link MIN_SITE_SEARCH_LENGTH} characters.
 */

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@sudobility/raidr_agent_client';
import type { SiteSearchHit } from '@sudobility/raidr_agent_types';
import { useAgentClient } from '@/hooks/useAgentClient';
import { useAuth } from '@/context/AuthContext';

/** The server answers nothing shorter. */
export const MIN_SITE_SEARCH_LENGTH = 2;
export const SITE_SEARCH_DEBOUNCE_MS = 300;

/** `value`, once it has stopped changing for `ms`. */
export function useDebounced<T>(value: T, ms: number): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return settled;
}

export interface SiteSearch {
  /** The query the results are for (trimmed, debounced). */
  query: string;
  /** False while the query is too short to search. */
  enabled: boolean;
  hits: SiteSearchHit[];
  isLoading: boolean;
  isError: boolean;
}

export function useSiteSearch(text: string): SiteSearch {
  const client = useAgentClient();
  const { getToken } = useAuth();
  const query = useDebounced(text.trim(), SITE_SEARCH_DEBOUNCE_MS);
  const enabled = query.length >= MIN_SITE_SEARCH_LENGTH;
  const result = useQuery({
    queryKey: QUERY_KEYS.siteSearch(query),
    queryFn: async (): Promise<SiteSearchHit[]> => {
      const response = await client.searchSites(
        query,
        (await getToken()) ?? ''
      );
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Could not search sites');
      }
      return response.data;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
  return {
    query,
    enabled,
    hits: enabled ? result.data ?? [] : [],
    // Typing ahead of the debounce counts as loading, so "No sites" never
    // flashes for a query that has not been asked yet.
    isLoading: enabled && (result.isLoading || query !== text.trim()),
    isError: enabled && result.isError,
  };
}

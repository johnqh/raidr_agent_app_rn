/**
 * Builds the {@link RaidrAgentClient} from the app's network client + base URL.
 *
 * The client is memoised so its identity is stable across re-renders (the query
 * hooks and the run reader take it as an argument).
 */

import { useMemo } from 'react';
import { RaidrAgentClient } from '@sudobility/raidr_agent_client';
import { useApi } from '@/context/ApiContext';

/** The memoised raidr agent API client for the current session. */
export function useAgentClient(): RaidrAgentClient {
  const { networkClient, baseUrl } = useApi();
  return useMemo(
    () => new RaidrAgentClient({ baseUrl, networkClient }),
    [baseUrl, networkClient]
  );
}

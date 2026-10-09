/**
 * The agent email's unread inbox, for the email UI to come. Reads through
 * `agentEmailService` (which signs in once); disabled when no agent email is
 * set up. Keyed on the current address so switching email refetches.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { SignicEmail } from '@sudobility/signic_sdk';
import { listAgentEmails } from '@/lib/agentEmailService';
import { useAgentEmailStore } from '@/stores/agentEmailStore';

export const AGENT_INBOX_KEY = ['raidr-agent', 'inbox'] as const;

export function useAgentInbox(limit = 50): UseQueryResult<SignicEmail[]> {
  const emailAddress = useAgentEmailStore(s => s.emailAddress);
  return useQuery({
    queryKey: [...AGENT_INBOX_KEY, emailAddress, limit],
    queryFn: () => listAgentEmails(limit),
    enabled: emailAddress !== null,
    staleTime: 30 * 1000,
  });
}

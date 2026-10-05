/**
 * Transient state for one pass through the Ask → Sites → Results flow.
 *
 * The classified intent and its candidate sites are too heavy to thread through
 * navigation params (and React Navigation warns about non-serialisable params),
 * so the Ask step stashes them here and the later steps read them back. This is
 * in-memory only and is cleared when a new request is classified.
 */

import { create } from 'zustand';
import type { AgentIntent, CandidateSite } from '@sudobility/raidr_agent_types';

export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

/** Shape of the run-flow Zustand store. */
interface RunFlowState {
  /** The raw request the user typed. */
  request: string;
  /** The classified intent, or `null` before classification. */
  intent: AgentIntent | null;
  /** Candidate sites for the intent. */
  candidates: CandidateSite[];
  location: Coordinates | null;
  /** Record a freshly classified request and its candidates. */
  setFlow: (
    request: string,
    intent: AgentIntent,
    candidates: CandidateSite[],
    location: Coordinates | null
  ) => void;
  /** Clear the flow back to its empty defaults. */
  clear: () => void;
}

const initialState = {
  request: '',
  intent: null as AgentIntent | null,
  candidates: [] as CandidateSite[],
  location: null as Coordinates | null,
};

/** Zustand store hook for the current run flow. */
export const useRunFlowStore = create<RunFlowState>(set => ({
  ...initialState,
  setFlow: (request, intent, candidates, location) =>
    set({ request, intent, candidates, location }),
  clear: () => set(initialState),
}));

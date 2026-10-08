/**
 * Transient state for one pass through the Ask → Sites → Prepare → Results flow.
 *
 * The understood intent, its candidate sites, the prepared plan and the form
 * answers are too heavy to thread through navigation params (and React
 * Navigation warns about non-serialisable params), so each step stashes them
 * here and the later steps read them back. This is in-memory only and is
 * cleared when a new request is understood.
 */

import { create } from 'zustand';
import type {
  AgentIntent,
  CandidateSite,
  FormValue,
  PrepareResponse,
} from '@sudobility/raidr_agent_types';

export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

/** Shape of the run-flow Zustand store. */
interface RunFlowState {
  /** The raw request the user typed. */
  request: string;
  /** The understood intent, or `null` before the Ask step. */
  intent: AgentIntent | null;
  /** Candidate sites for the intent, best first. */
  candidates: CandidateSite[];
  location: Coordinates | null;
  /** The Prepare step's per-site plans and merged form, or `null` before it. */
  plan: PrepareResponse | null;
  /** The form answers the run sends (`RunRequest.inputs`). */
  inputs: Record<string, FormValue>;
  /** Record a freshly understood request and its candidates (clears the plan). */
  setFlow: (
    request: string,
    intent: AgentIntent,
    candidates: CandidateSite[],
    location: Coordinates | null
  ) => void;
  /** Record the device position (the location permission screen). */
  setLocation: (location: Coordinates | null) => void;
  /** Record the Prepare step's plan (clears earlier inputs). */
  setPlan: (plan: PrepareResponse | null) => void;
  /** Record the form answers for the run. */
  setInputs: (inputs: Record<string, FormValue>) => void;
  /** Clear the flow back to its empty defaults. */
  clear: () => void;
}

const initialState = {
  request: '',
  intent: null as AgentIntent | null,
  candidates: [] as CandidateSite[],
  location: null as Coordinates | null,
  plan: null as PrepareResponse | null,
  inputs: {} as Record<string, FormValue>,
};

/** Zustand store hook for the current run flow. */
export const useRunFlowStore = create<RunFlowState>(set => ({
  ...initialState,
  setFlow: (request, intent, candidates, location) =>
    set({ request, intent, candidates, location, plan: null, inputs: {} }),
  setLocation: location => set({ location }),
  setPlan: plan => set({ plan, inputs: {} }),
  setInputs: inputs => set({ inputs }),
  clear: () => set(initialState),
}));

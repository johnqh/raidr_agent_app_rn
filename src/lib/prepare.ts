/**
 * Pure rules for the Prepare step and the run it starts: the form the model
 * asked for (initial values, validation, coercion to {@link FormValue}s), which
 * sites must be signed in, when Run is enabled, the run's site list, and which
 * `fallback` sites to offer "Sign in and retry" for after a run.
 *
 * No React, i18n or navigation imports, so it is unit-testable on its own.
 */

import type {
  CallData,
  FormField,
  FormValue,
  PrepareResponse,
  RunSiteSelection,
  SitePlan,
} from '@sudobility/raidr_agent_types';

/**
 * What the form holds while the user edits it. Text-like fields (text,
 * number, date, datetime, select) are strings so partial input such as `1.`
 * survives; booleans are booleans; multiselects are string arrays.
 */
export type DraftValue = string | boolean | string[];
export type FormDraft = Record<string, DraftValue>;

/** Why a field is not valid; the screen maps it to a message. */
export type FieldError = 'required' | 'number' | 'date' | 'datetime' | 'option';

export interface FormCheck {
  /** Coerced values of every filled, valid field — the run's `inputs`. */
  inputs: Record<string, FormValue>;
  errors: Record<string, FieldError>;
  valid: boolean;
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATETIME_RE =
  /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/;
const NUMBER_RE = /^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/;

/** A real calendar date (rejects `2026-02-30`). */
function isRealDate(y: number, m: number, d: number): boolean {
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

/** `YYYY-MM-DD`, valid on the calendar. */
export function isIsoDate(value: string): boolean {
  const m = DATE_RE.exec(value);
  return !!m && isRealDate(Number(m[1]), Number(m[2]), Number(m[3]));
}

/** `YYYY-MM-DDTHH:mm[:ss][zone]` (a space instead of `T` is accepted). */
export function isIsoDateTime(value: string): boolean {
  const m = DATETIME_RE.exec(value);
  return (
    !!m &&
    isRealDate(Number(m[1]), Number(m[2]), Number(m[3])) &&
    Number(m[4]) < 24 &&
    Number(m[5]) < 60 &&
    (m[6] === undefined || Number(m[6]) < 60)
  );
}

function optionValues(field: FormField): Set<string> | null {
  return field.options && field.options.length > 0
    ? new Set(field.options.map(o => o.value))
    : null;
}

/** The draft value a field starts with: its `default`, shaped for its type. */
export function initialDraftValue(field: FormField): DraftValue {
  const value = field.default;
  switch (field.type) {
    case 'boolean':
      return typeof value === 'boolean'
        ? value
        : value === 'true' || value === 1;
    case 'multiselect': {
      const list = Array.isArray(value)
        ? value
        : typeof value === 'string' && value
        ? [value]
        : [];
      const allowed = optionValues(field);
      return allowed ? list.filter(v => allowed.has(v)) : list;
    }
    case 'date': {
      // A date-time default (from the intent's `when`) keeps its date part.
      const text = value == null || Array.isArray(value) ? '' : String(value);
      const datePart = text.slice(0, 10);
      return isIsoDate(datePart) ? datePart : text;
    }
    case 'select': {
      const text = value == null || Array.isArray(value) ? '' : String(value);
      const allowed = optionValues(field);
      return !allowed || allowed.has(text) ? text : '';
    }
    default:
      if (value == null) {
        return '';
      }
      return Array.isArray(value) ? value.join(', ') : String(value);
  }
}

/** Every field's starting draft value, keyed by name. */
export function initialDraft(fields: FormField[]): FormDraft {
  const draft: FormDraft = {};
  for (const field of fields) {
    draft[field.name] = initialDraftValue(field);
  }
  return draft;
}

/**
 * Check one field. Returns the coerced value (absent when the field is empty)
 * or why it is invalid.
 */
export function checkField(
  field: FormField,
  draft: DraftValue | undefined
): { value?: FormValue; error?: FieldError } {
  if (field.type === 'boolean') {
    return { value: draft === true };
  }
  if (field.type === 'multiselect') {
    const list = Array.isArray(draft) ? draft : [];
    const allowed = optionValues(field);
    if (allowed && list.some(v => !allowed.has(v))) {
      return { error: 'option' };
    }
    if (list.length === 0) {
      return field.required ? { error: 'required' } : {};
    }
    return { value: list };
  }

  const text = typeof draft === 'string' ? draft.trim() : '';
  if (!text) {
    return field.required ? { error: 'required' } : {};
  }
  switch (field.type) {
    case 'number':
      return NUMBER_RE.test(text) && Number.isFinite(Number(text))
        ? { value: Number(text) }
        : { error: 'number' };
    case 'date':
      return isIsoDate(text) ? { value: text } : { error: 'date' };
    case 'datetime':
      return isIsoDateTime(text)
        ? { value: text.replace(' ', 'T') }
        : { error: 'datetime' };
    case 'select': {
      const allowed = optionValues(field);
      return !allowed || allowed.has(text)
        ? { value: text }
        : { error: 'option' };
    }
    default:
      return { value: text };
  }
}

/** Check the whole form. */
export function checkForm(fields: FormField[], draft: FormDraft): FormCheck {
  const inputs: Record<string, FormValue> = {};
  const errors: Record<string, FieldError> = {};
  for (const field of fields) {
    const { value, error } = checkField(field, draft[field.name]);
    if (error) {
      errors[field.name] = error;
    } else if (value !== undefined) {
      inputs[field.name] = value;
    }
  }
  return { inputs, errors, valid: Object.keys(errors).length === 0 };
}

/** Sites the run calls: every plan that is not `unsupported`. */
export function supportedSites(plan: PrepareResponse): SitePlan[] {
  return plan.sites.filter(s => !s.unsupported);
}

/** Sites the prepare step dropped, with the reason. */
export function unsupportedSites(plan: PrepareResponse): SitePlan[] {
  return plan.sites.filter(s => !!s.unsupported);
}

/** Supported sites that must be signed in before Run. */
export function sitesRequiringSignIn(plan: PrepareResponse): SitePlan[] {
  return supportedSites(plan).filter(s => s.login === 'required');
}

/** Supported sites that run without asking for sign-in, using a stored token when there is one. */
export function fallbackSites(plan: PrepareResponse): SitePlan[] {
  return supportedSites(plan).filter(s => s.login === 'fallback');
}

/**
 * Run is enabled when the form is valid, at least one site is left, and every
 * `required` site has a stored token (`authorized`).
 */
export function isRunReady(
  plan: PrepareResponse,
  form: FormCheck,
  authorized: ReadonlySet<string>
): boolean {
  return (
    form.valid &&
    supportedSites(plan).length > 0 &&
    sitesRequiringSignIn(plan).every(s => authorized.has(s.apiHost))
  );
}

/**
 * The run's site list. A stored token goes with a site whose login is
 * `required` or `fallback` (signed in, a fallback site just gets more); a
 * `none` site never gets one.
 */
export function buildRunSites(
  plans: SitePlan[],
  tokens: Readonly<Record<string, string | null | undefined>>
): RunSiteSelection[] {
  return plans.map(plan => {
    const token = plan.login === 'none' ? null : tokens[plan.apiHost];
    return {
      apiHost: plan.apiHost,
      ...(plan.tools.length > 0 ? { tools: plan.tools } : {}),
      ...(token ? { token } : {}),
    };
  });
}

/** Whether an HTTP status means "not signed in / not allowed". */
export function isAuthFailure(status: number | undefined): boolean {
  return status === 401 || status === 403;
}

/**
 * `fallback` sites to offer "Sign in and retry" for: every finished call to
 * the site failed with 401 or 403 (and there was at least one).
 */
export function sitesToRetryWithSignIn(
  plans: SitePlan[],
  calls: CallData[]
): SitePlan[] {
  return plans.filter(plan => {
    if (plan.login !== 'fallback') {
      return false;
    }
    const finished = calls.filter(
      c => c.apiHost === plan.apiHost && c.status !== 'running'
    );
    return (
      finished.length > 0 && finished.every(c => isAuthFailure(c.httpStatus))
    );
  });
}

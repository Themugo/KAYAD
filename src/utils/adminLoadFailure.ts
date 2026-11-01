// Shared, truthful interpretation of a failed Super Admin data request.
//
// A failed read must never be shown as an empty queue or a confirmed zero. Every admin screen uses this module so that
// "maintenance", "not allowed", "server error" and "network" are told apart from the REAL response, never guessed, and
// so that the wording is the same on all screens. Only curated text is returned: raw server messages, stack traces and
// internal detail are deliberately not echoed to the operator.

export type AdminFailureKind =
  | 'maintenance'
  | 'maintenance_policy'
  | 'session'
  | 'forbidden'
  | 'missing'
  | 'rate_limited'
  | 'server'
  | 'timeout'
  | 'network'
  | 'invalid';

export interface AdminFailure {
  kind: AdminFailureKind;
  status: number | null;
  code: string | null;
  /** True when retrying later can reasonably succeed without the operator changing anything. */
  retryable: boolean;
  /** Short operator-facing reason (no subject). */
  reason: string;
}

type ErrLike = {
  response?: { status?: number; data?: { code?: unknown; message?: unknown; maintenance?: unknown } };
  code?: unknown;
  message?: unknown;
  kayadInvalidResponse?: boolean;
} | null | undefined;

const REASONS: Record<AdminFailureKind, string> = {
  maintenance:
    'Platform maintenance is active and the server is refusing admin data requests (HTTP 503). Nothing is wrong with your account. ' +
    'Data cannot be loaded until the maintenance scope is changed or ended; a System Owner can review it in the Panic Room.',
  maintenance_policy:
    'The server could not confirm who is allowed through the current maintenance policy (HTTP 503) and refused the request to be safe. Retry shortly.',
  session: 'Your session was not accepted (HTTP 401). Sign in again.',
  forbidden: 'Your account is not permitted to read this data (HTTP 403).',
  missing: 'The API route or table was not found (HTTP 404). A backend or schema deployment may be missing.',
  rate_limited: 'Too many requests (HTTP 429). Wait a moment and retry.',
  server: 'The server returned an error (HTTP 5xx). Check the backend and database logs.',
  timeout: 'The request timed out. Retry; check backend latency if it persists.',
  network: 'The browser could not reach the API. Check connectivity and that the backend is running.',
  invalid: 'The server answered with data in an unexpected format.',
};

export function classifyAdminFailure(error: unknown): AdminFailure {
  const e = error as ErrLike;
  const status = typeof e?.response?.status === 'number' ? e.response.status : null;
  const data = e?.response?.data;
  const code = typeof data?.code === 'string' ? data.code : null;
  const message = typeof data?.message === 'string' ? data.message : '';

  const make = (kind: AdminFailureKind, retryable: boolean): AdminFailure => ({ kind, status, code, retryable, reason: REASONS[kind] });

  if (status === 503) {
    if (code === 'MAINTENANCE_POLICY_UNAVAILABLE') return make('maintenance_policy', true);
    if (code === 'SYSTEM_MAINTENANCE' || data?.maintenance === true || /maintenance/i.test(message)) return make('maintenance', false);
    return make('server', true);
  }
  if (status === 401) return make('session', false);
  if (status === 403) return make('forbidden', false);
  if (status === 404) return make('missing', false);
  if (status === 429) return make('rate_limited', true);
  if (status !== null) return make('server', status >= 500);
  if (e?.kayadInvalidResponse) return make('invalid', true);
  if (e?.code === 'ECONNABORTED' || /timeout/i.test(String(e?.message ?? ''))) return make('timeout', true);
  if (e?.response) return make('server', true);
  // Errors thrown by our own response-shape guards (no `response`) are contract failures, not connectivity failures.
  if (e instanceof Error && !('code' in e) && /unexpected|invalid|malformed/i.test(e.message)) return make('invalid', true);
  return make('network', true);
}

/** One sentence for a screen: "<Subject> could not be loaded. <reason>" */
export function describeAdminFailure(error: unknown, subject: string): string {
  return `${subject} could not be loaded. ${classifyAdminFailure(error).reason}`;
}

export function formatLastRefresh(at: Date | number | string | null | undefined): string | null {
  if (at === null || at === undefined) return null;
  const d = at instanceof Date ? at : new Date(at);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleTimeString();
}

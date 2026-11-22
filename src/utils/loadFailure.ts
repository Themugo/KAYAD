// Classifies a failed load/save so each panel can show a state the person can act on, instead of one generic "try again":
//   denied      403  - retrying will not help; ask the owner / use the right account
//   expired     401  - sign in again; retrying will not help
//   offline     browser offline or a network-level failure (no HTTP response) - retry when the connection is back
//   unavailable 5xx/429/timeout - temporary; retry
//   error       anything else - generic, retry
export type LoadFailureKind = 'denied' | 'expired' | 'offline' | 'unavailable' | 'error';
export interface LoadFailure { kind: LoadFailureKind; status: number | null; message: string; retryable: boolean }

const statusOf = (err: unknown): number | null => {
  const e = err as { status?: unknown; response?: { status?: unknown } } | null;
  const s = e?.response?.status ?? e?.status;
  return typeof s === 'number' ? s : null;
};

export function classifyLoadFailure(err: unknown, noun: string): LoadFailure {
  const status = statusOf(err);
  const e = err as { code?: string; message?: string; response?: unknown } | null;
  const browserOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
  if (status === 403) return { kind: 'denied', status, retryable: false, message: `You do not have permission to view your ${noun}. Ask the dealership owner for access.` };
  if (status === 401) return { kind: 'expired', status, retryable: false, message: 'Your session has expired. Please sign in again.' };
  if (browserOffline || (status === null && (e?.code === 'ERR_NETWORK' || e?.code === 'ECONNABORTED' || /network error|failed to fetch/i.test(String(e?.message || ''))))) {
    return { kind: 'offline', status, retryable: true, message: `You appear to be offline, so your ${noun} could not be loaded. Check your connection and try again.` };
  }
  if (status !== null && (status >= 500 || status === 429 || status === 408)) return { kind: 'unavailable', status, retryable: true, message: `Your ${noun} are temporarily unavailable. Please try again in a moment.` };
  return { kind: 'error', status, retryable: true, message: `Could not load your ${noun}. Please try again.` };
}

// Shared, truthful handling of the dealer approval decision in the admin screens.
//
// The server decides (reason required, application must be complete, acting account must be a database administrator). These helpers only
// translate its answer: the server's own message and code are shown, never a generic "failed", and the screen never assumes success.

export const DEALER_REASON_MIN = 8;

export interface DealerApplicationSummary {
  blockers: { code: string; message: string }[];
  warnings?: string[];
  alreadyApproved?: boolean;
}

type ErrLike = { response?: { status?: number; data?: { code?: unknown; message?: unknown; blockers?: unknown } }; message?: unknown } | null | undefined;

export const isReasonValid = (reason: string) => reason.trim().length >= DEALER_REASON_MIN;

/** Server message plus `[HTTP status · code]` so a refusal can be identified exactly. */
export function describeDealerDecisionError(error: unknown, fallback: string): string {
  const e = error as ErrLike;
  const status = e?.response?.status;
  const data = e?.response?.data;
  const code = typeof data?.code === 'string' ? data.code : null;
  const message = typeof data?.message === 'string' && data.message.trim() ? data.message.trim() : null;
  const tag = status ? ` [HTTP ${status}${code ? ` · ${code}` : ''}]` : '';
  return `${message ?? fallback}${tag}`;
}

/**
 * Can Approve be offered for this row?
 *  - `unknown`: the application could not be inspected by the server (null/undefined); the attempt is allowed and the server validates.
 *  - `blocked`: the server listed what is missing; Approve is withheld and the reasons are shown.
 */
export function approvalEligibility(application: DealerApplicationSummary | null | undefined): { state: 'ready' | 'blocked' | 'unknown'; reasons: string[] } {
  if (application === null || application === undefined) return { state: 'unknown', reasons: [] };
  const reasons = (application.blockers || []).map((b) => b.message);
  return reasons.length ? { state: 'blocked', reasons } : { state: 'ready', reasons: [] };
}

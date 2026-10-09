import { request, HttpRequestError } from '../api/httpRequest';

// ---- Customer projection (what the backend returns to the case owner; never contains staff data) ----
export interface SupportReference { kind: SupportReferenceKind; id: string }
export type SupportReferenceKind = 'vehicle' | 'escrow' | 'payment' | 'inspection' | 'auction';

export interface SupportMessage {
  id: string | null;
  from: 'you' | 'support';
  content: string;
  createdAt: string | null;
}

export interface SupportCaseSummary {
  id: string;
  ticketNumber: string;
  category: string;
  subject: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  rated: boolean;
  messageCount: number;
}

export interface SupportCase extends SupportCaseSummary {
  description: string;
  references: SupportReference[];
  messages: SupportMessage[];
  rating: number | null;
  ratingComment: string | null;
  canReply: boolean;
  canRate: boolean;
  /** Configured reopen window (days) after which a resolved case can no longer be reopened by replying. */
  reopenWindowDays?: number;
  /** Present only when operations configured targets; null means KAYAD makes no timing promise. */
  expectations: { firstResponseMinutes: number | null; resolutionMinutes: number | null };
}

export interface SupportCategory { value: string; label: string; reference: SupportReferenceKind | null }
export interface SupportConfig { categories: SupportCategory[]; reopenWindowDays: number; attachments: boolean }

export interface CreateCasePayload {
  category: string;
  subject: string;
  description: string;
  reference?: SupportReference;
  /** One per form submission; makes retries safe (no duplicate cases). */
  idempotencyKey: string;
}

export type SupportApiErrorKind = 'network' | 'unauthenticated' | 'forbidden' | 'not_found' | 'conflict' | 'validation' | 'rate_limited' | 'server' | 'unknown';

export class SupportApiError extends Error {
  kind: SupportApiErrorKind;
  status?: number;
  code?: string;
  constructor(message: string, kind: SupportApiErrorKind, status?: number, code?: string) {
    super(message);
    this.kind = kind;
    this.status = status;
    this.code = code;
  }
}

export function newIdempotencyKey(): string {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c?.randomUUID) return `sup-${c.randomUUID()}`;
  return `sup-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

async function supportFetch<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  try {
    return await request<T>(path, {
      method: options.method,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch (err) {
    const e = err instanceof HttpRequestError ? err : new HttpRequestError('Request failed.');
    const s = e.status;
    const kind: SupportApiErrorKind = !s ? 'network'
      : s === 401 ? 'unauthenticated'
      : s === 403 ? 'forbidden'
      : s === 404 ? 'not_found'
      : s === 409 ? 'conflict'
      : s === 429 ? 'rate_limited'
      : s >= 500 ? 'server'
      : s >= 400 ? 'validation'
      : 'unknown';
    throw new SupportApiError(e.message, kind, s, (e as { code?: string }).code);
  }
}

export const getSupportConfig = () => supportFetch<{ success: boolean } & SupportConfig>('/api/support/config');

export const createSupportCase = (payload: CreateCasePayload) =>
  supportFetch<{ success: boolean; case: SupportCase; referenceLinked: boolean | null; deduplicated: boolean }>('/api/support', { method: 'POST', body: payload });

export const getMySupportCases = () =>
  supportFetch<{ success: boolean; cases: SupportCaseSummary[]; total: number }>('/api/support/my-tickets');

export const getSupportCase = (id: string) =>
  supportFetch<{ success: boolean; case: SupportCase }>(`/api/support/${encodeURIComponent(id)}`);

export const replyToSupportCase = (id: string, content: string) =>
  supportFetch<{ success: boolean; case: SupportCase; reopened: boolean }>(`/api/support/${encodeURIComponent(id)}/messages`, { method: 'POST', body: { content } });

export const rateSupportCase = (id: string, rating: number, comment?: string) =>
  supportFetch<{ success: boolean; case: SupportCase }>(`/api/support/${encodeURIComponent(id)}/rate`, { method: 'POST', body: { rating, comment } });

// ---- Staff workspace (PERM.MANAGE_SUPPORT) ----
export interface StaffPerson { id: string; name: string | null; role: string | null }
export interface StaffCaseSummary {
  id: string; ticketNumber: string; category: string; priority: string; subject: string; status: string;
  customer: StaffPerson | null; assignedTo: StaffPerson | null; escalatedTo: StaffPerson | null;
  firstResponseAt: string | null; resolvedAt: string | null; messageCount: number; rowVersion: number;
  createdAt: string; updatedAt: string; awaitingStaff: boolean;
}
export interface StaffMessage { id: string | null; kind: 'customer' | 'staff'; internal: boolean; senderName: string | null; content: string; createdAt: string | null }
export interface StaffCase extends StaffCaseSummary {
  description: string; references: SupportReference[]; messages: StaffMessage[];
  resolutionNote: string | null; rating: number | null; ratingComment: string | null; reopenCount: number;
  /** True for oversight views: no internal notes, no write controls. */
  readOnly?: boolean;
}
export interface SupportMetrics {
  total: number; windowDays: number; slaConfigured: boolean;
  byStatus: Record<string, number>; byCategory: Record<string, number>;
  openBacklog: number; unassignedOpen: number; awaitingFirstResponse: number;
  medianFirstResponseMinutes: number | null; medianResolutionMinutes: number | null;
  firstResponseWithinTarget: number | null; resolutionWithinTarget: number | null;
  averageRating: number | null; ratedCount: number;
}

const qs = (p: Record<string, string | number | undefined>) => {
  const q = new URLSearchParams();
  Object.entries(p).forEach(([k, v]) => { if (v !== undefined && v !== '') q.set(k, String(v)); });
  return q.toString() ? `?${q}` : '';
};

export const getStaffQueue = (params: Record<string, string | number | undefined> = {}) =>
  supportFetch<{ success: boolean; cases: StaffCaseSummary[]; total: number; limit: number; offset: number; capability?: 'agent' | 'oversight' }>(`/api/support/staff/queue${qs(params)}`);
export const getStaffMetrics = (days = 30) =>
  supportFetch<{ success: boolean; metrics: SupportMetrics }>(`/api/support/staff/metrics${qs({ days })}`);
export const getStaffTeam = () =>
  supportFetch<{ success: boolean; staff: StaffPerson[] }>('/api/support/staff/team');
/** Oversight (read-only) access must state a reason; it is audited server-side. Agents omit it. */
export const getStaffCase = (id: string, reason?: string) =>
  supportFetch<{ success: boolean; case: StaffCase; capability?: 'agent' | 'oversight' }>(`/api/support/staff/${encodeURIComponent(id)}${qs({ reason })}`);
export const staffReplyToCase = (id: string, content: string, isInternal: boolean) =>
  supportFetch<{ success: boolean; case: StaffCase }>(`/api/support/staff/${encodeURIComponent(id)}/messages`, { method: 'POST', body: { content, isInternal } });
export const staffUpdateCase = (id: string, body: { status?: string; priority?: string; assignedTo?: string | null; escalatedTo?: string; resolutionNote?: string; expectedVersion?: number }) =>
  supportFetch<{ success: boolean; case: StaffCase }>(`/api/support/staff/${encodeURIComponent(id)}`, { method: 'PATCH', body });

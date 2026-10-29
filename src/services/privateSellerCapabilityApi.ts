import { HttpRequestError, request } from '../api/httpRequest';

export type SellerStatus = 'none' | 'pending' | 'approved' | 'rejected' | 'suspended' | 'revoked' | 'not_applicable';

export interface SellerCapability {
  status: SellerStatus;
  source: string;
  application: { status: string; reviewReason: string | null; submittedAt: string; reviewedAt: string | null } | null;
  canApply: boolean;
  canList: boolean;
}

interface Envelope<T> { success: boolean; data: T }

/** The signed-in person's private-seller state. One personal account (same users.id) – never a second account. */
export async function getMySellerCapability(): Promise<SellerCapability> {
  const res = await request<Envelope<SellerCapability>>('/api/private-seller-capability/me');
  return res.data;
}

export async function applyForPrivateSelling(input: { contactPhone: string; intendedUse?: string; acceptTerms: true }): Promise<SellerCapability['application']> {
  const res = await request<Envelope<{ status: string; application: SellerCapability['application'] }>>('/api/private-seller-capability/apply', { method: 'POST', body: input });
  return res.data.application;
}


export interface PrivateSellerApplication {
  userId: string;
  status: Exclude<SellerStatus, 'none' | 'not_applicable'>;
  contactPhone: string | null;
  intendedUse: string | null;
  source: string;
  submittedAt: string;
  reviewedAt: string | null;
  reviewReason: string | null;
}

export type SellerDecision = 'approve' | 'reject' | 'suspend' | 'revoke';

/** Existing RBAC-protected application review surface. */
export async function getPrivateSellerApplications(status?: SellerStatus): Promise<PrivateSellerApplication[]> {
  const res = await request<unknown>('/api/private-seller-capability/admin/applications', {
    params: status && status !== 'none' && status !== 'not_applicable' ? { status } : undefined,
  });
  const envelope = res && typeof res === 'object' ? res as Partial<Envelope<unknown>> & { code?: unknown; maintenance?: unknown; message?: unknown } : null;
  // The backend contract is { success: true, data: PrivateSellerApplication[] }. Do not let an unexpected
  // 200/JSON shape become a false empty queue or a render-time crash.
  if (envelope?.success !== true || !Array.isArray(envelope.data)) {
    throw new HttpRequestError(
      typeof envelope?.message === 'string' ? envelope.message : 'The server returned an unexpected response while loading applications.',
      undefined,
      envelope,
    );
  }
  const statuses = new Set<SellerStatus>(['pending', 'approved', 'rejected', 'suspended', 'revoked']);
  const validRows = envelope.data.every((row) => {
    if (!row || typeof row !== 'object') return false;
    const item = row as Partial<PrivateSellerApplication>;
    return typeof item.userId === 'string'
      && statuses.has(item.status as SellerStatus)
      && typeof item.source === 'string'
      && typeof item.submittedAt === 'string'
      && (item.contactPhone == null || typeof item.contactPhone === 'string')
      && (item.intendedUse == null || typeof item.intendedUse === 'string')
      && (item.reviewedAt == null || typeof item.reviewedAt === 'string')
      && (item.reviewReason == null || typeof item.reviewReason === 'string');
  });
  if (!validRows) {
    throw new HttpRequestError('The server returned malformed application records. Refresh the page or contact support if the problem continues.');
  }
  return envelope.data as PrivateSellerApplication[];
}

export interface SellerDecisionOutcome {
  before: string;
  after: string;
  application: PrivateSellerApplication | null;
  /** Phase 13F: truthful listing-visibility outcome of a suspension/revocation/reinstatement. */
  visibility?: { changed: boolean; cacheInvalidated: boolean | null; listingsHiddenByPolicy: number | null };
}

export async function decidePrivateSellerApplication(userId: string, decision: SellerDecision, reason?: string): Promise<SellerDecisionOutcome> {
  const res = await request<Envelope<SellerDecisionOutcome>>(`/api/private-seller-capability/admin/${encodeURIComponent(userId)}/decision`, {
    method: 'PATCH', body: { decision, ...(reason ? { reason } : {}) },
  });
  return res.data;
}

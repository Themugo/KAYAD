import { HttpRequestError, request } from '../api/httpRequest';

export type SellerStatus = 'none' | 'pending' | 'approved' | 'rejected' | 'suspended' | 'revoked' | 'not_applicable';

export interface SellerCapability {
  status: SellerStatus;
  source: string;
  application: { status: string; reviewReason: string | null; submittedAt: string; reviewedAt: string | null } | null;
  canApply: boolean;
  canList: boolean;
  approvalRequired: boolean;
  packageMode: 'free' | 'optional' | 'required';
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

export interface PersonalAccountRow {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  createdAt: string | null;
  accountType: 'personal' | 'personal_legacy';
  accountState: 'active' | 'restricted';
  emailVerified: boolean;
  /** Old users.status of a legacy individual_seller. A historical value, never a current approval gate. */
  legacyRecordStatus: string | null;
  listings: { total: number; published: number };
  historicalApplication: PrivateSellerApplication | null;
}
export interface PersonalAccountsPage { accounts: PersonalAccountRow[]; page: number; limit: number; total: number }

/** Personal accounts for staff review. Independent of historical seller applications. */
export async function getPersonalAccounts(params: { q?: string; state?: 'all' | 'active' | 'restricted'; verified?: 'all' | 'true' | 'false'; page?: number; limit?: number } = {}): Promise<PersonalAccountsPage> {
  const clean: Record<string, string | number> = {};
  if (params.q?.trim()) clean.q = params.q.trim();
  if (params.state && params.state !== 'all') clean.state = params.state;
  if (params.verified && params.verified !== 'all') clean.verified = params.verified;
  if (params.page) clean.page = params.page;
  if (params.limit) clean.limit = params.limit;
  const res = await request<Partial<Envelope<PersonalAccountsPage>> & { message?: string }>('/api/private-seller-capability/admin/accounts', { params: clean });
  const data = res?.data;
  if (res?.success !== true || !data || !Array.isArray(data.accounts) || !Number.isFinite(Number(data.total))) {
    throw new HttpRequestError(typeof res?.message === 'string' ? res.message : 'The server returned an unexpected response while loading personal accounts.', undefined, res);
  }
  return data;
}

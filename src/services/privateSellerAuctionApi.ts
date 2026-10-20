import { request, HttpRequestError } from '../api/httpRequest';

/**
 * Private-seller auction verification & custody client (Stage 5F.10).
 *
 * Contract (backend/routes/privateSellerAuctionRoutes.js):
 * - Every mutation needs an Idempotency-Key; this client generates one per user action and re-sends the same key on retry.
 * - The browser never decides eligibility. `eligibility` always comes from the PostgreSQL gate through the API.
 * - Payment is never inferred client-side: a booking is linkable only if the server has recorded a verified payment.
 */
export type PsapApiErrorKind = 'network' | 'unauthenticated' | 'forbidden' | 'not_found' | 'conflict' | 'validation' | 'unavailable' | 'server';
export class PsapApiError extends Error {
  kind: PsapApiErrorKind; status?: number; code?: string;
  constructor(message: string, kind: PsapApiErrorKind, status?: number, code?: string) { super(message); this.kind = kind; this.status = status; this.code = code; }
}

export interface PsapProposal {
  id: string; car_id: string; seller_user_id: string;
  proposal_version: number; evidence_version: number;
  proposal_status: 'draft' | 'submitted' | 'under_review' | 'changes_requested' | 'approved' | 'rejected' | 'withdrawn';
  verification_status: 'not_started' | 'awaiting_payment' | 'assigned' | 'in_progress' | 'passed' | 'failed' | 'inconclusive' | 'expired' | 'disputed';
  custody_status: 'awaiting_partner' | 'handover_scheduled' | 'received' | 'in_custody' | 'release_authorized' | 'released' | 'refused' | 'incident_hold';
  appeal_status: 'not_requested' | 'submitted' | 'under_review' | 'upheld' | 'overturned' | 'closed';
  inspection_payment_confirmed_at?: string | null;
  decision_reason?: string | null;
  custody_hold_reason?: string | null;
  updated_at?: string;
}
export interface PsapEligibility { eligible: boolean; blockers: string[] }
export interface PsapEvent { id: string; event_type: string; actor_role?: string; created_at: string }
export interface PsapDetail { proposal: PsapProposal; events: PsapEvent[]; eligibility: PsapEligibility }

const statusKind = (s?: number): PsapApiErrorKind =>
  s === 401 ? 'unauthenticated' : s === 403 ? 'forbidden' : s === 404 ? 'not_found' : s === 409 ? 'conflict' : s === 400 || s === 422 ? 'validation' : s === 503 ? 'unavailable' : s ? 'server' : 'network';

async function call<T>(path: string, method: 'GET' | 'POST', body?: unknown, idempotencyKey?: string): Promise<T> {
  try {
    return await request<T>(path, { method, body, ...(method === 'POST' ? { headers: { 'Idempotency-Key': idempotencyKey || newIdempotencyKey() } } : {}) });
  } catch (err) {
    const e = err instanceof HttpRequestError ? err : new HttpRequestError('Request failed.');
    const code = (e.responseData as { code?: unknown } | undefined)?.code;
    throw new PsapApiError(e.message, statusKind(e.status), e.status, typeof code === 'string' ? code : undefined);
  }
}

export const newIdempotencyKey = (): string =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `k-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);

const BASE = '/api/private-seller-auctions/seller';
export const listMyProposals = async (): Promise<PsapProposal[]> => (await call<{ proposals: PsapProposal[] }>(`${BASE}/proposals`, 'GET')).proposals ?? [];
export const getMyProposal = (id: string) => call<PsapDetail & { success: boolean }>(`${BASE}/proposals/${encodeURIComponent(id)}`, 'GET');
export const openProposal = (carId: string, key?: string) => call<{ result: { proposal_id: string } }>(`${BASE}/proposals`, 'POST', { carId }, key);

export type SellerEvent = 'evidence_submitted' | 'proposal_submitted' | 'proposal_withdrawn' | 'inspection_assigned' | 'reinspection_requested' | 'appeal_submitted';
export const sendSellerEvent = (id: string, event: SellerEvent, payload: Record<string, unknown> = {}, key?: string) =>
  call<{ success: boolean }>(`${BASE}/proposals/${encodeURIComponent(id)}/events/${event}`, 'POST', { payload }, key);

// ---- admin (server enforces admin/superadmin + MANAGE_AUCTIONS; the DB re-verifies the actor) -------------------------------------
const ADMIN = '/api/private-seller-auctions/admin';
export type AdminEvent = 'authority_verified' | 'custody_assigned' | 'custody_incident' | 'custody_hold_released' | 'admin_decision' | 'appeal_decision' | 'release_authorized' | 'inspection_expired';
export const adminListProposals = async (status?: string): Promise<PsapProposal[]> =>
  (await call<{ proposals: PsapProposal[] }>(`${ADMIN}/proposals${status ? `?status=${encodeURIComponent(status)}` : ''}`, 'GET')).proposals ?? [];
export const adminGetProposal = (id: string) => call<PsapDetail & { success: boolean }>(`${ADMIN}/proposals/${encodeURIComponent(id)}`, 'GET');
export const adminSendEvent = (id: string, event: AdminEvent, payload: Record<string, unknown> = {}, key?: string) =>
  call<{ success: boolean }>(`${ADMIN}/proposals/${encodeURIComponent(id)}/events/${event}`, 'POST', { payload }, key);
export const adminCapabilityAction = (providerId: string, action: 'approve' | 'suspend' | 'revoke', providerKind: 'garage' | 'dealer', payload: Record<string, unknown>, key?: string) =>
  call<{ success: boolean }>(`${ADMIN}/capabilities/${encodeURIComponent(providerId)}/${action}`, 'POST', { providerKind, payload }, key);

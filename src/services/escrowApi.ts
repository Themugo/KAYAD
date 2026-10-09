import { request, HttpRequestError } from '../api/httpRequest';
/**
 * Escrow API client.
 *
 * Contract notes (verified against backend/controllers/escrowController.js,
 * backend/utils/escrowViewModel.js and backend/routes/escrowRoutes.js):
 *
 * - `GET /api/escrow/my` returns only deals the signed-in user is a party to,
 *   already projected for that viewer: the counterparty is `{ id, name }`
 *   (no contact or account data), the fee split is present only for the
 *   seller/staff, and each deal carries `viewerRole` and `availableActions`
 *   computed by the server from the same state machine the action endpoints
 *   enforce. The browser therefore never decides what a user "may" do.
 * - The accompanying `summary` is explicitly `scope: 'participant'`: totals
 *   over the viewer's own deals, never a platform balance.
 * - `GET /api/escrow/program` is public and returns only whether the program
 *   is switched on and the admin-published rules.
 * - Operator endpoints (`/operations/*`) are staff-only; `operator.can` and
 *   per-case `staffActions` say what the signed-in operator may do.
 * - There is no endpoint that creates an escrow from this client: escrows are
 *   created by the purchase and auction settlement workflows.
 */

export type EscrowApiErrorKind = 'network' | 'unauthenticated' | 'forbidden' | 'validation' | 'not_found' | 'conflict' | 'server';

export class EscrowApiError extends Error {
  kind: EscrowApiErrorKind;
  status?: number;
  constructor(message: string, kind: EscrowApiErrorKind, status?: number) {
    super(message);
    this.kind = kind;
    this.status = status;
  }
}

export type EscrowStatus = 'pending' | 'funded' | 'vehicle_confirmed' | 'delivered' | 'disputed' | 'refunded' | 'released' | 'closed';
export type EscrowViewerRole = 'buyer' | 'seller' | 'staff' | null;
export type EscrowPartyAction = 'view_funding_instructions' | 'confirm_vehicle' | 'request_release' | 'confirm_delivery' | 'open_dispute';
export type EscrowStaffAction = 'verify_funding' | 'release' | 'refund' | 'complete_refund' | 'payout' | 'close';

export interface BackendUser { id: string | null; name: string | null; businessName?: string | null }

export interface BackendCarRef {
  id: string | null;
  title: string | null;
  images?: { url: string | null }[];
  price?: number | null;
  vin?: string | null;
  registrationNumber?: string | null;
}

export interface BackendEscrow {
  id: string;
  buyer: BackendUser;
  seller: BackendUser;
  car: BackendCarRef | null;
  amount: number;
  currency?: 'KES';
  commission?: number;
  sellerAmount?: number;
  status: EscrowStatus;
  viewerRole?: EscrowViewerRole;
  availableActions?: EscrowPartyAction[];
  createdAt: string;
  updatedAt: string;
  fundedAt?: string | null;
  fundingVerifiedAt?: string | null;
  vehicleConfirmedAt?: string | null;
  deliveredAt?: string | null;
  autoReleaseEligibleAt?: string | null;
  releasedAt?: string | null;
  refundedAt?: string | null;
  closedAt?: string | null;
  disputedAt?: string | null;
  disputedBy?: string | null;
  disputeReason?: string | null;
  disputeTitle?: string | null;
  disputeDescription?: string | null;
  disputeWorkflowStatus?: 'open' | 'under_review' | 'mediation' | 'resolved' | 'appealed' | 'closed' | null;
  disputeEvidence?: Array<{ type?: string | null; fileName?: string | null; mimeType?: string | null; size?: number | null; createdAt?: string | null; verified?: boolean }>;
  disputeTimeline?: Array<{ action?: string | null; at?: string | null; note?: string | null; fromStatus?: string | null; toStatus?: string | null }>;
}

export interface EscrowParticipantSummary {
  scope: 'participant';
  currency: 'KES';
  totalDeals: number;
  heldAmount: number;
  heldCount: number;
  pendingFundingCount: number;
  activeCount: number;
  settledCount: number;
  needsActionCount: number;
}

export interface EscrowProgram {
  enabled: boolean;
  fundingMethods: string[];
  releaseDays: number;
  minimumAmount: number;
  maximumAmount: number | null;
  currency: 'KES';
}

function kindFor(status?: number): EscrowApiErrorKind {
  if (status === 401) return 'unauthenticated';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  if (status === 409) return 'conflict';
  if (status === 400) return 'validation';
  return status && status >= 500 ? 'server' : status ? 'server' : 'network';
}

async function escrowFetch<T>(path: string, options: { method?: string; body?: string; headers?: Record<string, string> } = {}): Promise<T> {
  try {
    return await request<T>(path, { method: options.method, body: options.body ? JSON.parse(options.body) : undefined, headers: options.headers });
  } catch (err) {
    const error = err instanceof HttpRequestError ? err : new HttpRequestError('Request failed.');
    throw new EscrowApiError(error.message, kindFor(error.status), error.status);
  }
}

// Idempotency: the server derives a deterministic key per escrow/operation for
// every escrow action (backend/middleware/idempotency.js), so the browser does
// not send its own (a custom header would also need to be CORS-allowed).

// ── Public ────────────────────────────────────────────────────────────────
/** GET /api/escrow/program — public, no deal or balance data. */
export async function getEscrowProgram(): Promise<EscrowProgram> {
  const body = await escrowFetch<{ data: EscrowProgram }>('/api/escrow/program');
  return body.data;
}

// ── Participants ──────────────────────────────────────────────────────────
/** GET /api/escrow/my — the signed-in user's own deals, projected for them. */
export async function getMyEscrowOverview(): Promise<{ escrows: BackendEscrow[]; summary: EscrowParticipantSummary | null }> {
  const body = await escrowFetch<{ data: BackendEscrow[]; summary?: EscrowParticipantSummary }>('/api/escrow/my');
  return { escrows: body.data || [], summary: body.summary || null };
}

/** Deals only (used by the seller and buyer dashboards). */
export async function getMyEscrows(): Promise<BackendEscrow[]> {
  return (await getMyEscrowOverview()).escrows;
}

export async function confirmVehicle(escrowId: string): Promise<void> {
  await escrowFetch(`/api/escrow/${escrowId}/confirm-vehicle`, { method: 'POST' });
}
export async function confirmDelivery(escrowId: string): Promise<void> {
  await escrowFetch(`/api/escrow/${escrowId}/confirm-delivery`, { method: 'POST' });
}
export async function requestRelease(escrowId: string): Promise<{ message: string }> {
  const body = await escrowFetch<{ message: string }>(`/api/escrow/${escrowId}/request-release`, { method: 'POST' });
  return { message: body.message };
}
export async function disputeEscrow(escrowId: string, reason: string): Promise<void> {
  await escrowFetch(`/api/escrow/${escrowId}/dispute`, { method: 'POST', body: JSON.stringify({ reason }) });
}

export interface EscrowStateInfo { currentState: EscrowStatus; allowedTransitions: EscrowStatus[]; history: Array<{ action?: string; by?: string; at?: string; reason?: string }> }
/** GET /api/escrow/:id/state — canonical history. */
export async function getEscrowState(escrowId: string): Promise<EscrowStateInfo> {
  const body = await escrowFetch<{ data: EscrowStateInfo }>(`/api/escrow/${escrowId}/state`);
  return body.data;
}

export interface FundingInstructions {
  fundingMethod: string;
  rules: { releaseDays: number; minimumAmount: number; maximumAmount?: number | null };
  account: { accountName?: string; bankName?: string; accountNumber?: string; branch?: string; currency?: string } | null;
  amount: number;
  reference: string;
}
/** GET /api/escrow/:id/funding-instructions */
export async function getFundingInstructions(escrowId: string): Promise<FundingInstructions> {
  const body = await escrowFetch<{ data: FundingInstructions }>(`/api/escrow/${escrowId}/funding-instructions`);
  return body.data;
}

// ── Operators (staff) ─────────────────────────────────────────────────────
export interface EscrowStaffCapabilities { view: boolean; operate: boolean; reconcile: boolean; release: boolean; refund: boolean; settle: boolean; completeRefund: boolean; close: boolean }
export interface OpsEscrow {
  id: string; status: EscrowStatus; amount: number; commission: number; sellerAmount: number;
  createdAt?: string; updatedAt?: string; fundedAt?: string | null; releasedAt?: string | null; refundedAt?: string | null; disputedAt?: string | null;
  buyer: { id: string; name: string } | null; seller: { id: string; name: string } | null;
  car: { id: string; title: string; registrationNumber?: string; vinLast4?: string | null } | null;
  refund?: { id: string; status: string; amount: number } | null;
  payout?: { id: string; status: string; amount: number; netAmount: number; failureReason?: string | null } | null;
  staffActions?: EscrowStaffAction[];
}
export interface OpsQueue { count: number; amount?: number; items: OpsEscrow[] }
export interface OpsDashboard {
  queues: Record<'funded' | 'vehicleConfirmed' | 'delivered' | 'released' | 'disputed', OpsQueue> & {
    refunds: { count: number; items: Array<{ id: string; status: string; amount: number; escrow: string | null; createdAt?: string }> };
    reconciliation: { count: number; items: Array<{ id: string; status: string; createdAt?: string; issueCount: number }> };
    anomalies: { count: number; items: Array<{ id: string; category?: string; severity?: string; status: string; escrow: string | null; createdAt?: string; summary?: string }> };
  };
  totals: { scope: 'platform'; currency: 'KES'; heldAmount: number; heldCount: number };
  operator: { can: EscrowStaffCapabilities; role: string };
  generatedAt: string;
}
export async function getOperationsDashboard(): Promise<OpsDashboard> {
  return (await escrowFetch<{ data: OpsDashboard }>('/api/escrow/operations/dashboard')).data;
}
export async function getOperationsPending(): Promise<OpsEscrow[]> {
  return (await escrowFetch<{ data: OpsEscrow[] }>('/api/escrow?status=pending&limit=25')).data || [];
}
export interface OpsCase {
  escrow: OpsEscrow;
  timeline: Array<{ id: string; action: string; actor: string; role?: string; timestamp: string; reason?: string | null; notes?: string | null }>;
  anomalies: Array<{ id?: string; category?: string; severity?: string; status?: string; summary?: string }>;
  reconciliation: Array<{ id?: string; status?: string; createdAt?: string }>;
}
export async function getOperationsCase(id: string): Promise<OpsCase> {
  return (await escrowFetch<{ data: OpsCase }>(`/api/escrow/operations/case/${id}`)).data;
}
export const verifyFunding = (id: string, fundingReference: string) =>
  escrowFetch(`/api/escrow/${id}/verify-funding`, { method: 'POST', body: JSON.stringify({ fundingReference }) });
export const releaseEscrow = (id: string) => escrowFetch(`/api/escrow/${id}/release`, { method: 'POST' });
export const refundEscrow = (id: string, reason: string) => escrowFetch(`/api/escrow/${id}/refund`, { method: 'POST', body: JSON.stringify({ reason }) });
export const completeRefund = (id: string, refundId: string, providerReference: string, cashAccountCode: '1000' | '1200') =>
  escrowFetch(`/api/escrow/${id}/refund/${refundId}/complete`, { method: 'POST', body: JSON.stringify({ providerReference, cashAccountCode }) });
export const initiatePayout = (id: string) => escrowFetch(`/api/escrow/operations/case/${id}/payout`, { method: 'POST' });
export const closeEscrow = (id: string, reason: string) => escrowFetch(`/api/escrow/${id}/close`, { method: 'POST', body: JSON.stringify({ reason }) });
export const runReconciliation = () => escrowFetch('/api/escrow/operations/reconcile', { method: 'POST', body: JSON.stringify({}) });
export const runAnomalyScan = () => escrowFetch('/api/escrow/operations/anomaly-scan', { method: 'POST', body: JSON.stringify({}) });

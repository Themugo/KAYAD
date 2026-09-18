import { request, HttpRequestError } from '../api/httpRequest';
/**
 * Real backend escrow API client, and an honest mapper from the
 * real escrow shape into this frontend's own EscrowTransaction type.
 *
 * Follows the exact pattern established in services/vehicleApi.ts,
 * bidApi.ts, inspectionApi.ts, chatApi.ts: typed error class with a
 * `kind` field, `credentials: 'include'` on every request (the real
 * backend requires auth for this entire route file - confirmed via
 * `protect` middleware on every real route in
 * backend/routes/escrowRoutes.js).
 *
 * SCOPE, STATED HONESTLY: the real backend has a clear, 8-state
 * status enum ('pending' | 'funded' | 'vehicle_confirmed' |
 * 'delivered' | 'disputed' | 'refunded' | 'released' | 'closed'),
 * real amount/commission/sellerAmount, and real per-stage timestamps
 * (fundedAt, vehicleConfirmedAt, deliveredAt, releasedAt) - all
 * mapped directly, nothing invented. It has NO real NTSA TIMS
 * integration, no per-escrow linked inspection report/score, and no
 * "create a new escrow" endpoint at all (every real POST route acts
 * on an escrow that already exists) - the mapper below omits those
 * concepts entirely rather than fabricate them.
 */

import { EscrowTransaction } from '../types';


export type EscrowApiErrorKind = 'network' | 'unauthenticated' | 'forbidden' | 'validation' | 'not_found' | 'server';

export class EscrowApiError extends Error {
  kind: EscrowApiErrorKind;
  status?: number;
  constructor(message: string, kind: EscrowApiErrorKind, status?: number) {
    super(message);
    this.kind = kind;
    this.status = status;
  }
}

interface BackendUser {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  role?: string;
}

interface BackendCarRef {
  id: string;
  title: string;
  images?: { url: string }[];
  price?: number;
  vin?: string;
  registrationNumber?: string;
}

export interface BackendEscrow {
  id: string;
  buyer: BackendUser;
  seller: BackendUser;
  car: BackendCarRef | null;
  amount: number;
  commission?: number;
  sellerAmount?: number;
  status: 'pending' | 'funded' | 'vehicle_confirmed' | 'delivered' | 'disputed' | 'refunded' | 'released' | 'closed';
  fundedAt?: string | null;
  vehicleConfirmedAt?: string | null;
  deliveredAt?: string | null;
  releasedAt?: string | null;
  closedAt?: string | null;
  disputeReason?: string | null;
  disputeTitle?: string | null;
  disputeDescription?: string | null;
  disputedAt?: string | null;
  disputedBy?: string | null;
  disputeWorkflowStatus?: 'open' | 'under_review' | 'mediation' | 'resolved' | 'appealed' | 'closed' | null;
  disputeEvidence?: Array<{ _id?: string; type?: string; fileName?: string; mimeType?: string; size?: number; url?: string; thumbnailUrl?: string; description?: string; uploadedBy?: string; uploadedByRole?: string; createdAt?: string; verified?: boolean; verifiedBy?: string; verifiedAt?: string }>;
  disputeTimeline?: Array<{ action?: string; actor?: string; assigneeId?: string; at?: string; note?: string; fromStatus?: string; toStatus?: string }>;
  createdAt: string;
  updatedAt: string;
}

async function escrowFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  try {
    return await request<T>(path, { method: options.method, body: options.body, headers: options.headers as Record<string, string> });
  } catch (err) {
    const error = err instanceof HttpRequestError ? err : new HttpRequestError('Request failed.');
    const kind: EscrowApiErrorKind = error.status === 401 ? 'unauthenticated' : error.status === 403 ? 'forbidden' : error.status === 404 ? 'not_found' : error.status === 400 ? 'validation' : 'server';
    throw new EscrowApiError(error.message, kind, error.status);
  }
}

/** GET /api/escrow/my - every real escrow deal the current user is a
 * real party to (buyer or seller). */
export async function getMyEscrows(): Promise<BackendEscrow[]> {
  const body = await escrowFetch<{ data: BackendEscrow[] }>('/api/escrow/my');
  return body.data || [];
}

/** POST /api/escrow/:id/confirm-vehicle - buyer confirms the vehicle
 * matches inspection/expectations, moving the deal forward. */
export async function confirmVehicle(escrowId: string): Promise<BackendEscrow> {
  const body = await escrowFetch<{ data: BackendEscrow }>(`/api/escrow/${escrowId}/confirm-vehicle`, { method: 'POST' });
  return body.data;
}

/** POST /api/escrow/:id/confirm-delivery - seller confirms delivery. */
export async function confirmDelivery(escrowId: string): Promise<BackendEscrow> {
  const body = await escrowFetch<{ data: BackendEscrow }>(`/api/escrow/${escrowId}/confirm-delivery`, { method: 'POST' });
  return body.data;
}

/** POST /api/escrow/:id/request-release - buyer requests admin release. */
export async function requestRelease(escrowId: string): Promise<{ message: string }> {
  const body = await escrowFetch<{ message: string }>(`/api/escrow/${escrowId}/request-release`, { method: 'POST' });
  return { message: body.message };
}

/** POST /api/escrow/:id/dispute - buyer, seller, or staff raises a
 * real dispute, freezing the deal. */
export async function disputeEscrow(escrowId: string, reason: string): Promise<BackendEscrow> {
  const body = await escrowFetch<{ data: BackendEscrow }>(`/api/escrow/${escrowId}/dispute`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
  return body.data;
}

/** POST /api/escrow/:id/release - admin-only, confirmed directly
 * (backend/routes/escrowRoutes.js's own real route gate). Releases
 * the real, held funds to the seller. The real response only
 * contains { sellerAmount, commission }, not the full updated escrow
 * - callers should re-fetch the deal list afterward for the real,
 * current state rather than construct one from this response alone. */
export async function releaseEscrow(escrowId: string): Promise<{ sellerAmount: number; commission: number }> {
  const body = await escrowFetch<{ data: { sellerAmount: number; commission: number } }>(`/api/escrow/${escrowId}/release`, { method: 'POST' });
  return body.data;
}

const STATUS_LABELS: Record<BackendEscrow['status'], string> = {
  pending: 'Awaiting Buyer Deposit',
  funded: 'Funds Held in Escrow',
  vehicle_confirmed: 'Buyer Approved Vehicle',
  delivered: 'Vehicle Delivered',
  disputed: 'Dispute Under Review',
  refunded: 'Refunded to Buyer',
  released: 'Funds Released to Seller',
  closed: 'Completed',
};

// The real backend's 8 statuses honestly compressed to a linear
// step count for a simple progress indicator - 'disputed'/'refunded'
// are shown via their own real status label instead of a step number,
// since they are not points on the normal, linear happy path.
const STATUS_STEP: Record<BackendEscrow['status'], number> = {
  pending: 1,
  funded: 2,
  vehicle_confirmed: 3,
  delivered: 4,
  released: 5,
  closed: 5,
  disputed: 0,
  refunded: 0,
};

/** Honestly maps a real escrow into this frontend's own
 * EscrowTransaction shape - see this file's own header for exactly
 * which concepts (TIMS, a linked inspection score, deal creation)
 * have no real backend equivalent and are correctly omitted rather
 * than invented. */
export function mapBackendEscrowToTransaction(e: BackendEscrow): EscrowTransaction {
  return {
    id: e.id,
    vehicleId: e.car?.id || '',
    vehicleTitle: e.car?.title || 'Vehicle',
    vehicleImage: e.car?.images?.[0]?.url,
    vehiclePrice: e.car?.price,
    vin: e.car?.vin,
    plateNumber: e.car?.registrationNumber,
    amount: e.amount,
    buyerName: e.buyer?.name || 'Buyer',
    buyerPhone: e.buyer?.phone,
    buyerEmail: e.buyer?.email,
    sellerName: e.seller?.name || 'Seller',
    sellerPhone: e.seller?.phone,
    sellerEmail: e.seller?.email,
    sellerType: e.seller?.role === 'dealer' ? 'Verified Dealer' : 'Private Seller',
    status: STATUS_LABELS[e.status] || e.status,
    step: STATUS_STEP[e.status] ?? 0,
    updatedAt: e.updatedAt,
    depositDate: e.fundedAt || undefined,
    bankReference: undefined,
    vaultHolder: undefined,
    whoControlsFunds: e.status === 'released' || e.status === 'closed' ? 'Released' : 'KAYAD Escrow (Neutral Hold)',
    ...(e.status === 'disputed' || e.disputeWorkflowStatus ? {
      dispute: {
        id: e.id,
        openedAt: e.disputedAt || e.updatedAt,
        openedBy: e.disputedBy && String(e.disputedBy) === String(e.buyer?.id) ? 'Buyer' : 'Seller',
        reason: e.disputeDescription || e.disputeReason || 'Dispute opened',
        status: ({ open: 'Under Review', under_review: 'Under Review', mediation: 'Mediation In Progress', appealed: 'Evidence Gathering', resolved: e.status === 'refunded' ? 'Resolved - Refunded' : 'Resolved - Released', closed: 'Resolved - Released' } as const)[e.disputeWorkflowStatus || 'open'],
        evidence: (e.disputeEvidence || []).map((item) => ({
          title: item.fileName || item.type || 'Evidence file',
          fileType: item.mimeType || item.type || 'unknown',
          uploadedAt: item.createdAt || e.updatedAt,
        })),
        updates: (e.disputeTimeline || []).map((item, index) => ({
          timestamp: item.at || e.updatedAt,
          note: item.note || item.action || 'Dispute updated',
          author: item.actor ? `${item.actor}${item.action ? ` — ${item.action}` : ''}` : item.action || `Update ${index + 1}`,
        })),
      },
    } : {}),
  };
}

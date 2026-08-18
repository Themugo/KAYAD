/**
 * Real backend support-ticket API client.
 *
 * Follows the exact pattern established in authApi.ts/vehicleApi.ts/
 * favoriteApi.ts/inspectionApi.ts: typed error class with a `kind`
 * field, `credentials: 'include'` on every request (the real backend
 * requires auth for every /api/support endpoint - confirmed via
 * `protect` middleware on every route in backend/routes/supportRoutes.js).
 *
 * Built specifically for what the real support PAGE needs
 * (create + list-my-own) - the admin-side ticket-management endpoints
 * (assign/escalate/message-thread/status-change) are real too but were
 * not wrapped here, since this client's scope is the buyer/seller-
 * facing support form, not an admin console.
 */

const API_BASE = import.meta.env.VITE_API_URL || '';

export interface SupportTicket {
  id: string;
  category?: string;
  priority?: string;
  subject: string;
  description: string;
  status: string;
  createdAt?: string;
  sla?: {
    firstResponseTarget?: string;
    resolutionTarget?: string;
  };
}

export interface CreateTicketPayload {
  category: string;
  priority?: string;
  subject: string;
  description: string;
  relatedCar?: string;
  relatedEscrow?: string;
  relatedPayment?: string;
}

export type SupportApiErrorKind = 'network' | 'unauthenticated' | 'not_found' | 'server' | 'unknown';

export class SupportApiError extends Error {
  kind: SupportApiErrorKind;
  status?: number;
  constructor(message: string, kind: SupportApiErrorKind, status?: number) {
    super(message);
    this.kind = kind;
    this.status = status;
  }
}

async function supportFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
  } catch {
    throw new SupportApiError(
      'Unable to reach KAYAD servers. Please check your connection and try again.',
      'network'
    );
  }

  let body: T & { success?: boolean; message?: string };
  try {
    body = await res.json();
  } catch {
    throw new SupportApiError('Unexpected response from server.', 'server', res.status);
  }

  if (!res.ok) {
    const kind: SupportApiErrorKind =
      res.status === 401 ? 'unauthenticated' : res.status === 404 ? 'not_found' : 'server';
    throw new SupportApiError(body.message || 'Request failed.', kind, res.status);
  }

  return body;
}

/** POST /api/support - create a real support ticket. Requires
 * authentication (the backend's own protect middleware applies to
 * this entire route file, confirmed directly). */
export async function createSupportTicket(
  payload: CreateTicketPayload
): Promise<{ success: boolean; ticket: SupportTicket }> {
  return supportFetch('/api/support', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** GET /api/support/my-tickets - the caller's own tickets. */
export async function getMySupportTickets(): Promise<{ success: boolean; tickets: SupportTicket[] }> {
  return supportFetch('/api/support/my-tickets', { method: 'GET' });
}

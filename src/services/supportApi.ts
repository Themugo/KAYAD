import { request, HttpRequestError } from '../api/httpRequest';

export interface SupportTicketMessage {
  sender?: string;
  senderRole?: string;
  content: string;
  isInternal?: boolean;
  createdAt?: string;
}

export interface SupportTicket {
  id: string;
  ticketNumber?: string;
  category?: string;
  priority?: string;
  subject: string;
  description: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  closedAt?: string;
  messages?: SupportTicketMessage[];
  satisfactionRating?: number;
  resolutionNotes?: string;
  sla?: {
    firstResponseTarget?: string;
    firstResponseActual?: string;
    firstResponseMet?: boolean;
    resolutionTarget?: string;
    resolutionActual?: string;
    resolutionMet?: boolean;
  };
  relatedEscrow?: { id?: string; amount?: number; status?: string } | string;
  relatedCar?: { id?: string; title?: string; brand?: string; model?: string; year?: number } | string;
  relatedPayment?: { id?: string; amount?: number; status?: string } | string;
  assignedTo?: { id?: string; name?: string; email?: string } | string;
  escalatedTo?: { id?: string; name?: string; email?: string } | string;
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
  try {
    return await request<T>(path, {
      method: options.method,
      body: options.body,
      headers: options.headers as Record<string, string>,
    });
  } catch (err) {
    const error = err instanceof HttpRequestError ? err : new HttpRequestError('Request failed.');
    const kind: SupportApiErrorKind = error.status === 401
      ? 'unauthenticated'
      : error.status === 404
        ? 'not_found'
        : error.status && error.status >= 500
          ? 'server'
          : 'unknown';
    throw new SupportApiError(error.message, kind, error.status);
  }
}

export async function createSupportTicket(
  payload: CreateTicketPayload
): Promise<{ success: boolean; ticket: SupportTicket }> {
  return supportFetch('/api/support', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getMySupportTickets(): Promise<{ success: boolean; tickets: SupportTicket[] }> {
  return supportFetch('/api/support/my-tickets', { method: 'GET' });
}

export async function getSupportTicket(ticketId: string): Promise<{ success: boolean; ticket: SupportTicket }> {
  return supportFetch(`/api/support/${encodeURIComponent(ticketId)}`, { method: 'GET' });
}

export async function addSupportTicketMessage(
  ticketId: string,
  content: string,
): Promise<{ success: boolean; message: SupportTicketMessage; ticket: SupportTicket }> {
  return supportFetch(`/api/support/${encodeURIComponent(ticketId)}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}

export async function rateSupportTicket(
  ticketId: string,
  rating: number,
  resolutionNotes?: string,
): Promise<{ success: boolean; ticket: SupportTicket }> {
  return supportFetch(`/api/support/${encodeURIComponent(ticketId)}/rate`, {
    method: 'POST',
    body: JSON.stringify({ rating, resolutionNotes }),
  });
}

export async function getAdminSupportTickets(params: Record<string, string | number | undefined> = {}): Promise<{ success: boolean; tickets: SupportTicket[] }> {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value));
  });
  return supportFetch(`/api/support/all${query.toString() ? `?${query}` : ''}`, { method: 'GET' });
}

export async function updateSupportTicketStatus(
  ticketId: string,
  body: { status?: string; assignedTo?: string; escalatedTo?: string; priority?: string },
): Promise<{ success: boolean; ticket: SupportTicket }> {
  return supportFetch(`/api/support/${encodeURIComponent(ticketId)}/status`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

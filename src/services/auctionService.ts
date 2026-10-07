import { request, HttpRequestError } from '../api/httpRequest';

/**
 * Canonical public auction transport.
 * Auctions are represented by the backend's auction read model; callers do
 * not need to know which HTTP client implements the transport.
 */
export interface Auction {
  id: string;
  carId: string;
  status: 'draft' | 'active' | 'ended';
  startingBid: number;
  highestBid: number;
  startTime: string | null;
  endTime: string | null;
  bidIncrement: number;
  reservePrice?: number | null;
  highestBidderId?: string | null;
  bidCount: number;
  allowBid: boolean;
  allowBuy: boolean;
  car?: Record<string, unknown>;
}

export interface AuctionListParams {
  page?: number;
  limit?: number;
  status?: 'active' | 'live' | 'ended' | 'draft';
  search?: string;
}

async function auctionRequest<T>(path: string, options?: { method?: string; body?: unknown }): Promise<T> {
  return request<T>(path, options);
}

export async function fetchList(params: AuctionListParams = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
  });
  return auctionRequest<{ auctions: Auction[]; pagination?: Record<string, unknown> }>(`/api/auctions${query.toString() ? `?${query}` : ''}`);
}

export async function fetchAuction(id: string) {
  if (!id) throw new HttpRequestError('Auction ID is required.');
  return auctionRequest<{ success?: boolean; auction: Auction; bids?: Array<Record<string, unknown>> }>(`/api/auctions/${encodeURIComponent(id)}`);
}

export async function fetchActiveAuctions(params: { page?: number; limit?: number } = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) query.set(key, String(value));
  });
  return auctionRequest<{ auctions: Auction[]; pagination?: Record<string, unknown> }>(`/api/auctions/active${query.toString() ? `?${query}` : ''}`);
}

export async function fetchAuctionOutcome(id: string) {
  if (!id) throw new HttpRequestError('Auction ID is required.');
  return auctionRequest<{ success?: boolean; outcome: Record<string, unknown> }>(`/api/auctions/${encodeURIComponent(id)}/outcome`);
}

export async function initiateAuctionWinnerPayment(id: string, phone: string) {
  if (!id) throw new HttpRequestError('Auction ID is required.');
  if (!phone) throw new HttpRequestError('Verified phone number is required.');
  return auctionRequest<Record<string, unknown>>(`/api/auctions/${encodeURIComponent(id)}/outcome/payment`, {
    method: 'POST',
    body: JSON.stringify({ phone }),
  });
}

export async function fetchMyAuctions(params: { page?: number; limit?: number } = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) query.set(key, String(value));
  });
  return auctionRequest<{ auctions: Auction[]; pagination?: Record<string, unknown> }>(`/api/auctions/my${query.toString() ? `?${query}` : ''}`);
}

export async function fetchAuctionBids(carId: string) {
  if (!carId) throw new HttpRequestError('Vehicle ID is required.');
  return auctionRequest<{ success?: boolean; bids: Array<Record<string, unknown>> }>(`/api/auctions/${encodeURIComponent(carId)}/bids`);
}

export async function startDealerAuction(carId: string, body: { durationMs: number; startingBid: number; reservePrice?: number | null; reserveMode?: string }) {
  if (!carId) throw new HttpRequestError('Vehicle ID is required.');
  return auctionRequest<Record<string, unknown>>(`/api/dealer/cars/${encodeURIComponent(carId)}/auction/start`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function setAuctionWinner(bidId: string) {
  if (!bidId) throw new HttpRequestError('Bid ID is required.');
  return auctionRequest<Record<string, unknown>>(`/api/bids/admin/${encodeURIComponent(bidId)}/set-winner`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export default { fetchList, fetchAuction, fetchActiveAuctions, fetchAuctionOutcome, initiateAuctionWinnerPayment, fetchMyAuctions, fetchAuctionBids, startDealerAuction, setAuctionWinner };

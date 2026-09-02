import { auctionAPI } from '../api/api.exports';

/**
 * Canonical public auction contract.
 * An auction is represented by a car row; id and carId are the same vehicle ID.
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

export async function fetchList(params?: {
  page?: number;
  limit?: number;
  status?: 'active' | 'live' | 'ended';
  search?: string;
}) {
  return auctionAPI.list(params || {});
}

export async function fetchAuction(id: string) {
  return auctionAPI.get(id);
}

export async function fetchActiveAuctions(params?: {
  page?: number;
  limit?: number;
}) {
  return auctionAPI.active(params || {});
}

export async function fetchMyAuctions(params?: {
  page?: number;
  limit?: number;
}) {
  return auctionAPI.my(params || {});
}

export default {
  fetchList,
  fetchAuction,
  fetchActiveAuctions,
  fetchMyAuctions,
};

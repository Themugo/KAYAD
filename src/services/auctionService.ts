// Auction Service - API calls for auction functionality
import { auctionAPI } from '../api/api.exports';

export interface Auction {
  id: string;
  carId: string;
  title: string;
  startPrice: number;
  currentPrice: number;
  startTime: string;
  endTime: string;
  status: 'upcoming' | 'live' | 'ended';
  bidCount: number;
  highestBidder?: {
    id: string;
    name: string;
  };
}

export async function fetchList(params?: {
  page?: number;
  limit?: number;
  status?: string;
  brand?: string;
}) {
  return auctionAPI.list(params);
}

export async function fetchAuction(id: string) {
  return auctionAPI.get(id);
}

export async function fetchActiveAuctions(params?: {
  page?: number;
  limit?: number;
}) {
  return auctionAPI.active(params);
}

export async function fetchMyAuctions(params?: {
  page?: number;
  limit?: number;
}) {
  return auctionAPI.my(params);
}

export default {
  fetchList,
  fetchAuction,
  fetchActiveAuctions,
  fetchMyAuctions,
};

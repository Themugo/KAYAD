import { auctionAPI, carsAPI, bidsAPI } from '../api/api';

const AXIOS_TIMEOUT = 15000;

function getErrorMessage(error) {
  if (!error) return 'Could not load auctions. Please try again.';
  if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
    return 'Network error. Please check your connection.';
  }
  if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
    return 'Request timed out. Please try again.';
  }
  if (error.response?.status === 401) return 'Authentication required. Please sign in.';
  if (error.response?.status === 403) return 'Access denied.';
  if (error.response?.status === 404) return 'No auctions found.';
  if (error.response?.status >= 500) return 'Server error. Please try again later.';
  return 'Could not load auctions. Please try again.';
}

function enrichAuction(a) {
  const car = a.car || a.carId || {};
  const now = Date.now();
  const start = a.startTime ? new Date(a.startTime).getTime() : car.auctionStartTime ? new Date(car.auctionStartTime).getTime() : 0;
  const end = a.endTime ? new Date(a.endTime).getTime() : car.auctionEnd ? new Date(car.auctionEnd).getTime() : 0;
  let timeStatus = 'scheduled';
  if (a.status === 'cancelled') timeStatus = 'cancelled';
  else if (a.status === 'completed' || a.status === 'pending_payment') timeStatus = 'ended';
  else if (start > 0 && end > 0 && start <= now && end > now) timeStatus = 'live';
  else if (end > 0 && end <= now) timeStatus = 'ended';
  else if (start > now) timeStatus = 'scheduled';

  return {
    _id: a._id,
    carId: car._id || a.carId,
    title: car.title || 'Untitled Vehicle',
    image: Array.isArray(car.images) ? (car.images[0]?.url || car.images[0] || '') : '',
    brand: car.brand || '',
    model: car.model || '',
    year: car.year || '',
    price: car.price || 0,
    currentBid: a.highestBid || car.currentBid || 0,
    bidsCount: a.bidHistory?.length || car.bidsCount || 0,
    startTime: a.startTime || car.auctionStartTime,
    endTime: a.endTime || car.auctionEnd,
    status: a.status || car.auctionStatus || 'draft',
    timeStatus,
    roomId: a.roomId || car._id?.toString(),
    fuel: car.fuel,
    transmission: car.transmission,
    mileage: car.mileage,
    location: car.location,
    dealer: car.dealer,
    startingBid: a.startingBid || 0,
    winner: a.winner || car.winner || null,
    allowBid: car.allowBid,
    isLive: timeStatus === 'live',
    paymentStatus: a.paymentStatus || 'pending',
    paymentDeadline: a.paymentDeadline,
  };
}

export async function fetchList(params = {}) {
  const { page = 1, limit = 20, status, search, sort, timeout = AXIOS_TIMEOUT } = params;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    const res = await auctionAPI.list({ page, limit, status, search, sort });
    clearTimeout(timeoutId);
    const auctions = (res.auctions || res.data || []).map(enrichAuction);
    return {
      auctions,
      pagination: res.pagination || { page, limit, total: auctions.length, pages: 1 },
    };
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

export async function fetchActive(params = {}) {
  const { page = 1, limit = 20, timeout = AXIOS_TIMEOUT } = params;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    const res = await auctionAPI.active({ page, limit });
    clearTimeout(timeoutId);
    const auctions = (res.auctions || res.data || []).map(enrichAuction);
    return {
      auctions,
      pagination: res.pagination || { page, limit, total: auctions.length, pages: 1 },
    };
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

export async function fetchMine(params = {}) {
  const { page = 1, limit = 20, timeout = AXIOS_TIMEOUT } = params;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    const res = await auctionAPI.my({ page, limit });
    clearTimeout(timeoutId);
    const auctions = (res.auctions || res.data || []).map(enrichAuction);
    return {
      auctions,
      pagination: res.pagination || { page, limit, total: auctions.length, pages: 1 },
    };
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

export async function fetchOne(id, params = {}) {
  const { timeout = AXIOS_TIMEOUT } = params;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    const res = await auctionAPI.get(id);
    clearTimeout(timeoutId);
    return {
      auction: enrichAuction(res.auction || res),
      bids: res.bids || [],
    };
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

export async function fetchFromCars(params = {}) {
  const { page = 1, limit = 20, timeout = AXIOS_TIMEOUT, ...filters } = params;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    const res = await carsAPI.list({ page, limit, ...filters, category: 'auction' });
    clearTimeout(timeoutId);
    const cars = res.cars || res.data || [];
    return {
      auctions: cars.map((c) => enrichAuction({ car: c })),
      pagination: res.pagination || { page, limit, total: cars.length, pages: 1 },
    };
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

export { getErrorMessage };

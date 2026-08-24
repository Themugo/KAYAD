import { api, unwrap } from '../api/api';

// Backend contract: GET /api/auctions → { success, auctions, pagination }
// (backend/controllers/auctionController.js listAuctions).
export const fetchList = (params = {}) =>
  api.get('/auctions', { params }).then(unwrap);

export const fetchOne = (id) =>
  api.get(`/auctions/${id}`).then(unwrap);

export const fetchActive = () =>
  api.get('/auctions/active').then(unwrap);

export const fetchMine = () =>
  api.get('/auctions/my').then(unwrap);

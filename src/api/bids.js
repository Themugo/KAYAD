import { api, unwrap, withDemo } from './core';
import { demoAPI } from '../data/demoAPI';

const _bidsAPI = {
  place: (carId, body) => api.post(`/bids/${carId}/bid`, body).then(unwrap),
  getForCar: (carId) => api.get(`/bids/${carId}/bids`).then(unwrap),
  endAuction: (carId) => api.post(`/bids/${carId}/end`).then(unwrap),
  adminAll: (params) => api.get('/bids/admin/all', { params }).then(unwrap),
  adminSuspicious: () => api.get('/bids/admin/suspicious').then(unwrap),
  adminSetWinner: (bidId) => api.post(`/bids/admin/${bidId}/set-winner`).then(unwrap),
};
export const bidsAPI = withDemo(_bidsAPI, demoAPI.bids);

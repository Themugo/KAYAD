import { api, unwrap, withDemo } from './core';
import { demoAPI } from '../data/demoAPI';

const _dealerAPI = {
  earnings: (params) => api.get('/dealer/earnings', { params }).then(unwrap),
  cars: (params) => api.get('/dealer/cars', { params }).then(unwrap),
  analytics: (params) => api.get('/dealer/analytics', { params }).then(unwrap),
  summary: () => api.get('/dealer/summary').then(unwrap),
  quickStats: () => api.get('/dealer/quick-stats').then(unwrap),
  bids: (params) => api.get('/dealer/bids', { params }).then(unwrap),
  duplicate: (carId) => api.post(`/dealer/cars/${carId}/duplicate`).then(unwrap),
  markSold: (carId, body) => api.patch(`/dealer/cars/${carId}/mark-sold`, body).then(unwrap),
  acceptBid: (carId, bidId) => api.post(`/dealer/cars/${carId}/accept-bid`, { bidId }).then(unwrap),
  rejectBid: (carId, bidId) => api.post(`/dealer/cars/${carId}/reject-bid`, { bidId }).then(unwrap),
  bulkStatus: (body) => api.patch('/dealer/cars/bulk-status', body).then(unwrap),
  exportCSV: (params) => api.get('/dealer/cars', { params, responseType: 'blob' }).then(r => r.data),
  getTeam: () => api.get('/dealer/team').then(unwrap),
  inviteMember: (body) => api.post('/dealer/team/invite', body).then(unwrap),
  updateMember: (memberId, body) => api.patch(`/dealer/team/${memberId}`, body).then(unwrap),
  removeMember: (memberId) => api.delete(`/dealer/team/${memberId}`).then(unwrap),
  getSettlement: () => api.get('/dealer/settlement').then(unwrap),
  updateSettlement: (body) => api.put('/dealer/settlement', body).then(unwrap),
};
export const dealerAPI = withDemo(_dealerAPI, demoAPI.dealer);

const _dealerAuctionAPI = {
  start: (carId, body) => api.post(`/dealer/cars/${carId}/auction/start`, body).then(unwrap),
  end: (carId) => api.post(`/dealer/cars/${carId}/auction/end`).then(unwrap),
  extend: (carId, hours) => api.post(`/dealer/cars/${carId}/auction/extend`, { hours }).then(unwrap),
};
export const dealerAuctionAPI = withDemo(_dealerAuctionAPI, demoAPI.auctionAdmin);

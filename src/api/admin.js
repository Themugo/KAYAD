import { api, unwrap, withDemo } from './core';
import { demoAPI } from '../data/demoAPI';

const _adminAPI = {
  stats: () => api.get('/admin/stats').then(unwrap),
  users: (params) => api.get('/admin/users', { params }).then(unwrap),
  toggleBan: (userId) => api.post(`/admin/users/${userId}/toggle-ban`).then(unwrap),
  approveDealer: (userId) => api.post(`/admin/users/${userId}/approve-dealer`).then(unwrap),
  cars: (params) => api.get('/admin/cars', { params }).then(unwrap),
  deleteCar: (carId) => api.delete(`/admin/cars/${carId}`).then(unwrap),
  updateSellerSettings: (userId, body) => api.put(`/admin/users/${userId}/seller-settings`, body).then(unwrap),
  getConfig: () => api.get('/admin/config').then(unwrap),
  updateConfig: (body) => api.put('/admin/config', body).then(unwrap),
  getAuditLog: (params) => api.get('/admin/audit-log', { params }).then(unwrap),
  appendAuditLog: (body) => api.post('/admin/audit-log', body).then(unwrap),
  testMpesa: (body) => api.post('/admin/daraja/test', body).then(unwrap),
  systemKillSwitch: (body) => api.post('/admin/system/kill-switch', body).then(unwrap),
  systemRecover: (body) => api.post('/admin/system/recover', body).then(unwrap),
  verifyDealer: (userId, body) => api.post(`/admin/users/${userId}/verify-dealer`, body).then(unwrap),
  verifyCar: (carId, body) => api.post(`/admin/cars/${carId}/verify`, body).then(unwrap),
  moderateCar: (carId, body) => api.post(`/admin/cars/${carId}/moderate`, body).then(unwrap),
  getStaff: () => api.get('/admin/staff').then(unwrap),
  createStaff: (body) => api.post('/admin/staff', body).then(unwrap),
  updateStaff: (id, body) => api.put(`/admin/staff/${id}`, body).then(unwrap),
  deleteStaff: (id) => api.delete(`/admin/staff/${id}`).then(unwrap),
  seedDepartments: () => api.post('/admin/seed-departments').then(unwrap),
  reseed: () => api.post('/admin/reseed').then(unwrap),
  deleteUser: (userId) => api.delete(`/admin/users/${userId}`).then(unwrap),
  deactivateUser: (userId) => api.put(`/admin/users/${userId}/deactivate`).then(unwrap),
  demoStatus: () => api.get('/admin/demo/status').then(unwrap),
  demoCleanup: () => api.delete('/admin/demo/cleanup').then(unwrap),
  assignPackage: (userId, body) => api.patch(`/admin/dealers/${userId}/package`, body).then(unwrap),
  updatePackages: (packages) => api.put('/admin/config/packages', { packages }).then(unwrap),
  reviews: (params) => api.get('/admin/reviews', { params }).then(unwrap),
  deleteReview: (id) => api.delete(`/admin/reviews/${id}`).then(unwrap),
  referrals: (params) => api.get('/admin/referrals', { params }).then(unwrap),
  referralStats: () => api.get('/admin/referrals/stats').then(unwrap),
  referralDetail: (id) => api.get(`/admin/referrals/${id}`).then(unwrap),
  creditReferral: (id, body) => api.post(`/admin/referrals/${id}/credit`, body).then(unwrap),
  expireReferral: (id) => api.post(`/admin/referrals/${id}/expire`).then(unwrap),
  userReferrals: (userId) => api.get(`/admin/users/${userId}/referrals`).then(unwrap),
  chats: (params) => api.get('/admin/chats', { params }).then(unwrap),
  chatMessages: (chatId) => api.get(`/admin/chats/${chatId}/messages`).then(unwrap),
  deleteChatMessage: (chatId, msgId) => api.delete(`/admin/chats/${chatId}/messages/${msgId}`).then(unwrap),
  blockChat: (chatId) => api.post(`/admin/chats/${chatId}/block`).then(unwrap),
  unblockChat: (chatId) => api.post(`/admin/chats/${chatId}/unblock`).then(unwrap),
  marketData: (params) => api.get('/admin/market-data', { params }).then(unwrap),
  marketDataDetail: (id) => api.get(`/admin/market-data/${id}`).then(unwrap),
  createMarketData: (body) => api.post('/admin/market-data', body).then(unwrap),
  updateMarketData: (id, body) => api.put(`/admin/market-data/${id}`, body).then(unwrap),
  deleteMarketData: (id) => api.delete(`/admin/market-data/${id}`).then(unwrap),
  bulkMarketData: (entries) => api.post('/admin/market-data/bulk', { entries }).then(unwrap),
  alerts: (params) => api.get('/admin/alerts', { params }).then(unwrap),
  markAlertRead: (id) => api.post(`/admin/alerts/${id}/read`).then(unwrap),
  markAllAlertsRead: () => api.post('/admin/alerts/read-all').then(unwrap),
  systemHealth: () => api.get('/admin/system/health').then(unwrap),
};
export const adminAPI = withDemo(_adminAPI, demoAPI.admin);

const _auctionAdminAPI = {
  start: (carId, body) => api.post(`/auction-admin/${carId}/start`, body).then(unwrap),
  end: (carId) => api.post(`/auction-admin/${carId}/end`).then(unwrap),
  extend: (carId, body) => api.post(`/auction-admin/${carId}/extend`, body).then(unwrap),
  bidHistory: (carId) => api.get(`/auction-admin/${carId}/bids`).then(unwrap),
  setWinner: (carId, bidId) => api.post(`/auction-admin/${carId}/set-winner`, { bidId }).then(unwrap),
};
export const auctionAdminAPI = withDemo(_auctionAdminAPI, demoAPI.auctionAdmin);

export const adsAPI = {
  list: (params) => api.get('/ads', { params }).then(unwrap),
  adminList: () => api.get('/admin/ads').then(unwrap),
  create: (body) => api.post('/admin/ads', body).then(unwrap),
  update: (id, body) => api.put(`/admin/ads/${id}`, body).then(unwrap),
  remove: (id) => api.delete(`/admin/ads/${id}`).then(unwrap),
};

export const adminPaymentsAPI = {
  list: (params) => api.get('/admin/payments', { params }).then(unwrap),
};

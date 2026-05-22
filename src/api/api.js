// src/api/api.js
// ============================================================
// KAYAD — FULL API LAYER (Production — no demo fallback)
// Every backend route mapped exactly to the Express routes
// ============================================================

import axios from 'axios';

// In dev: Vite proxy forwards /api → backend (see vite.config.js)
// In prod: Vercel rewrite forwards /api → Render backend (see vercel.json)
// Always use /api — never set VITE_API_BASE_URL to a full backend URL
const BASE = '/api';

// ─── MULTI-TAB DETECTION ──────────────────────────────────────
let _currentToken = localStorage.getItem('kayad_token');
window.addEventListener('storage', (e) => {
  if (e.key === 'kayad_token' && e.newValue !== _currentToken) {
    _currentToken = e.newValue;
    window.location.reload();
  }
});

// ─── AXIOS INSTANCE ───────────────────────────────────────────
const api = axios.create({ baseURL: BASE, withCredentials: true, timeout: 15000 });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('kayad_token');
  if (token) {
    cfg.headers = cfg.headers || {};
    cfg.headers.Authorization = `Bearer ${token}`;
    cfg._hadToken = true;
  }
  return cfg;
});

// Auto-refresh on 401 (token expired)
let _refreshing = false;
let _queue = [];

api.interceptors.response.use(
  r => r,
  async err => {
    const orig = err.config;
    const requestUrl = orig?.url || "";
    const hasStoredToken = !!localStorage.getItem('kayad_token');
    const skipRefresh =
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/register') ||
      requestUrl.includes('/auth/forgot-password') ||
      requestUrl.includes('/auth/reset-password') ||
      requestUrl.includes('/auth/refresh');

    if (err.response?.status === 401 && hasStoredToken && !skipRefresh && !orig._retry && orig._hadToken) {
      if (_refreshing) {
        return new Promise((res, rej) => _queue.push({ res, rej }))
          .then(token => {
            orig.headers = orig.headers || {};
            orig.headers.Authorization = `Bearer ${token}`;
            return api(orig);
          });
      }
      orig._retry = true;
      _refreshing = true;
      try {
        const storedToken = localStorage.getItem('kayad_token');
        const { data } = await axios.post(`${BASE}/auth/refresh`, {}, {
          withCredentials: true,
          headers: {
            'X-Requested-By': 'kayad-app',
            ...(storedToken ? { 'Authorization': `Bearer ${storedToken}` } : {}),
          }
        });
        localStorage.setItem('kayad_token', data.token);
        _queue.forEach(p => p.res(data.token));
        _queue = [];
        orig.headers = orig.headers || {};
        orig.headers.Authorization = `Bearer ${data.token}`;
        return api(orig);
      } catch {
        _queue.forEach(p => p.rej());
        _queue = [];
        localStorage.removeItem('kayad_token');
        window.dispatchEvent(new Event('kayad:auth-expired'));
      } finally {
        _refreshing = false;
      }
    }
    return Promise.reject(err);
  }
);

const unwrap = res => res.data;

// ============================================================
//  AUTH  — routes/authRoutes.js
// ============================================================

const _authAPI = {
  register: (body) => api.post('/auth/register', body).then(unwrap),
  login:    (body) => api.post('/auth/login', body).then(unwrap),
  refresh:  ()     => api.post('/auth/refresh').then(unwrap),
  logout:   ()     => api.post('/auth/logout').then(unwrap),
  profile:  ()     => api.get('/auth/profile').then(unwrap),
  me:       ()     => api.get('/auth/me').then(unwrap),
  changePassword:   (body) => api.put('/auth/change-password', body).then(unwrap),
  forgotPassword:   (body) => api.post('/auth/forgot-password', body).then(unwrap),
  resetPassword:    (body) => api.post('/auth/reset-password', body).then(unwrap),
  verifyEmail:         (token) => api.get(`/auth/verify-email/${token}`).then(unwrap),
  resendVerification:  (body)  => api.post('/auth/resend-verification', body).then(unwrap),
  updateProfile:       (body) => api.put('/auth/profile', body).then(unwrap),
};
export const authAPI = _authAPI;

// ============================================================
//  CARS — routes/carRoutes.js
// ============================================================
const _carsAPI = {
  list: (params) => api.get('/cars', { params }).then(unwrap),
  get:  (id)     => api.get(`/cars/${id}`).then(unwrap),
  insights: (id) => api.get(`/cars/${id}/insights`).then(unwrap),
  priceHistory: (id) => api.get(`/cars/${id}/price-history`).then(unwrap),
  trackClick: (id) => api.post(`/cars/${id}/click`).then(unwrap),

  create: (formData) =>
    api.post('/cars', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(unwrap),
  addImages: (id, formData) =>
    api.post(`/cars/${id}/images`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(unwrap),
  deleteImage: (id, idx) => api.delete(`/cars/${id}/images/${idx}`).then(unwrap),
  update:  (id, body) => api.put(`/cars/${id}`, body).then(unwrap),
  promote: (id, body) => api.patch(`/cars/${id}/promote`, body).then(unwrap),
  remove: (id)       => api.delete(`/cars/${id}`).then(unwrap),
  myCars:    ()      => api.get('/cars/dealer/my-cars').then(unwrap),
  analytics: ()      => api.get('/cars/dealer/analytics').then(unwrap),

  bid: (id, body)        => api.post(`/cars/${id}/bid`, body).then(unwrap),
  toggleFav: (id)        => api.post(`/cars/${id}/favorite`).then(unwrap),

  batch: (body)         => api.post('/cars/batch', body).then(unwrap),

  fraudCheck: (id) => api.get(`/cars/admin/${id}/fraud`).then(unwrap),
  adminStart: (id) => api.post(`/cars/admin/${id}/start`).then(unwrap),
  adminEnd:   (id) => api.post(`/cars/admin/${id}/end`).then(unwrap),
};
export const carsAPI = _carsAPI;

// ============================================================
//  BIDS — routes/bidRoutes.js
// ============================================================
const _bidsAPI = {
  place:           (carId, body) => api.post(`/bids/${carId}/bid`, body).then(unwrap),
  getForCar:       (carId)       => api.get(`/bids/${carId}/bids`).then(unwrap),
  endAuction:      (carId)       => api.post(`/bids/${carId}/end`).then(unwrap),
  adminAll:        (params)      => api.get('/bids/admin/all', { params }).then(unwrap),
  adminSuspicious: ()            => api.get('/bids/admin/suspicious').then(unwrap),
  adminSetWinner:  (bidId)       => api.post(`/bids/admin/${bidId}/set-winner`).then(unwrap),
};
export const bidsAPI = _bidsAPI;

const _paymentsAPI = {
  initiate:    (body)      => api.post('/payments/initiate', body, { timeout: 45000 }).then(unwrap),
  status:      (id)        => api.get(`/payments/status/${id}`).then(unwrap),
  myPayments:  ()          => api.get('/payments/my').then(unwrap),
  byCheckout:  (checkoutId)=> api.get(`/payments/checkout/${checkoutId}`).then(unwrap),
};
export const paymentsAPI = _paymentsAPI;

const _escrowAPI = {
  mine:    ()              => api.get('/escrow/my').then(unwrap),
  all:     (params)        => api.get('/escrow', { params }).then(unwrap),
  get:     (id)            => api.get(`/escrow/${id}`).then(unwrap),
  release: (id)            => api.post(`/escrow/${id}/release`).then(unwrap),
  refund:  (id)            => api.post(`/escrow/${id}/refund`).then(unwrap),
  dispute: (id, reason)    => api.post(`/escrow/${id}/dispute`, { reason }).then(unwrap),
  requestRelease: (id)     => api.post(`/escrow/${id}/request-release`).then(unwrap),
};
export const escrowAPI = _escrowAPI;

const _escrowVaultAPI = {
  init:             (carId)          => api.post(`/escrow-vault/${carId}/init`).then(unwrap),
  my:               ()               => api.get('/escrow-vault/my').then(unwrap),
  get:              (id)             => api.get(`/escrow-vault/${id}`).then(unwrap),
  forCar:           (carId)          => api.get(`/escrow-vault/car/${carId}`).then(unwrap),
  markInspection:   (id)             => api.post(`/escrow-vault/${id}/inspection-complete`).then(unwrap),
  requestOtp:       (id)             => api.post(`/escrow-vault/${id}/request-otp`).then(unwrap),
  release:          (id, otp)        => api.post(`/escrow-vault/${id}/release`, { otp }).then(unwrap),
  webhookFunded:    (id, body)       => api.post(`/escrow-vault/webhook/${id}/funded`, body).then(unwrap),
  adminAll:         ()               => api.get('/escrow-vault/admin/all').then(unwrap),
  adminConfirm:     (id)             => api.post(`/escrow-vault/${id}/admin-confirm-funding`).then(unwrap),
  adminRefund:      (id)             => api.post(`/escrow-vault/${id}/admin-refund`).then(unwrap),
};
export const escrowVaultAPI = _escrowVaultAPI;

const _dealerAPI = {
  earnings:   (params) => api.get('/dealer/earnings', { params }).then(unwrap),
  cars:       (params) => api.get('/dealer/cars', { params }).then(unwrap),
  analytics:  (params) => api.get('/dealer/analytics', { params }).then(unwrap),
  summary:    ()       => api.get('/dealer/summary').then(unwrap),
  quickStats: ()       => api.get('/dealer/quick-stats').then(unwrap),
  bids:       (params) => api.get('/dealer/bids', { params }).then(unwrap),

  duplicate:  (carId)        => api.post(`/dealer/cars/${carId}/duplicate`).then(unwrap),
  markSold:   (carId, body)  => api.patch(`/dealer/cars/${carId}/mark-sold`, body).then(unwrap),
  acceptBid:  (carId, bidId) => api.post(`/dealer/cars/${carId}/accept-bid`, { bidId }).then(unwrap),
  rejectBid:  (carId, bidId) => api.post(`/dealer/cars/${carId}/reject-bid`, { bidId }).then(unwrap),
  bulkStatus: (body)         => api.patch('/dealer/cars/bulk-status', body).then(unwrap),

  exportCSV:  (params)       => api.get('/dealer/cars', { params, responseType: 'blob' }).then(r => r.data),

  getTeam:        ()             => api.get('/dealer/team').then(unwrap),
  inviteMember:   (body)         => api.post('/dealer/team/invite', body).then(unwrap),
  updateMember:   (memberId, body) => api.patch(`/dealer/team/${memberId}`, body).then(unwrap),
  removeMember:   (memberId)     => api.delete(`/dealer/team/${memberId}`).then(unwrap),

  getSettlement:  ()             => api.get('/dealer/settlement').then(unwrap),
  updateSettlement: (body)       => api.put('/dealer/settlement', body).then(unwrap),
};
export const dealerAPI = _dealerAPI;

const _referralAPI = {
  stats: () => api.get('/referral/stats').then(unwrap),
  code:  () => api.get('/referral/code').then(unwrap),
};
export const referralAPI = _referralAPI;

const _adminAPI = {
  stats:         ()          => api.get('/admin/stats').then(unwrap),
  users:         (params)    => api.get('/admin/users', { params }).then(unwrap),
  toggleBan:     (userId)    => api.post(`/admin/users/${userId}/toggle-ban`).then(unwrap),
  approveDealer: (userId)    => api.post(`/admin/users/${userId}/approve-dealer`).then(unwrap),
  cars:          (params)    => api.get('/admin/cars', { params }).then(unwrap),
  deleteCar:     (carId)     => api.delete(`/admin/cars/${carId}`).then(unwrap),

  updateSellerSettings: (userId, body) => api.put(`/admin/users/${userId}/seller-settings`, body).then(unwrap),

  getConfig:      ()          => api.get('/admin/config').then(unwrap),
  updateConfig:   (body)      => api.put('/admin/config', body).then(unwrap),

  getAuditLog:    (params)    => api.get('/admin/audit-log', { params }).then(unwrap),
  appendAuditLog: (body)      => api.post('/admin/audit-log', body).then(unwrap),

  testMpesa:      (body)      => api.post('/admin/daraja/test', body).then(unwrap),

  systemKillSwitch: (body) => api.post('/admin/system/kill-switch', body).then(unwrap),
  systemRecover:    (body) => api.post('/admin/system/recover', body).then(unwrap),

  verifyDealer:    (userId, body) => api.post(`/admin/users/${userId}/verify-dealer`, body).then(unwrap),

  verifyCar:       (carId, body) => api.post(`/admin/cars/${carId}/verify`, body).then(unwrap),

  moderateCar:     (carId, body) => api.post(`/admin/cars/${carId}/moderate`, body).then(unwrap),

  getStaff:        ()            => api.get('/admin/staff').then(unwrap),
  createStaff:     (body)        => api.post('/admin/staff', body).then(unwrap),
  updateStaff:     (id, body)    => api.put(`/admin/staff/${id}`, body).then(unwrap),
  deleteStaff:     (id)          => api.delete(`/admin/staff/${id}`).then(unwrap),
  seedDepartments: ()            => api.post('/admin/seed-departments').then(unwrap),
  reseed:          ()            => api.post('/admin/reseed').then(unwrap),

  deleteUser:      (userId)      => api.delete(`/admin/users/${userId}`).then(unwrap),
  deactivateUser:  (userId)      => api.put(`/admin/users/${userId}/deactivate`).then(unwrap),

  demoStatus:      ()            => api.get('/admin/demo/status').then(unwrap),
  demoCleanup:     ()            => api.delete('/admin/demo/cleanup').then(unwrap),

  assignPackage:   (userId, body) => api.patch(`/admin/dealers/${userId}/package`, body).then(unwrap),
  updatePackages:  (packages) => api.put('/admin/config/packages', { packages }).then(unwrap),

  reviews:         (params)    => api.get('/admin/reviews', { params }).then(unwrap),
  deleteReview:    (id)        => api.delete(`/admin/reviews/${id}`).then(unwrap),

  referrals:        (params)    => api.get('/admin/referrals', { params }).then(unwrap),
  referralStats:    ()          => api.get('/admin/referrals/stats').then(unwrap),
  referralDetail:   (id)        => api.get(`/admin/referrals/${id}`).then(unwrap),
  creditReferral:   (id, body)  => api.post(`/admin/referrals/${id}/credit`, body).then(unwrap),
  expireReferral:   (id)        => api.post(`/admin/referrals/${id}/expire`).then(unwrap),
  userReferrals:    (userId)    => api.get(`/admin/users/${userId}/referrals`).then(unwrap),

  chats:            (params)    => api.get('/admin/chats', { params }).then(unwrap),
  chatMessages:     (chatId)    => api.get(`/admin/chats/${chatId}/messages`).then(unwrap),
  deleteChatMessage: (chatId, msgId) => api.delete(`/admin/chats/${chatId}/messages/${msgId}`).then(unwrap),
  blockChat:        (chatId)    => api.post(`/admin/chats/${chatId}/block`).then(unwrap),
  unblockChat:      (chatId)    => api.post(`/admin/chats/${chatId}/unblock`).then(unwrap),

  marketData:       (params)    => api.get('/admin/market-data', { params }).then(unwrap),
  marketDataDetail: (id)        => api.get(`/admin/market-data/${id}`).then(unwrap),
  createMarketData: (body)      => api.post('/admin/market-data', body).then(unwrap),
  updateMarketData: (id, body)  => api.put(`/admin/market-data/${id}`, body).then(unwrap),
  deleteMarketData: (id)        => api.delete(`/admin/market-data/${id}`).then(unwrap),
  bulkMarketData:  (entries)   => api.post('/admin/market-data/bulk', { entries }).then(unwrap),

  alerts:          (params)    => api.get('/admin/alerts', { params }).then(unwrap),
  markAlertRead:   (id)        => api.post(`/admin/alerts/${id}/read`).then(unwrap),
  markAllAlertsRead: ()        => api.post('/admin/alerts/read-all').then(unwrap),

  systemHealth:    ()          => api.get('/admin/system/health').then(unwrap),
};
export const adminAPI = _adminAPI;

// ============================================================
//  AUCTION ADMIN — routes/auctionAdminRoutes.js (ADMIN ONLY)
// ============================================================
const _auctionAdminAPI = {
  start:     (carId, body)  => api.post(`/auction-admin/${carId}/start`, body).then(unwrap),
  end:       (carId)        => api.post(`/auction-admin/${carId}/end`).then(unwrap),
  extend:    (carId, body)  => api.post(`/auction-admin/${carId}/extend`, body).then(unwrap),
  bidHistory:(carId)        => api.get(`/auction-admin/${carId}/bids`).then(unwrap),
  setWinner: (carId, bidId) => api.post(`/auction-admin/${carId}/set-winner`, { bidId }).then(unwrap),
};
export const auctionAdminAPI = _auctionAdminAPI;

const _dealerAuctionAPI = {
  start:     (carId, body)  => api.post(`/dealer/cars/${carId}/auction/start`, body).then(unwrap),
  end:       (carId)        => api.post(`/dealer/cars/${carId}/auction/end`).then(unwrap),
  extend:    (carId, hours) => api.post(`/dealer/cars/${carId}/auction/extend`, { hours }).then(unwrap),
};
export const dealerAuctionAPI = _dealerAuctionAPI;

const _favoritesAPI = {
  list:   ()      => api.get('/favorites').then(unwrap),
  add:    (carId) => api.post(`/favorites/${carId}`).then(unwrap),
  remove: (carId) => api.delete(`/favorites/${carId}`).then(unwrap),
  toggle: (carId) => api.post(`/favorites/${carId}/toggle`).then(unwrap),
  setPriceAlert: (carId, notify) => api.put(`/favorites/${carId}/price-alert`, { notifyOnPriceDrop: notify }).then(unwrap),
};
export const favoritesAPI = _favoritesAPI;

const _chatAPI = {
  inbox:    ()               => api.get('/chat').then(unwrap),
  start:    (body)           => api.post('/chat', body).then(unwrap),
  messages: (chatId, params) => api.get(`/chat/${chatId}/messages`, { params }).then(unwrap),
  send:     (chatId, body)   => api.post(`/chat/${chatId}/message`, body).then(unwrap),
  seen:     (chatId)         => api.post(`/chat/${chatId}/seen`).then(unwrap),
  leave:    (chatId)         => api.delete(`/chat/${chatId}`).then(unwrap),
};
export const chatAPI = _chatAPI;

const _notifAPI = {
  list:        (params) => api.get('/notifications', { params }).then(unwrap),
  markRead:    (id)     => api.post(`/notifications/${id}/read`).then(unwrap),
  markAllRead: ()       => api.post('/notifications/read-all').then(unwrap),
  remove:      (id)     => api.delete(`/notifications/${id}`).then(unwrap),
};
export const notifAPI = _notifAPI;

const _savedSearchAPI = {
  list:   ()             => api.get('/saved-searches').then(unwrap),
  create: (body)         => api.post('/saved-searches', body).then(unwrap),
  update: (id, body)     => api.put(`/saved-searches/${id}`, body).then(unwrap),
  remove: (id)           => api.delete(`/saved-searches/${id}`).then(unwrap),
};
export const savedSearchAPI = _savedSearchAPI;

const _ntsaAPI = {
  list:    (params)    => api.get('/ntsa-verification', { params }).then(unwrap),
  queue:   (carId)     => api.post('/ntsa-verification', { carId }).then(unwrap),
  process: (id, body)  => api.post(`/ntsa-verification/${id}/process`, body).then(unwrap),
  addDoc:  (id, body)  => api.post(`/ntsa-verification/${id}/documents`, body).then(unwrap),
  status:  (carId)     => api.get(`/ntsa-verification/car/${carId}/status`).then(unwrap),
};
export const ntsaAPI = _ntsaAPI;

export const buyerVerificationAPI = {
  submitPreApproval: (body) => api.post('/users/bank-pre-approval', body).then(unwrap),
  removePreApproval: ()     => api.delete('/users/bank-pre-approval').then(unwrap),
};

const _inspectionAPI = {
  order:           (body)           => api.post('/inspections/order', body).then(unwrap),
  confirmPayment:  (checkoutRequestID) => api.post('/inspections/confirm-payment', { checkoutRequestID }).then(unwrap),
  myOrders:        ()               => api.get('/inspections/my').then(unwrap),
  myTasks:         ()               => api.get('/inspections/my-tasks').then(unwrap),
  list:            (params)         => api.get('/inspections', { params }).then(unwrap),
  availableInspectors: ()           => api.get('/inspections/available-inspectors').then(unwrap),
  assign:          (id, inspectorId)=> api.post(`/inspections/${id}/assign`, { inspectorId }).then(unwrap),
  start:           (id)             => api.post(`/inspections/${id}/start`).then(unwrap),
  submit:          (id, body)       => api.post(`/inspections/${id}/submit`, body).then(unwrap),
  get:             (id)             => api.get(`/inspections/${id}`).then(unwrap),
  forCar:          (carId)          => api.get(`/inspections/car/${carId}`).then(unwrap),
};
export const inspectionAPI = _inspectionAPI;

const _reviewsAPI = {
  create:       (body)     => api.post('/reviews', body).then(unwrap),
  mine:         ()         => api.get('/reviews/my').then(unwrap),
  forDealer:    (dealerId) => api.get(`/reviews/dealer/${dealerId}`).then(unwrap),
  remove:       (id)       => api.delete(`/reviews/${id}`).then(unwrap),
};
export const reviewsAPI = _reviewsAPI;

const _transactionsAPI = {
  list:    (params) => api.get('/transactions', { params }).then(unwrap),
  get:     (id)     => api.get(`/transactions/${id}`).then(unwrap),
  summary: ()       => api.get('/transactions/summary').then(unwrap),
};
export const transactionsAPI = _transactionsAPI;

// ============================================================
//  ADS — routes/adRoutes.js (/ads) + adminRoutes.js (/admin/ads)
// ============================================================
export const adsAPI = {
  list:       (params) => api.get('/ads', { params }).then(unwrap),
  adminList:  ()       => api.get('/admin/ads').then(unwrap),
  create:     (body)   => api.post('/admin/ads', body).then(unwrap),
  update:     (id, body) => api.put(`/admin/ads/${id}`, body).then(unwrap),
  remove:     (id)     => api.delete(`/admin/ads/${id}`).then(unwrap),
};

// ============================================================
//  ADMIN PAYMENTS — routes/adminRoutes.js (/admin/payments)
// ============================================================
export const adminPaymentsAPI = {
  list: (params) => api.get('/admin/payments', { params }).then(unwrap),
};

// Utility: format KES
export { api };
export const formatKES = (n) =>
  'KES ' + Number(n || 0).toLocaleString('en-KE');

export default api;

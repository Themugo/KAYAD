// src/api/api.js
// ============================================================
// KAYAD — FULL API LAYER
// Every backend route mapped exactly to the Express routes
// ============================================================

import axios from 'axios';
import { demoAPI } from '../data/demoAPI';

const BASE = '/api';

// ─── Demo mode auto-detection ────────────────────────────────
let __DEMO_MODE__ = false;
export const isDemoMode = () => __DEMO_MODE__;

// Try backend on startup — if unreachable, switch to demo
(function initDemoCheck() {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), 3000);
  axios.get(`${BASE}/cars?limit=1`, { signal: controller.signal })
    .catch(() => {
      __DEMO_MODE__ = true;
      console.info('[Demo] Backend unreachable, using demo data');
    });
})();

// ─── AXIOS INSTANCE ───────────────────────────────────────────
const api = axios.create({ baseURL: BASE, withCredentials: true, timeout: 4000 });

// Attach JWT from localStorage on every request
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('kayad_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// Auto-refresh on 401 (token expired)
let _refreshing = false;
let _queue = [];

api.interceptors.response.use(
  r => r,
  async err => {
    // Network error → switch to demo mode
    if (!err.response) {
      __DEMO_MODE__ = true;
      return Promise.reject(err);
    }
    // Demo token hitting real backend → activate demo mode, don't attempt refresh
    if (err.response?.status === 401 && isDemoToken()) {
      __DEMO_MODE__ = true;
      return Promise.reject(err);
    }
    const orig = err.config;
    if (err.response?.status === 401 && !orig._retry) {
      if (_refreshing) {
        return new Promise((res, rej) => _queue.push({ res, rej }))
          .then(token => { orig.headers.Authorization = `Bearer ${token}`; return api(orig); });
      }
      orig._retry = true;
      _refreshing = true;
      try {
        const { data } = await axios.post(`${BASE}/auth/refresh`, {}, { withCredentials: true });
        localStorage.setItem('kayad_token', data.token);
        _queue.forEach(p => p.res(data.token));
        _queue = [];
        orig.headers.Authorization = `Bearer ${data.token}`;
        return api(orig);
      } catch {
        _queue.forEach(p => p.rej());
        _queue = [];
        localStorage.removeItem('kayad_token');
        window.location.href = '/login';
      } finally {
        _refreshing = false;
      }
    }
    return Promise.reject(err);
  }
);

// ─── HELPERS ───────────────────────────────────────────────────
const unwrap = res => res.data;

// Wrap a real API object with demo fallback
function withDemo(realObj, demoObj) {
  const wrapped = {};
  for (const key of Object.keys(realObj)) {
    wrapped[key] = async (...args) => {
      if (__DEMO_MODE__) return demoObj[key](...args);
      try { return await realObj[key](...args); }
      catch (err) {
        if (!err.response) {
          __DEMO_MODE__ = true;
          return demoObj[key](...args);
        }
        throw err;
      }
    };
  }
  return wrapped;
}

// ============================================================
//  AUTH  — routes/authRoutes.js
// ============================================================
// Check if the stored token is a demo token (base64-encoded JSON with @demo.com email)
const isDemoToken = () => {
  const t = localStorage.getItem('kayad_token');
  if (!t) return false;
  try {
    const p = JSON.parse(atob(t));
    return p.email?.endsWith('@demo.com') || p.superAdmin === true;
  } catch { return false; }
};

const _authAPI = {
  register: (body) => api.post('/auth/register', body).then(unwrap),
  login:    (body) => {
    if (body.email?.endsWith('@demo.com') || body.email === 'jimmythemugo@gmail.com') {
      __DEMO_MODE__ = true;
      return demoAPI.auth.login(body);
    }
    return api.post('/auth/login', body).then(unwrap);
  },
  refresh:  ()     => isDemoToken() ? (__DEMO_MODE__ = true, demoAPI.auth.refresh()) : api.post('/auth/refresh').then(unwrap),
  logout:   ()     => isDemoToken() ? demoAPI.auth.logout() : api.post('/auth/logout').then(unwrap),
  profile:  ()     => isDemoToken() ? demoAPI.auth.profile() : api.get('/auth/profile').then(unwrap),
  me:       ()     => isDemoToken() ? (__DEMO_MODE__ = true, demoAPI.auth.me()) : api.get('/auth/me').then(unwrap),
  changePassword: (body) => isDemoToken() ? demoAPI.auth.changePassword(body) : api.put('/auth/change-password', body).then(unwrap),
  updateProfile:  (body) => isDemoToken() ? demoAPI.auth.updateProfile(body) : api.put('/auth/profile', body).then(unwrap),
};
export const authAPI = withDemo(_authAPI, demoAPI.auth);

// ============================================================
//  CARS — routes/carRoutes.js
// ============================================================
const _carsAPI = {
  // Public
  list: (params) => api.get('/cars', { params }).then(unwrap),
  get:  (id)     => api.get(`/cars/${id}`).then(unwrap),
  insights: (id) => api.get(`/cars/${id}/insights`).then(unwrap),
  trackClick: (id) => api.post(`/cars/${id}/click`).then(unwrap),

  // Dealer
  create: (formData) =>
    api.post('/cars', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(unwrap),
  update: (id, body) => api.put(`/cars/${id}`, body).then(unwrap),
  remove: (id)       => api.delete(`/cars/${id}`).then(unwrap),
  myCars:    ()      => api.get('/cars/dealer/my-cars').then(unwrap),
  analytics: ()      => api.get('/cars/dealer/analytics').then(unwrap),

  // Actions
  buy: (id)              => api.post(`/cars/${id}/buy`).then(unwrap),
  bid: (id, body)        => api.post(`/cars/${id}/bid`, body).then(unwrap),
  toggleFav: (id)        => api.post(`/cars/${id}/favorite`).then(unwrap),

  // Admin
  fraudCheck: (id) => api.get(`/cars/admin/${id}/fraud`).then(unwrap),
  adminStart: (id) => api.post(`/cars/admin/${id}/start`).then(unwrap),
  adminEnd:   (id) => api.post(`/cars/admin/${id}/end`).then(unwrap),
};
export const carsAPI = withDemo(_carsAPI, demoAPI.cars);

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
export const bidsAPI = withDemo(_bidsAPI, demoAPI.bids);

// ============================================================
//  PAYMENTS — routes/paymentRoutes.js
// ============================================================
const _paymentsAPI = {
  initiate:    (body)      => api.post('/payments/initiate', body).then(unwrap),
  status:      (id)        => api.get(`/payments/status/${id}`).then(unwrap),
  myPayments:  ()          => api.get('/payments/my').then(unwrap),
  byCheckout:  (checkoutId)=> api.get(`/payments/checkout/${checkoutId}`).then(unwrap),
};
export const paymentsAPI = withDemo(_paymentsAPI, demoAPI.payments);

// ============================================================
//  ESCROW — routes/escrowRoutes.js
// ============================================================
const _escrowAPI = {
  mine:    ()              => api.get('/escrow/my').then(unwrap),
  all:     (params)        => api.get('/escrow', { params }).then(unwrap),
  get:     (id)            => api.get(`/escrow/${id}`).then(unwrap),
  release: (id)            => api.post(`/escrow/${id}/release`).then(unwrap),
  refund:  (id)            => api.post(`/escrow/${id}/refund`).then(unwrap),
};
export const escrowAPI = withDemo(_escrowAPI, demoAPI.escrow);

// ============================================================
//  DEALER — routes/dealerRoutes.js
// ============================================================
const _dealerAPI = {
  earnings:   (params) => api.get('/dealer/earnings', { params }).then(unwrap),
  cars:       (params) => api.get('/dealer/cars', { params }).then(unwrap),
  analytics:  (params) => api.get('/dealer/analytics', { params }).then(unwrap),
  summary:    ()       => api.get('/dealer/summary').then(unwrap),
  quickStats: ()       => api.get('/dealer/quick-stats').then(unwrap),
  bids:       (params) => api.get('/dealer/bids', { params }).then(unwrap),
  escrows:    ()       => api.get('/dealer/escrows').then(unwrap),
};
export const dealerAPI = withDemo(_dealerAPI, demoAPI.dealer);

// ============================================================
//  ADMIN — routes/adminRoutes.js
// ============================================================
const _adminAPI = {
  stats:         ()          => api.get('/admin/stats').then(unwrap),
  users:         (params)    => api.get('/admin/users', { params }).then(unwrap),
  toggleBan:     (userId)    => api.post(`/admin/users/${userId}/toggle-ban`).then(unwrap),
  approveDealer: (userId)    => api.post(`/admin/users/${userId}/approve-dealer`).then(unwrap),
  cars:          (params)    => api.get('/admin/cars', { params }).then(unwrap),
  deleteCar:     (carId)     => api.delete(`/admin/cars/${carId}`).then(unwrap),

  // Seller Settings
  updateSellerSettings: (userId, body) => api.put(`/admin/users/${userId}/seller-settings`, body).then(unwrap),

  // Platform Config
  getConfig:      ()          => api.get('/admin/config').then(unwrap),
  updateConfig:   (body)      => api.put('/admin/config', body).then(unwrap),

  // Audit Log
  getAuditLog:    (params)    => api.get('/admin/audit-log', { params }).then(unwrap),
  appendAuditLog: (body)      => api.post('/admin/audit-log', body).then(unwrap),

  // M-Pesa Test
  testMpesa:      (body)      => api.post('/admin/daraja/test', body).then(unwrap),

  // System Kill-Switch
  systemKillSwitch: (body) => api.post('/admin/system/kill-switch', body).then(unwrap),
  systemRecover:    (body) => api.post('/admin/system/recover', body).then(unwrap),

  // Dealer Verification
  verifyDealer:    (userId, body) => api.post(`/admin/users/${userId}/verify-dealer`, body).then(unwrap),

  // NTSA / Car Verification
  verifyCar:       (carId, body) => api.post(`/admin/cars/${carId}/verify`, body).then(unwrap),
};
export const adminAPI = withDemo(_adminAPI, demoAPI.admin);

// ============================================================
//  AUCTION ADMIN — routes/auctionAdminRoutes.js
// ============================================================
const _auctionAdminAPI = {
  start:     (carId, body)  => api.post(`/auction-admin/${carId}/start`, body).then(unwrap),
  end:       (carId)        => api.post(`/auction-admin/${carId}/end`).then(unwrap),
  extend:    (carId, body)  => api.post(`/auction-admin/${carId}/extend`, body).then(unwrap),
  bidHistory:(carId)        => api.get(`/auction-admin/${carId}/bids`).then(unwrap),
  setWinner: (carId, bidId) => api.post(`/auction-admin/${carId}/set-winner`, { bidId }).then(unwrap),
};
export const auctionAdminAPI = withDemo(_auctionAdminAPI, demoAPI.auctionAdmin);

// ============================================================
//  FAVORITES — routes/favoriteRoutes.js
// ============================================================
const _favoritesAPI = {
  list:   ()      => api.get('/favorites').then(unwrap),
  add:    (carId) => api.post(`/favorites/${carId}`).then(unwrap),
  remove: (carId) => api.delete(`/favorites/${carId}`).then(unwrap),
  toggle: (carId) => api.post(`/favorites/${carId}/toggle`).then(unwrap),
};
export const favoritesAPI = withDemo(_favoritesAPI, demoAPI.favorites);

// ============================================================
//  CHAT — routes/chatRoutes.js
// ============================================================
const _chatAPI = {
  inbox:    ()               => api.get('/chat').then(unwrap),
  start:    (body)           => api.post('/chat', body).then(unwrap),
  messages: (chatId, params) => api.get(`/chat/${chatId}/messages`, { params }).then(unwrap),
  send:     (chatId, body)   => api.post(`/chat/${chatId}/message`, body).then(unwrap),
  seen:     (chatId)         => api.post(`/chat/${chatId}/seen`).then(unwrap),
  leave:    (chatId)         => api.delete(`/chat/${chatId}`).then(unwrap),
};
export const chatAPI = withDemo(_chatAPI, demoAPI.chat);

// ============================================================
//  NOTIFICATIONS — routes/notificationRoutes.js
// ============================================================
const _notifAPI = {
  list:        (params) => api.get('/notifications', { params }).then(unwrap),
  markRead:    (id)     => api.post(`/notifications/${id}/read`).then(unwrap),
  markAllRead: ()       => api.post('/notifications/read-all').then(unwrap),
  remove:      (id)     => api.delete(`/notifications/${id}`).then(unwrap),
};
export const notifAPI = withDemo(_notifAPI, demoAPI.notif);

// ============================================================
//  REVIEWS — routes/reviewRoutes.js
// ============================================================
const _reviewsAPI = {
  create:       (body)     => api.post('/reviews', body).then(unwrap),
  mine:         ()         => api.get('/reviews/my').then(unwrap),
  forDealer:    (dealerId) => api.get(`/reviews/dealer/${dealerId}`).then(unwrap),
  remove:       (id)       => api.delete(`/reviews/${id}`).then(unwrap),
};
export const reviewsAPI = withDemo(_reviewsAPI, demoAPI.reviews);

// ============================================================
//  TRANSACTIONS — routes/transactionRoutes.js
// ============================================================
const _transactionsAPI = {
  list:    (params) => api.get('/transactions', { params }).then(unwrap),
  get:     (id)     => api.get(`/transactions/${id}`).then(unwrap),
  summary: ()       => api.get('/transactions/summary').then(unwrap),
};
export const transactionsAPI = withDemo(_transactionsAPI, demoAPI.transactions);

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
export const formatKES = (n) =>
  'KES ' + Number(n || 0).toLocaleString('en-KE');

export default api;

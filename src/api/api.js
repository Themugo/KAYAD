// src/api/api.js
// ============================================================
// GARI MOTORS — FULL API LAYER
// Every backend route mapped exactly to the Express routes
// ============================================================

import axios from 'axios';

const BASE = '/api';

// ─── AXIOS INSTANCE ───────────────────────────────────────────
const api = axios.create({ baseURL: BASE, withCredentials: true });

// Attach JWT from localStorage on every request
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('gari_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// Auto-refresh on 401 (token expired)
let _refreshing = false;
let _queue = [];

api.interceptors.response.use(
  r => r,
  async err => {
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
        localStorage.setItem('gari_token', data.token);
        _queue.forEach(p => p.res(data.token));
        _queue = [];
        orig.headers.Authorization = `Bearer ${data.token}`;
        return api(orig);
      } catch {
        _queue.forEach(p => p.rej());
        _queue = [];
        localStorage.removeItem('gari_token');
        window.location.href = '/login';
      } finally {
        _refreshing = false;
      }
    }
    return Promise.reject(err);
  }
);

// ─── HELPER ───────────────────────────────────────────────────
const unwrap = res => res.data;

// ============================================================
//  AUTH  — routes/authRoutes.js
// ============================================================
export const authAPI = {
  register: (body) => api.post('/auth/register', body).then(unwrap),
  login:    (body) => api.post('/auth/login', body).then(unwrap),
  refresh:  ()     => api.post('/auth/refresh').then(unwrap),
  logout:   ()     => api.post('/auth/logout').then(unwrap),
  profile:  ()     => api.get('/auth/profile').then(unwrap),
  me:       ()     => api.get('/auth/me').then(unwrap),
};

// ============================================================
//  CARS — routes/carRoutes.js
// ============================================================
export const carsAPI = {
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

// ============================================================
//  BIDS — routes/bidRoutes.js
// ============================================================
export const bidsAPI = {
  place:           (carId, body) => api.post(`/bids/${carId}/bid`, body).then(unwrap),
  getForCar:       (carId)       => api.get(`/bids/${carId}/bids`).then(unwrap),
  endAuction:      (carId)       => api.post(`/bids/${carId}/end`).then(unwrap),
  adminAll:        (params)      => api.get('/bids/admin/all', { params }).then(unwrap),
  adminSuspicious: ()            => api.get('/bids/admin/suspicious').then(unwrap),
  adminSetWinner:  (bidId)       => api.post(`/bids/admin/${bidId}/set-winner`).then(unwrap),
};

// ============================================================
//  PAYMENTS — routes/paymentRoutes.js
// ============================================================
export const paymentsAPI = {
  initiate:    (body)      => api.post('/payments/initiate', body).then(unwrap),
  status:      (id)        => api.get(`/payments/status/${id}`).then(unwrap),
  myPayments:  ()          => api.get('/payments/my').then(unwrap),
  byCheckout:  (checkoutId)=> api.get(`/payments/checkout/${checkoutId}`).then(unwrap),
};

// ============================================================
//  ESCROW — routes/escrowRoutes.js
// ============================================================
export const escrowAPI = {
  mine:    ()              => api.get('/escrow/my').then(unwrap),
  all:     (params)        => api.get('/escrow', { params }).then(unwrap),
  get:     (id)            => api.get(`/escrow/${id}`).then(unwrap),
  release: (id)            => api.post(`/escrow/${id}/release`).then(unwrap),
  refund:  (id)            => api.post(`/escrow/${id}/refund`).then(unwrap),
};

// ============================================================
//  DEALER — routes/dealerRoutes.js
// ============================================================
export const dealerAPI = {
  earnings:   (params) => api.get('/dealer/earnings', { params }).then(unwrap),
  cars:       (params) => api.get('/dealer/cars', { params }).then(unwrap),
  analytics:  (params) => api.get('/dealer/analytics', { params }).then(unwrap),
  summary:    ()       => api.get('/dealer/summary').then(unwrap),
  quickStats: ()       => api.get('/dealer/quick-stats').then(unwrap),
};

// ============================================================
//  ADMIN — routes/adminRoutes.js
// ============================================================
export const adminAPI = {
  stats:         ()          => api.get('/admin/stats').then(unwrap),
  users:         (params)    => api.get('/admin/users', { params }).then(unwrap),
  toggleBan:     (userId)    => api.post(`/admin/users/${userId}/toggle-ban`).then(unwrap),
  approveDealer: (userId)    => api.post(`/admin/users/${userId}/approve-dealer`).then(unwrap),
  cars:          (params)    => api.get('/admin/cars', { params }).then(unwrap),
  deleteCar:     (carId)     => api.delete(`/admin/cars/${carId}`).then(unwrap),
};

// ============================================================
//  AUCTION ADMIN — routes/auctionAdminRoutes.js
// ============================================================
export const auctionAdminAPI = {
  start:     (carId, body)  => api.post(`/auction-admin/${carId}/start`, body).then(unwrap),
  end:       (carId)        => api.post(`/auction-admin/${carId}/end`).then(unwrap),
  extend:    (carId, body)  => api.post(`/auction-admin/${carId}/extend`, body).then(unwrap),
  bidHistory:(carId)        => api.get(`/auction-admin/${carId}/bids`).then(unwrap),
  setWinner: (carId, bidId) => api.post(`/auction-admin/${carId}/set-winner`, { bidId }).then(unwrap),
};

// ============================================================
//  FAVORITES — routes/favoriteRoutes.js
// ============================================================
export const favoritesAPI = {
  list:   ()      => api.get('/favorites').then(unwrap),
  add:    (carId) => api.post(`/favorites/${carId}`).then(unwrap),
  remove: (carId) => api.delete(`/favorites/${carId}`).then(unwrap),
  toggle: (carId) => api.post(`/favorites/${carId}/toggle`).then(unwrap),
};

// ============================================================
//  CHAT — routes/chatRoutes.js
// ============================================================
export const chatAPI = {
  inbox:    ()               => api.get('/chat').then(unwrap),
  start:    (body)           => api.post('/chat', body).then(unwrap),
  messages: (chatId, params) => api.get(`/chat/${chatId}/messages`, { params }).then(unwrap),
  send:     (chatId, body)   => api.post(`/chat/${chatId}/message`, body).then(unwrap),
  seen:     (chatId)         => api.post(`/chat/${chatId}/seen`).then(unwrap),
  leave:    (chatId)         => api.delete(`/chat/${chatId}`).then(unwrap),
};

// ============================================================
//  NOTIFICATIONS — routes/notificationRoutes.js
// ============================================================
export const notifAPI = {
  list:        (params) => api.get('/notifications', { params }).then(unwrap),
  markRead:    (id)     => api.post(`/notifications/${id}/read`).then(unwrap),
  markAllRead: ()       => api.post('/notifications/read-all').then(unwrap),
  remove:      (id)     => api.delete(`/notifications/${id}`).then(unwrap),
};

// ============================================================
//  REVIEWS — routes/reviewRoutes.js
// ============================================================
export const reviewsAPI = {
  create:       (body)     => api.post('/reviews', body).then(unwrap),
  mine:         ()         => api.get('/reviews/my').then(unwrap),
  forDealer:    (dealerId) => api.get(`/reviews/dealer/${dealerId}`).then(unwrap),
  remove:       (id)       => api.delete(`/reviews/${id}`).then(unwrap),
};

// ============================================================
//  TRANSACTIONS — routes/transactionRoutes.js
// ============================================================
export const transactionsAPI = {
  list:    (params) => api.get('/transactions', { params }).then(unwrap),
  get:     (id)     => api.get(`/transactions/${id}`).then(unwrap),
  summary: ()       => api.get('/transactions/summary').then(unwrap),
};

// Utility: format KES
export const formatKES = (n) =>
  'KES ' + Number(n || 0).toLocaleString('en-KE');

export default api;

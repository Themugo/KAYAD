// src/api/api.js
// ============================================================
// KAYAD — FULL API LAYER
// Every backend route mapped exactly to the Express routes
// ============================================================

import axios from 'axios';
import { demoAPI } from '../data/demoAPI';

// In dev: Vite proxy forwards /api → backend (see vite.config.js)
// In prod: Vercel rewrite forwards /api → Render backend (see vercel.json)
// Always use /api — never set VITE_API_BASE_URL to a full backend URL
const BASE = '/api';
const HEALTH_ENDPOINT = `${BASE}/health`;

// ─── Demo mode auto-detection ────────────────────────────────
// Production override: set VITE_ENABLE_DEMO=false to disable demo mode entirely
const DEMO_MODE_ENABLED = (import.meta.env?.VITE_ENABLE_DEMO ?? 'true') !== 'false';
let __DEMO_MODE__ = false;
export const isDemoMode = () => __DEMO_MODE__ && DEMO_MODE_ENABLED;
// Force demo mode on (used by the login page's demo quick-login buttons so
// the @demo.com accounts work instantly regardless of real-backend state).
// Respects VITE_ENABLE_DEMO environment variable to prevent accidental activation in production.
export const enableDemoMode = () => {
  if (DEMO_MODE_ENABLED && import.meta.env?.VITE_ENABLE_DEMO !== 'false') {
    __DEMO_MODE__ = true;
    // Clear any existing demo user state to prevent conflicts
    try {
      localStorage.removeItem('kayad_demo_user');
    } catch { /* ignore */ }
  }
};
let _backendProbePromise = null;
let _lastProbeAt = 0;
const PROBE_COOLDOWN_MS = 20_000;

export const checkBackendAvailability = async (retries = 2) => {
  const now = Date.now();
  if (_backendProbePromise) return _backendProbePromise;
  if (now - _lastProbeAt < PROBE_COOLDOWN_MS) return !__DEMO_MODE__;
  _lastProbeAt = now;
  _backendProbePromise = (async () => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await axios.get(HEALTH_ENDPOINT, { timeout: 5000 });
      __DEMO_MODE__ = false;
      return true;
    } catch (err) {
      const s = err.response?.status;
      const unavailable =
        !err.response ||
        err.code === 'ERR_NETWORK' ||
        err.code === 'ECONNABORTED' ||
        err.message?.includes('Network Error') ||
        [404, 502, 503, 504].includes(s);
      if (!unavailable) return true;
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 1000 * attempt));
        continue;
      }
      __DEMO_MODE__ = true;
      return false;
    }
  }
  return false;
  })();
  try {
    return await _backendProbePromise;
  } finally {
    _backendProbePromise = null;
  }
};

// Backend availability is checked lazily by API calls. Avoid probing /api/cars
// on page load; that endpoint can wake a sleeping backend and create noisy 502s
// before the UI has asked for data.

// ─── AXIOS INSTANCE ───────────────────────────────────────────
const api = axios.create({ baseURL: BASE, withCredentials: true, timeout: 15000 }); // 15s default; payment calls override to 45s
const RETRYABLE_STATUSES = new Set([429, 502, 503, 504]);
const IDEMPOTENT_METHODS = new Set(['get', 'head', 'options']);
const MAX_RETRIES = 2;

// Cookie debugging for authentication troubleshooting
api.interceptors.request.use((config) => {
  if (import.meta.env?.DEV || import.meta.env?.VITE_DEBUG_COOKIES === 'true') {
    console.log('🔍 API Request:', config.url, {
      method: config.method,
      hasCookies: document.cookie.length > 0,
      cookiePreview: document.cookie.substring(0, 100),
      withCredentials: config.withCredentials,
      demoMode: __DEMO_MODE__,
    });
  }
  return config;
}, (error) => {
  if (import.meta.env?.DEV || import.meta.env?.VITE_DEBUG_COOKIES === 'true') {
    console.error('🔍 API Request Error:', error);
  }
  return Promise.reject(error);
});

api.interceptors.response.use((response) => {
  if (import.meta.env?.DEV || import.meta.env?.VITE_DEBUG_COOKIES === 'true') {
    console.log('🔍 API Response:', response.config.url, {
      status: response.status,
      hasSetCookie: response.headers['set-cookie']?.length > 0,
      setCookiePreview: response.headers['set-cookie']?.[0]?.substring(0, 100),
    });
  }
  return response;
}, (error) => {
  if (import.meta.env?.DEV || import.meta.env?.VITE_DEBUG_COOKIES === 'true') {
    console.error('🔍 API Response Error:', error.config?.url, {
      status: error.response?.status,
      message: error.message,
    });
  }
  return Promise.reject(error);
});

// Auto-refresh on 401 (token expired)
let _refreshing = false;
let _queue = [];

api.interceptors.response.use(
  r => r,
  async err => {
    const orig = err.config || {};
    const method = String(orig.method || 'get').toLowerCase();
    const status = err.response?.status;
    const canRetry = IDEMPOTENT_METHODS.has(method) && (RETRYABLE_STATUSES.has(status) || !err.response);
    if (canRetry && (orig._retryCount || 0) < MAX_RETRIES) {
      orig._retryCount = (orig._retryCount || 0) + 1;
      const retryAfterHeader = Number(err.response?.headers?.['retry-after']);
      const retryAfterMs = Number.isFinite(retryAfterHeader) ? retryAfterHeader * 1000 : 0;
      const backoffMs = Math.max(retryAfterMs, 300 * (2 ** (orig._retryCount - 1)));
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
      return api(orig);
    }

    // Network error → switch to demo mode
    if (!err.response) {
      __DEMO_MODE__ = true;
      return Promise.reject(err);
    }

    const requestUrl = orig?.url || "";
    const skipRefresh =
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/register') ||
      requestUrl.includes('/auth/forgot-password') ||
      requestUrl.includes('/auth/reset-password') ||
      requestUrl.includes('/auth/refresh');

    if (err.response?.status === 401 && !skipRefresh && !orig._retry) {
      if (_refreshing) {
        return new Promise((res, rej) => _queue.push({ res, rej }))
          .then(() => api(orig));
      }
      orig._retry = true;
      _refreshing = true;
      try {
        await axios.post(`${BASE}/auth/refresh`, {}, {
          withCredentials: true,
          headers: { 'X-Requested-By': 'kayad-app' },
        });
        _queue.forEach(p => p.res());
        _queue = [];
        return api(orig);
      } catch {
        _queue.forEach(p => p.rej());
        _queue = [];
        window.dispatchEvent(new Event('kayad:auth-expired'));
      } finally {
        _refreshing = false;
      }
    }
    return Promise.reject(err);
  }
);

// ─── HELPERS ───────────────────────────────────────────────────
const unwrap = res => res.data;

// Check if demo mode is active (no localStorage token in cookie-based auth)
const isDemoToken = () => __DEMO_MODE__;

// Should we fall back to demo for this error?
// Yes when the backend is effectively unavailable:
//   • no response at all (network error / CORS / DNS)
//   • request timed out
//   • gateway errors (502/503/504) — common when a free-tier backend is asleep
//   • 404 on the API itself — backend not deployed at this origin
// No for genuine 400/401/403/409/422 from a LIVE backend — those are real
// validation/auth errors and must surface to the user (except a 401 paired
// with a demo token, which just means the real backend rejected a demo token).
const shouldFallbackToDemo = (err) => {
  if (!err.response) return true;                          // network / CORS / DNS / timeout
  if (err.code === 'ECONNABORTED') return true;            // axios timeout
  const s = err.response.status;
  if (s >= 500) return true;                               // backend failure / asleep
  if (s === 404) return true;                              // API not found at origin
  if (s === 401 && isDemoToken()) return true;             // real backend rejected a demo token
  return false;
};

// Wrap a real API object with demo fallback.
// Strategy:
// 1. If the token is a demo token → use demo API directly (real backend will reject it)
// 2. Otherwise → try real API first
// 3. On network error (no response) → fall back to demo
// 4. On 401 from real backend with a demo token → fall back to demo
function withDemo(realObj, demoObj) {
  const wrapped = {};
  for (const key of Object.keys(realObj)) {
    wrapped[key] = async (...args) => {
      // If using a demo token, go straight to demo API — real backend will reject it
      if (demoObj?.[key] && (isDemoToken() || __DEMO_MODE__)) {
        __DEMO_MODE__ = true;
        return demoObj[key](...args);
      }

      try { return await realObj[key](...args); }
      catch (err) {
        if (demoObj?.[key] && (__DEMO_MODE__ || shouldFallbackToDemo(err))) {
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

const _authAPI = {
  register: (body) => api.post('/auth/register', body).then(unwrap),
  login:    (body) => api.post('/auth/login', body).then(unwrap),
  refresh:  ()     => isDemoToken() ? (__DEMO_MODE__ = true, demoAPI.auth.refresh()) : api.post('/auth/refresh').then(unwrap),
  logout:   ()     => isDemoToken() ? demoAPI.auth.logout() : api.post('/auth/logout').then(unwrap),
  profile:  ()     => isDemoToken() ? demoAPI.auth.profile() : api.get('/auth/profile').then(unwrap),
  me:       ()     => isDemoToken() ? (__DEMO_MODE__ = true, demoAPI.auth.me()) : api.get('/auth/me').then(unwrap),
  changePassword:   (body) => isDemoToken() ? demoAPI.auth.changePassword(body) : api.put('/auth/change-password', body).then(unwrap),
  forgotPassword:   (body) => isDemoToken() ? demoAPI.auth.forgotPassword(body) : api.post('/auth/forgot-password', body).then(unwrap),
  resetPassword:    (body) => isDemoToken() ? demoAPI.auth.resetPassword(body) : api.post('/auth/reset-password', body).then(unwrap),
  verifyEmail:         (token) => isDemoToken() ? demoAPI.auth.verifyEmail(token) : api.get(`/auth/verify-email/${token}`).then(unwrap),
  resendVerification:  (body)  => isDemoToken() ? demoAPI.auth.resendVerification(body) : api.post('/auth/resend-verification', body).then(unwrap),
  updateProfile:       (body) => isDemoToken() ? demoAPI.auth.updateProfile(body) : api.put('/auth/profile', body).then(unwrap),
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
  priceHistory: (id) => api.get(`/cars/${id}/price-history`).then(unwrap),
  trackClick: (id) => api.post(`/cars/${id}/click`).then(unwrap),

  // Dealer
  create: (formData) =>
    api.post('/cars', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(unwrap),
  addImages: (id, formData) =>
    api.post(`/cars/${id}/images`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(unwrap),
  deleteImage: (id, idx) => api.delete(`/cars/${id}/images/${idx}`).then(unwrap),
  deleteImages: async (id, indices) => {
    const sorted = [...indices].sort((a, b) => b - a);
    const results = [];
    for (const idx of sorted) {
      const res = await api.delete(`/cars/${id}/images/${idx}`).then(unwrap);
      results.push(res);
    }
    return results;
  },
  update:  (id, body) => api.put(`/cars/${id}`, body).then(unwrap),
  promote: (id, body) => api.patch(`/cars/${id}/promote`, body).then(unwrap),
  remove: (id)       => api.delete(`/cars/${id}`).then(unwrap),
  myCars:    ()      => api.get('/cars/dealer/my-cars').then(unwrap),
  analytics: ()      => api.get('/cars/dealer/analytics').then(unwrap),

  // Actions
  bid: (id, body)        => api.post(`/cars/${id}/bid`, body).then(unwrap),
  toggleFav: (id)        => api.post(`/cars/${id}/favorite`).then(unwrap),

  // Batch
  batch: (body)         => api.post('/cars/batch', body).then(unwrap),

  // Demo
  demoAll: ()       => api.get('/cars/demo/all').then(unwrap),

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
  initiate:    (body)      => api.post('/payments/initiate', body, { timeout: 45000 }).then(unwrap), // M-Pesa STK can take ~30s
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
  dispute: (id, reason)    => api.post(`/escrow/${id}/dispute`, { reason }).then(unwrap),
  requestRelease: (id)     => api.post(`/escrow/${id}/request-release`).then(unwrap),
};
export const escrowAPI = withDemo(_escrowAPI, demoAPI.escrow);

// ============================================================
//  ESCROW VAULT — routes/escrowVaultRoutes.js
// ============================================================
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
export const escrowVaultAPI = withDemo(_escrowVaultAPI, demoAPI.escrowVault);

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

  // Listing actions
  duplicate:  (carId)        => api.post(`/dealer/cars/${carId}/duplicate`).then(unwrap),
  markSold:   (carId, body)  => api.patch(`/dealer/cars/${carId}/mark-sold`, body).then(unwrap),
  acceptBid:  (carId, bidId) => api.post(`/dealer/cars/${carId}/accept-bid`, { bidId }).then(unwrap),
  rejectBid:  (carId, bidId) => api.post(`/dealer/cars/${carId}/reject-bid`, { bidId }).then(unwrap),
  bulkStatus: (body)         => api.patch('/dealer/cars/bulk-status', body).then(unwrap),

  // CSV export
  exportCSV:  (params)       => api.get('/dealer/cars', { params, responseType: 'blob' }).then(r => r.data),

  // Team management
  getTeam:        ()             => api.get('/dealer/team').then(unwrap),
  inviteMember:   (body)         => api.post('/dealer/team/invite', body).then(unwrap),
  updateMember:   (memberId, body) => api.patch(`/dealer/team/${memberId}`, body).then(unwrap),
  removeMember:   (memberId)     => api.delete(`/dealer/team/${memberId}`).then(unwrap),

  // Settlement config
  getSettlement:  ()             => api.get('/dealer/settlement').then(unwrap),
  updateSettlement: (body)       => api.put('/dealer/settlement', body).then(unwrap),

  // Activity audit log (own actions)
  getMyActivityLog: (params)     => api.get('/security-logs/my', { params }).then(unwrap),

  // Dealer profile (used by DealerSetup.jsx)
  getProfile:   ()       => api.get('/dealer/profile').then(unwrap),
  updateProfile: (body)  => api.put('/dealer/profile', body).then(unwrap),
};
export const dealerAPI = withDemo(_dealerAPI, demoAPI.dealer);

// ============================================================
//  ADMIN — routes/adminRoutes.js
// ============================================================
const _referralAPI = {
  stats: () => api.get('/referral/stats').then(unwrap),
  code:  () => api.get('/referral/code').then(unwrap),
};
export const referralAPI = withDemo(_referralAPI, {});

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
  getPublicConfig: ()         => api.get('/admin/public/config').then(unwrap),
  updateConfig:   (body)      => api.put('/admin/config', body).then(unwrap),

  // Audit Log
  getAuditLog:    (params)    => api.get('/admin/audit-log', { params }).then(unwrap),
  appendAuditLog: (body)      => api.post('/admin/audit-log', body).then(unwrap),

  // General Audit Log (new immutable audit trail)
  getAuditLogs:          (params) => api.get('/audit/logs', { params }).then(unwrap),
  getAuditLogById:       (id)     => api.get(`/audit/logs/${id}`).then(unwrap),
  getAuditLogsByAction:  (action, params) => api.get(`/audit/logs/action/${action}`, { params }).then(unwrap),
  getAuditLogsByActor:   (actorId, params) => api.get(`/audit/logs/actor/${actorId}`, { params }).then(unwrap),
  getAuditLogsByTarget:  (targetId, targetModel, params) => api.get(`/audit/logs/target/${targetId}/${targetModel}`, { params }).then(unwrap),
  getAuditLogStatistics: (params) => api.get('/audit/logs/statistics', { params }).then(unwrap),
  exportAuditLogs:       (params) => api.get('/audit/logs/export', { params }).then(unwrap),

  // Reconciliation (enterprise payment reconciliation)
  getReconciliationDashboard: (params) => api.get('/reconciliation/dashboard', { params }).then(unwrap),
  getFinancialIntegrityScore: (params) => api.get('/reconciliation/integrity-score', { params }).then(unwrap),
  getNegativeBalances:        (params) => api.get('/reconciliation/negative-balances', { params }).then(unwrap),
  getUnreleasedEscrows:       (params) => api.get('/reconciliation/unreleased-escrows', { params }).then(unwrap),
  runReconciliationReport:    (body)   => api.post('/reconciliation/run', body).then(unwrap),
  getReconciliationReports:   (params) => api.get('/reconciliation/reports', { params }).then(unwrap),
  getReconciliationReportById: (id)     => api.get(`/reconciliation/reports/${id}`).then(unwrap),
  resolveReconciliationIssue: (reportId, body) => api.post(`/reconciliation/reports/${reportId}/resolve`, body).then(unwrap),
  exportReconciliationReport: (reportId, format) => api.get(`/reconciliation/export/${reportId}/${format}`, { responseType: 'blob' }).then(unwrap),

  // M-Pesa Test
  testMpesa:      (body)      => api.post('/admin/daraja/test', body).then(unwrap),

  // System Kill-Switch
  systemKillSwitch: (body) => api.post('/admin/system/kill-switch', body).then(unwrap),
  systemRecover:    (body) => api.post('/admin/system/recover', body).then(unwrap),

  // Dealer Verification
  verifyDealer:    (userId, body) => api.post(`/admin/users/${userId}/verify-dealer`, body).then(unwrap),

  // NTSA / Car Verification
  verifyCar:       (carId, body) => api.post(`/admin/cars/${carId}/verify`, body).then(unwrap),

  // Moderation Queue
  moderateCar:     (carId, body) => api.post(`/admin/cars/${carId}/moderate`, body).then(unwrap),

  // Staff Management (superadmin only)
  getStaff:        ()            => api.get('/admin/staff').then(unwrap),
  createStaff:     (body)        => api.post('/admin/staff', body).then(unwrap),
  updateStaff:     (id, body)    => api.put(`/admin/staff/${id}`, body).then(unwrap),
  deleteStaff:     (id)          => api.delete(`/admin/staff/${id}`).then(unwrap),
  getPermCatalog:  ()            => api.get('/admin/staff/permissions/catalog').then(unwrap),
  getStaffPerms:   (id)          => api.get(`/admin/staff/${id}/permissions`).then(unwrap),
  setStaffPerms:   (id, body)    => api.put(`/admin/staff/${id}/permissions`, body).then(unwrap),
  seedDepartments: ()            => api.post('/admin/seed-departments').then(unwrap),
  reseed:          ()            => api.post('/admin/reseed').then(unwrap),

  // User Management
  deleteUser:      (userId)      => api.delete(`/admin/users/${userId}`).then(unwrap),
  deactivateUser:  (userId)      => api.put(`/admin/users/${userId}/deactivate`).then(unwrap),

  // Demo Data Management
  demoStatus:      ()            => api.get('/admin/demo/status').then(unwrap),
  demoCleanup:     ()            => api.delete('/admin/demo/cleanup').then(unwrap),

  // Dealer Package Assignment
  assignPackage:   (userId, body) => api.patch(`/admin/dealers/${userId}/package`, body).then(unwrap),
  updatePackages:  (packages) => api.put('/admin/config/packages', { packages }).then(unwrap),

  // Review Moderation
  reviews:         (params)    => api.get('/admin/reviews', { params }).then(unwrap),
  deleteReview:    (id)        => api.delete(`/admin/reviews/${id}`).then(unwrap),

  // Referral Management
  referrals:        (params)    => api.get('/admin/referrals', { params }).then(unwrap),
  referralStats:    ()          => api.get('/admin/referrals/stats').then(unwrap),
  referralDetail:   (id)        => api.get(`/admin/referrals/${id}`).then(unwrap),
  creditReferral:   (id, body)  => api.post(`/admin/referrals/${id}/credit`, body).then(unwrap),
  expireReferral:   (id)        => api.post(`/admin/referrals/${id}/expire`).then(unwrap),
  userReferrals:    (userId)    => api.get(`/admin/users/${userId}/referrals`).then(unwrap),

  // Chat Moderation
  chats:            (params)    => api.get('/admin/chats', { params }).then(unwrap),
  chatMessages:     (chatId)    => api.get(`/admin/chats/${chatId}/messages`).then(unwrap),
  deleteChatMessage: (chatId, msgId) => api.delete(`/admin/chats/${chatId}/messages/${msgId}`).then(unwrap),
  blockChat:        (chatId)    => api.post(`/admin/chats/${chatId}/block`).then(unwrap),
  unblockChat:      (chatId)    => api.post(`/admin/chats/${chatId}/unblock`).then(unwrap),

  // Market Data Management
  marketData:       (params)    => api.get('/admin/market-data', { params }).then(unwrap),
  marketDataDetail: (id)        => api.get(`/admin/market-data/${id}`).then(unwrap),
  createMarketData: (body)      => api.post('/admin/market-data', body).then(unwrap),
  updateMarketData: (id, body)  => api.put(`/admin/market-data/${id}`, body).then(unwrap),
  deleteMarketData: (id)        => api.delete(`/admin/market-data/${id}`).then(unwrap),
  bulkMarketData:  (entries)   => api.post('/admin/market-data/bulk', { entries }).then(unwrap),

  // Alerts (NEW)
  alerts:          (params)    => api.get('/admin/alerts', { params }).then(unwrap),
  markAlertRead:   (id)        => api.post(`/admin/alerts/${id}/read`).then(unwrap),
  markAllAlertsRead: ()        => api.post('/admin/alerts/read-all').then(unwrap),

  // System Health (NEW)
  systemHealth:    ()          => api.get('/admin/system/health').then(unwrap),

  // Inspector applications (admin)
  inspectorApplications: (params) => api.get('/inspector-applications', { params }).then(unwrap),
  reviewInspector: (id, action, body) => api.post(`/inspector-applications/${id}/${action}`, body).then(unwrap),

  // Branding / upload logo
  uploadLogo: (formData) => api.post('/admin/upload-logo', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(unwrap),

  // Dispute resolution
  disputeGet:      (id)          => api.get(`/disputes/${id}`).then(unwrap),
  disputeResolve:  (id, body)    => api.post(`/disputes/${id}/resolve`, body).then(unwrap),
  disputeAddNote:  (id, body)    => api.post(`/disputes/${id}/notes`, body).then(unwrap),
  disputeGetAll:   (params)      => api.get('/disputes/admin/all', { params }).then(unwrap),

  // Fraud analytics
  fraudAnalytics:    ()          => api.get('/fraud/analytics').then(unwrap),
  fraudGetAll:       (params)    => api.get('/fraud/all', { params }).then(unwrap),
  fraudUpdateStatus: (id, body)  => api.put(`/fraud/${id}/status`, body).then(unwrap),
};
// Admin & webhost are real-backend only — there is no demo admin/webhost.
// Falling back to demo data here would show a real administrator fabricated
// numbers, so admin endpoints always hit the live API (or surface an error).
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
export const auctionAdminAPI = withDemo(_auctionAdminAPI, demoAPI.auctionAdmin);

// ============================================================
//  DEALER AUCTIONS — routes/dealerRoutes.js (DEALER ONLY)
// ============================================================
const _dealerAuctionAPI = {
  start:     (carId, body)  => api.post(`/dealer/cars/${carId}/auction/start`, body).then(unwrap),
  end:       (carId)        => api.post(`/dealer/cars/${carId}/auction/end`).then(unwrap),
  extend:    (carId, hours) => api.post(`/dealer/cars/${carId}/auction/extend`, { hours }).then(unwrap),
};
export const dealerAuctionAPI = withDemo(_dealerAuctionAPI, demoAPI.auctionAdmin);

// ============================================================
//  FAVORITES — routes/favoriteRoutes.js
// ============================================================
const _favoritesAPI = {
  list:   ()      => api.get('/favorites').then(unwrap),
  add:    (carId) => api.post(`/favorites/${carId}`).then(unwrap),
  remove: (carId) => api.delete(`/favorites/${carId}`).then(unwrap),
  toggle: (carId) => api.post(`/favorites/${carId}/toggle`).then(unwrap),
  setPriceAlert: (carId, notify) => api.put(`/favorites/${carId}/price-alert`, { notifyOnPriceDrop: notify }).then(unwrap),
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
//  SAVED SEARCHES — routes/savedSearchRoutes.js
// ============================================================
const _savedSearchAPI = {
  list:   ()             => api.get('/saved-searches').then(unwrap),
  create: (body)         => api.post('/saved-searches', body).then(unwrap),
  update: (id, body)     => api.put(`/saved-searches/${id}`, body).then(unwrap),
  remove: (id)           => api.delete(`/saved-searches/${id}`).then(unwrap),
  // Backward-compatible aliases used by some pages.
  delete: (id)           => api.delete(`/saved-searches/${id}`).then(unwrap),
  toggleAlerts: async (id, enabled) => {
    const body = enabled === undefined ? {} : { notifyOnNewMatch: enabled };
    return api.put(`/saved-searches/${id}`, body).then(unwrap);
  },
};
export const savedSearchAPI = withDemo(_savedSearchAPI, demoAPI.savedSearch);

// ============================================================
//  NTSA VERIFICATION — routes/ntsaVerificationRoutes.js
// ============================================================
const _ntsaAPI = {
  list:    (params)    => api.get('/ntsa-verification', { params }).then(unwrap),
  queue:   (carId)     => api.post('/ntsa-verification', { carId }).then(unwrap),
  process: (id, body)  => api.post(`/ntsa-verification/${id}/process`, body).then(unwrap),
  addDoc:  (id, body)  => api.post(`/ntsa-verification/${id}/documents`, body).then(unwrap),
  status:  (carId)     => api.get(`/ntsa-verification/car/${carId}/status`).then(unwrap),
};
export const ntsaAPI = withDemo(_ntsaAPI, demoAPI.ntsa);

// ============================================================
//  VERIFIED BUYER — routes/userRoutes.js
// ============================================================
export const buyerVerificationAPI = {
  submitPreApproval: (body) => api.post('/users/bank-pre-approval', body).then(unwrap),
  removePreApproval: ()     => api.delete('/users/bank-pre-approval').then(unwrap),
};

// ============================================================
//  INSPECTIONS — routes/inspectionRoutes.js
// ============================================================
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
export const inspectionAPI = withDemo(_inspectionAPI, demoAPI.inspection);

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
//  SMS BIDDING — routes/smsBiddingRoutes.js (/sms-bidding)
// ============================================================
export const smsBiddingAPI = {
  my:          ()                => api.get('/sms-bidding/my').then(unwrap),
  register:    (phone)           => api.post('/sms-bidding/register', { phone }).then(unwrap),
  subscribe:   (body)            => api.post('/sms-bidding/subscribe', body).then(unwrap),
  unsubscribe: (carId)           => api.delete(`/sms-bidding/unsubscribe/${carId}`).then(unwrap),
};

// ============================================================
//  CONTACT — routes/contactRoutes.js (/contact)
// ============================================================
export const contactAPI = {
  send: (body) => api.post('/contact', body).then(unwrap),
};

// ============================================================
//  MARKET INTELLIGENCE — routes/marketRoutes.js (/market)
// ============================================================
const _marketAPI = {
  pulse:      (carId)  => api.get(`/market/pulse/${carId}`).then(unwrap),
  trends:     (params) => api.get('/market/trends', { params }).then(unwrap),
  dealerInsights: ()   => api.get('/market/dealer/insights').then(unwrap),
};
export const marketAPI = withDemo(_marketAPI, demoAPI.market);

// ============================================================
//  INSPECTOR APPLICATIONS — routes/inspectorRoutes.js
//  (Applicant-facing — POST /apply)
// ============================================================
export const inspectorAPI = {
  apply: (body) => api.post('/inspector-applications/apply', body).then(unwrap),
};

// ============================================================
//  ADMIN PAYMENTS — routes/adminRoutes.js (/admin/payments)
// ============================================================
export const adminPaymentsAPI = {
  list: (params) => api.get('/admin/payments', { params }).then(unwrap),
};

// Utility: format KES (re-exported from helpers for backward compat)
export { api };
export { formatKES } from '../utils/helpers';

export default api;

// src/api/api.ts
// ============================================================
// KAYAD — FULL API LAYER
// Every backend route mapped exactly to the Express routes
// ============================================================

import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
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
let _backendProbePromise: Promise<boolean> | null = null;
let _lastProbeAt = 0;
const PROBE_COOLDOWN_MS = 20_000;

export const checkBackendAvailability = async (retries = 2): Promise<boolean> => {
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
      const error = err as AxiosError;
      const s = error.response?.status;
      const unavailable =
        !error.response ||
        error.code === 'ERR_NETWORK' ||
        error.code === 'ECONNABORTED' ||
        error.message?.includes('Network Error') ||
        [404, 502, 503, 504].includes(s!);
      if (!unavailable) return true;
      if (attempt < retries) {
        await new Promise<void>(r => setTimeout(r, 1000 * attempt));
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
const api: AxiosInstance = axios.create({ baseURL: BASE, withCredentials: true, timeout: 15000 }); // 15s default; payment calls override to 45s
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
let _queue: Array<{ res: () => void; rej: (err: any) => void }> = [];

api.interceptors.response.use(
  r => r,
  async err => {
    const orig = err.config || {};
    const method = String(orig.method || 'get').toLowerCase();
    const status = err.response?.status;
    const canRetry = IDEMPOTENT_METHODS.has(method) && (RETRYABLE_STATUSES.has(status!) || !err.response);
    if (canRetry && (orig._retryCount || 0) < MAX_RETRIES) {
      orig._retryCount = (orig._retryCount || 0) + 1;
      const retryAfterHeader = Number(err.response?.headers?.['retry-after']);
      const retryAfterMs = Number.isFinite(retryAfterHeader) ? retryAfterHeader * 1000 : 0;
      const backoffMs = Math.max(retryAfterMs, 300 * (2 ** ((orig._retryCount || 1) - 1)));
      await new Promise<void>((resolve) => setTimeout(resolve, backoffMs));
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
        return new Promise<void>((res, rej) => _queue.push({ res, rej }))
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
        _queue.forEach(p => p.rej(undefined));
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
const unwrap = (res: AxiosResponse) => res.data;

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
const shouldFallbackToDemo = (err: AxiosError): boolean => {
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
function withDemo<T extends Record<string, any>>(realObj: T, demoObj: Partial<T>): T {
  const wrapped = {} as T;
  for (const key of Object.keys(realObj)) {
    (wrapped as any)[key] = async (...args: any[]) => {
      // If using a demo token, go straight to demo API — real backend will reject it
      if (demoObj?.[key] && (isDemoToken() || __DEMO_MODE__)) {
        __DEMO_MODE__ = true;
        return demoObj[key]!(...args);
      }

      try { return await realObj[key](...args); }
      catch (err) {
        if (demoObj?.[key] && (__DEMO_MODE__ || shouldFallbackToDemo(err as AxiosError))) {
          __DEMO_MODE__ = true;
          return demoObj[key]!(...args);
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
  register: (body: any) => api.post('/auth/register', body).then(unwrap),
  login:    (body: any) => api.post('/auth/login', body).then(unwrap),
  refresh:  ()     => isDemoToken() ? (__DEMO_MODE__ = true, demoAPI.auth.refresh()) : api.post('/auth/refresh').then(unwrap),
  logout:   ()     => isDemoToken() ? demoAPI.auth.logout() : api.post('/auth/logout').then(unwrap),
  profile:  ()     => isDemoToken() ? demoAPI.auth.profile() : api.get('/auth/profile').then(unwrap),
  me:       ()     => isDemoToken() ? (__DEMO_MODE__ = true, demoAPI.auth.me()) : api.get('/auth/me').then(unwrap),
  changePassword:   (body: any) => isDemoToken() ? demoAPI.auth.changePassword(body) : api.put('/auth/change-password', body).then(unwrap),
  forgotPassword:   (body: any) => isDemoToken() ? demoAPI.auth.forgotPassword(body) : api.post('/auth/forgot-password', body).then(unwrap),
  resetPassword:    (body: any) => isDemoToken() ? demoAPI.auth.resetPassword(body) : api.post('/auth/reset-password', body).then(unwrap),
  verifyEmail:         (token: string) => isDemoToken() ? demoAPI.auth.verifyEmail(token) : api.get(`/auth/verify-email/${token}`).then(unwrap),
  resendVerification:  (body: any)  => isDemoToken() ? demoAPI.auth.resendVerification(body) : api.post('/auth/resend-verification', body).then(unwrap),
  updateProfile:       (body: any) => isDemoToken() ? demoAPI.auth.updateProfile(body) : api.put('/auth/profile', body).then(unwrap),

  // Phone verification
  sendOTP:       ()     => api.post('/auth/send-otp').then(unwrap),
  verifyPhone:   (otp: string) => api.post('/auth/verify-phone', { otp }).then(unwrap),
  phoneStatus:   ()     => api.get('/auth/phone-status').then(unwrap),
};
export const authAPI = withDemo(_authAPI, demoAPI.auth);

// ============================================================
//  CARS — routes/carRoutes.js
// ============================================================
const _carsAPI = {
  // Public
  list: (params: any) => api.get('/cars', { params }).then(unwrap),
  get:  (id: string)     => api.get(`/cars/${id}`).then(unwrap),
  insights: (id: string) => api.get(`/cars/${id}/insights`).then(unwrap),
  priceHistory: (id: string) => api.get(`/cars/${id}/price-history`).then(unwrap),
  trackClick: (id: string) => api.post(`/cars/${id}/click`).then(unwrap),

  // Dealer
  create: (formData: FormData) =>
    api.post('/cars', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(unwrap),
  addImages: (id: string, formData: FormData) =>
    api.post(`/cars/${id}/images`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(unwrap),
  deleteImage: (id: string, idx: number) => api.delete(`/cars/${id}/images/${idx}`).then(unwrap),
  deleteImages: async (id: string, indices: number[]) => {
    const sorted = [...indices].sort((a, b) => b - a);
    const results: any[] = [];
    for (const idx of sorted) {
      const res = await api.delete(`/cars/${id}/images/${idx}`).then(unwrap);
      results.push(res);
    }
    return results;
  },
  update:  (id: string, body: any) => api.put(`/cars/${id}`, body).then(unwrap),
  promote: (id: string, body: any) => api.patch(`/cars/${id}/promote`, body).then(unwrap),
  remove: (id: string)       => api.delete(`/cars/${id}`).then(unwrap),
  myCars:    ()      => api.get('/cars/dealer/my-cars').then(unwrap),
  analytics: ()      => api.get('/cars/dealer/analytics').then(unwrap),

  // Actions
  bid: (id: string, body: any)        => api.post(`/cars/${id}/bid`, body).then(unwrap),
  toggleFav: (id: string)        => api.post(`/cars/${id}/favorite`).then(unwrap),

  // Batch
  batch: (body: any)         => api.post('/cars/batch', body).then(unwrap),

  // Demo
  demoAll: ()       => api.get('/cars/demo/all').then(unwrap),

  // Admin
  fraudCheck: (id: string) => api.get(`/cars/admin/${id}/fraud`).then(unwrap),
  adminStart: (id: string) => api.post(`/cars/admin/${id}/start`).then(unwrap),
  adminEnd:   (id: string) => api.post(`/cars/admin/${id}/end`).then(unwrap),
};
export const carsAPI = withDemo(_carsAPI, demoAPI.cars);

// ============================================================
//  BIDS — routes/bidRoutes.js
// ============================================================
const _bidsAPI = {
  place:           (carId: string, body: any) => api.post(`/bids/${carId}/bid`, body).then(unwrap),
  getForCar:       (carId: string)       => api.get(`/bids/${carId}/bids`).then(unwrap),
  endAuction:      (carId: string)       => api.post(`/bids/${carId}/end`).then(unwrap),
  adminAll:        (params: any)      => api.get('/bids/admin/all', { params }).then(unwrap),
  adminSuspicious: ()            => api.get('/bids/admin/suspicious').then(unwrap),
  adminSetWinner:  (bidId: string)       => api.post(`/bids/admin/${bidId}/set-winner`).then(unwrap),
};
export const bidsAPI = withDemo(_bidsAPI, demoAPI.bids);

// ============================================================
//  PAYMENTS — routes/paymentRoutes.js
// ============================================================
const _paymentsAPI = {
  initiate:    (body: any)      => api.post('/payments/initiate', body, { timeout: 45000 }).then(unwrap), // M-Pesa STK can take ~30s
  status:      (id: string)        => api.get(`/payments/status/${id}`).then(unwrap),
  myPayments:  ()          => api.get('/payments/my').then(unwrap),
  byCheckout:  (checkoutId: string)=> api.get(`/payments/checkout/${checkoutId}`).then(unwrap),
};
export const paymentsAPI = withDemo(_paymentsAPI, demoAPI.payments);

// ============================================================
//  ESCROW — routes/escrowRoutes.js
// ============================================================
const _escrowAPI = {
  mine:    ()              => api.get('/escrow/my').then(unwrap),
  all:     (params: any)        => api.get('/escrow', { params }).then(unwrap),
  get:     (id: string)            => api.get(`/escrow/${id}`).then(unwrap),
  release: (id: string)            => api.post(`/escrow/${id}/release`).then(unwrap),
  refund:  (id: string)            => api.post(`/escrow/${id}/refund`).then(unwrap),
  dispute: (id: string, reason: string)    => api.post(`/escrow/${id}/dispute`, { reason }).then(unwrap),
  requestRelease: (id: string)     => api.post(`/escrow/${id}/request-release`).then(unwrap),
};
export const escrowAPI = withDemo(_escrowAPI, demoAPI.escrow);

// ============================================================
//  ESCROW VAULT — routes/escrowVaultRoutes.js
// ============================================================
const _escrowVaultAPI = {
  init:             (carId: string)          => api.post(`/escrow-vault/${carId}/init`).then(unwrap),
  my:               ()               => api.get('/escrow-vault/my').then(unwrap),
  get:              (id: string)             => api.get(`/escrow-vault/${id}`).then(unwrap),
  forCar:           (carId: string)          => api.get(`/escrow-vault/car/${carId}`).then(unwrap),
  markInspection:   (id: string)             => api.post(`/escrow-vault/${id}/inspection-complete`).then(unwrap),
  requestOtp:       (id: string)             => api.post(`/escrow-vault/${id}/request-otp`).then(unwrap),
  release:          (id: string, otp: string)        => api.post(`/escrow-vault/${id}/release`, { otp }).then(unwrap),
  webhookFunded:    (id: string, body: any)       => api.post(`/escrow-vault/webhook/${id}/funded`, body).then(unwrap),
  adminAll:         ()               => api.get('/escrow-vault/admin/all').then(unwrap),
  adminConfirm:     (id: string)             => api.post(`/escrow-vault/${id}/admin-confirm-funding`).then(unwrap),
  adminRefund:      (id: string)             => api.post(`/escrow-vault/${id}/admin-refund`).then(unwrap),
};
export const escrowVaultAPI = withDemo(_escrowVaultAPI, demoAPI.escrowVault);

// ============================================================
//  DEALER — routes/dealerRoutes.js
// ============================================================
const _dealerAPI = {
  earnings:   (params: any) => api.get('/dealer/earnings', { params }).then(unwrap),
  cars:       (params: any) => api.get('/dealer/cars', { params }).then(unwrap),
  analytics:  (params: any) => api.get('/dealer/analytics', { params }).then(unwrap),
  summary:    ()       => api.get('/dealer/summary').then(unwrap),
  quickStats: ()       => api.get('/dealer/quick-stats').then(unwrap),
  bids:       (params: any) => api.get('/dealer/bids', { params }).then(unwrap),

  // Listing actions
  duplicate:  (carId: string)        => api.post(`/dealer/cars/${carId}/duplicate`).then(unwrap),
  markSold:   (carId: string, body: any)  => api.patch(`/dealer/cars/${carId}/mark-sold`, body).then(unwrap),
  acceptBid:  (carId: string, bidId: string) => api.post(`/dealer/cars/${carId}/accept-bid`, { bidId }).then(unwrap),
  rejectBid:  (carId: string, bidId: string) => api.post(`/dealer/cars/${carId}/reject-bid`, { bidId }).then(unwrap),
  bulkStatus: (body: any)         => api.patch('/dealer/cars/bulk-status', body).then(unwrap),
  bulkDelete: (ids: string[])     => api.post('/dealer/cars/bulk-delete', { ids }).then(unwrap),

  // CSV export
  exportCSV:  (params: any)       => api.get('/dealer/cars', { params, responseType: 'blob' }).then(r => r.data),

  // Team management
  getTeam:        ()             => api.get('/dealer/team').then(unwrap),
  inviteMember:   (body: any)         => api.post('/dealer/team/invite', body).then(unwrap),
  updateMember:   (memberId: string, body: any) => api.patch(`/dealer/team/${memberId}`, body).then(unwrap),
  removeMember:   (memberId: string)     => api.delete(`/dealer/team/${memberId}`).then(unwrap),

  // Settlement config
  getSettlement:  ()             => api.get('/dealer/settlement').then(unwrap),
  updateSettlement: (body: any)       => api.put('/dealer/settlement', body).then(unwrap),

  // Activity audit log (own actions)
  getMyActivityLog: (params: any)     => api.get('/security-logs/my', { params }).then(unwrap),

  // Dealer profile (used by DealerSetup.jsx)
  getProfile:   ()       => api.get('/dealer/profile').then(unwrap),
  updateProfile: (body: any)  => api.put('/dealer/profile', body).then(unwrap),

  // Milestones + completion score
  milestones:   ()       => api.get('/dealer/milestones').then(unwrap),

  // Self-service plan upgrade
  upgrade:      (body: any) => api.post('/dealer/upgrade', body).then(unwrap),

  // Leads / inquiries
  leads:           (params?: any) => api.get('/leads', { params }).then(unwrap),
  updateLeadStage: (leadId: string, body: any) => api.put(`/leads/${leadId}/stage`, body).then(unwrap),
  archiveLead:     (leadId: string) => api.put(`/leads/${leadId}/archive`).then(unwrap),
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
  users:         (params: any)    => api.get('/admin/users', { params }).then(unwrap),
  toggleBan:     (userId: string)    => api.post(`/admin/users/${userId}/toggle-ban`).then(unwrap),
  approveDealer: (userId: string)    => api.post(`/admin/users/${userId}/approve-dealer`).then(unwrap),
  cars:          (params: any)    => api.get('/admin/cars', { params }).then(unwrap),
  deleteCar:     (carId: string)     => api.delete(`/admin/cars/${carId}`).then(unwrap),

  // Seller Settings
  updateSellerSettings: (userId: string, body: any) => api.put(`/admin/users/${userId}/seller-settings`, body).then(unwrap),

  // Platform Config
  getConfig:      ()          => api.get('/admin/config').then(unwrap),
  getPublicConfig: ()         => api.get('/admin/public/config').then(unwrap),
  updateConfig:   (body: any)      => api.put('/admin/config', body).then(unwrap),

  // Audit Log
  getAuditLog:    (params: any)    => api.get('/admin/audit-log', { params }).then(unwrap),
  appendAuditLog: (body: any)      => api.post('/admin/audit-log', body).then(unwrap),

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
  testMpesa:      (body: any)      => api.post('/admin/daraja/test', body).then(unwrap),

  // System Kill-Switch
  systemKillSwitch: (body: any) => api.post('/admin/system/kill-switch', body).then(unwrap),
  systemRecover:    (body: any) => api.post('/admin/system/recover', body).then(unwrap),

  // Dealer Verification
  verifyDealer:    (userId: string, body: any) => api.post(`/admin/users/${userId}/verify-dealer`, body).then(unwrap),

  // NTSA / Car Verification
  verifyCar:       (carId: string, body: any) => api.post(`/admin/cars/${carId}/verify`, body).then(unwrap),

  // Moderation Queue
  moderateCar:     (carId: string, body: any) => api.post(`/admin/cars/${carId}/moderate`, body).then(unwrap),

  // Staff Management (superadmin only)
  getStaff:        ()            => api.get('/admin/staff').then(unwrap),
  createStaff:     (body: any)        => api.post('/admin/staff', body).then(unwrap),
  updateStaff:     (id: string, body: any)    => api.put(`/admin/staff/${id}`, body).then(unwrap),
  deleteStaff:     (id: string)          => api.delete(`/admin/staff/${id}`).then(unwrap),
  getPermCatalog:  ()            => api.get('/admin/staff/permissions/catalog').then(unwrap),
  getStaffPerms:   (id: string)          => api.get(`/admin/staff/${id}/permissions`).then(unwrap),
  setStaffPerms:   (id: string, body: any)    => api.put(`/admin/staff/${id}/permissions`, body).then(unwrap),
  seedDepartments: ()            => api.post('/admin/seed-departments').then(unwrap),
  reseed:          ()            => api.post('/admin/reseed').then(unwrap),

  // User Management
  deleteUser:      (userId: string)      => api.delete(`/admin/users/${userId}`).then(unwrap),
  deactivateUser:  (userId: string)      => api.put(`/admin/users/${userId}/deactivate`).then(unwrap),

  // Demo Data Management
  demoStatus:      ()            => api.get('/admin/demo/status').then(unwrap),
  demoCleanup:     ()            => api.delete('/admin/demo/cleanup').then(unwrap),

  // Dealer Package Assignment
  assignPackage:   (userId: string, body: any) => api.patch(`/admin/dealers/${userId}/package`, body).then(unwrap),
  updatePackages:  (packages: any) => api.put('/admin/config/packages', { packages }).then(unwrap),

  // Review Moderation
  reviews:         (params: any)    => api.get('/admin/reviews', { params }).then(unwrap),
  deleteReview:    (id: string)        => api.delete(`/admin/reviews/${id}`).then(unwrap),

  // Referral Management
  referrals:        (params: any)    => api.get('/admin/referrals', { params }).then(unwrap),
  referralStats:    ()          => api.get('/admin/referrals/stats').then(unwrap),
  referralDetail:   (id: string)        => api.get(`/admin/referrals/${id}`).then(unwrap),
  creditReferral:   (id: string, body: any)  => api.post(`/admin/referrals/${id}/credit`, body).then(unwrap),
  expireReferral:   (id: string)        => api.post(`/admin/referrals/${id}/expire`).then(unwrap),
  userReferrals:    (userId: string)    => api.get(`/admin/users/${userId}/referrals`).then(unwrap),

  // Chat Moderation
  chats:            (params: any)    => api.get('/admin/chats', { params }).then(unwrap),
  chatMessages:     (chatId: string)    => api.get(`/admin/chats/${chatId}/messages`).then(unwrap),
  deleteChatMessage: (chatId: string, msgId: string) => api.delete(`/admin/chats/${chatId}/messages/${msgId}`).then(unwrap),
  blockChat:        (chatId: string)    => api.post(`/admin/chats/${chatId}/block`).then(unwrap),
  unblockChat:      (chatId: string)    => api.post(`/admin/chats/${chatId}/unblock`).then(unwrap),

  // Market Data Management
  marketData:       (params: any)    => api.get('/admin/market-data', { params }).then(unwrap),
  marketDataDetail: (id: string)        => api.get(`/admin/market-data/${id}`).then(unwrap),
  createMarketData: (body: any)      => api.post('/admin/market-data', body).then(unwrap),
  updateMarketData: (id: string, body: any)  => api.put(`/admin/market-data/${id}`, body).then(unwrap),
  deleteMarketData: (id: string)        => api.delete(`/admin/market-data/${id}`).then(unwrap),
  bulkMarketData:  (entries: any)   => api.post('/admin/market-data/bulk', { entries }).then(unwrap),

  // Alerts (NEW)
  alerts:          (params: any)    => api.get('/admin/alerts', { params }).then(unwrap),
  markAlertRead:   (id: string)        => api.post(`/admin/alerts/${id}/read`).then(unwrap),
  markAllAlertsRead: ()        => api.post('/admin/alerts/read-all').then(unwrap),

  // System Health (NEW)
  systemHealth:    ()          => api.get('/admin/system/health').then(unwrap),

  // Inspector applications (admin)
  inspectorApplications: (params: any) => api.get('/inspector-applications', { params }).then(unwrap),
  reviewInspector: (id: string, action: string, body: any) => api.post(`/inspector-applications/${id}/${action}`, body).then(unwrap),

  // Branding / upload logo
  uploadLogo: (formData: FormData) => api.post('/admin/upload-logo', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(unwrap),

  // Dispute resolution (legacy aliases — kept for adminAPI backward compat)
  disputeGet:      (id: string)          => api.get(`/disputes/${id}`).then(unwrap),
  disputeResolve:  (id: string, body: any)    => api.post(`/disputes/${id}/resolve`, body).then(unwrap),
  disputeAddNote:  (id: string, body: any)    => api.post(`/disputes/${id}/notes`, body).then(unwrap),
  disputeGetAll:   (params: any)      => api.get('/disputes', { params }).then(unwrap),
  disputeStats:    ()            => api.get('/disputes/stats').then(unwrap),

    // Fraud analytics
  fraudAnalytics:    ()          => api.get('/fraud/analytics').then(unwrap),
  fraudGetAll:       (params: any)    => api.get('/fraud/all', { params }).then(unwrap),
  fraudUpdateStatus: (id: string, body: any)  => api.put(`/fraud/${id}/status`, body).then(unwrap),

  // Auction Integrity — routes/auctionIntegrityRoutes.js
  integrityDashboard: ()        => api.get('/new-admin/auction-integrity/dashboard').then(unwrap),
  integrityFlags:     (p: any)  => api.get('/new-admin/auction-integrity', { params: p }).then(unwrap),
  integrityFlag:      (id: string)  => api.get(`/new-admin/auction-integrity/${id}`).then(unwrap),
  integrityUpdateFlag:(id: string, body: any) => api.patch(`/new-admin/auction-integrity/${id}/status`, body).then(unwrap),
  integrityScan:      (body: any)   => api.post('/new-admin/auction-integrity/scan', body).then(unwrap),
  integrityRiskProfiles: (p: any) => api.get('/new-admin/auction-integrity/risk-profiles', { params: p }).then(unwrap),
};
// Dispute management — full standalone API
export const disputeAPI = {
  // User
  my:           (params?: any)       => api.get('/disputes/my', { params }).then(unwrap),
  create:       (body: any)          => api.post('/disputes', body).then(unwrap),

  // Detail
  get:          (id: string)         => api.get(`/disputes/${id}`).then(unwrap),

  // Evidence
  evidence:     (id: string)         => api.get(`/disputes/${id}/evidence`).then(unwrap),
  uploadEvidence: (id: string, formData: FormData) =>
    api.post(`/disputes/${id}/evidence`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(unwrap),
  evidenceItem: (id: string, evidenceId: string) => api.get(`/disputes/${id}/evidence/${evidenceId}`).then(unwrap),
  deleteEvidence: (id: string, evidenceId: string) => api.delete(`/disputes/${id}/evidence/${evidenceId}`).then(unwrap),
  verifyEvidence: (id: string, evidenceId: string) => api.post(`/disputes/${id}/evidence/${evidenceId}/verify`).then(unwrap),

  // Admin
  all:          (params?: any)       => api.get('/disputes', { params }).then(unwrap),
  stats:        ()                   => api.get('/disputes/stats').then(unwrap),
  assign:       (id: string, body: any) => api.post(`/disputes/${id}/assign`, body).then(unwrap),
  transitionTo:   (id: string, body: any) => api.patch(`/disputes/${id}/status`, body).then(unwrap),

  // Internal notes
  addNote:      (id: string, body: any) => api.post(`/disputes/${id}/notes`, body).then(unwrap),

  // Mediation
  startMediation:   (id: string, body: any) => api.post(`/disputes/${id}/mediation/start`, body).then(unwrap),
  completeMediation: (id: string, body: any) => api.post(`/disputes/${id}/mediation/complete`, body).then(unwrap),

  // Resolution
  resolve:      (id: string, body: any) => api.post(`/disputes/${id}/resolve`, body).then(unwrap),

  // Appeal
  appeal:       (id: string, body: any) => api.post(`/disputes/${id}/appeal`, body).then(unwrap),
  reviewAppeal: (id: string, body: any) => api.post(`/disputes/${id}/appeal/review`, body).then(unwrap),
};

// Admin & webhost are real-backend only — there is no demo admin/webhost.
// Falling back to demo data here would show a real administrator fabricated
// numbers, so admin endpoints always hit the live API (or surface an error).
export const adminAPI = _adminAPI;

// ============================================================
//  AUCTION ADMIN — routes/auctionAdminRoutes.js (ADMIN ONLY)
// ============================================================
const _auctionAdminAPI = {
  start:     (carId: string, body: any)  => api.post(`/auction-admin/${carId}/start`, body).then(unwrap),
  end:       (carId: string)        => api.post(`/auction-admin/${carId}/end`).then(unwrap),
  extend:    (carId: string, body: any)  => api.post(`/auction-admin/${carId}/extend`, body).then(unwrap),
  bidHistory:(carId: string)        => api.get(`/auction-admin/${carId}/bids`).then(unwrap),
  setWinner: (carId: string, bidId: string) => api.post(`/auction-admin/${carId}/set-winner`, { bidId }).then(unwrap),
};
export const auctionAdminAPI = withDemo(_auctionAdminAPI, demoAPI.auctionAdmin);

// ============================================================
//  DEALER AUCTIONS — routes/dealerRoutes.js (DEALER ONLY)
// ============================================================
const _dealerAuctionAPI = {
  start:     (carId: string, body: any)  => api.post(`/dealer/cars/${carId}/auction/start`, body).then(unwrap),
  end:       (carId: string)        => api.post(`/dealer/cars/${carId}/auction/end`).then(unwrap),
  extend:    (carId: string, hours: number) => api.post(`/dealer/cars/${carId}/auction/extend`, { hours }).then(unwrap),
};
export const dealerAuctionAPI = withDemo(_dealerAuctionAPI, demoAPI.auctionAdmin);

// ============================================================
//  FAVORITES — routes/favoriteRoutes.js
// ============================================================
const _favoritesAPI = {
  list:   ()      => api.get('/favorites').then(unwrap),
  add:    (carId: string) => api.post(`/favorites/${carId}`).then(unwrap),
  remove: (carId: string) => api.delete(`/favorites/${carId}`).then(unwrap),
  toggle: (carId: string) => api.post(`/favorites/${carId}/toggle`).then(unwrap),
  setPriceAlert: (carId: string, notify: boolean) => api.put(`/favorites/${carId}/price-alert`, { notifyOnPriceDrop: notify }).then(unwrap),
};
export const favoritesAPI = withDemo(_favoritesAPI, demoAPI.favorites);

// ============================================================
//  CHAT — routes/chatRoutes.js
// ============================================================
const _chatAPI = {
  inbox:    ()               => api.get('/chat').then(unwrap),
  start:    (body: any)           => api.post('/chat', body).then(unwrap),
  messages: (chatId: string, params: any) => api.get(`/chat/${chatId}/messages`, { params }).then(unwrap),
  send:     (chatId: string, body: any)   => api.post(`/chat/${chatId}/message`, body).then(unwrap),
  seen:     (chatId: string)         => api.post(`/chat/${chatId}/seen`).then(unwrap),
  leave:    (chatId: string)         => api.delete(`/chat/${chatId}`).then(unwrap),
};
export const chatAPI = withDemo(_chatAPI, demoAPI.chat);

// ============================================================
//  NOTIFICATIONS — routes/notificationRoutes.js
// ============================================================
const _notifAPI = {
  list:        (params: any) => api.get('/notifications', { params }).then(unwrap),
  markRead:    (id: string)     => api.post(`/notifications/${id}/read`).then(unwrap),
  markAllRead: ()       => api.post('/notifications/read-all').then(unwrap),
  remove:      (id: string)     => api.delete(`/notifications/${id}`).then(unwrap),
};
export const notifAPI = withDemo(_notifAPI, demoAPI.notif);

// ============================================================
//  SAVED SEARCHES — routes/savedSearchRoutes.js
// ============================================================
const _savedSearchAPI = {
  list:   ()             => api.get('/saved-searches').then(unwrap),
  create: (body: any)         => api.post('/saved-searches', body).then(unwrap),
  update: (id: string, body: any)     => api.put(`/saved-searches/${id}`, body).then(unwrap),
  remove: (id: string)           => api.delete(`/saved-searches/${id}`).then(unwrap),
  // Backward-compatible aliases used by some pages.
  delete: (id: string)           => api.delete(`/saved-searches/${id}`).then(unwrap),
  toggleAlerts: async (id: string, enabled?: boolean) => {
    const body = enabled === undefined ? {} : { notifyOnNewMatch: enabled };
    return api.put(`/saved-searches/${id}`, body).then(unwrap);
  },
};
export const savedSearchAPI = withDemo(_savedSearchAPI, demoAPI.savedSearch);

// ============================================================
//  NTSA VERIFICATION — routes/ntsaVerificationRoutes.js
// ============================================================
const _ntsaAPI = {
  list:    (params: any)    => api.get('/ntsa-verification', { params }).then(unwrap),
  queue:   (carId: string)     => api.post('/ntsa-verification', { carId }).then(unwrap),
  process: (id: string, body: any)  => api.post(`/ntsa-verification/${id}/process`, body).then(unwrap),
  addDoc:  (id: string, body: any)  => api.post(`/ntsa-verification/${id}/documents`, body).then(unwrap),
  status:  (carId: string)     => api.get(`/ntsa-verification/car/${carId}/status`).then(unwrap),
};
export const ntsaAPI = withDemo(_ntsaAPI, demoAPI.ntsa);

// ============================================================
//  VERIFIED BUYER — routes/userRoutes.js
// ============================================================
export const buyerVerificationAPI = {
  submitPreApproval: (body: any) => api.post('/users/bank-pre-approval', body).then(unwrap),
  removePreApproval: ()     => api.delete('/users/bank-pre-approval').then(unwrap),
};

// ============================================================
//  INSPECTIONS — routes/inspectionRoutes.js
// ============================================================
const _inspectionAPI = {
  order:           (body: any)           => api.post('/inspections/order', body).then(unwrap),
  confirmPayment:  (checkoutRequestID: string) => api.post('/inspections/confirm-payment', { checkoutRequestID }).then(unwrap),
  myOrders:        ()               => api.get('/inspections/my').then(unwrap),
  myTasks:         ()               => api.get('/inspections/my-tasks').then(unwrap),
  list:            (params: any)         => api.get('/inspections', { params }).then(unwrap),
  availableInspectors: ()           => api.get('/inspections/available-inspectors').then(unwrap),
  assign:          (id: string, inspectorId: string)=> api.post(`/inspections/${id}/assign`, { inspectorId }).then(unwrap),
  start:           (id: string)             => api.post(`/inspections/${id}/start`).then(unwrap),
  submit:          (id: string, body: any)       => api.post(`/inspections/${id}/submit`, body).then(unwrap),
  get:             (id: string)             => api.get(`/inspections/${id}`).then(unwrap),
  forCar:          (carId: string)          => api.get(`/inspections/car/${carId}`).then(unwrap),
};
export const inspectionAPI = withDemo(_inspectionAPI, demoAPI.inspection);

// ============================================================
//  REVIEWS — routes/reviewRoutes.js
// ============================================================
const _reviewsAPI = {
  create:       (body: any)     => api.post('/reviews', body).then(unwrap),
  mine:         ()         => api.get('/reviews/my').then(unwrap),
  forDealer:    (dealerId: string) => api.get(`/reviews/dealer/${dealerId}`).then(unwrap),
  remove:       (id: string)       => api.delete(`/reviews/${id}`).then(unwrap),
};
export const reviewsAPI = withDemo(_reviewsAPI, demoAPI.reviews);

// ============================================================
//  TRANSACTIONS — routes/transactionRoutes.js
// ============================================================
const _transactionsAPI = {
  list:    (params: any) => api.get('/transactions', { params }).then(unwrap),
  get:     (id: string)     => api.get(`/transactions/${id}`).then(unwrap),
  summary: ()       => api.get('/transactions/summary').then(unwrap),
};
export const transactionsAPI = withDemo(_transactionsAPI, demoAPI.transactions);

// ============================================================
//  ADS — routes/adRoutes.js (/ads) + adminRoutes.js (/admin/ads)
// ============================================================
export const adsAPI = {
  list:       (params: any) => api.get('/ads', { params }).then(unwrap),
  adminList:  ()       => api.get('/admin/ads').then(unwrap),
  create:     (body: any)   => api.post('/admin/ads', body).then(unwrap),
  update:     (id: string, body: any) => api.put(`/admin/ads/${id}`, body).then(unwrap),
  remove:     (id: string)     => api.delete(`/admin/ads/${id}`).then(unwrap),
};

// ============================================================
//  SMS BIDDING — routes/smsBiddingRoutes.js (/sms-bidding)
// ============================================================
export const smsBiddingAPI = {
  my:          ()                => api.get('/sms-bidding/my').then(unwrap),
  register:    (phone: string)           => api.post('/sms-bidding/register', { phone }).then(unwrap),
  subscribe:   (body: any)            => api.post('/sms-bidding/subscribe', body).then(unwrap),
  unsubscribe: (carId: string)           => api.delete(`/sms-bidding/unsubscribe/${carId}`).then(unwrap),
};

// ============================================================
//  CONTACT — routes/contactRoutes.js (/contact)
// ============================================================
export const contactAPI = {
  send: (body: any) => api.post('/contact', body).then(unwrap),
};

// ============================================================
//  MARKET INTELLIGENCE — routes/marketRoutes.js (/market)
// ============================================================
const _marketAPI = {
  pulse:      (carId: string)  => api.get(`/market/pulse/${carId}`).then(unwrap),
  trends:     (params: any) => api.get('/market/trends', { params }).then(unwrap),
  dealerInsights: ()   => api.get('/market/dealer/insights').then(unwrap),
};
export const marketAPI = withDemo(_marketAPI, demoAPI.market);

// ============================================================
//  INSPECTOR APPLICATIONS — routes/inspectorRoutes.js
//  (Applicant-facing — POST /apply)
// ============================================================
export const inspectorAPI = {
  apply: (body: any) => api.post('/inspector-applications/apply', body).then(unwrap),
};

// ============================================================
//  ADMIN PAYMENTS — routes/adminRoutes.js (/admin/payments)
// ============================================================
export const adminPaymentsAPI = {
  list: (params: any) => api.get('/admin/payments', { params }).then(unwrap),
};

// ============================================================
//  DEALER VERIFICATION — routes/verificationRoutes.js
// ============================================================
export const verificationAPI = {
  submit:      (body: any)     => api.post('/verification/submit', body).then(unwrap),
  getStatus:   ()              => api.get('/verification/status').then(unwrap),
  requestPhoneOTP: ()          => api.post('/verification/phone/request').then(unwrap),
  verifyPhoneOTP: (code: string) => api.post('/verification/phone/verify', { code }).then(unwrap),
};

export const adminVerificationAPI = {
  list:        (params?: any)  => api.get('/verification/admin/all', { params }).then(unwrap),
  getById:     (id: string)    => api.get(`/verification/admin/${id}`).then(unwrap),
  approve:     (id: string, body?: any) => api.post(`/verification/admin/${id}/approve`, body).then(unwrap),
  reject:      (id: string, body: any)  => api.post(`/verification/admin/${id}/reject`, body).then(unwrap),
  suspend:     (id: string, body: any)  => api.post(`/verification/admin/${id}/suspend`, body).then(unwrap),
  reinstate:   (id: string)    => api.post(`/verification/admin/${id}/reinstate`).then(unwrap),
};

// ============================================================
//  SUPPORT TICKETS — routes/supportRoutes.js (/support)
// ============================================================
export const supportAPI = {
  list:          (params?: any) => api.get('/support/all', { params }).then(unwrap),
  getById:       (id: string)   => api.get(`/support/${id}`).then(unwrap),
  updateStatus:  (id: string, body: any) => api.put(`/support/${id}/status`, body).then(unwrap),
  analytics:     ()             => api.get('/support/analytics').then(unwrap),
  myTickets:     (params?: any) => api.get('/support/my-tickets', { params }).then(unwrap),
  create:        (body: any)    => api.post('/support', body).then(unwrap),
};

// ============================================================
//  CONTACT (ADMIN) — routes/contactRoutes.js (/contact)
// ============================================================
export const contactAdminAPI = {
  list:    (params?: any) => api.get('/contact', { params }).then(unwrap),
};

// ============================================================
//  OPERATIONS QUEUES — routes/operationsRoutes.js (/operations)
// ============================================================
export const operationsAPI = {
  dashboard:    ()            => api.get('/operations/dashboard').then(unwrap),
  supportQueue: (params?: any) => api.get('/operations/support-queue', { params }).then(unwrap),
  escrowQueue:  (params?: any) => api.get('/operations/escrow-queue', { params }).then(unwrap),
  dealerQueue:  (params?: any) => api.get('/operations/dealer-queue', { params }).then(unwrap),
  paymentQueue: (params?: any) => api.get('/operations/payment-queue', { params }).then(unwrap),
};

// Utility: format KES (re-exported from helpers for backward compat)
export { api };
export { formatKES } from '../utils/helpers';

export default api;

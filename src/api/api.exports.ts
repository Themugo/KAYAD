// src/api/api.exports.ts
// All the per-route API objects. Unchanged from the original api.ts.
// Keeping them here lets api.ts stay focused on client infrastructure
// (instance, interceptors, demo fallback, withDemo wrapper).
import { api, unwrap, withDemo } from "./api";
import { demoAPI } from "../data/demoAPI";

// ── AUTH ──────────────────────────────────────────────
const _authAPI = {
  register: (body: any) => api.post('/auth/register', body).then(unwrap),
  login:    (body: any) => api.post('/auth/login', body).then(unwrap),
  refresh:  ()     => api.post('/auth/refresh').then(unwrap),
  logout:   ()     => api.post('/auth/logout').then(unwrap),
  profile:  ()     => api.get('/auth/profile').then(unwrap),
  me:       ()     => api.get('/auth/me').then(unwrap),
  changePassword:   (body: any) => api.put('/auth/change-password', body).then(unwrap),
  forgotPassword:   (body: any) => api.post('/auth/forgot-password', body).then(unwrap),
  resetPassword:    (body: any) => api.post('/auth/reset-password', body).then(unwrap),
  verifyEmail:         (token: string) => api.get(`/auth/verify-email/${token}`).then(unwrap),
  resendVerification:  (body: any)  => api.post('/auth/resend-verification', body).then(unwrap),
  updateProfile:       (body: any) => api.put('/auth/profile', body).then(unwrap),
  sendOTP:       ()     => api.post('/auth/send-otp').then(unwrap),
  verifyPhone:   (otp: string) => api.post('/auth/verify-phone', { otp }).then(unwrap),
  phoneStatus:   ()     => api.get('/auth/phone-status').then(unwrap),
};
export const authAPI = withDemo(_authAPI, demoAPI.auth);

// ── CARS ──────────────────────────────────────────────
const _carsAPI = {
  list: (params: any) => api.get('/cars', { params }).then(unwrap),
  get:  (id: string)     => api.get(`/cars/${id}`).then(unwrap),
  insights: (id: string) => api.get(`/cars/${id}/insights`).then(unwrap),
  priceHistory: (id: string) => api.get(`/cars/${id}/price-history`).then(unwrap),
  trackClick: (id: string) => api.post(`/cars/${id}/click`).then(unwrap),
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
  bid: (id: string, body: any)        => api.post(`/cars/${id}/bid`, body).then(unwrap),
  toggleFav: (id: string)        => api.post(`/cars/${id}/favorite`).then(unwrap),
  batch: (body: any)         => api.post('/cars/batch', body).then(unwrap),
  demoAll: ()       => api.get('/cars/demo/all').then(unwrap),
  fraudCheck: (id: string) => api.get(`/cars/admin/${id}/fraud`).then(unwrap),
  adminStart: (id: string) => api.post(`/cars/admin/${id}/start`).then(unwrap),
  adminEnd:   (id: string) => api.post(`/cars/admin/${id}/end`).then(unwrap),
};
export const carsAPI = withDemo(_carsAPI, demoAPI.cars);

// ── BIDS ──────────────────────────────────────────────
const _bidsAPI = {
  place:           (carId: string, body: any) => api.post(`/bids/${carId}/bid`, body).then(unwrap),
  getForCar:       (carId: string)       => api.get(`/bids/${carId}/bids`).then(unwrap),
  endAuction:      (carId: string)       => api.post(`/bids/${carId}/end`).then(unwrap),
  adminAll:        (params: any)      => api.get('/bids/admin/all', { params }).then(unwrap),
  adminSuspicious: ()            => api.get('/bids/admin/suspicious').then(unwrap),
  adminSetWinner:  (bidId: string)       => api.post(`/bids/admin/${bidId}/set-winner`).then(unwrap),
};
export const bidsAPI = withDemo(_bidsAPI, demoAPI.bids);

// ── PAYMENTS ──────────────────────────────────────────
const _paymentsAPI = {
  initiate:    (body: any)      => api.post('/payments/initiate', body, { timeout: 45000 }).then(unwrap),
  status:      (id: string)        => api.get(`/payments/status/${id}`).then(unwrap),
  myPayments:  ()          => api.get('/payments/my').then(unwrap),
  byCheckout:  (checkoutId: string)=> api.get(`/payments/checkout/${checkoutId}`).then(unwrap),
};
export const paymentsAPI = withDemo(_paymentsAPI, demoAPI.payments);

// ── ESCROW ────────────────────────────────────────────
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

// ── ESCROW VAULT ──────────────────────────────────────
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

// ── DEALER ────────────────────────────────────────────
const _dealerAPI = {
  earnings:   (params: any) => api.get('/dealer/earnings', { params }).then(unwrap),
  cars:       (params: any) => api.get('/dealer/cars', { params }).then(unwrap),
  analytics:  (params: any) => api.get('/dealer/analytics', { params }).then(unwrap),
  summary:    ()       => api.get('/dealer/summary').then(unwrap),
  quickStats: ()       => api.get('/dealer/quick-stats').then(unwrap),
  bids:       (params: any) => api.get('/dealer/bids', { params }).then(unwrap),
  duplicate:  (carId: string)        => api.post(`/dealer/cars/${carId}/duplicate`).then(unwrap),
  markSold:   (carId: string, body: any)  => api.patch(`/dealer/cars/${carId}/mark-sold`, body).then(unwrap),
  acceptBid:  (carId: string, bidId: string) => api.post(`/dealer/cars/${carId}/accept-bid`, { bidId }).then(unwrap),
  rejectBid:  (carId: string, bidId: string) => api.post(`/dealer/cars/${carId}/reject-bid`, { bidId }).then(unwrap),
  bulkStatus: (body: any)         => api.patch('/dealer/cars/bulk-status', body).then(unwrap),
  bulkDelete: (ids: string[])     => api.post('/dealer/cars/bulk-delete', { ids }).then(unwrap),
  exportCSV:  (params: any)       => api.get('/dealer/cars', { params, responseType: 'blob' }).then(r => r.data),
  getTeam:        ()             => api.get('/dealer/team').then(unwrap),
  inviteMember:   (body: any)         => api.post('/dealer/team/invite', body).then(unwrap),
  updateMember:   (memberId: string, body: any) => api.patch(`/dealer/team/${memberId}`, body).then(unwrap),
  removeMember:   (memberId: string)     => api.delete(`/dealer/team/${memberId}`).then(unwrap),
  getSettlement:  ()             => api.get('/dealer/settlement').then(unwrap),
  updateSettlement: (body: any)       => api.put('/dealer/settlement', body).then(unwrap),
  getMyActivityLog: (params: any)     => api.get('/security-logs/my', { params }).then(unwrap),
  getProfile:   ()       => api.get('/dealer/profile').then(unwrap),
  updateProfile: (body: any)  => api.put('/dealer/profile', body).then(unwrap),
  milestones:   ()       => api.get('/dealer/milestones').then(unwrap),
  upgrade:      (body: any) => api.post('/dealer/upgrade', body).then(unwrap),
  leads:           (params?: any) => api.get('/leads', { params }).then(unwrap),
  updateLeadStage: (leadId: string, body: any) => api.put(`/leads/${leadId}/stage`, body).then(unwrap),
  archiveLead:     (leadId: string) => api.put(`/leads/${leadId}/archive`).then(unwrap),
  toggleWholesale: (carId: string, wholesale: boolean) => api.patch(`/dealer/cars/${carId}/wholesale`, { wholesale }).then(unwrap),
  tradeListings:   (params?: any) => api.get('/dealer/trade-listings', { params }).then(unwrap),
  pricingRecommendations: (body: any) => api.post('/dealer/pricing-recommendations', body).then(unwrap),
  generateApiKey:  () => api.post('/dealer/api-key').then(unwrap),
};
export const dealerAPI = withDemo(_dealerAPI, demoAPI.dealer);

// ── ADMIN ─────────────────────────────────────────────
const _adminAPI = {
  stats:         ()          => api.get('/admin/stats').then(unwrap),
  users:         (params: any)    => api.get('/admin/users', { params }).then(unwrap),
  toggleBan:     (userId: string)    => api.post(`/admin/users/${userId}/toggle-ban`).then(unwrap),
  approveDealer: (userId: string)    => api.post(`/admin/users/${userId}/approve-dealer`).then(unwrap),
  cars:          (params: any)    => api.get('/admin/cars', { params }).then(unwrap),
  deleteCar:     (carId: string)     => api.delete(`/admin/cars/${carId}`).then(unwrap),
  updateSellerSettings: (userId: string, body: any) => api.put(`/admin/users/${userId}/seller-settings`, body).then(unwrap),
  getConfig:      ()          => api.get('/admin/config').then(unwrap),
  getPublicConfig: ()         => api.get('/admin/public/config').then(unwrap),
  updateConfig:   (body: any)      => api.put('/admin/config', body).then(unwrap),
  getAuditLog:    (params: any)    => api.get('/admin/audit-log', { params }).then(unwrap),
  appendAuditLog: (body: any)      => api.post('/admin/audit-log', body).then(unwrap),
  getAuditLogs:          (params: any) => api.get('/audit/logs', { params }).then(unwrap),
  getAuditLogById:       (id: string)     => api.get(`/audit/logs/${id}`).then(unwrap),
  getAuditLogsByAction:  (action: string, params: any) => api.get(`/audit/logs/action/${action}`, { params }).then(unwrap),
  getAuditLogsByActor:   (actorId: string, params: any) => api.get(`/audit/logs/actor/${actorId}`, { params }).then(unwrap),
  getAuditLogsByTarget:  (targetId: string, targetModel: string, params: any) => api.get(`/audit/logs/target/${targetId}/${targetModel}`, { params }).then(unwrap),
  getAuditLogStatistics: (params: any) => api.get('/audit/logs/statistics', { params }).then(unwrap),
  exportAuditLogs:       (params: any) => api.get('/audit/logs/export', { params }).then(unwrap),
  getReconciliationDashboard: (params: any) => api.get('/reconciliation/dashboard', { params }).then(unwrap),
  getFinancialIntegrityScore: (params: any) => api.get('/reconciliation/integrity-score', { params }).then(unwrap),
  getNegativeBalances:        (params: any) => api.get('/reconciliation/negative-balances', { params }).then(unwrap),
  getUnreleasedEscrows:       (params: any) => api.get('/reconciliation/unreleased-escrows', { params }).then(unwrap),
  runReconciliationReport:    (body: any)   => api.post('/reconciliation/run', body).then(unwrap),
  getReconciliationReports:   (params: any) => api.get('/reconciliation/reports', { params }).then(unwrap),
  getReconciliationReportById: (id: string)     => api.get(`/reconciliation/reports/${id}`).then(unwrap),
  resolveReconciliationIssue: (reportId: string, body: any) => api.post(`/reconciliation/reports/${reportId}/resolve`, body).then(unwrap),
  exportReconciliationReport: (reportId: string, format: string) => api.get(`/reconciliation/export/${reportId}/${format}`, { responseType: 'blob' }).then(unwrap),
  testMpesa:      (body: any)      => api.post('/admin/daraja/test', body).then(unwrap),
  systemKillSwitch: (body: any) => api.post('/admin/system/kill-switch', body).then(unwrap),
  systemRecover:    (body: any) => api.post('/admin/system/recover', body).then(unwrap),
  verifyDealer:    (userId: string, body: any) => api.post(`/admin/users/${userId}/verify-dealer`, body).then(unwrap),
  verifyCar:       (carId: string, body: any) => api.post(`/admin/cars/${carId}/verify`, body).then(unwrap),
  moderateCar:     (carId: string, body: any) => api.post(`/admin/cars/${carId}/moderate`, body).then(unwrap),
  getStaff:        ()            => api.get('/admin/staff').then(unwrap),
  createStaff:     (body: any)        => api.post('/admin/staff', body).then(unwrap),
  updateStaff:     (id: string, body: any)    => api.put(`/admin/staff/${id}`, body).then(unwrap),
  deleteStaff:     (id: string)          => api.delete(`/admin/staff/${id}`).then(unwrap),
  getPermCatalog:  ()            => api.get('/admin/staff/permissions/catalog').then(unwrap),
  getStaffPerms:   (id: string)          => api.get(`/admin/staff/${id}/permissions`).then(unwrap),
  setStaffPerms:   (id: string, body: any)    => api.put(`/admin/staff/${id}/permissions`, body).then(unwrap),
  seedDepartments: ()            => api.post('/admin/seed-departments').then(unwrap),
  reseed:          ()            => api.post('/admin/reseed').then(unwrap),
  deleteUser:      (userId: string)      => api.delete(`/admin/users/${userId}`).then(unwrap),
  deactivateUser:  (userId: string)      => api.put(`/admin/users/${userId}/deactivate`).then(unwrap),
  demoStatus:      ()            => api.get('/admin/demo/status').then(unwrap),
  demoCleanup:     ()            => api.delete('/admin/demo/cleanup').then(unwrap),
  toggleDemo:      ()            => api.post('/admin/demo/toggle').then(unwrap),
  demoReseed:      ()            => api.post('/admin/demo/reseed').then(unwrap),
  assignPackage:   (userId: string, body: any) => api.patch(`/admin/dealers/${userId}/package`, body).then(unwrap),
  updatePackages:  (packages: any) => api.put('/admin/config/packages', { packages }).then(unwrap),
  reviews:         (params: any)    => api.get('/admin/reviews', { params }).then(unwrap),
  deleteReview:    (id: string)        => api.delete(`/admin/reviews/${id}`).then(unwrap),
  referrals:        (params: any)    => api.get('/admin/referrals', { params }).then(unwrap),
  referralStats:    ()          => api.get('/admin/referrals/stats').then(unwrap),
  referralDetail:   (id: string)        => api.get(`/admin/referrals/${id}`).then(unwrap),
  creditReferral:   (id: string, body: any)  => api.post(`/admin/referrals/${id}/credit`, body).then(unwrap),
  expireReferral:   (id: string)        => api.post(`/admin/referrals/${id}/expire`).then(unwrap),
  userReferrals:    (userId: string)    => api.get(`/admin/users/${userId}/referrals`).then(unwrap),
  chats:            (params: any)    => api.get('/admin/chats', { params }).then(unwrap),
  chatMessages:     (chatId: string)    => api.get(`/admin/chats/${chatId}/messages`).then(unwrap),
  deleteChatMessage: (chatId: string, msgId: string) => api.delete(`/admin/chats/${chatId}/messages/${msgId}`).then(unwrap),
  blockChat:        (chatId: string)    => api.post(`/admin/chats/${chatId}/block`).then(unwrap),
  unblockChat:      (chatId: string)    => api.post(`/admin/chats/${chatId}/unblock`).then(unwrap),
  marketData:       (params: any)    => api.get('/admin/market-data', { params }).then(unwrap),
  marketDataDetail: (id: string)        => api.get(`/admin/market-data/${id}`).then(unwrap),
  createMarketData: (body: any)      => api.post('/admin/market-data', body).then(unwrap),
  updateMarketData: (id: string, body: any)  => api.put(`/admin/market-data/${id}`, body).then(unwrap),
  deleteMarketData: (id: string)        => api.delete(`/admin/market-data/${id}`).then(unwrap),
  bulkMarketData:  (entries: any)   => api.post('/admin/market-data/bulk', { entries }).then(unwrap),
  alerts:          (params: any)    => api.get('/admin/alerts', { params }).then(unwrap),
  markAlertRead:   (id: string)        => api.post(`/admin/alerts/${id}/read`).then(unwrap),
  markAllAlertsRead: ()        => api.post('/admin/alerts/read-all').then(unwrap),
  systemHealth:    ()          => api.get('/admin/system/health').then(unwrap),
  inspectorApplications: (params: any) => api.get('/inspector-applications', { params }).then(unwrap),
  reviewInspector: (id: string, action: string, body: any) => api.post(`/inspector-applications/${id}/${action}`, body).then(unwrap),
  uploadLogo: (formData: FormData) => api.post('/admin/upload-logo', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(unwrap),
  fraudAnalytics:    ()          => api.get('/fraud/analytics').then(unwrap),
  fraudGetAll:       (params: any)    => api.get('/fraud/all', { params }).then(unwrap),
  fraudUpdateStatus: (id: string, body: any)  => api.put(`/fraud/${id}/status`, body).then(unwrap),
  integrityDashboard: ()        => api.get('/new-admin/auction-integrity/dashboard').then(unwrap),
  integrityFlags:     (p: any)  => api.get('/new-admin/auction-integrity', { params: p }).then(unwrap),
  integrityFlag:      (id: string)  => api.get(`/new-admin/auction-integrity/${id}`).then(unwrap),
  integrityUpdateFlag:(id: string, body: any) => api.patch(`/new-admin/auction-integrity/${id}/status`, body).then(unwrap),
  integrityScan:      (body: any)   => api.post('/new-admin/auction-integrity/scan', body).then(unwrap),
   integrityRiskProfiles: (p: any) => api.get('/new-admin/auction-integrity/risk-profiles', { params: p }).then(unwrap),
   escrowApprove: (userId: string) => api.put(`/admin/users/${userId}/escrow-approve`).then(unwrap),
   escrowForce:   (userId: string) => api.put(`/admin/users/${userId}/escrow-force`).then(unwrap),
};
export const adminAPI = _adminAPI;

// ── DISPUTE ───────────────────────────────────────────
export const disputeAPI = {
  my:           (params?: any)       => api.get('/disputes/my', { params }).then(unwrap),
  create:       (body: any)          => api.post('/disputes', body).then(unwrap),
  get:          (id: string)         => api.get(`/disputes/${id}`).then(unwrap),
  evidence:     (id: string)         => api.get(`/disputes/${id}/evidence`).then(unwrap),
  uploadEvidence: (id: string, formData: FormData) =>
    api.post(`/disputes/${id}/evidence`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(unwrap),
  evidenceItem: (id: string, evidenceId: string) => api.get(`/disputes/${id}/evidence/${evidenceId}`).then(unwrap),
  deleteEvidence: (id: string, evidenceId: string) => api.delete(`/disputes/${id}/evidence/${evidenceId}`).then(unwrap),
  verifyEvidence: (id: string, evidenceId: string) => api.post(`/disputes/${id}/evidence/${evidenceId}/verify`).then(unwrap),
  all:          (params?: any)       => api.get('/disputes', { params }).then(unwrap),
  stats:        ()                   => api.get('/disputes/stats').then(unwrap),
  assign:       (id: string, body: any) => api.post(`/disputes/${id}/assign`, body).then(unwrap),
  transitionTo:   (id: string, body: any) => api.patch(`/disputes/${id}/status`, body).then(unwrap),
  addNote:      (id: string, body: any) => api.post(`/disputes/${id}/notes`, body).then(unwrap),
  startMediation:   (id: string, body: any) => api.post(`/disputes/${id}/mediation/start`, body).then(unwrap),
  completeMediation: (id: string, body: any) => api.post(`/disputes/${id}/mediation/complete`, body).then(unwrap),
  resolve:      (id: string, body: any) => api.post(`/disputes/${id}/resolve`, body).then(unwrap),
  appeal:       (id: string, body: any) => api.post(`/disputes/${id}/appeal`, body).then(unwrap),
  reviewAppeal: (id: string, body: any) => api.post(`/disputes/${id}/appeal/review`, body).then(unwrap),
};

// ── NOTIFICATIONS ─────────────────────────────────────
const _notifAPI = {
  list:        (params: any) => api.get('/notifications', { params }).then(unwrap),
  markRead:    (id: string)     => api.post(`/notifications/${id}/read`).then(unwrap),
  markAllRead: ()       => api.post('/notifications/read-all').then(unwrap),
  remove:      (id: string)     => api.delete(`/notifications/${id}`).then(unwrap),
  createReminder: (body: any) => api.post('/notifications/reminders', body).then(unwrap),
};
export const notifAPI = withDemo(_notifAPI, demoAPI.notif);

// ── FAVORITES ─────────────────────────────────────────
const _favoritesAPI = {
  list:   ()      => api.get('/favorites').then(unwrap),
  add:    (carId: string) => api.post(`/favorites/${carId}`).then(unwrap),
  remove: (carId: string) => api.delete(`/favorites/${carId}`).then(unwrap),
  toggle: (carId: string) => api.post(`/favorites/${carId}/toggle`).then(unwrap),
  setPriceAlert: (carId: string, notify: boolean) => api.put(`/favorites/${carId}/price-alert`, { notifyOnPriceDrop: notify }).then(unwrap),
};
export const favoritesAPI = withDemo(_favoritesAPI, demoAPI.favorites);

// ── CHAT ──────────────────────────────────────────────
const _chatAPI = {
  inbox:    ()               => api.get('/chat').then(unwrap),
  start:    (body: any)           => api.post('/chat', body).then(unwrap),
  messages: (chatId: string, params: any) => api.get(`/chat/${chatId}/messages`, { params }).then(unwrap),
  send:     (chatId: string, body: any)   => api.post(`/chat/${chatId}/message`, body).then(unwrap),
  seen:     (chatId: string)         => api.post(`/chat/${chatId}/seen`).then(unwrap),
  leave:    (chatId: string)         => api.delete(`/chat/${chatId}`).then(unwrap),
};
export const chatAPI = withDemo(_chatAPI, demoAPI.chat);

// ── SAVED SEARCHES ────────────────────────────────────
const _savedSearchAPI = {
  list:   ()             => api.get('/saved-searches').then(unwrap),
  create: (body: any)         => api.post('/saved-searches', body).then(unwrap),
  update: (id: string, body: any)     => api.put(`/saved-searches/${id}`, body).then(unwrap),
  remove: (id: string)           => api.delete(`/saved-searches/${id}`).then(unwrap),
  toggleAlerts: async (id: string, enabled?: boolean) => {
    const body = enabled === undefined ? {} : { notifyOnNewMatch: enabled };
    return api.put(`/saved-searches/${id}`, body).then(unwrap);
  },
};
export const savedSearchAPI = withDemo(_savedSearchAPI, demoAPI.savedSearch);

// ── NTSA ──────────────────────────────────────────────
const _ntsaAPI = {
  list:    (params: any)    => api.get('/ntsa-verification', { params }).then(unwrap),
  queue:   (carId: string)     => api.post('/ntsa-verification', { carId }).then(unwrap),
  process: (id: string, body: any)  => api.post(`/ntsa-verification/${id}/process`, body).then(unwrap),
  addDoc:  (id: string, body: any)  => api.post(`/ntsa-verification/${id}/documents`, body).then(unwrap),
  status:  (carId: string)     => api.get(`/ntsa-verification/car/${carId}/status`).then(unwrap),
};
export const ntsaAPI = withDemo(_ntsaAPI, demoAPI.ntsa);

// ── REFERRAL ──────────────────────────────────────────
const _referralAPI = {
  stats: () => api.get('/referral/stats').then(unwrap),
  code:  () => api.get('/referral/code').then(unwrap),
};
export const referralAPI = withDemo(_referralAPI, {});

// ── INSPECTIONS ───────────────────────────────────────
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

// ── REVIEWS ───────────────────────────────────────────
const _reviewsAPI = {
  create:       (body: any)     => api.post('/reviews', body).then(unwrap),
  mine:         ()         => api.get('/reviews/my').then(unwrap),
  forDealer:    (dealerId: string) => api.get(`/reviews/dealer/${dealerId}`).then(unwrap),
  remove:       (id: string)       => api.delete(`/reviews/${id}`).then(unwrap),
};
export const reviewsAPI = withDemo(_reviewsAPI, demoAPI.reviews);

// ── TRANSACTIONS ──────────────────────────────────────
const _transactionsAPI = {
  list:    (params: any) => api.get('/transactions', { params }).then(unwrap),
  get:     (id: string)     => api.get(`/transactions/${id}`).then(unwrap),
  summary: ()       => api.get('/transactions/summary').then(unwrap),
};
export const transactionsAPI = withDemo(_transactionsAPI, demoAPI.transactions);

// ── AUCTIONS (PUBLIC) ──────────────────────────────────
const _auctionAPI = {
  list:     (params: any) => api.get('/auctions', { params }).then(unwrap),
  get:      (id: string)     => api.get(`/auctions/${id}`).then(unwrap),
  active:   (params: any) => api.get('/auctions/active', { params }).then(unwrap),
  my:       (params: any) => api.get('/auctions/my', { params }).then(unwrap),
};
export const auctionAPI = withDemo(_auctionAPI, demoAPI.auctionAdmin);

// ── AUCTION ADMIN ─────────────────────────────────────
const _auctionAdminAPI = {
  start:     (carId: string, body: any)  => api.post(`/auction-admin/${carId}/start`, body).then(unwrap),
  end:       (carId: string)        => api.post(`/auction-admin/${carId}/end`).then(unwrap),
  extend:    (carId: string, body: any)  => api.post(`/auction-admin/${carId}/extend`, body).then(unwrap),
  bidHistory:(carId: string)        => api.get(`/auction-admin/${carId}/bids`).then(unwrap),
  setWinner: (carId: string, bidId: string) => api.post(`/auction-admin/${carId}/set-winner`, { bidId }).then(unwrap),
};
export const auctionAdminAPI = withDemo(_auctionAdminAPI, demoAPI.auctionAdmin);

// ── DEALER AUCTION ────────────────────────────────────
const _dealerAuctionAPI = {
  start:     (carId: string, body: any)  => api.post(`/dealer/cars/${carId}/auction/start`, body).then(unwrap),
  end:       (carId: string)        => api.post(`/dealer/cars/${carId}/auction/end`).then(unwrap),
  extend:    (carId: string, hours: number) => api.post(`/dealer/cars/${carId}/auction/extend`, { hours }).then(unwrap),
};
export const dealerAuctionAPI = withDemo(_dealerAuctionAPI, demoAPI.auctionAdmin);

// ── VERIFIED BUYER ────────────────────────────────────
export const buyerVerificationAPI = {
  submitPreApproval: (body: any) => api.post('/users/bank-pre-approval', body).then(unwrap),
  removePreApproval: ()     => api.delete('/users/bank-pre-approval').then(unwrap),
};

// ── ADS ───────────────────────────────────────────────
export const adsAPI = {
  list:       (params: any) => api.get('/ads', { params }).then(unwrap),
  adminList:  ()       => api.get('/admin/ads').then(unwrap),
  create:     (body: any)   => api.post('/admin/ads', body).then(unwrap),
  update:     (id: string, body: any) => api.put(`/admin/ads/${id}`, body).then(unwrap),
  remove:     (id: string)     => api.delete(`/admin/ads/${id}`).then(unwrap),
};

// ── SMS BIDDING ───────────────────────────────────────
export const smsBiddingAPI = {
  my:          ()                => api.get('/sms-bidding/my').then(unwrap),
  register:    (phone: string)           => api.post('/sms-bidding/register', { phone }).then(unwrap),
  subscribe:   (body: any)            => api.post('/sms-bidding/subscribe', body).then(unwrap),
  unsubscribe: (carId: string)           => api.delete(`/sms-bidding/unsubscribe/${carId}`).then(unwrap),
};

// ── CONTACT ───────────────────────────────────────────
export const contactAPI = {
  send: (body: any) => api.post('/contact', body).then(unwrap),
};

// ── MARKET ────────────────────────────────────────────
const _marketAPI = {
  pulse:      (carId: string)  => api.get(`/market/pulse/${carId}`).then(unwrap),
  trends:     (params: any) => api.get('/market/trends', { params }).then(unwrap),
  dealerInsights: ()   => api.get('/market/dealer/insights').then(unwrap),
};
export const marketAPI = withDemo(_marketAPI, demoAPI.market);

// ── INSPECTOR ─────────────────────────────────────────
export const inspectorAPI = {
  apply: (body: any) => api.post('/inspector-applications/apply', body).then(unwrap),
};

// ── ADMIN PAYMENTS ────────────────────────────────────
export const adminPaymentsAPI = {
  list: (params: any) => api.get('/admin/payments', { params }).then(unwrap),
};

// ── BULK ADMIN ────────────────────────────────────────
export const bulkAdminAPI = {
  moderateCars: (body: any) => api.post('/admin/bulk/cars/moderate', body).then(unwrap),
  deleteCars:   (body: any) => api.post('/admin/bulk/cars/delete', body).then(unwrap),
  exportCars:   (params?: any) => api.get('/admin/bulk/export/cars', { params, responseType: 'blob' }).then(unwrap),
  exportUsers:  (params?: any) => api.get('/admin/bulk/export/users', { params, responseType: 'blob' }).then(unwrap),
};

// ── ADMIN VERIFICATION ────────────────────────────────
export const adminVerificationAPI = {
  list:        (params?: any)  => api.get('/verification/admin/all', { params }).then(unwrap),
  getById:     (id: string)    => api.get(`/verification/admin/${id}`).then(unwrap),
  approve:     (id: string, body?: any) => api.post(`/verification/admin/${id}/approve`, body).then(unwrap),
  reject:      (id: string, body: any)  => api.post(`/verification/admin/${id}/reject`, body).then(unwrap),
  suspend:     (id: string, body: any)  => api.post(`/verification/admin/${id}/suspend`, body).then(unwrap),
  reinstate:   (id: string)    => api.post(`/verification/admin/${id}/reinstate`).then(unwrap),
};

// ── VERIFICATION ──────────────────────────────────────
export const verificationAPI = {
  submit:      (body: any)     => api.post('/verification/submit', body).then(unwrap),
  getStatus:   ()              => api.get('/verification/status').then(unwrap),
  requestPhoneOTP: ()          => api.post('/verification/phone/request').then(unwrap),
  verifyPhoneOTP: (code: string) => api.post('/verification/phone/verify', { code }).then(unwrap),
};

// ── SUPPORT ───────────────────────────────────────────
export const supportAPI = {
  list:          (params?: any) => api.get('/support/all', { params }).then(unwrap),
  getById:       (id: string)   => api.get(`/support/${id}`).then(unwrap),
  updateStatus:  (id: string, body: any) => api.put(`/support/${id}/status`, body).then(unwrap),
  analytics:     ()             => api.get('/support/analytics').then(unwrap),
  myTickets:     (params?: any) => api.get('/support/my-tickets', { params }).then(unwrap),
  create:        (body: any)    => api.post('/support', body).then(unwrap),
};

// ── SUPPORT TICKET ADMIN ──────────────────────────────
export const supportTicketAdminAPI = {
  stats:      ()            => api.get('/admin/support-tickets/stats').then(unwrap),
  list:       (params?: any) => api.get('/admin/support-tickets', { params }).then(unwrap),
  get:        (id: string)  => api.get(`/admin/support-tickets/${id}`).then(unwrap),
  updateStatus: (id: string, body: any) => api.patch(`/admin/support-tickets/${id}/status`, body).then(unwrap),
  assign:     (id: string, body: any) => api.patch(`/admin/support-tickets/${id}/assign`, body).then(unwrap),
  addMessage: (id: string, body: any) => api.post(`/admin/support-tickets/${id}/messages`, body).then(unwrap),
};

// ── REPORTS ───────────────────────────────────────────
export const reportAPI = {
  submit:      (body: any) => api.post('/reports/submit', body).then(unwrap),
  my:          (params?: any) => api.get('/reports/my', { params }).then(unwrap),
  adminAll:    (params?: any) => api.get('/reports/admin/all', { params }).then(unwrap),
  adminGet:    (id: string)  => api.get(`/reports/admin/${id}`).then(unwrap),
  adminUpdate: (id: string, body: any) => api.patch(`/reports/admin/${id}/status`, body).then(unwrap),
};

// ── FEEDBACK ──────────────────────────────────────────
export const feedbackAPI = {
  submit:      (body: any) => api.post('/feedback/submit', body).then(unwrap),
  adminAll:    (params?: any) => api.get('/feedback/admin/all', { params }).then(unwrap),
  adminUpdate: (id: string, body: any) => api.patch(`/feedback/admin/${id}/status`, body).then(unwrap),
};

// ── ANNOUNCEMENTS ─────────────────────────────────────
export const announcementAPI = {
  create:     (body: any)  => api.post('/announcements', body).then(unwrap),
  send:       (id: string) => api.post(`/announcements/${id}/send`).then(unwrap),
  list:       (params?: any) => api.get('/announcements', { params }).then(unwrap),
  get:        (id: string) => api.get(`/announcements/${id}`).then(unwrap),
  delete:     (id: string) => api.delete(`/announcements/${id}`).then(unwrap),
};

// ── CONTACT ADMIN ─────────────────────────────────────
export const contactAdminAPI = {
  list:    (params?: any) => api.get('/contact', { params }).then(unwrap),
};

// ── OPERATIONS ────────────────────────────────────────
export const operationsAPI = {
  dashboard:    ()            => api.get('/operations/dashboard').then(unwrap),
  supportQueue: (params?: any) => api.get('/operations/support-queue', { params }).then(unwrap),
  escrowQueue:  (params?: any) => api.get('/operations/escrow-queue', { params }).then(unwrap),
  dealerQueue:  (params?: any) => api.get('/operations/dealer-queue', { params }).then(unwrap),
  paymentQueue: (params?: any) => api.get('/operations/payment-queue', { params }).then(unwrap),
};

// ── PARTNERS ──────────────────────────────────────────
export const partnersAPI = {
  list: async () => {
    try {
      const config = await adminAPI.getConfig();
      return config?.partners || [];
    } catch {
      return [];
    }
  },
  update: async (partners: any[]) => {
    const config = await adminAPI.getConfig();
    return adminAPI.updateConfig({ ...config, partners });
  },
};

// ── PLATFORM STATS ────────────────────────────────────
export const platformStatsAPI = {
  get: async () => {
    const [carsData, adminStats] = await Promise.allSettled([
      carsAPI.list({ page: 1, limit: 1, category: 'all' }),
      adminAPI.stats(),
    ]);
    const totalCars = carsData.status === 'fulfilled'
      ? (carsData.value?.total || carsData.value?.cars?.length || 0)
      : 0;
    const adminData = adminStats.status === 'fulfilled' ? adminStats.value : {};
    const verifiedDealers = adminData?.totalDealers || adminData?.verifiedDealers || 0;
    const totalTransactions = adminData?.totalTransactions || adminData?.completedSales || 0;
    const totalRevenue = adminData?.totalRevenue || adminData?.revenue || 0;
    const liveAuctions = adminData?.liveAuctions || 0;
    const totalUsers = adminData?.totalUsers || 0;
    return { totalCars, verifiedDealers, totalTransactions, totalRevenue, liveAuctions, totalUsers };
  },
};

// ── formatKES (re-exported from helpers) ──────────────
export { formatKES } from "../utils/helpers";



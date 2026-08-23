import axios from 'axios';

// Fixed (Phase 2 - auth consolidation): this shared axios instance had
// no withCredentials at all - meaning every one of its 22 real
// consumers (SimilarCars, HeroCarousel, MarketPulse, PaymentModal,
// InspectionButton, DealerMarketInsights, AdminSidebar, and others -
// confirmed by direct search across src/) sent completely
// unauthenticated requests: not the Bearer token below (dead code,
// see the interceptor's own note) and not the real HttpOnly session
// cookie either (axios does not send cookies cross-origin, or even
// same-origin in some configurations, without this flag explicitly
// set). Any of these 22 components calling a real, protect-gated
// backend endpoint would receive 401 regardless of whether the visitor
// was actually logged in. Added withCredentials: true so requests
// through this client now carry the same, real, one authoritative
// session used everywhere else in the app (services/authApi.ts,
// AuthContext) - the minimal, correct fix for this specific gap.
// Not touched this pass: baseURL ('/api', not '/api/v1') is shared
// across many different endpoint modules in api.exports.ts, some of
// which may correctly target non-versioned /api/* routes (this
// project's backend mounts both prefixes) - changing it globally risks
// breaking currently-correct paths and is a separate, per-endpoint
// audit, not an authentication-wiring fix.
export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Dead code, left in place rather than silently removed: kayad_token
// is never written to localStorage anywhere in the real, current auth
// flow (services/authApi.ts uses HttpOnly cookies exclusively, never
// localStorage) - this interceptor's `if (token)` branch can no longer
// fire. Harmless (getItem returns null, the branch is skipped), but
// worth flagging as another loose end from the same legacy client this
// phase is consolidating away from.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('kayad_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const unwrap = (response: any) => {
  if (response && response.data !== undefined) {
    return response.data;
  }
  return response;
};

// Re-export all API modules from api.exports.ts
export * from './api.exports';

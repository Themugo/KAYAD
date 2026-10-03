import axios from 'axios';
import { clearCSRFToken, getCSRFToken, getCsrfHeaders, setCSRFToken } from '../utils/csrf';

const configuredApiUrl = String(import.meta.env.VITE_API_URL || '').trim().replace(/\/$/, '');

// One transport contract for every browser API call:
//   - unset VITE_API_URL -> /api locally, canonical api.kayad.space in production
//   - VITE_API_URL=/api -> same-origin /api when explicitly configured
//   - VITE_API_URL=https://api.kayad.space -> https://api.kayad.space/api
//   - VITE_API_URL=https://api.kayad.space/api -> same canonical API origin
// All service modules therefore keep using their existing /cars, /auth, etc.
// paths while the adapter normalizes /api-prefixed auth paths in httpRequest.
const apiOrigin = configuredApiUrl.replace(/\/api$/, '');
const API_URL = configuredApiUrl && apiOrigin && /^https?:\/\//i.test(apiOrigin)
  ? `${apiOrigin}/api`
  : import.meta.env.PROD
    ? 'https://api.kayad.space/api'
    : '/api';

// Auth routes are mounted at /api/v1/auth on the backend. Axios already has
// /api in its baseURL, so the request path is /v1/auth/... in every deployment.
const CSRF_BOOTSTRAP_PATH = '/v1/auth/csrf';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  // A hanging request must not hang the UI forever — network
  // interruptions surface as an error the page can render honestly.
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

let csrfBootstrapPromise: Promise<void> | null = null;
let refreshSessionPromise: Promise<void> | null = null;

const ensureCsrfToken = async (): Promise<void> => {
  if (typeof document === 'undefined') return;
  if (getCSRFToken()) return;

  if (!csrfBootstrapPromise) {
    csrfBootstrapPromise = api
      .get(CSRF_BOOTSTRAP_PATH, { withCredentials: true })
      .then((response) => {
        const token = response?.data?.csrfToken;
        if (typeof token === 'string' && token.length >= 32) {
          // Keep a memory copy as well as the readable cookie. This matters
          // when the API is on api.kayad.space and the UI is on a separate
          // KAYAD subdomain, or when a browser privacy mode hides a cookie
          // from document.cookie even though it is still sent to the API.
          setCSRFToken(token);
          return;
        }
        throw new Error('CSRF bootstrap did not return a valid token');
      })
      .finally(() => {
        csrfBootstrapPromise = null;
      });
  }

  await csrfBootstrapPromise;
};

api.interceptors.request.use(async (config) => {
  const method = String(config.method || 'get').toUpperCase();
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    // A brand-new browser has no XSRF cookie yet. Bootstrap it before the
    // first state-changing request; otherwise the server correctly rejects
    // registration/login/etc. with "CSRF token validation failed".
    await ensureCsrfToken();
  }
  Object.assign(config.headers, getCsrfHeaders(method));
  return config;
});

// Authentication endpoints have different 401 semantics. Do not collapse
// login failures, registration failures, session probes and refresh failures
// into one generic "session expired" path.
type AuthEndpointKind =
  | 'login'
  | 'register'
  | 'refresh'
  | 'session-probe'
  | 'logout'
  | 'verification'
  | 'recovery'
  | 'other';

const classifyAuthEndpoint = (url: string = ''): AuthEndpointKind => {
  const path = String(url).split('?')[0];
  if (/\/auth\/(login)(?:$|\?)/.test(path)) return 'login';
  if (/\/auth\/(register)(?:$|\?)/.test(path)) return 'register';
  if (/\/auth\/(refresh)(?:$|\?)/.test(path)) return 'refresh';
  if (/\/auth\/(me|profile)(?:$|\?)/.test(path)) return 'session-probe';
  if (/\/auth\/logout(?:$|\?)/.test(path)) return 'logout';
  if (/\/auth\/(verify-email|resend-verification)(?:\/|$)/.test(path)) return 'verification';
  if (/\/auth\/(forgot-password|reset-password)(?:$|\?)/.test(path)) return 'recovery';
  return 'other';
};

const shouldAttemptRefresh = (kind: AuthEndpointKind) =>
  kind === 'other' || kind === 'session-probe';

const shouldDispatchAuthExpired = (kind: AuthEndpointKind) =>
  kind === 'other' || kind === 'refresh';

const refreshSession = async (): Promise<void> => {
  if (!refreshSessionPromise) {
    refreshSessionPromise = api
      .post('/v1/auth/refresh')
      .then(() => undefined)
      .finally(() => {
        refreshSessionPromise = null;
      });
  }
  await refreshSessionPromise;
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error?.config as (typeof error.config & { _kayadRetried?: boolean; _kayadCsrfRetried?: boolean }) | undefined;
    const status = error?.response?.status;

    // A stale/missing double-submit token is recoverable. Clear only the
    // in-memory copy, bootstrap a fresh server-issued token, and retry the
    // mutation once. This is deliberately separate from authentication expiry.
    if (status === 403 && original && !original._kayadCsrfRetried && /csrf token validation failed/i.test(String(error?.response?.data?.message || error?.message || ''))) {
      original._kayadCsrfRetried = true;
      try {
        clearCSRFToken();
        await ensureCsrfToken();
        return api.request(original);
      } catch {
        return Promise.reject(error);
      }
    }

    // Access cookies are intentionally short-lived. On the first 401 from a
    // normal authenticated endpoint, rotate the refresh cookie and retry the
    // original request once. Login/register/refresh failures remain terminal
    // auth errors and never recurse through this path.
    const endpointKind = classifyAuthEndpoint(original?.url || error?.config?.url || '');

    if (status === 401 && original && !original._kayadRetried && shouldAttemptRefresh(endpointKind)) {
      original._kayadRetried = true;
      try {
        await refreshSession();
        return api.request(original);
      } catch {
        // A normal login/registration/session-probe failure must not be
        // converted into a global redirect signal. A refresh failure is the
        // explicit session-expiry boundary.
        if (shouldDispatchAuthExpired(endpointKind)) {
          window.dispatchEvent(new Event('kayad:auth-expired'));
        }
        return Promise.reject(error);
      }
    }

    if (status === 401 && shouldDispatchAuthExpired(endpointKind)) {
      window.dispatchEvent(new Event('kayad:auth-expired'));
    }
    return Promise.reject(error);
  }
);

export const unwrap = (response: any) => {
  if (response && response.data !== undefined) {
    return response.data;
  }
  return response;
};



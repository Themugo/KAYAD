import axios from 'axios';
import { getCsrfHeaders } from '../utils/csrf';

const configuredApiUrl = String(import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
// Keep the established `/api` same-origin fallback for service prefixes while
// accepting either an API origin or an origin that already ends in `/api`.
const API_URL = configuredApiUrl ? configuredApiUrl.replace(/\/api$/, '') : '/api';

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

const ensureCsrfToken = async (): Promise<void> => {
  if (typeof document === 'undefined') return;
  if (getCsrfHeaders('POST')['X-CSRF-Token']) return;

  if (!csrfBootstrapPromise) {
    csrfBootstrapPromise = api
      .get('/auth/csrf', { withCredentials: true })
      .then(() => undefined)
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

// Auth endpoints return 401 as a normal part of their own flows
// (bad credentials, "not logged in" probes) — those must NOT trigger
// a global session-expired event.
const isAuthEndpoint = (url: string = '') => /\/auth\/(login|register|refresh|me|profile)/.test(url);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Expired/revoked session: clear local state so the app stops
    // firing doomed authenticated requests, and notify AuthContext
    // (it listens for this event) instead of silently showing stale
    // or empty data.
    if (error?.response?.status === 401 && !isAuthEndpoint(error?.config?.url)) {
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



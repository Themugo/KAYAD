import axios from 'axios';
import { getCsrfHeaders } from '../utils/csrf';

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  // A hanging request must not hang the UI forever — network
  // interruptions surface as an error the page can render honestly.
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const method = String(config.method || 'get').toUpperCase();
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



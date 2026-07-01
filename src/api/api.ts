// src/api/api.ts
// ============================================================
// KAYAD — FULL API LAYER
// Every backend route mapped exactly to the Express routes.
// Production-grade: structured logging, abort-aware, no token leaks.
// ============================================================

import axios, { AxiosInstance, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from "axios";
import { logInfo, logWarn, logError } from "../utils/logger";
import { demoAPI } from "../data/demoAPI";

const BASE = "/api";
const HEALTH_ENDPOINT = `${BASE}/health`;

const DEMO_MODE_ENABLED = (import.meta.env?.VITE_ENABLE_DEMO ?? "true") !== "false";
let __DEMO_MODE__ = false;

export const isDemoMode = (): boolean => __DEMO_MODE__ && DEMO_MODE_ENABLED;

export const enableDemoMode = (): void => {
  if (DEMO_MODE_ENABLED && import.meta.env?.VITE_ENABLE_DEMO !== "false") {
    __DEMO_MODE__ = true;
    try { localStorage.removeItem("kayad_demo_user"); } catch { /* ignore */ }
    logInfo("Demo mode enabled");
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
        logInfo("Backend reachable — live mode");
        return true;
      } catch (err) {
        const error = err as AxiosError;
        const s = error.response?.status;
        const unavailable =
          !error.response ||
          error.code === "ERR_NETWORK" ||
          error.code === "ECONNABORTED" ||
          error.message?.includes("Network Error") ||
          (s !== undefined && [404, 502, 503, 504].includes(s));
        if (!unavailable) return true;
        if (attempt < retries) {
          await new Promise<void>((r) => setTimeout(r, 1000 * attempt));
          continue;
        }
        __DEMO_MODE__ = true;
        logWarn("Backend unreachable — falling back to demo mode");
        return false;
      }
    }
    return false;
  })();
  try { return await _backendProbePromise; }
  finally { _backendProbePromise = null; }
};

const api: AxiosInstance = axios.create({
  baseURL: BASE,
  withCredentials: true,
  timeout: 15000,
});

const RETRYABLE_STATUSES = new Set([429, 502, 503, 504]);
const IDEMPOTENT_METHODS = new Set(["get", "head", "options"]);
const MAX_RETRIES = 2;

api.interceptors.request.use(
  (config) => {
    if (import.meta.env?.DEV) {
      logInfo("API request", {
        method: (config.method ?? "get").toString().toUpperCase(),
        url: config.url,
        demoMode: __DEMO_MODE__,
      });
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);

let _refreshing = false;
let _queue: Array<{ res: () => void; rej: (err: unknown) => void }> = [];

api.interceptors.response.use(
  (r) => r,
  async (err) => {
    const orig = err.config || {};
    const method = String(orig.method || "get").toLowerCase();
    const status = err.response?.status;
    const canRetry =
      IDEMPOTENT_METHODS.has(method) && ((status !== undefined && RETRYABLE_STATUSES.has(status)) || !err.response);

    if (canRetry && (orig._retryCount || 0) < MAX_RETRIES) {
      orig._retryCount = (orig._retryCount || 0) + 1;
      await new Promise<void>((resolve) => setTimeout(resolve, 300 * 2 ** ((orig._retryCount || 1) - 1)));
      return api(orig);
    }

    if (!err.response) {
      __DEMO_MODE__ = true;
      return Promise.reject(err);
    }

    const requestUrl: string = orig?.url || "";
    const skipRefresh =
      requestUrl.includes("/auth/login") ||
      requestUrl.includes("/auth/register") ||
      requestUrl.includes("/auth/forgot-password") ||
      requestUrl.includes("/auth/reset-password") ||
      requestUrl.includes("/auth/refresh");

    if (err.response?.status === 401 && !skipRefresh && !orig._retry) {
      if (_refreshing) {
        return new Promise<void>((res, rej) => _queue.push({ res, rej })).then(() => api(orig));
      }
      orig._retry = true;
      _refreshing = true;
      try {
        await axios.post(`${BASE}/auth/refresh`, {}, { withCredentials: true });
        _queue.forEach((p) => p.res());
        _queue = [];
        return api(orig);
      } catch {
        _queue.forEach((p) => p.rej(undefined));
        _queue = [];
        window.dispatchEvent(new Event("kayad:auth-expired"));
      } finally {
        _refreshing = false;
      }
    }
    return Promise.reject(err);
  }
);

const unwrap = (res: AxiosResponse) => res.data;
const isDemoToken = (): boolean => __DEMO_MODE__;

const shouldFallbackToDemo = (err: AxiosError): boolean => {
  if (!err.response) return true;
  if (err.code === "ECONNABORTED") return true;
  const s = err.response.status;
  if (s >= 500) return true;
  if (s === 404) return true;
  if (s === 401 && isDemoToken()) return true;
  return false;
};

function withDemo<T extends Record<string, any>>(realObj: T, demoObj: Partial<T>): T {
  const wrapped = {} as T;
  for (const key of Object.keys(realObj)) {
    (wrapped as any)[key] = async (...args: any[]) => {
      if (demoObj?.[key] && (isDemoToken() || __DEMO_MODE__)) {
        __DEMO_MODE__ = true;
        return (demoObj[key] as (...a: any[]) => any)(...args);
      }
      try { return await (realObj as any)[key](...args); }
      catch (err) {
        if (demoObj?.[key] && (__DEMO_MODE__ || shouldFallbackToDemo(err as AxiosError))) {
          __DEMO_MODE__ = true;
          return (demoObj[key] as (...a: any[]) => any)(...args);
        }
        throw err;
      }
    };
  }
  return wrapped;
}

// Export shared utilities for api.exports.ts
export { api, unwrap, withDemo };
export default api;

// Re-export all API modules (unchanged shape from your original)
export * from "./api.exports";
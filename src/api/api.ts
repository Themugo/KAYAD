// src/api/api.ts
// ============================================================
// KAYAD — FULL API LAYER
// Every backend route mapped exactly to the Express routes.
// Production-grade: structured logging, abort-aware, no token leaks.
// ============================================================

import axios, { AxiosInstance, AxiosResponse, AxiosError } from "axios";
import { logInfo } from "../utils/logger";

const BASE = "/api";

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

// Export shared utilities for api.exports.ts
export { api, unwrap };
export default api;

// Re-export all API modules (unchanged shape from your original)
export * from "./api.exports";

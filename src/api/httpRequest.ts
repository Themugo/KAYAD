import { api } from './httpClient';

export class HttpRequestError extends Error {
  status?: number;
  responseData?: unknown;
  constructor(message: string, status?: number, responseData?: unknown) {
    super(message);
    this.name = 'HttpRequestError';
    this.status = status;
    this.responseData = responseData;
  }
}

export interface HttpRequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  params?: Record<string, unknown>;
  /** Per-request timeout override in ms (defaults to the shared client's 30s). */
  timeout?: number;
}

/** Fetch-shaped adapter over KAYAD's single Axios transport. Service modules
 * use this only to preserve their existing request/response contracts while
 * inheriting the canonical credentials, timeout, CSRF and auth-expiry rules. */
// Identical GETs that are in flight at the same moment (the header, the page and a context all asking for
// the same config/ads/session on startup) share ONE network request. Only while pending: nothing is cached,
// so every later call still goes to the server. Each caller receives its own copy of the data.
const inflightGets = new Map<string, Promise<unknown>>();
const copyOf = <T,>(data: T): T => {
  try { return typeof structuredClone === 'function' ? structuredClone(data) : data; } catch { return data; }
};

export async function request<T>(path: string, options: HttpRequestOptions = {}): Promise<T> {
  const isGet = String(options.method || 'GET').toUpperCase() === 'GET' && options.body === undefined;
  if (!isGet) return performRequest<T>(path, options);
  const key = `${path}|${JSON.stringify(options.params ?? null)}|${JSON.stringify(options.headers ?? null)}|${options.timeout ?? ''}`;
  const existing = inflightGets.get(key) as Promise<T> | undefined;
  if (existing) return existing.then(copyOf);
  const pending = performRequest<T>(path, options).finally(() => { inflightGets.delete(key); });
  inflightGets.set(key, pending);
  return pending.then(copyOf);
}

async function performRequest<T>(path: string, options: HttpRequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers, params, timeout } = options;
  // httpClient always carries the canonical /api prefix in baseURL.
  // Strip an optional /api prefix from service paths so legacy /api/v1/...
  // auth callers and newer /v1/... callers both resolve exactly once.
  const requestPath = /^\/api(?:\/|$)/.test(path)
    ? path.slice(4) || '/'
    : path;

  try {
    const response = await api.request<T>({
      url: requestPath,
      method,
      data: body,
      headers,
      params,
      ...(timeout ? { timeout } : {}),
    });
    return response.data;
  } catch (error) {
    if (error instanceof HttpRequestError) throw error;
    const axiosError = error as {
      response?: { status?: number; data?: unknown };
      message?: string;
      isAxiosError?: boolean;
    };
    if (axiosError?.isAxiosError || axiosError?.response) {
      const data = axiosError.response?.data;
      const responseMessage = (data as { message?: unknown } | undefined)?.message;
      const message = typeof responseMessage === 'string'
        ? responseMessage
        : axiosError.message || 'Request failed.';
      throw new HttpRequestError(message, axiosError.response?.status, data);
    }
    throw new HttpRequestError('Unable to reach KAYAD servers. Please check your connection and try again.');
  }
}

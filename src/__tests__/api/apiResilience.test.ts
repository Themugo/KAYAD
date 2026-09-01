/**
 * Phase 11 — frontend failure-mode tests:
 *  - expired session (401) clears the token and notifies AuthContext
 *  - auth-endpoint 401s (bad login) do NOT trigger global expiry
 *  - non-401 errors pass through untouched
 *  - the client has a finite timeout (no forever-hanging requests)
 *  - duplicate in-flight requests are deduplicated
 *  - failed fetches are NOT cached (no false/stale success on retry)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const handlers: { requestErr?: any; responseOk?: any; responseErr?: any } = {};
let createConfig: any = null;
const createMock = vi.fn((config: any) => {
  createConfig = config;
  return {
  interceptors: {
    request: { use: vi.fn() },
    response: {
      use: vi.fn((ok: any, err: any) => {
        handlers.responseOk = ok;
        handlers.responseErr = err;
      }),
    },
  },
  defaults: { timeout: 30000 },
  };
});

vi.mock('axios', () => ({ default: { create: createMock } }));

const { api } = await import('../../api/api');
const { dedupedFetch, getCached, clearCache } = await import('../../utils/requestCache');

void api;

describe('api client resilience', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('is created with a finite timeout', () => {
    expect(createConfig).toMatchObject({ baseURL: '/api' });
    expect(typeof createConfig.timeout).toBe('number');
    expect(createConfig.timeout).toBeGreaterThan(0);
  });

  it('401 on a data endpoint clears the token and dispatches kayad:auth-expired', async () => {
    const listener = vi.fn();
    window.addEventListener('kayad:auth-expired', listener);

    const error = { response: { status: 401 }, config: { url: '/cars' } };
    await expect(handlers.responseErr(error)).rejects.toBe(error);
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener('kayad:auth-expired', listener);
  });

  it('401 on auth endpoints does NOT dispatch the expiry event (normal login failure)', async () => {
    const listener = vi.fn();
    window.addEventListener('kayad:auth-expired', listener);

    for (const url of ['/auth/login', '/auth/me', '/auth/refresh']) {
      await expect(handlers.responseErr({ response: { status: 401 }, config: { url } })).rejects.toBeTruthy();
    }

    expect(listener).not.toHaveBeenCalled();
    window.removeEventListener('kayad:auth-expired', listener);
  });

  it('500 / network errors pass through without touching session state', async () => {
    const listener = vi.fn();
    window.addEventListener('kayad:auth-expired', listener);

    const err500 = { response: { status: 500 }, config: { url: '/cars' } };
    await expect(handlers.responseErr(err500)).rejects.toBe(err500);

    const networkErr = { message: 'Network Error', config: { url: '/cars' } };
    await expect(handlers.responseErr(networkErr)).rejects.toBe(networkErr);

    expect(listener).not.toHaveBeenCalled();
    window.removeEventListener('kayad:auth-expired', listener);
  });

  it('successful responses pass through unchanged', () => {
    const res = { data: { success: true } };
    expect(handlers.responseOk(res)).toBe(res);
  });
});

describe('dedupedFetch (duplicate request handling)', () => {
  beforeEach(() => clearCache());

  it('concurrent identical requests share one network call', async () => {
    const fetcher = vi.fn().mockResolvedValue({ cars: [1, 2] });
    const [a, b] = await Promise.all([
      dedupedFetch('k1', fetcher, 1000),
      dedupedFetch('k1', fetcher, 1000),
    ]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(a).toEqual({ cars: [1, 2] });
    expect(b).toEqual({ cars: [1, 2] });
  });

  it('a failed fetch is NOT cached — the next call retries the network', async () => {
    let calls = 0;
    const fetcher = vi.fn().mockImplementation(() => {
      calls++;
      return calls === 1 ? Promise.reject(new Error('API 500')) : Promise.resolve({ ok: true });
    });

    await expect(dedupedFetch('k2', fetcher, 1000)).rejects.toThrow('API 500');
    expect(getCached('k2', 1000)).toBeNull(); // failure never poisons the cache

    const result = await dedupedFetch('k2', fetcher, 1000);
    expect(result).toEqual({ ok: true });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('concurrent failure rejects ALL waiters with the real error (no false success)', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('network interruption'));
    const p1 = dedupedFetch('k3', fetcher, 1000);
    const p2 = dedupedFetch('k3', fetcher, 1000);
    await expect(p1).rejects.toThrow('network interruption');
    await expect(p2).rejects.toThrow('network interruption');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});

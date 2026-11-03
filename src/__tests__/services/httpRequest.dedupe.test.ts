import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiRequest = vi.hoisted(() => vi.fn());
vi.mock('../../api/httpClient', () => ({ api: { request: apiRequest } }));
import { request } from '../../api/httpRequest';

beforeEach(() => apiRequest.mockReset());

describe('request: identical in-flight GETs share one network call', () => {
  it('three simultaneous identical GETs hit the network once and each gets its own copy', async () => {
    let resolve!: (v: unknown) => void;
    apiRequest.mockReturnValue(new Promise((r) => { resolve = r; }));
    const calls = [request<{ a: number[] }>('/api/ads'), request<{ a: number[] }>('/api/ads'), request<{ a: number[] }>('/api/ads')];
    resolve({ data: { a: [1] } });
    const [x, y, z] = await Promise.all(calls);
    expect(apiRequest).toHaveBeenCalledTimes(1);
    x.a.push(2);
    expect(y.a).toEqual([1]);
    expect(z.a).toEqual([1]);
  });

  it('nothing is cached: a later GET goes to the server again', async () => {
    apiRequest.mockResolvedValue({ data: { ok: true } });
    await request('/api/ads'); await request('/api/ads');
    expect(apiRequest).toHaveBeenCalledTimes(2);
  });

  it('different params or paths are separate requests, and writes are never shared', async () => {
    apiRequest.mockResolvedValue({ data: {} });
    await Promise.all([request('/api/cars', { params: { page: 1 } }), request('/api/cars', { params: { page: 2 } }), request('/api/cars/1')]);
    expect(apiRequest).toHaveBeenCalledTimes(3);
    apiRequest.mockClear();
    await Promise.all([request('/api/x', { method: 'POST', body: { a: 1 } }), request('/api/x', { method: 'POST', body: { a: 1 } })]);
    expect(apiRequest).toHaveBeenCalledTimes(2);
  });

  it('a failed shared request fails every waiter, and the next call retries', async () => {
    apiRequest.mockRejectedValueOnce(Object.assign(new Error('boom'), { isAxiosError: true, response: { status: 500, data: {} } }));
    const results = await Promise.allSettled([request('/api/ads'), request('/api/ads')]);
    expect(results.every((r) => r.status === 'rejected')).toBe(true);
    expect(apiRequest).toHaveBeenCalledTimes(1);
    apiRequest.mockResolvedValueOnce({ data: { ok: 1 } });
    await expect(request('/api/ads')).resolves.toEqual({ ok: 1 });
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getCars, peekCars, clearCarsCache, setCarsCacheEnabled, updateCar } from '../../services/vehicleApi';
import { request } from '../../api/httpRequest';

vi.mock('../../api/httpRequest', async () => {
  const actual = await vi.importActual<typeof import('../../api/httpRequest')>('../../api/httpRequest');
  return { ...actual, request: vi.fn() };
});
const requestMock = vi.mocked(request);
const page = (n: number) => ({ success: true, data: [{ id: String(n) }], pagination: { page: 1, limit: 24, total: n } });

describe('inventory read cache', () => {
  beforeEach(() => { setCarsCacheEnabled(true); requestMock.mockReset(); });
  afterEach(() => { setCarsCacheEnabled(false); vi.useRealTimers(); });

  it('serves a repeat request from memory without a second network call', async () => {
    requestMock.mockResolvedValue(page(1));
    await getCars({ page: 1, limit: 24 });
    const again = await getCars({ limit: 24, page: 1 }); // same filters, different order
    expect(requestMock).toHaveBeenCalledTimes(1);
    expect(again.data).toHaveLength(1);
  });

  it('shares one in-flight request between simultaneous callers', async () => {
    requestMock.mockResolvedValue(page(2));
    await Promise.all([getCars({ limit: 24 }), getCars({ limit: 24 }), getCars({ limit: 24 })]);
    expect(requestMock).toHaveBeenCalledTimes(1);
  });

  it('keeps an older page for instant display but marks it stale, and refetches when forced', async () => {
    vi.useFakeTimers();
    requestMock.mockResolvedValueOnce(page(3));
    await getCars({ limit: 24 });
    vi.advanceTimersByTime(60_000);
    const hit = peekCars({ limit: 24 });
    expect(hit?.fresh).toBe(false);
    expect(hit?.data.data).toHaveLength(1);
    requestMock.mockResolvedValueOnce(page(4));
    const next = await getCars({ limit: 24 });
    expect(requestMock).toHaveBeenCalledTimes(2);
    expect(next.pagination?.total).toBe(4);
  });

  it('never caches a failure', async () => {
    requestMock.mockRejectedValueOnce(new Error('down'));
    await expect(getCars({ limit: 24 })).rejects.toBeTruthy();
    expect(peekCars({ limit: 24 })).toBeNull();
  });

  it('a listing write clears the cache so sellers never see old data', async () => {
    requestMock.mockResolvedValueOnce(page(5));
    await getCars({ limit: 24 });
    expect(peekCars({ limit: 24 })).not.toBeNull();
    requestMock.mockResolvedValueOnce({ success: true });
    await updateCar('c1', { title: 'x' } as never);
    expect(peekCars({ limit: 24 })).toBeNull();
    clearCarsCache();
  });
});

import { describe, it, expect, vi, afterEach } from 'vitest';
import { getMyInspections } from '../../services/inspectionApi';

/**
 * Coverage for the new inspection data connection: Bookings Tracker
 * and Digital Reports tabs on InspectionsView now attempt real data
 * via GET /api/inspections/my. Confirms the real network call is
 * genuinely made and its response shape is passed through correctly -
 * matching this program's established standard of verifying the real
 * call happens, not just that the component renders.
 */

describe('inspectionApi.getMyInspections', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls the real GET /api/inspections/my endpoint with credentials included', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, orders: [] }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await getMyInspections();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/api/inspections/my');
    expect(options).toMatchObject({ method: 'GET', credentials: 'include' });
  });

  it('returns the real orders array from a successful response', async () => {
    const mockOrder = {
      id: 'insp-1',
      status: 'completed',
      car: { title: 'Toyota Land Cruiser', location: 'Nairobi' },
      inspector: { name: 'Jane Mechanic' },
      overallScore: 87,
      notes: 'Vehicle in good condition.',
    };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, orders: [mockOrder] }),
    }) as unknown as typeof fetch;

    const res = await getMyInspections();

    expect(res.orders).toHaveLength(1);
    expect(res.orders[0].car?.title).toBe('Toyota Land Cruiser');
    expect(res.orders[0].overallScore).toBe(87);
  });

  it('throws an unauthenticated-kind error on a 401 response, not a silent empty result', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ success: false, message: 'Unauthorized' }),
    }) as unknown as typeof fetch;

    await expect(getMyInspections()).rejects.toMatchObject({ kind: 'unauthenticated' });
  });
});

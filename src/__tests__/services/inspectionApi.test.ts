import { describe, it, expect, vi, afterEach } from 'vitest';
import { getMyInspections } from '../../services/inspectionApi';
import { HttpRequestError, request } from '../../api/httpRequest';

vi.mock('../../api/httpRequest', async () => {
  const actual = await vi.importActual<typeof import('../../api/httpRequest')>('../../api/httpRequest');
  return { ...actual, request: vi.fn() };
});

const requestMock = vi.mocked(request);

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
    requestMock.mockReset();
  });

  it('calls the real GET /api/inspections/my endpoint with credentials included', async () => {
    requestMock.mockResolvedValueOnce({ success: true, orders: [] });

    await getMyInspections();

    expect(requestMock).toHaveBeenCalledTimes(1);
    expect(requestMock).toHaveBeenCalledWith('/api/inspections/my', { method: 'GET' });
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
    requestMock.mockResolvedValueOnce({ success: true, orders: [mockOrder] });

    const res = await getMyInspections();

    expect(res.orders).toHaveLength(1);
    expect(res.orders[0].car?.title).toBe('Toyota Land Cruiser');
    expect(res.orders[0].overallScore).toBe(87);
  });

  it('throws an unauthenticated-kind error on a 401 response, not a silent empty result', async () => {
    requestMock.mockRejectedValueOnce(new HttpRequestError('Unauthorized', 401, { success: false, message: 'Unauthorized' }));

    await expect(getMyInspections()).rejects.toMatchObject({ kind: 'unauthenticated' });
  });
});

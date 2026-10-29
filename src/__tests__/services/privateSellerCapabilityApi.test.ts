import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpRequestError } from '../../api/httpRequest';
import { getPrivateSellerApplications } from '../../services/privateSellerCapabilityApi';

const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('../../api/httpRequest', async () => {
  const actual = await vi.importActual<typeof import('../../api/httpRequest')>('../../api/httpRequest');
  return { ...actual, request: (...args: unknown[]) => request(...args) };
});

const validApplication = {
  userId: '11111111-1111-4111-8111-111111111111',
  status: 'pending',
  contactPhone: '+254712345678',
  intendedUse: 'Sell my own vehicle',
  source: 'application',
  submittedAt: '2026-10-25T10:00:00.000Z',
  reviewedAt: null,
  reviewReason: null,
};

beforeEach(() => request.mockReset());

describe('private seller capability API response contract', () => {
  it('returns rows from the established success envelope and sends the selected status filter', async () => {
    request.mockResolvedValue({ success: true, data: [validApplication] });
    await expect(getPrivateSellerApplications('pending')).resolves.toEqual([validApplication]);
    expect(request).toHaveBeenCalledWith('/api/private-seller-capability/admin/applications', { params: { status: 'pending' } });
  });

  it('rejects a malformed success envelope instead of treating it as an empty queue', async () => {
    request.mockResolvedValue({ success: true, data: { rows: [] } });
    await expect(getPrivateSellerApplications()).rejects.toThrow('unexpected response');
    await expect(getPrivateSellerApplications()).rejects.toBeInstanceOf(HttpRequestError);
  });

  it('rejects malformed rows instead of passing invalid data into the page', async () => {
    request.mockResolvedValue({ success: true, data: [{ ...validApplication, status: 'unknown' }] });
    await expect(getPrivateSellerApplications()).rejects.toThrow('malformed application records');
  });

  it('preserves the structured maintenance response for precise UI classification', async () => {
    const maintenance = { success: false, code: 'SYSTEM_MAINTENANCE', maintenance: true, message: 'System under scheduled maintenance.' };
    request.mockResolvedValue(maintenance);
    await expect(getPrivateSellerApplications()).rejects.toMatchObject({ responseData: maintenance });
  });
});

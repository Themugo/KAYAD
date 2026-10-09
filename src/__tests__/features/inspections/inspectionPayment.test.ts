import { describe, expect, it, vi, beforeEach } from 'vitest';

const initiate = vi.fn();
const status = vi.fn();
vi.mock('../../../features/InspectionMarketplace/services/api', () => ({ inspectionApi: { initiatePayment: (...a: unknown[]) => initiate(...a) } }));
vi.mock('../../../services/paymentApi', () => ({ getPaymentStatus: (...a: unknown[]) => status(...a) }));

import { InspectionPaymentError, settleBookingPayment } from '../../../features/InspectionMarketplace/services/inspectionPayment';

const run = (opts = {}) => settleBookingPayment('bk1', '0712345678', { intervalMs: 1, maxAttempts: 3, ...opts });

describe('settleBookingPayment', () => {
  beforeEach(() => { initiate.mockReset(); status.mockReset(); });

  it('treats an STK prompt that never started as a failure, not a success', async () => {
    initiate.mockResolvedValue({ message: 'M-Pesa unavailable' });
    await expect(run()).rejects.toMatchObject({ kind: 'not_started' });
    expect(status).not.toHaveBeenCalled();
  });

  it('resolves only when the server reports the booking paid', async () => {
    initiate.mockResolvedValue({ checkoutRequestID: 'ws_1' });
    status.mockResolvedValueOnce({ status: 'pending' }).mockResolvedValueOnce({ status: 'success' });
    await expect(run()).resolves.toBeUndefined();
    expect(status).toHaveBeenCalledTimes(2);
  });

  it('fails on a failed payment and reports still_pending on timeout (never "paid")', async () => {
    initiate.mockResolvedValue({ checkoutRequestID: 'ws_1' });
    status.mockResolvedValue({ status: 'failed' });
    await expect(run()).rejects.toMatchObject({ kind: 'failed' });
    status.mockResolvedValue({ status: 'pending' });
    await expect(run()).rejects.toBeInstanceOf(InspectionPaymentError);
    await expect(run()).rejects.toMatchObject({ kind: 'still_pending' });
  });

  it('stops polling when aborted', async () => {
    initiate.mockResolvedValue({ checkoutRequestID: 'ws_1' });
    status.mockResolvedValue({ status: 'pending' });
    const c = new AbortController();
    const p = run({ signal: c.signal, maxAttempts: 50, intervalMs: 5 });
    setTimeout(() => c.abort(), 12);
    await expect(p).rejects.toMatchObject({ kind: 'aborted' });
  });
});

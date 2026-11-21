import { jest } from '@jest/globals';

const rpc = jest.fn();
jest.unstable_mockModule('../../utils/supabase.js', () => ({ getSupabase: () => ({ rpc }) }));
jest.unstable_mockModule('../../utils/logger.js', () => ({ logInfo: jest.fn(), logError: jest.fn() }));

const { default: settlementService } = await import('../../inspection/services/settlementService.js');

describe('inspection refund provider boundary', () => {
  beforeEach(() => rpc.mockReset());

  test('fails closed instead of recording a ledger-only entry as a completed external refund', async () => {
    await expect(settlementService.processRefund('booking-1', { amount: 1200, reason: 'Cancellation' }, 'admin-1'))
      .rejects.toMatchObject({
        statusCode: 501,
        details: { refundInitiated: false, providerRefundConfirmed: false },
      });

    expect(rpc).not.toHaveBeenCalled();
  });
});

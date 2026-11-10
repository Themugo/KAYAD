import { jest } from '@jest/globals';

const db = {
  findById: jest.fn(),
  update: jest.fn(),
  updateMany: jest.fn(),
  create: jest.fn(),
};
jest.unstable_mockModule('../../inspection/services/dbAdapter.js', () => ({ default: db }));
jest.unstable_mockModule('../../utils/logger.js', () => ({ logInfo: jest.fn(), logError: jest.fn() }));
jest.unstable_mockModule('../../config/metrics.js', () => ({ incrementCounter: jest.fn() }));
jest.unstable_mockModule('../../inspection/services/workforceService.js', () => ({ assertStaffAssignable: jest.fn() }));
jest.unstable_mockModule('../../inspection/services/organizationService.js', () => ({ assignBooking: jest.fn() }));

const { default: bookingService } = await import('../../inspection/services/bookingService.js');

const unpaidBooking = (overrides = {}) => ({
  id: 'booking-1',
  customer_id: 'customer-1',
  status: 'booked',
  payment_status: 'pending',
  scheduled_date: '2026-12-01',
  total_price: 4500,
  ...overrides,
});

describe('inspection booking cancellation / refund safety', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    db.findById.mockResolvedValue(unpaidBooking());
    db.update.mockResolvedValue({ id: 'booking-1', status: 'cancelled' });
    db.updateMany.mockResolvedValue([{ id: 'booking-1', status: 'cancelled' }]);
    db.create.mockResolvedValue({ id: 'history-1' });
  });

  test('customer can cancel an unpaid booking without a refund being represented as paid', async () => {
    db.findById
      .mockResolvedValueOnce(unpaidBooking())
      .mockResolvedValueOnce(unpaidBooking({ status: 'cancelled' }));

    const result = await bookingService.cancelBooking('booking-1', 'Changed plans', 'customer-1');

    expect(db.updateMany).toHaveBeenCalledWith('inspection_bookings', expect.objectContaining({ id: 'booking-1', payment_status: 'pending' }), expect.objectContaining({ status: 'cancelled' }));
    expect(db.create).toHaveBeenCalledWith('inspection_status_history', expect.objectContaining({ to_status: 'cancelled' }));
    expect(result).toMatchObject({ refundAmount: 0, refundPercentage: 0, refundStatus: 'not_applicable_unpaid_booking' });
  });

  test.each(['fully_paid', 'deposit_paid', 'partial_refund', 'refunded', 'processing', null])(
    'paid or non-pending payment state %s is rejected without changing the booking',
    async (payment_status) => {
      db.findById.mockResolvedValue(unpaidBooking({ payment_status }));

      await expect(bookingService.cancelBooking('booking-1', 'Cancel', 'customer-1'))
        .rejects.toMatchObject({ statusCode: 409, details: { refundInitiated: false } });

      expect(db.updateMany).not.toHaveBeenCalled();
      expect(db.create).not.toHaveBeenCalled();
    }
  );

  test('a payment-state race prevents cancellation when the conditional update finds no pending row', async () => {
    db.updateMany.mockResolvedValue([]);

    await expect(bookingService.cancelBooking('booking-1', 'Cancel', 'customer-1'))
      .rejects.toMatchObject({ statusCode: 409, details: { refundInitiated: false } });

    expect(db.create).not.toHaveBeenCalled();
  });

  test('another customer cannot cancel the booking', async () => {
    await expect(bookingService.cancelBooking('booking-1', 'Cancel', 'someone-else'))
      .rejects.toMatchObject({ statusCode: 403 });
    expect(db.updateMany).not.toHaveBeenCalled();
  });
});

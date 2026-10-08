import { jest } from '@jest/globals';

// STAGE 4 ACCOUNT/SESSION/IDENTITY CONVERGENCE REGRESSION TEST:
// POST /api/payments/initiate (paymentController.js::initiatePayment) is a
// generic, directly-callable, customer-authenticated endpoint. Before this
// fix, its amount-integrity guard only covered type ∈ {escrow, auction_win,
// purchase} — for type "bid" (and "listing"/"subscription"/"deposit"), the
// raw client-supplied `amount` was passed straight to the payment-initiation
// service, bypassing bidController.js::placeBid's own, separate
// bidConfirmationFeeKes enforcement entirely. This test proves: (1) a "bid"
// payment initiated through this endpoint must match the server-configured
// confirmation fee exactly, rejecting any other client amount; (2) the
// correct fee amount is accepted; (3) "listing"/"subscription"/"deposit" are
// refused outright (no authoritative server amount exists for them yet),
// rather than trusting whatever amount the client sent.

const findOne = jest.fn();
const findById = jest.fn();
const initiate = jest.fn();
const getAuctionFinancialPolicy = jest.fn();
jest.unstable_mockModule('../../services/escrowCapability.service.js', () => ({ getEffectiveEscrowForCar: jest.fn().mockResolvedValue(false), getSellerEscrowCapabilityStatus: jest.fn().mockResolvedValue('none'), getEscrowEnabledForNewOrEditedCar: jest.fn().mockResolvedValue(false), computeEffectiveEscrowEnabled: jest.fn().mockReturnValue(false), setSellerEscrowCapability: jest.fn() }));

jest.unstable_mockModule('../../utils/logger.js', () => ({ logInfo: jest.fn() }));
jest.unstable_mockModule('../../infrastructure/logging/index.js', () => ({ logError: jest.fn() }));
jest.unstable_mockModule('../../db/index.js', () => ({ findOne, findById, findAll: jest.fn(), count: jest.fn(), create: jest.fn() }));
jest.unstable_mockModule('../../services/paymentService.js', () => ({ initiatePayment: initiate }));
jest.unstable_mockModule('../../services/paymentCallback.service.js', () => ({ handleMpesaCallback: jest.fn() }));
jest.unstable_mockModule('../../services/auctionFinancialIntegrity.service.js', () => ({ getAuctionFinancialPolicy }));

const { initiatePayment } = await import('../../controllers/paymentController.js');

function buildRes() {
  return { json: jest.fn(), status: jest.fn().mockReturnThis() };
}

beforeEach(() => {
  jest.clearAllMocks();
  getAuctionFinancialPolicy.mockResolvedValue({ bidConfirmationFeeKes: 1 });
});

test('rejects a "bid" payment whose client amount does not match the server-configured confirmation fee', async () => {
  const res = buildRes();
  await initiatePayment({
    user: { id: 'u1' },
    body: { phone: '254712345678', amount: 50000, carId: 'car-1', type: 'bid' },
  }, res);

  expect(initiate).not.toHaveBeenCalled();
  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
    success: false,
    message: expect.stringContaining('bid confirmation fee'),
  }));
});

test('accepts a "bid" payment whose client amount exactly matches the server-configured confirmation fee', async () => {
  const res = buildRes();
  initiate.mockResolvedValue({ payment: { id: 'p1' } });

  await initiatePayment({
    user: { id: 'u1' },
    body: { phone: '254712345678', amount: 1, carId: 'car-1', type: 'bid' },
  }, res);

  expect(initiate).toHaveBeenCalledWith(expect.objectContaining({ amount: 1, type: 'bid', userId: 'u1' }));
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
});

test.each(['listing', 'subscription', 'deposit'])(
  'refuses a "%s" payment outright rather than trusting the client amount',
  async (type) => {
    const res = buildRes();
    await initiatePayment({
      user: { id: 'u1' },
      body: { phone: '254712345678', amount: 999999, carId: 'car-1', type },
    }, res);

    expect(initiate).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  },
);

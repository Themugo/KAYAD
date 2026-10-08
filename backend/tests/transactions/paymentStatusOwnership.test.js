import { jest } from '@jest/globals';

// STAGE 4 ACCOUNT/SESSION/IDENTITY CONVERGENCE REGRESSION TEST:
// GET /api/payments/status/:id (paymentController.js::checkPaymentStatus)
// previously read `payment.user && payment.user.toString() !== req.user.id
// && req.user.role !== "admin"` — when `payment.user` was itself falsy, the
// whole condition short-circuited to false and the ownership check was
// skipped entirely (fail-open), returning the full payment record (amount,
// phone, mpesaReceipt, metadata) to *any* authenticated user who supplied
// that checkoutRequestId. This proves: a payment with no owner on file is
// now denied to a non-staff caller rather than leaked, a real owner can
// still read their own payment, a non-owner is still denied, and staff can
// still read any payment.

const findOne = jest.fn();

jest.unstable_mockModule('../../utils/logger.js', () => ({ logInfo: jest.fn() }));
jest.unstable_mockModule('../../infrastructure/logging/index.js', () => ({ logError: jest.fn() }));
jest.unstable_mockModule('../../db/index.js', () => ({ findOne, findById: jest.fn(), findAll: jest.fn(), count: jest.fn(), create: jest.fn() }));
jest.unstable_mockModule('../../services/paymentService.js', () => ({ initiatePayment: jest.fn() }));
jest.unstable_mockModule('../../services/paymentCallback.service.js', () => ({ handleMpesaCallback: jest.fn() }));
jest.unstable_mockModule('../../services/auctionFinancialIntegrity.service.js', () => ({ getAuctionFinancialPolicy: jest.fn() }));

const { checkPaymentStatus } = await import('../../controllers/paymentController.js');

function buildRes() {
  return { json: jest.fn(), status: jest.fn().mockReturnThis() };
}

beforeEach(() => jest.clearAllMocks());

test('denies a non-staff caller when the payment record has no owner on file', async () => {
  findOne.mockResolvedValue({ id: 'p1', status: 'success', amount: 1, user: null });
  const res = buildRes();

  await checkPaymentStatus({ user: { id: 'u1', role: 'user' }, params: { id: 'cr-1' } }, res);

  expect(res.status).toHaveBeenCalledWith(403);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
});

test('allows staff to read a payment with no owner on file', async () => {
  findOne.mockResolvedValue({ id: 'p1', status: 'success', amount: 1, user: null });
  const res = buildRes();

  await checkPaymentStatus({ user: { id: 'admin1', role: 'admin' }, params: { id: 'cr-1' } }, res);

  expect(res.status).not.toHaveBeenCalledWith(403);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
});

test('allows the real owner to read their own payment', async () => {
  findOne.mockResolvedValue({ id: 'p1', status: 'success', amount: 1, user: 'u1' });
  const res = buildRes();

  await checkPaymentStatus({ user: { id: 'u1', role: 'user' }, params: { id: 'cr-1' } }, res);

  expect(res.status).not.toHaveBeenCalledWith(403);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
});

test('denies a different authenticated user from reading someone else\'s payment', async () => {
  findOne.mockResolvedValue({ id: 'p1', status: 'success', amount: 1, user: 'owner-1' });
  const res = buildRes();

  await checkPaymentStatus({ user: { id: 'u2', role: 'user' }, params: { id: 'cr-1' } }, res);

  expect(res.status).toHaveBeenCalledWith(403);
});

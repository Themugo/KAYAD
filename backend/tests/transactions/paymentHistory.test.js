import { jest } from '@jest/globals';
const findAll = jest.fn();
const count = jest.fn();
jest.unstable_mockModule('../../utils/logger.js', () => ({ logInfo: jest.fn() }));
jest.unstable_mockModule('../../infrastructure/logging/index.js', () => ({ logError: jest.fn() }));
jest.unstable_mockModule('../../db/index.js', () => ({ findOne: jest.fn(), findById: jest.fn(), findAll, count }));
jest.unstable_mockModule('../../services/paymentService.js', () => ({ initiatePayment: jest.fn() }));
jest.unstable_mockModule('../../services/paymentCallback.service.js', () => ({ handleMpesaCallback: jest.fn() }));
// STAGE 4 ACCOUNT/SESSION/IDENTITY CONVERGENCE: paymentController.js now
// also imports getAuctionFinancialPolicy (used only by initiatePayment's
// "bid" amount-integrity check, not by getUserPayments under test here),
// which itself imports db/index.js's `create`/`update` - exports this
// file's own db/index.js mock above doesn't provide. Without mocking it
// too, importing the controller module at all fails at ESM link time.
jest.unstable_mockModule('../../services/auctionFinancialIntegrity.service.js', () => ({ getAuctionFinancialPolicy: jest.fn() }));
// STAGE 9: paymentController.js also now imports escrowCapability.service.js
// (the new shared escrow-capability authority) for its escrow-creation
// decision — mocked here too so importing the controller at all succeeds.
jest.unstable_mockModule('../../services/escrowCapability.service.js', () => ({
  getEffectiveEscrowForCar: jest.fn().mockResolvedValue(false),
  getSellerEscrowCapabilityStatus: jest.fn().mockResolvedValue('none'),
  getEscrowEnabledForNewOrEditedCar: jest.fn().mockResolvedValue(false),
  computeEffectiveEscrowEnabled: jest.fn().mockReturnValue(false),
  setSellerEscrowCapability: jest.fn(),
}));
const { getUserPayments } = await import('../../controllers/paymentController.js');

const call = async (query) => {
  const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
  await getUserPayments({ user: { id: 'u1' }, query }, res);
  return res;
};

test('getUserPayments is scoped to the authenticated user and the canonical payments table', async () => {
  findAll.mockResolvedValue([{ id: 'p1' }]); count.mockResolvedValue(1);
  const res = await call({ page: '1', limit: '10', status: 'success' });
  expect(findAll).toHaveBeenCalledWith('payments', expect.objectContaining({
    filters: { user: 'u1', status: 'success' }, orderBy: 'createdAt', ascending: false, limit: 10, offset: 0,
    select: expect.stringContaining('mpesaReceipt'),
  }));
  expect(count).toHaveBeenCalledWith('payments', { user: 'u1', status: 'success' });
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, payments: [{ id: 'p1' }], pagination: { page: 1, limit: 10, total: 1, pages: 1 } }));
});

test('a client cannot widen the scope: user filter is fixed and unknown status/type are ignored', async () => {
  findAll.mockResolvedValue([]); count.mockResolvedValue(0);
  await call({ status: 'nonsense', type: 'drop table', user: 'someone-else' });
  expect(findAll.mock.calls.at(-1)[1].filters).toEqual({ user: 'u1' });
});

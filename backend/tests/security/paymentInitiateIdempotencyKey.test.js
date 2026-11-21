// ============================================================
// STAGE 6 ESCROW/PURCHASE/FULFILMENT CONVERGENCE — payment-initiation
// idempotency-key finding
//
// POST /payments/initiate (the generic M-Pesa STK-push initiation
// endpoint, backend/controllers/paymentController.js::initiatePayment) had
// no deterministic-key branch in idempotencyCheck's auto-key generation.
// Every call -- including a genuine retry of the exact same request after
// a network timeout, or a buyer double-clicking "Pay" -- fell through to
// the random `generateIdempotencyKey("auto")` fallback, so the middleware's
// cached-response dedup never actually engaged: two retries of the SAME
// logical payment request issued two real Safaricom STK pushes.
//
// This mirrors exactly the class of bug Stage 1 already fixed for five
// escrow actions (see tests/security/escrowIdempotencyKeys.test.js) --
// the "payment" operation type (the generic initiate endpoint) was simply
// missed from that earlier sweep, and Stage 6's own master prompt flags
// "payment retry idempotency gaps" as directly in scope.
// ============================================================

import { describe, test, expect, jest, beforeEach } from "@jest/globals";

const idempotencyKeyModelMock = { getCachedResponse: jest.fn().mockResolvedValue(null), record: jest.fn().mockResolvedValue(undefined) };
const idempotencyAuditLogMock = { create: jest.fn().mockResolvedValue(undefined), findOneAndUpdate: jest.fn().mockResolvedValue(undefined) };
const acquireLockMock = jest.fn().mockResolvedValue({ acquired: true, id: "lock1" });
const releaseLockMock = jest.fn().mockResolvedValue(undefined);

jest.unstable_mockModule("../../models/IdempotencyKey.js", () => ({ default: idempotencyKeyModelMock }));
jest.unstable_mockModule("../../models/IdempotencyAuditLog.js", () => ({ default: idempotencyAuditLogMock }));
jest.unstable_mockModule("../../middleware/distributedLock.js", () => ({
  acquireLock: acquireLockMock, releaseLock: releaseLockMock,
  withLock: jest.fn(async (resource, fn) => fn()),
}));
jest.unstable_mockModule("../../utils/logger.js", () => ({ logInfo: jest.fn(), logWarn: jest.fn(), logError: jest.fn() }));
jest.unstable_mockModule("../../db/index.js", () => ({ findOne: jest.fn().mockResolvedValue(null) }));
jest.unstable_mockModule("../../config/metrics.js", () => ({
  recordIdempotencyCheck: jest.fn(), recordIdempotencyHit: jest.fn(), recordIdempotencyMiss: jest.fn(),
  recordIdempotencyCache: jest.fn(), recordIdempotencyError: jest.fn(),
}));

const { idempotencyCheck } = await import("../../middleware/idempotency.js");

const mockReqRes = (overrides = {}) => {
  const req = { headers: {}, body: {}, params: {}, path: "/api/payments/initiate", user: { id: "buyer1" }, ip: "127.0.0.1", ...overrides };
  const res = { on: jest.fn(), status: jest.fn().mockReturnThis(), json: jest.fn(), set: jest.fn().mockReturnThis() };
  return { req, res };
};

describe("idempotencyCheck — deterministic key for POST /payments/initiate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    acquireLockMock.mockResolvedValue({ acquired: true, id: "lock1" });
    idempotencyKeyModelMock.getCachedResponse.mockResolvedValue(null);
  });

  test("a retried payment request for the same buyer/car/type/amount produces the identical, non-random key", async () => {
    const body = { carId: "car1", type: "purchase", amount: 500000, phone: "254712345678" };
    const { req: first, res: res1 } = mockReqRes({ body });
    await idempotencyCheck(first, res1, jest.fn());
    const { req: retry, res: res2 } = mockReqRes({ body: { ...body } });
    await idempotencyCheck(retry, res2, jest.fn());

    expect(first.idempotencyKey).toBe(retry.idempotencyKey);
    expect(first.idempotencyKey).toMatch(/^payment_buyer1_car1_purchase_500000_\d+$/);
  });

  test("a different amount for the same buyer/car/type gets a different key (not conflated as the same retry)", async () => {
    const { req: low, res: res1 } = mockReqRes({ body: { carId: "car1", type: "purchase", amount: 500000 } });
    await idempotencyCheck(low, res1, jest.fn());
    const { req: high, res: res2 } = mockReqRes({ body: { carId: "car1", type: "purchase", amount: 999999 } });
    await idempotencyCheck(high, res2, jest.fn());

    expect(low.idempotencyKey).not.toBe(high.idempotencyKey);
  });

  test("a different car for the same buyer/type/amount gets a different key", async () => {
    const { req: carA, res: res1 } = mockReqRes({ body: { carId: "car1", type: "purchase", amount: 500000 } });
    await idempotencyCheck(carA, res1, jest.fn());
    const { req: carB, res: res2 } = mockReqRes({ body: { carId: "car2", type: "purchase", amount: 500000 } });
    await idempotencyCheck(carB, res2, jest.fn());

    expect(carA.idempotencyKey).not.toBe(carB.idempotencyKey);
  });
});

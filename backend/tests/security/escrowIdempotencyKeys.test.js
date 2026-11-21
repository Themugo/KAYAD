// ============================================================
// P0/P1 SOURCE-LEVEL TRUST BOUNDARY SWEEP — Stage 1, Item 5
// Non-M-Pesa webhook/communication idempotency: escrow action routes
//
// backend/middleware/idempotency.js's extractOperationType() classified
// POST /api/escrow/:id/request-release as the SAME operationType
// ("escrow_release") as the admin-only, financially authoritative
// POST /api/escrow/:id/release, and POST /api/escrow/:id/refund/:refundId/complete
// as the same type ("escrow_refund") as POST /api/escrow/:id/refund. None of
// escrow_release/escrow_refund/escrow_confirm_delivery/escrow_confirm_vehicle/
// escrow_request_release had a deterministic-key branch in idempotencyCheck,
// so every call fell through to generateIdempotencyKey("auto") — a fresh
// random key every time. Two consequences:
//
//  1. The middleware's own cached-response dedup never engaged for these
//     five user-facing escrow actions (a literal retry got a fresh key, so
//     it never hit the cache) — confirmed the frontend never sends its own
//     x-idempotency-key header for them either.
//  2. The also-dead escrow_vault_funded/escrow_vault_init/escrow_vault_release
//     branches referenced a bankRef/otp "vault funding" feature with zero
//     routes or controllers anywhere in this codebase — unreachable code
//     suggesting idempotency coverage for a feature that doesn't exist.
//
// Fix: distinguish request-release from release and refund-complete from
// refund in extractOperationType (most-specific-first ordering — each
// previously-generic substring match swallowed a structurally different
// action), add real deterministic keys for all five, and drop the dead vault
// branches. This is a UX/graceful-retry fix, not a financial-integrity one —
// the underlying row-locked state machine (kayad_transition_escrow_atomic)
// was always the real authority and already rejected a genuine duplicate
// release/refund by its FROM/TO transition table regardless of this bug.
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

const { extractOperationType, idempotencyCheck } = await import("../../middleware/idempotency.js");

describe("extractOperationType — escrow path classification", () => {
  test("request-release is distinct from the admin release action", () => {
    expect(extractOperationType("/api/escrow/abc123/request-release")).toBe("escrow_request_release");
    expect(extractOperationType("/api/escrow/abc123/release")).toBe("escrow_release");
  });

  test("refund-completion is distinct from refund-initiation", () => {
    expect(extractOperationType("/api/escrow/abc123/refund/ref456/complete")).toBe("escrow_refund_complete");
    expect(extractOperationType("/api/escrow/abc123/refund")).toBe("escrow_refund");
  });

  test("confirm-vehicle is distinct from confirm-delivery", () => {
    expect(extractOperationType("/api/escrow/abc123/confirm-vehicle")).toBe("escrow_confirm_vehicle");
    expect(extractOperationType("/api/escrow/abc123/confirm-delivery")).toBe("escrow_confirm_delivery");
  });

  test("dispute is unaffected", () => {
    expect(extractOperationType("/api/escrow/abc123/dispute")).toBe("escrow_dispute");
  });
});

describe("idempotencyCheck — deterministic keys for escrow actions", () => {
  const mockReqRes = (overrides = {}) => {
    const req = { headers: {}, body: {}, params: {}, path: "/api/escrow/escrow1/release", user: { id: "admin1" }, ip: "127.0.0.1", ...overrides };
    const res = { on: jest.fn(), status: jest.fn().mockReturnThis(), json: jest.fn(), set: jest.fn().mockReturnThis() };
    return { req, res };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    acquireLockMock.mockResolvedValue({ acquired: true, id: "lock1" });
    idempotencyKeyModelMock.getCachedResponse.mockResolvedValue(null);
  });

  test("release and request-release on the SAME escrow never share a key", async () => {
    const { req: releaseReq, res: res1 } = mockReqRes({ path: "/api/escrow/escrow1/release", params: { id: "escrow1" } });
    const next1 = jest.fn();
    await idempotencyCheck(releaseReq, res1, next1);

    const { req: requestReleaseReq, res: res2 } = mockReqRes({ path: "/api/escrow/escrow1/request-release", params: { id: "escrow1" } });
    const next2 = jest.fn();
    await idempotencyCheck(requestReleaseReq, res2, next2);

    expect(releaseReq.idempotencyKey).toBe("escrow_release_escrow1");
    expect(requestReleaseReq.idempotencyKey).toBe("escrow_request_release_escrow1_admin1");
    expect(releaseReq.idempotencyKey).not.toBe(requestReleaseReq.idempotencyKey);
    expect(next1).toHaveBeenCalled();
    expect(next2).toHaveBeenCalled();
  });

  test("a retried release request produces the identical, non-random key", async () => {
    const { req: first, res: res1 } = mockReqRes({ path: "/api/escrow/escrow9/release", params: { id: "escrow9" } });
    await idempotencyCheck(first, res1, jest.fn());
    const { req: retry, res: res2 } = mockReqRes({ path: "/api/escrow/escrow9/release", params: { id: "escrow9" } });
    await idempotencyCheck(retry, res2, jest.fn());

    expect(first.idempotencyKey).toBe("escrow_release_escrow9");
    expect(retry.idempotencyKey).toBe("escrow_release_escrow9");
  });

  test("refund and refund-complete on the same escrow never share a key", async () => {
    const { req: refundReq, res: res1 } = mockReqRes({ path: "/api/escrow/escrow2/refund", params: { id: "escrow2" } });
    await idempotencyCheck(refundReq, res1, jest.fn());
    const { req: completeReq, res: res2 } = mockReqRes({ path: "/api/escrow/escrow2/refund/refundA/complete", params: { id: "escrow2", refundId: "refundA" } });
    await idempotencyCheck(completeReq, res2, jest.fn());

    expect(refundReq.idempotencyKey).toBe("escrow_refund_escrow2");
    expect(completeReq.idempotencyKey).toBe("escrow_refund_complete_escrow2_refundA");
    expect(refundReq.idempotencyKey).not.toBe(completeReq.idempotencyKey);
  });

  test("confirm-vehicle and confirm-delivery on the same escrow never share a key", async () => {
    const { req: vehicleReq, res: res1 } = mockReqRes({ path: "/api/escrow/escrow3/confirm-vehicle", params: { id: "escrow3" } });
    await idempotencyCheck(vehicleReq, res1, jest.fn());
    const { req: deliveryReq, res: res2 } = mockReqRes({ path: "/api/escrow/escrow3/confirm-delivery", params: { id: "escrow3" } });
    await idempotencyCheck(deliveryReq, res2, jest.fn());

    expect(vehicleReq.idempotencyKey).toBe("escrow_confirm_vehicle_escrow3_admin1");
    expect(deliveryReq.idempotencyKey).toBe("escrow_confirm_delivery_escrow3_admin1");
    expect(vehicleReq.idempotencyKey).not.toBe(deliveryReq.idempotencyKey);
  });
});

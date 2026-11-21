// Action handlers: ID guards, canonical admin roles, and no "system" downgrade on close.
import { describe, test, expect, jest, beforeEach } from "@jest/globals";

const B = "11111111-1111-4111-8111-111111111111";
const S = "22222222-2222-4222-8222-222222222222";
const X = "33333333-3333-4333-8333-333333333333";
const ID = "44444444-4444-4444-8444-444444444444";

const findById = jest.fn();
const svc = {
  confirmVehicle: jest.fn(async () => ({ id: ID })), deliverEscrow: jest.fn(async () => ({ id: ID })),
  releaseEscrow: jest.fn(async () => ({ id: ID, sellerAmount: 1, commission: 1 })), refundEscrow: jest.fn(async () => ({ id: ID, amount: 1 })),
  disputeEscrow: jest.fn(async () => ({ id: ID })), closeEscrow: jest.fn(async () => ({ id: ID })),
};
let populated = false;
const doc = () => ({
  id: ID, amount: 100, status: "delivered", history: [], car: X, save: async () => {},
  buyer: populated ? { id: B } : B, seller: populated ? { id: S } : S,
});
const query = () => { const q = { populate: () => q, select: () => q, then: (r, j) => Promise.resolve(findById()).then(r, j) }; return q; };

jest.unstable_mockModule("../../models/Escrow.js", () => ({ default: { findById: (...a) => { findById(...a); return query(); } } }));
for (const m of ["Car", "Payment"]) jest.unstable_mockModule(`../../models/${m}.js`, () => ({ default: {} }));
jest.unstable_mockModule("../../services/communicationEvents.service.js", () => ({ emitCommunication: jest.fn(async () => {}), COMMUNICATION_EVENTS: {} }));
jest.unstable_mockModule("../../utils/securityLogger.js", () => ({ logActionFromReq: jest.fn() }));
jest.unstable_mockModule("../../utils/io.js", () => ({ getIO: () => null }));
jest.unstable_mockModule("../../services/leadService.js", () => ({ findOrCreateLeadFromEscrow: jest.fn(async () => ({ id: 1 })), updateLeadStage: jest.fn() }));
jest.unstable_mockModule("../../services/auditService.js", () => ({ logEscrowReleased: jest.fn(), logEscrowRefunded: jest.fn() }));
jest.unstable_mockModule("../../services/escrow.service.js", () => svc);
jest.unstable_mockModule("../../utils/logger.js", () => ({ logInfo: jest.fn(), logWarn: jest.fn(), logError: jest.fn() }));

const c = await import("../../controllers/escrowController.js");
const run = async (h, user, id = ID, body = { reason: "a sufficiently long reason" }) => {
  const res = { statusCode: 200, body: null, status(x) { this.statusCode = x; return this; }, json(b) { this.body = b; return this; } };
  await h({ params: { id }, user, body, idempotencyKey: "k" }, res);
  return res;
};

beforeEach(() => { jest.clearAllMocks(); populated = false; findById.mockImplementation(() => doc()); });

describe("invalid ids are rejected before any lookup", () => {
  const bad = ["not-a-uuid", "507f1f77bcf86cd799439011", "", "../x"];
  const handlers = ["confirmVehicleHandler", "confirmDelivery", "requestRelease", "disputeEscrow", "releaseEscrow", "refundEscrow", "closeEscrowHandler"];
  test.each(handlers.flatMap((h) => bad.map((b) => [h, b])))("%s with %j -> 400", async (h, id) => {
    const res = await run(c[h], { id: X, role: "superadmin" }, id);
    expect(res.statusCode).toBe(400);
    expect(findById).not.toHaveBeenCalled();
  });
});

describe.each([false, true])("populated=%s", (pop) => {
  beforeEach(() => { populated = pop; });

  test("requestRelease: buyer ok, seller / unrelated denied, admin ok", async () => {
    expect((await run(c.requestRelease, { id: B, role: "user" })).statusCode).toBe(200);
    expect((await run(c.requestRelease, { id: S, role: "dealer" })).statusCode).toBe(403);
    expect((await run(c.requestRelease, { id: X, role: "user" })).statusCode).toBe(403);
    expect((await run(c.requestRelease, { id: X, role: "admin" })).statusCode).toBe(200);
  });

  test("confirmVehicle: buyer + admin only; staff without escrow-admin role denied", async () => {
    expect((await run(c.confirmVehicleHandler, { id: B, role: "user" })).statusCode).toBe(200);
    expect((await run(c.confirmVehicleHandler, { id: X, role: "superadmin" })).statusCode).toBe(200);
    for (const role of ["escrow_officer", "moderator", "hr", "user"]) {
      expect((await run(c.confirmVehicleHandler, { id: X, role })).statusCode).toBe(403);
    }
    expect((await run(c.confirmVehicleHandler, { id: S, role: "dealer" })).statusCode).toBe(403);
  });

  test("confirmDelivery: seller + admin only", async () => {
    expect((await run(c.confirmDelivery, { id: S, role: "dealer" })).statusCode).toBe(200);
    expect((await run(c.confirmDelivery, { id: B, role: "user" })).statusCode).toBe(403);
    expect((await run(c.confirmDelivery, { id: X, role: "admin" })).statusCode).toBe(200);
    expect((await run(c.confirmDelivery, { id: X, role: "accounts" })).statusCode).toBe(403);
  });

  test("dispute: parties and viewing staff; seller is recorded as seller, buyer as buyer", async () => {
    expect((await run(c.disputeEscrow, { id: B, role: "user" })).statusCode).toBe(200);
    expect(svc.disputeEscrow.mock.calls.at(-1)[2]).toBe("buyer");
    expect((await run(c.disputeEscrow, { id: S, role: "dealer" })).statusCode).toBe(200);
    expect(svc.disputeEscrow.mock.calls.at(-1)[2]).toBe("seller");
    expect((await run(c.disputeEscrow, { id: X, role: "admin" })).statusCode).toBe(200);
    expect(svc.disputeEscrow.mock.calls.at(-1)[2]).toBe("admin");
    expect((await run(c.disputeEscrow, { id: X, role: "user" })).statusCode).toBe(403);
    expect((await run(c.disputeEscrow, { id: X, role: "hr" })).statusCode).toBe(403);
  });

  test("dispute with missing body does not throw", async () => {
    expect((await run(c.disputeEscrow, { id: B, role: "user" }, ID, null)).statusCode).toBe(400);
  });
});

describe("money-moving handlers are escrow-admin only (defence in depth behind escrowAdminOnly)", () => {
  const denied = ["user", "dealer", "individual_seller", "ghost_checker", "moderator", "ad_manager", "marketing", "escrow_officer", "technical_support", "hr", "accounts"];
  test.each(denied)("release/refund/close refuse %s without touching the service", async (role) => {
    for (const h of ["releaseEscrow", "refundEscrow", "closeEscrowHandler"]) {
      expect((await run(c[h], { id: X, role })).statusCode).toBe(403);
    }
    expect(svc.releaseEscrow).not.toHaveBeenCalled();
    expect(svc.refundEscrow).not.toHaveBeenCalled();
    expect(svc.closeEscrow).not.toHaveBeenCalled();
  });
  test("admin / superadmin / webhoist proceed", async () => {
    for (const u of [{ id: X, role: "admin" }, { id: X, role: "superadmin" }, { id: X, role: "user", effectiveRole: "webhoist" }]) {
      expect((await run(c.closeEscrowHandler, u)).statusCode).toBe(200);
      expect((await run(c.refundEscrow, u)).statusCode).toBe(200);
    }
  });
  test("close always uses the admin role, never system", async () => {
    await run(c.closeEscrowHandler, { id: X, role: "admin" });
    expect(svc.closeEscrow.mock.calls.at(-1)[2]).toBe("admin");
  });
});

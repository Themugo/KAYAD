// Endpoint-level authorization matrix for GET /escrow/:id and /escrow/:id/state.
import { describe, test, expect, jest, beforeEach } from "@jest/globals";

const B = "11111111-1111-4111-8111-111111111111";
const S = "22222222-2222-4222-8222-222222222222";
const X = "33333333-3333-4333-8333-333333333333";
const ESCROW_ID = "44444444-4444-4444-8444-444444444444";

let mode = "unpopulated"; // what the model returns
const row = () => ({ id: ESCROW_ID, amount: 100, status: "funded", history: [], car: X });
const build = () => {
  const base = row();
  const e = mode === "populated"
    ? { ...base, buyer: { id: B, name: "b" }, seller: { id: S, name: "s" } }
    : { ...base, buyer: B, seller: S };
  return { ...e, toObject() { return { ...this }; } };
};
const query = () => { const q = { populate: () => q, select: () => q, lean: () => Promise.resolve(build()), then: (r, j) => Promise.resolve(build()).then(r, j) }; return q; };

jest.unstable_mockModule("../../models/Escrow.js", () => ({ default: { findById: () => query() } }));
for (const m of ["Car", "Payment"]) jest.unstable_mockModule(`../../models/${m}.js`, () => ({ default: {} }));
jest.unstable_mockModule("../../services/communicationEvents.service.js", () => ({ emitCommunication: jest.fn(), COMMUNICATION_EVENTS: {} }));
jest.unstable_mockModule("../../utils/securityLogger.js", () => ({ logActionFromReq: jest.fn() }));
jest.unstable_mockModule("../../utils/io.js", () => ({ getIO: () => null }));
jest.unstable_mockModule("../../services/leadService.js", () => ({ findOrCreateLeadFromEscrow: jest.fn(), updateLeadStage: jest.fn() }));
jest.unstable_mockModule("../../services/auditService.js", () => ({ logEscrowReleased: jest.fn(), logEscrowRefunded: jest.fn() }));
jest.unstable_mockModule("../../services/escrow.service.js", () => ({
  confirmVehicle: jest.fn(), deliverEscrow: jest.fn(), releaseEscrow: jest.fn(), refundEscrow: jest.fn(), disputeEscrow: jest.fn(), closeEscrow: jest.fn(),
}));
jest.unstable_mockModule("../../utils/logger.js", () => ({ logInfo: jest.fn(), logWarn: jest.fn(), logError: jest.fn() }));

const { getEscrowById, getEscrowState } = await import("../../controllers/escrowController.js");
const { escrowResponseSchema, escrowStateResponseSchema } = await import("../../validation/response.schema.js");

const call = async (handler, user) => {
  const res = { statusCode: 200, body: null, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; } };
  await handler({ params: { id: ESCROW_ID }, user }, res);
  return res;
};

const actors = [
  ["buyer", { id: B, role: "user" }, 200],
  ["seller (dealer)", { id: S, role: "dealer" }, 200],
  ["seller (individual_seller)", { id: S, role: "individual_seller" }, 200],
  ["unrelated user", { id: X, role: "user" }, 403],
  ["unrelated dealer", { id: X, role: "dealer" }, 403],
  ["unrelated ghost_checker", { id: X, role: "ghost_checker" }, 403],
  ["unrelated accounts", { id: X, role: "accounts" }, 403],
  ["admin", { id: X, role: "admin" }, 200],
  ["superadmin", { id: X, role: "superadmin" }, 200],
  ["escrow_officer", { id: X, role: "escrow_officer" }, 200],
  ["moderator", { id: X, role: "moderator" }, 200],
  ["webhoist owner", { id: X, role: "superadmin", effectiveRole: "webhoist" }, 200],
];

describe.each(["unpopulated", "populated"])("%s escrow record", (m) => {
  beforeEach(() => { mode = m; });
  describe.each([["getEscrowById", () => getEscrowById, escrowResponseSchema], ["getEscrowState", () => getEscrowState, escrowStateResponseSchema]])("%s", (_n, h, schema) => {
    test.each(actors)("%s -> %i", async (_a, user, status) => {
      const res = await call(h(), user);
      expect(res.statusCode).toBe(status);
      if (status === 200) {
        expect(res.body.data.allowedTransitions).toEqual(expect.arrayContaining(["released"]));
        expect(schema.safeParse(res.body).success).toBe(true);
      } else {
        expect(res.body.success).toBe(false);
        expect(res.body.data).toBeUndefined();
      }
    });
  });
});

test("state endpoint response uses allowedTransitions and never availableTransitions", async () => {
  mode = "unpopulated";
  const res = await call(getEscrowState, { id: B, role: "user" });
  expect(Object.keys(res.body.data).sort()).toEqual(["allowedTransitions", "currentState", "history"]);
});

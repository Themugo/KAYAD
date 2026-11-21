// /api/escrow/my, /api/escrow/:id and request-release: privacy projection and state guard.
import { describe, test, expect, jest, beforeEach } from "@jest/globals";

const B = "11111111-1111-4111-8111-111111111111";
const S = "22222222-2222-4222-8222-222222222222";
const X = "33333333-3333-4333-8333-333333333333";
const ID = "44444444-4444-4444-8444-444444444444";

const populateCalls = [];
let status = "funded";
const full = (u, name) => ({ id: u, name, email: `${name}@private.test`, phone: "0700", credits: 9, commissionBalance: 3, referralEarnings: 1 });
const row = () => ({
  id: ID, amount: 1000, status, history: [], car: { id: X, title: "Car", price: 5, vin: "V", registrationNumber: "R", images: [] },
  buyer: full(B, "Buyer"), seller: full(S, "Seller"), payment: "pay-1",
  async save() { saves.push(1); },
  toObject() { return { ...this }; },
});
const saves = [];
const q = (result) => { const o = { populate: (...a) => { populateCalls.push(a); return o; }, select: () => o, sort: () => o, lean: () => Promise.resolve(result()), then: (r, j) => Promise.resolve(result()).then(r, j) }; return o; };
jest.unstable_mockModule("../../models/Escrow.js", () => ({ default: { find: () => q(() => [row()]), findById: () => q(() => row()) } }));
for (const m of ["Car", "Payment"]) jest.unstable_mockModule(`../../models/${m}.js`, () => ({ default: {} }));
const emit = jest.fn(); const to = jest.fn(() => ({ emit }));
const ioEmit = jest.fn();
jest.unstable_mockModule("../../utils/io.js", () => ({ getIO: () => ({ to, emit: ioEmit }) }));
jest.unstable_mockModule("../../services/communicationEvents.service.js", () => ({ emitCommunication: jest.fn(), COMMUNICATION_EVENTS: {} }));
jest.unstable_mockModule("../../utils/securityLogger.js", () => ({ logActionFromReq: jest.fn() }));
jest.unstable_mockModule("../../services/leadService.js", () => ({ findOrCreateLeadFromEscrow: jest.fn(), updateLeadStage: jest.fn() }));
jest.unstable_mockModule("../../services/auditService.js", () => ({ logEscrowReleased: jest.fn(), logEscrowRefunded: jest.fn() }));
jest.unstable_mockModule("../../services/escrow.service.js", () => ({ confirmVehicle: jest.fn(), deliverEscrow: jest.fn(), releaseEscrow: jest.fn(), refundEscrow: jest.fn(), disputeEscrow: jest.fn(), closeEscrow: jest.fn() }));
jest.unstable_mockModule("../../utils/logger.js", () => ({ logInfo: jest.fn(), logWarn: jest.fn(), logError: jest.fn() }));

const c = await import("../../controllers/escrowController.js");
const call = async (h, user, id = ID) => {
  const res = { statusCode: 200, body: null, status(x) { this.statusCode = x; return this; }, json(b) { this.body = b; return this; } };
  await h({ params: { id }, user, body: {}, idempotencyKey: "k" }, res);
  return res;
};
beforeEach(() => { status = "funded"; populateCalls.length = 0; saves.length = 0; jest.clearAllMocks(); });

describe("GET /my", () => {
  test("never returns the counterparty's contact or account data", async () => {
    const res = await call(c.getUserEscrows, { id: B, role: "user" });
    const s = JSON.stringify(res.body);
    for (const f of ["private.test", "0700", "credits", "commissionBalance", "referralEarnings"]) expect(s).not.toContain(f);
    expect(res.body.data[0]).toMatchObject({ viewerRole: "buyer", availableActions: expect.arrayContaining(["confirm_vehicle", "open_dispute"]) });
  });
  test("populates a field list for every relation (no unrestricted populate)", async () => {
    await call(c.getUserEscrows, { id: B, role: "user" });
    expect(populateCalls.length).toBeGreaterThanOrEqual(3);
    for (const args of populateCalls) expect(typeof args[1]).toBe("string");
    expect(populateCalls.flat().join(" ")).not.toMatch(/payment/);
  });
  test("returns a participant-scoped summary", async () => {
    const res = await call(c.getUserEscrows, { id: B, role: "user" });
    expect(res.body.summary).toMatchObject({ scope: "participant", totalDeals: 1, heldAmount: 1000, needsActionCount: 1 });
  });
});

describe("GET /:id", () => {
  test("party gets the projection + allowedTransitions; stranger gets 403", async () => {
    const ok = await call(c.getEscrowById, { id: S, role: "dealer" });
    expect(ok.statusCode).toBe(200);
    expect(JSON.stringify(ok.body)).not.toContain("private.test");
    expect(ok.body.data).toMatchObject({ viewerRole: "seller", allowedTransitions: expect.any(Array) });
    expect((await call(c.getEscrowById, { id: X, role: "user" })).statusCode).toBe(403);
  });
});

describe("POST /:id/request-release is only valid once the buyer has accepted the vehicle", () => {
  test.each(["pending", "funded", "disputed", "released", "refunded", "closed"])("%s -> 409 and nothing is written to the audit history", async (s) => {
    status = s;
    const res = await call(c.requestRelease, { id: B, role: "user" });
    expect(res.statusCode).toBe(409);
    expect(saves).toHaveLength(0);
    expect(to).not.toHaveBeenCalled();
  });
  test.each(["vehicle_confirmed", "delivered"])("%s -> 200, staff-only notification (never a global broadcast)", async (s) => {
    status = s;
    const res = await call(c.requestRelease, { id: B, role: "user" });
    expect(res.statusCode).toBe(200);
    expect(saves).toHaveLength(1);
    expect(to).toHaveBeenCalledWith("admins");
    expect(ioEmit).not.toHaveBeenCalled();
  });
  test("the seller still cannot request release", async () => {
    status = "delivered";
    expect((await call(c.requestRelease, { id: S, role: "dealer" })).statusCode).toBe(403);
  });
});

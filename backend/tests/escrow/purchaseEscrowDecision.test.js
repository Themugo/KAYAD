// The escrow decision is frozen at payment initiation from the canonical authority.
import { describe, test, expect, jest, beforeEach } from "@jest/globals";

let car; let seller; let rules;
const created = [];
const findById = jest.fn(async (t) => (t === "cars" ? car : t === "users" ? seller : null));
const findOne = jest.fn(async (t) => (t === "platform_config" ? { escrowRules: rules } : null));
const create = jest.fn(async (t, d) => { created.push(d); return { id: "pay1", ...d }; });
jest.unstable_mockModule("../../db/index.js", () => ({ findById, findOne, create, update: jest.fn(async () => ({})), findAll: jest.fn(), remove: jest.fn(), updateMany: jest.fn() }));
jest.unstable_mockModule("../../services/mpesaService.js", () => ({ stkPush: jest.fn(async () => ({ CheckoutRequestID: "ws1", MerchantRequestID: "m1" })) }));
jest.unstable_mockModule("../../services/receiptService.js", () => ({ sendDigitalReceipt: jest.fn() }));
jest.unstable_mockModule("../../utils/io.js", () => ({ getIO: () => null }));
jest.unstable_mockModule("../../utils/logger.js", () => ({ logWarn: jest.fn(), logInfo: jest.fn(), logError: jest.fn() }));
jest.unstable_mockModule("../../services/paymentFinancialLifecycle.service.js", () => ({ recordPaymentEvent: jest.fn(async () => {}), recordPaymentAttempt: jest.fn(async () => ({})) }));
jest.unstable_mockModule("../../services/communicationEvents.service.js", () => ({ emitCommunication: jest.fn(), emitToUsers: jest.fn(), COMMUNICATION_EVENTS: {} }));

const { initiatePayment } = await import("../../services/paymentService.js");
const run = (extra = {}) => initiatePayment({ userId: "buyer1", carId: "car1", type: "purchase", amount: 1000, phone: "0712345678", ...extra }).catch(() => null);

beforeEach(() => { jest.clearAllMocks(); created.length = 0; car = { escrowEnabled: true, dealer: "seller1" }; seller = { role: "individual_seller", escrowCapabilityStatus: "granted" }; rules = { enabled: true }; });

describe("initiatePayment freezes metadata.escrowEligible for purchases", () => {
  test("all three conditions hold -> true", async () => { await run(); expect(created[0].metadata.escrowEligible).toBe(true); });
  test.each([
    ["platform escrow switched off", () => { rules.enabled = false; }],
    ["seller capability revoked", () => { seller.escrowCapabilityStatus = "revoked"; }],
    ["vehicle flag off", () => { car.escrowEnabled = false; }],
  ])("%s -> false (badge and settlement agree)", async (_n, mutate) => { mutate(); await run(); expect(created[0].metadata.escrowEligible).toBe(false); });
  test("a missing vehicle is never escrow-eligible", async () => { car = null; await run(); expect(created[0].metadata.escrowEligible).toBe(false); });
  test("other payment types are untouched", async () => { await run({ type: "bid" }); expect(created[0].metadata).toEqual({}); });
  test("an explicit value from a trusted internal caller is preserved", async () => { await run({ metadata: { escrowEligible: false, foo: 1 } }); expect(created[0].metadata).toEqual({ escrowEligible: false, foo: 1 }); });
});

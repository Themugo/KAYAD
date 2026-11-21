// Creating an escrow for an auction outcome must use the canonical eligibility authority and bind custody.
import { describe, test, expect, jest, beforeEach } from "@jest/globals";

const OUT = { id: "o1", carId: "car1", organizerId: "seller1", winnerUserId: "buyer1", settlementMode: "escrow", escrowRequired: true, paymentStatus: "paid", paymentDueAmount: 800000, winningAmount: 800000, escrowId: null };
let outcome; let car; let rules; let account; let seller;
const create = jest.fn(async (t, d) => ({ id: "esc1", ...d }));
const update = jest.fn(async (t, id, d) => ({ id, ...d }));
const findById = jest.fn(async (t, id) => (t === "auction_outcomes" ? outcome : t === "cars" ? car : t === "users" ? seller : null));
const findOne = jest.fn(async (t, f) => (t === "escrow_accounts" ? account : t === "platform_config" ? { escrowRules: rules } : null));
jest.unstable_mockModule("../../db/index.js", () => ({ findById, findOne, create, update, findAll: jest.fn(), remove: jest.fn(), updateMany: jest.fn() }));
jest.unstable_mockModule("../../utils/securityLogger.js", () => ({ logActionFromReq: jest.fn(async () => {}), }));
jest.unstable_mockModule("../../services/auctionPlatformPolicy.service.js", () => ({ getAuctionPlatformPolicy: jest.fn() }));
jest.unstable_mockModule("../../services/escrow.service.js", () => ({ createEscrow: jest.fn() }));
jest.unstable_mockModule("../../services/auctionFinancialIntegrity.service.js", () => ({ reconcileAuctionSecurityHolds: jest.fn(), forfeitAuctionWinnerSecurityHolds: jest.fn() }));
jest.unstable_mockModule("../../utils/supabase.js", () => ({ getSupabase: () => ({ rpc: jest.fn() }) }));
jest.unstable_mockModule("../../utils/atomicTransactions.js", () => ({ atomicSettleAuctionWinnerPayment: jest.fn(), atomicDefaultAuctionWinner: jest.fn() }));

const { createOptionalEscrowForOutcome } = await import("../../services/auctionSettlement.service.js");

beforeEach(() => {
  jest.clearAllMocks();
  outcome = { ...OUT }; car = { escrowEnabled: true }; seller = { role: "individual_seller", escrowCapabilityStatus: "granted" };
  rules = { enabled: true, minimumAmount: 0, maximumAmount: null }; account = { id: "acct1", isActive: true, isPrimary: true };
});
const reject = async (p) => { try { await p; } catch (e) { return e; } throw new Error("expected rejection"); };

describe("createOptionalEscrowForOutcome", () => {
  test("eligible seller + configured account: escrow is created bound to the custody account", async () => {
    await createOptionalEscrowForOutcome({ outcomeId: "o1", actorId: "seller1" });
    expect(create).toHaveBeenCalledWith("escrows", expect.objectContaining({ buyer: "buyer1", seller: "seller1", amount: 800000, status: "pending", custodianAccount: "acct1", fundingMethod: "bank_transfer" }));
  });

  test.each([
    ["seller capability revoked", () => { seller.escrowCapabilityStatus = "revoked"; }],
    ["seller capability suspended", () => { seller.escrowCapabilityStatus = "suspended"; }],
    ["seller never granted", () => { seller.escrowCapabilityStatus = "none"; }],
    ["vehicle flag off", () => { car.escrowEnabled = false; }],
    ["platform switch off", () => { rules.enabled = false; }],
  ])("%s -> 409 ESCROW_NOT_ELIGIBLE and no escrow row", async (_n, mutate) => {
    mutate();
    const e = await reject(createOptionalEscrowForOutcome({ outcomeId: "o1", actorId: "seller1" }));
    expect(e).toMatchObject({ status: 409, code: "ESCROW_NOT_ELIGIBLE" });
    expect(create).not.toHaveBeenCalled();
  });

  test("no active custody account -> 409, nothing created", async () => {
    account = null;
    const e = await reject(createOptionalEscrowForOutcome({ outcomeId: "o1", actorId: "seller1" }));
    expect(e.status).toBe(409); expect(e.message).toMatch(/escrow bank account/i);
    expect(create).not.toHaveBeenCalled();
  });

  test("admin minimum / maximum are enforced", async () => {
    rules.minimumAmount = 900000;
    expect((await reject(createOptionalEscrowForOutcome({ outcomeId: "o1", actorId: "seller1" }))).message).toMatch(/minimum/i);
    rules.minimumAmount = 0; rules.maximumAmount = 500000;
    expect((await reject(createOptionalEscrowForOutcome({ outcomeId: "o1", actorId: "seller1" }))).message).toMatch(/maximum/i);
    expect(create).not.toHaveBeenCalled();
  });

  test("an outcome that already has an escrow is returned untouched (idempotent)", async () => {
    outcome.escrowId = "esc0";
    await createOptionalEscrowForOutcome({ outcomeId: "o1", actorId: "seller1" });
    expect(create).not.toHaveBeenCalled();
  });
});

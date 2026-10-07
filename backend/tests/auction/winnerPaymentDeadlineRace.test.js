// ============================================================
// P0/P1 SOURCE-LEVEL TRUST BOUNDARY SWEEP — Item 8 (concurrency extension)
// Scenario: "winner payment + deadline"
//
// Regression coverage for the race between markAuctionPaymentReceived
// (triggered by the M-Pesa payment-confirmation webhook) and
// defaultAuctionWinner (triggered by the payment-deadline sweep/admin
// action). Both previously read+wrote auction_outcomes with a plain
// findById()/update() pair and no row lock — so a payment confirmed at
// nearly the same moment the deadline swept could both credit the seller
// payable AND forfeit the winner's security deposit for the same sale.
//
// The fix routes both transitions through row-locked Postgres functions
// (kayad_settle_auction_winner_payment_atomic /
// kayad_default_auction_winner_atomic — see
// 20261007190000_auction_winner_payment_deadline_lock.sql) so whichever
// commits first wins and the loser fails closed instead of applying a
// second, conflicting transition. These tests verify the service layer
// correctly surfaces that race loss as a 409 and takes no further action
// (no ledger post, no forfeiture, no car-sold flip) rather than silently
// proceeding.
// ============================================================

import { describe, test, expect, jest, beforeEach } from "@jest/globals";

const findByIdMock = jest.fn();
const findOneMock = jest.fn();
const createMock = jest.fn();
const updateMock = jest.fn();
jest.unstable_mockModule("../../db/index.js", () => ({
  findById: findByIdMock, findOne: findOneMock, create: createMock, update: updateMock,
}));
jest.unstable_mockModule("../../utils/securityLogger.js", () => ({ logActionFromReq: jest.fn().mockResolvedValue(undefined) }));
const getAuctionPlatformPolicyMock = jest.fn().mockResolvedValue({ allowDealerReaward: false });
jest.unstable_mockModule("../../services/auctionPlatformPolicy.service.js", () => ({ getAuctionPlatformPolicy: getAuctionPlatformPolicyMock }));
jest.unstable_mockModule("../../services/escrow.service.js", () => ({ createEscrow: jest.fn() }));
const forfeitMock = jest.fn().mockResolvedValue({});
const reconcileMock = jest.fn().mockResolvedValue({});
jest.unstable_mockModule("../../services/auctionFinancialIntegrity.service.js", () => ({
  reconcileAuctionSecurityHolds: reconcileMock,
  forfeitAuctionWinnerSecurityHolds: forfeitMock,
}));
const rpcMock = jest.fn();
jest.unstable_mockModule("../../utils/supabase.js", () => ({ getSupabase: () => ({ rpc: rpcMock }) }));
const atomicSettleMock = jest.fn();
const atomicDefaultMock = jest.fn();
jest.unstable_mockModule("../../utils/atomicTransactions.js", () => ({
  atomicSettleAuctionWinnerPayment: atomicSettleMock,
  atomicDefaultAuctionWinner: atomicDefaultMock,
}));

const { markAuctionPaymentReceived, defaultAuctionWinner } = await import("../../services/auctionSettlement.service.js");

describe("markAuctionPaymentReceived — loses the race to a concurrent default", () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test("surfaces the DB-level rejection as 409 and never posts a ledger entry or marks the car sold", async () => {
    const outcome = { id: "out1", carId: "car1", status: "payment_due", paymentStatus: "pending", winnerUserId: "winner1", paymentDueAmount: 500000, settlementMode: "direct" };
    findByIdMock.mockImplementation(async (table, id) => {
      if (table === "auction_outcomes") return outcome;
      if (table === "payments") return { id: "pay1", type: "auction_win", user: "winner1", amount: 500000 };
      return null;
    });
    // Simulates: by the time this transaction acquired the row lock, the
    // deadline sweep had already committed "defaulted" first.
    atomicSettleMock.mockRejectedValue(new Error("Auction is not awaiting winner payment (current status: defaulted)"));

    await expect(markAuctionPaymentReceived({ outcomeId: "out1", paymentId: "pay1" }))
      .rejects.toMatchObject({ status: 409 });

    expect(rpcMock).not.toHaveBeenCalledWith("kayad_post_ledger_entry_atomic", expect.anything());
    expect(updateMock).not.toHaveBeenCalledWith("cars", expect.anything(), expect.objectContaining({ sold: true }));
  });

  test("on success, posts the seller-payable ledger entry exactly once", async () => {
    const outcome = { id: "out1", carId: "car1", status: "payment_due", paymentStatus: "pending", winnerUserId: "winner1", paymentDueAmount: 500000, settlementMode: "direct" };
    findByIdMock.mockImplementation(async (table, id) => {
      if (table === "auction_outcomes") return outcome;
      if (table === "payments") return { id: "pay1", type: "auction_win", user: "winner1", amount: 500000 };
      return null;
    });
    atomicSettleMock.mockResolvedValue({ id: "out1", settlementMode: "direct", idempotent: false });
    rpcMock.mockResolvedValue({ data: { id: "ledger1" }, error: null });
    updateMock.mockResolvedValue({});

    await markAuctionPaymentReceived({ outcomeId: "out1", paymentId: "pay1" });

    expect(atomicSettleMock).toHaveBeenCalledWith(expect.objectContaining({
      outcomeId: "out1", paymentId: "pay1", winnerUserId: "winner1", expectedAmount: 500000, actualAmount: 500000,
    }));
    expect(rpcMock).toHaveBeenCalledWith("kayad_post_ledger_entry_atomic", expect.objectContaining({ p_source: "auction_payment" }));
  });
});

describe("defaultAuctionWinner — loses the race to a concurrent payment", () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test("surfaces the DB-level rejection as 409 and never forfeits the winner's security hold", async () => {
    const outcome = { id: "out1", carId: "car1", status: "payment_due", paymentDueAt: new Date(Date.now() - 1000).toISOString(), reawardEnabled: false };
    findByIdMock.mockResolvedValue(outcome);
    // Simulates: the winner's payment landed and committed first.
    atomicDefaultMock.mockRejectedValue(new Error("Auction is not awaiting winner payment (current status: payment_received)"));

    await expect(defaultAuctionWinner({ outcomeId: "out1", actorId: "admin1" }))
      .rejects.toMatchObject({ status: 409 });

    expect(forfeitMock).not.toHaveBeenCalled();
  });

  test("on success, forfeits the winner's security hold exactly once", async () => {
    const outcome = { id: "out1", carId: "car1", status: "payment_due", paymentDueAt: new Date(Date.now() - 1000).toISOString(), reawardEnabled: false };
    findByIdMock.mockResolvedValue(outcome);
    atomicDefaultMock.mockResolvedValue({ id: "out1", reawardAllowed: false, idempotent: false });

    await defaultAuctionWinner({ outcomeId: "out1", actorId: "admin1" });

    expect(forfeitMock).toHaveBeenCalledTimes(1);
    expect(forfeitMock).toHaveBeenCalledWith(expect.objectContaining({ outcomeId: "out1", actorId: "admin1" }));
  });

  test("replaying an already-defaulted outcome is idempotent and does not re-forfeit", async () => {
    const outcome = { id: "out1", carId: "car1", status: "defaulted", paymentDueAt: new Date(Date.now() - 1000).toISOString(), reawardEnabled: false };
    findByIdMock.mockResolvedValue(outcome);
    atomicDefaultMock.mockResolvedValue({ id: "out1", status: "defaulted", idempotent: true });

    await defaultAuctionWinner({ outcomeId: "out1", actorId: "admin1" });

    expect(forfeitMock).not.toHaveBeenCalled();
  });
});

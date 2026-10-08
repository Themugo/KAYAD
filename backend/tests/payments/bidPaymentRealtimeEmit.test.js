// ============================================================
// STAGE 3 MARKETPLACE/VEHICLE/AUCTION CONVERGENCE — manual bid confirmation
// never broadcast a realtime update finding.
//
// A human-placed bid is written "pending" at placement time (the KES-1
// confirmation design) and only becomes market-authoritative once the real
// M-Pesa webhook confirms it via atomicSettleBidPayment. Until this fix,
// nothing after that settlement ever called emitBidUpdate/emitListingUpdate
// — those were only ever wired into the auto-bid paths (bidController.js's
// runAutoBidding, autoBid.service.js). AuctionLivePage's own joinAuction/
// onBid socket handler is correctly wired on the frontend, but it never
// fired for a normal human bid confirmation; only the page's own 10-30s
// poll eventually caught up. This test confirms the settlement path now
// actually emits, with the same payload shape the frontend already handles.
// ============================================================

import { describe, test, expect, jest, beforeEach } from "@jest/globals";

const findByIdMock = jest.fn();
const findOneMock = jest.fn();
const updateMock = jest.fn();
const updateManyMock = jest.fn();
const createMock = jest.fn();

jest.unstable_mockModule("../../db/index.js", () => ({
  findById: findByIdMock,
  findOne: findOneMock,
  findAll: jest.fn(),
  create: createMock,
  update: updateMock,
  updateMany: updateManyMock,
}));

const emitBidUpdateMock = jest.fn().mockResolvedValue(undefined);
const emitListingUpdateMock = jest.fn().mockResolvedValue(undefined);
jest.unstable_mockModule("../../socket/socket.js", () => ({
  emitBidUpdate: emitBidUpdateMock,
  emitListingUpdate: emitListingUpdateMock,
}));

const atomicSettleBidPaymentMock = jest.fn();
jest.unstable_mockModule("../../utils/atomicTransactions.js", () => ({
  atomicSettleBidPayment: atomicSettleBidPaymentMock,
  atomicSettlePurchasePayment: jest.fn(),
}));

jest.unstable_mockModule("../../services/notification.service.js", () => ({
  sendNotification: jest.fn().mockResolvedValue(undefined),
}));
jest.unstable_mockModule("../../services/receiptService.js", () => ({
  sendDigitalReceipt: jest.fn().mockResolvedValue(undefined),
}));
jest.unstable_mockModule("../../utils/io.js", () => ({
  getIO: jest.fn().mockReturnValue(null),
}));
jest.unstable_mockModule("../../utils/logger.js", () => ({
  logInfo: jest.fn(),
  logWarn: jest.fn(),
  logError: jest.fn(),
}));
jest.unstable_mockModule("../../services/paymentFinancialLifecycle.service.js", () => ({
  recordPaymentEvent: jest.fn().mockResolvedValue(undefined),
  recordWebhookReceipt: jest.fn().mockResolvedValue({ duplicate: false, event: { id: "evt-1" } }),
  markWebhookProcessed: jest.fn().mockResolvedValue(undefined),
  markAttemptByCheckout: jest.fn().mockResolvedValue(undefined),
}));
jest.unstable_mockModule("../../services/paymentStateMachine.js", () => ({
  assertPaymentTransition: jest.fn(),
}));
jest.unstable_mockModule("../../services/dealerSubscription.service.js", () => ({
  activateDealerSubscriptionFromPayment: jest.fn(),
}));
jest.unstable_mockModule("../../utils/supabase.js", () => ({
  getSupabase: jest.fn(),
}));
jest.unstable_mockModule("../../services/ledgerService.js", () => ({
  recordPurchasePayment: jest.fn(),
}));

const { handleMpesaCallback } = await import("../../services/paymentCallback.service.js");

describe("handleMpesaCallback — bid payment settlement realtime emit", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const basePayment = {
    id: "pay-1",
    type: "bid",
    user: "user-1",
    car: "car-1",
    amount: 1, // the nominal KES-1 confirmation fee, not the bid amount
    status: "pending",
    checkoutRequestId: "checkout-1",
  };

  const baseCallback = {
    Body: {
      stkCallback: {
        CheckoutRequestID: "checkout-1",
        ResultCode: 0,
        CallbackMetadata: {
          Item: [
            { Name: "Amount", Value: 1 },
            { Name: "MpesaReceiptNumber", Value: "RCPT123" },
          ],
        },
      },
    },
  };

  test("a confirmed bid payment emits bidUpdate + listingUpdate with the real auction-identity and amount", async () => {
    findOneMock.mockImplementation(async (table) => {
      if (table === "transactions") return null; // not a commitment/security transaction
      return null;
    });
    updateManyMock.mockResolvedValue([basePayment]);
    findByIdMock.mockImplementation(async (table, id) => {
      if (table === "users") return { email: "x@y.com", name: "X", phone: "0700000000" };
      if (table === "bids") return { id: "bid-1", bidderTag: "Bidder-42" };
      if (table === "cars") return { id: "car-1", bidsCount: 5 };
      return null;
    });
    atomicSettleBidPaymentMock.mockResolvedValue({
      payment_id: "pay-1",
      bid_id: "bid-1",
      car_id: "car-1",
      amount: 2500000,
      ledger_recorded: true,
    });

    await handleMpesaCallback(baseCallback);

    expect(atomicSettleBidPaymentMock).toHaveBeenCalledWith("pay-1", "RCPT123");
    expect(emitBidUpdateMock).toHaveBeenCalledTimes(1);
    expect(emitBidUpdateMock).toHaveBeenCalledWith("car-1", expect.objectContaining({
      amount: 2500000,
      bidderTag: "Bidder-42",
      auto: false,
    }));
    expect(emitListingUpdateMock).toHaveBeenCalledTimes(1);
    expect(emitListingUpdateMock).toHaveBeenCalledWith("car-1", expect.objectContaining({
      currentBid: 2500000,
      bidsCount: 5,
    }));
  });

  test("a realtime emit failure does not fail payment confirmation (the poll fallback remains the backstop)", async () => {
    findOneMock.mockResolvedValue(null);
    updateManyMock.mockResolvedValue([basePayment]);
    findByIdMock.mockImplementation(async (table) => {
      if (table === "users") return { email: "x@y.com" };
      throw new Error("lookup failed");
    });
    atomicSettleBidPaymentMock.mockResolvedValue({
      payment_id: "pay-1",
      bid_id: "bid-1",
      car_id: "car-1",
      amount: 2500000,
    });
    emitBidUpdateMock.mockRejectedValueOnce(new Error("socket down"));

    const result = await handleMpesaCallback(baseCallback);

    // The settlement itself must still complete and be returned, even
    // though the realtime broadcast failed.
    expect(result).toBeTruthy();
  });
});

import { jest, describe, it, expect, beforeEach } from "@jest/globals";

const state = { transaction: null, hold: null, registration: null, user: null, setup: null, car: null, updates: [], events: [] };
jest.unstable_mockModule("../../db/index.js", () => ({
  findById: async (table, id) => table === "auction_security_holds" ? state.hold
    : table === "cars" ? state.car
    : table === "users" ? state.user
    : table === "auction_registrations" ? state.registration : null,
  findOne: async (table) => table === "auction_setups" ? state.setup : table === "auction_registrations" ? state.registration : null,
  create: async (table, row) => { state.events.push({ table, row }); return { id: "event-1", ...row }; },
  update: async (table, id, patch) => {
    state.updates.push({ table, id, patch });
    if (table === "auction_registrations") state.registration = { ...state.registration, ...patch };
    if (table === "auction_security_holds") state.hold = { ...state.hold, ...patch };
    return table === "auction_security_holds" ? state.hold : state.registration;
  },
}));
jest.unstable_mockModule("../../utils/supabase.js", () => ({
  getSupabase: () => ({ rpc: async () => ({ data: { status: "held" }, error: null }) }),
}));
jest.unstable_mockModule("../../services/securityPaymentStore.js", () => ({
  findSecurityPaymentByCheckout: async () => ({ table: "payments", row: state.transaction }),
  updateSecurityPayment: async (_ref, patch) => { state.transaction = { ...state.transaction, ...patch }; return state.transaction; },
  createSecurityPayment: async () => ({ row: state.transaction }),
}));
jest.unstable_mockModule("../../services/mpesaService.js", () => ({ stkPush: async () => ({ CheckoutRequestID: "checkout-1" }) }));
jest.unstable_mockModule("../../services/dealerPaymentAccount.service.js", () => ({ resolveDealerCollection: async () => null }));
jest.unstable_mockModule("../../services/privateSellerAuctionEligibility.service.js", () => ({ evaluatePrivateSellerAuctionEligibility: async () => ({ scope: "not_private_seller" }) }));
jest.unstable_mockModule("../../services/notification.service.js", () => ({ sendNotification: async () => {} }));

const { handleBidSecurityCallback } = await import("../../services/bidSecurityService.js");
const future = new Date(Date.now() + 86400000).toISOString();

beforeEach(() => {
  state.updates = []; state.events = [];
  state.transaction = {
    id: "payment-1", user: "bidder-1", car: "auction-1", type: "bid_commitment",
    amount: 5000, status: "pending", metadata: { auctionRegistrationId: "registration-1", auctionSecurityHoldId: "hold-1", auctionSecurityHoldType: "commitment" },
  };
  state.hold = { id: "hold-1", status: "pending", checkoutRequestId: "checkout-1" };
  state.registration = { id: "registration-1", auction_id: "auction-1", bidder_id: "bidder-1", status: "pending_commitment", eligibility_status: "eligible", commitment_status: "payment_pending" };
  state.user = { id: "bidder-1", phone: "254700000000", phoneVerified: true, email: "bidder@example.test", emailVerified: true, status: "active" };
  state.car = { id: "auction-1", auctionStatus: "draft" };
  state.setup = { publication_status: "published", config: { startsAt: future, bidderRequirements: { phoneVerified: true, emailVerified: true } } };
});

describe("bid security callback bidder-pass activation", () => {
  it("settles a commitment hold and then activates the eligible bidder registration", async () => {
    const result = await handleBidSecurityCallback({ checkoutRequestID: "checkout-1", resultCode: 0, mpesaReceipt: "ABC123", providerAmount: 5000 });
    expect(result.success).toBe(true);
    expect(state.transaction.status).toBe("success");
    expect(state.registration).toMatchObject({ status: "active", eligibility_status: "eligible", commitment_status: "satisfied" });
  });

  it("confirms money but does not activate a bidder whose required verification is missing", async () => {
    state.user.phoneVerified = false;
    const result = await handleBidSecurityCallback({ checkoutRequestID: "checkout-1", resultCode: 0, mpesaReceipt: "ABC123", providerAmount: 5000 });
    expect(result.success).toBe(true);
    expect(state.registration).toMatchObject({ status: "pending_eligibility", eligibility_status: "pending", commitment_status: "satisfied" });
  });

  it("fails the security hold when the provider callback amount does not match", async () => {
    const result = await handleBidSecurityCallback({ checkoutRequestID: "checkout-1", resultCode: 0, mpesaReceipt: "ABC123", providerAmount: 4999 });
    expect(result.success).toBe(false);
    expect(state.transaction.status).toBe("failed");
    expect(state.hold.status).toBe("failed");
    expect(state.registration.status).toBe("pending_commitment");
  });

  it("does not activate the registration when the provider reports a failed payment", async () => {
    const result = await handleBidSecurityCallback({ checkoutRequestID: "checkout-1", resultCode: 1, mpesaReceipt: null, providerAmount: 5000 });
    expect(result.success).toBe(false);
    expect(state.registration.status).toBe("pending_commitment");
    expect(state.registration.commitment_status).toBe("failed");
  });
});

// Commitment payment routing: private sellers are always KAYAD-held (seller-supplied account ignored), every car gets its
// own M-Pesa AccountReference, no silent default amount, and bidder identity is one anonymous value everywhere.
import { jest, describe, it, expect, beforeEach } from "@jest/globals";

const CAR = "05752bf6-34b9-40e2-8566-68c01f133179";
const stk = jest.fn(async () => ({ CheckoutRequestID: "ws_1" }));
const gate = jest.fn();
const db = {
  findById: jest.fn(async () => ({ id: CAR })),
  findOne: jest.fn(async (t) => (t === "auction_setups" ? { car_id: CAR, publication_status: "published", config: { commitment: { recipient: "organizer", recipientAccount: "SCAMMER-TILL" } } } : null)),
  create: jest.fn(async (_t, d) => ({ id: "tx", ...d })),
  update: jest.fn(async () => ({})),
};
jest.unstable_mockModule("../../services/mpesaService.js", () => ({ stkPush: stk }));
jest.unstable_mockModule("../../services/notification.service.js", () => ({ sendNotification: jest.fn() }));
jest.unstable_mockModule("../../db/index.js", () => db);
jest.unstable_mockModule("../../utils/supabase.js", () => ({ getSupabase: () => ({}) }));
jest.unstable_mockModule("../../services/securityPaymentStore.js", () => ({
  createSecurityPayment: jest.fn(async (p) => ({ row: { id: "tx", ...p } })), findSecurityPaymentByCheckout: jest.fn(), updateSecurityPayment: jest.fn(),
}));
jest.unstable_mockModule("../../services/privateSellerAuctionEligibility.service.js", () => ({ evaluatePrivateSellerAuctionEligibility: gate }));
const dealerCollection = jest.fn(async () => null);
jest.unstable_mockModule("../../services/dealerPaymentAccount.service.js", () => ({ resolveDealerCollection: dealerCollection }));
const { initiateBidSecurity } = await import("../../services/bidSecurityService.js");
const { bidderNumber } = await import("../../utils/bidderIdentity.js");

beforeEach(() => { stk.mockClear(); });

describe("bid commitment routing", () => {
  it("private seller: platform recipient, seller account ignored, per-car reference", async () => {
    gate.mockResolvedValue({ eligible: true, scope: "private_seller_proposal" });
    const r = await initiateBidSecurity({ auctionId: CAR, userId: "u1", phone: "0712345678", amount: 5000 });
    expect(r.success).toBe(true);
    expect(r.recipient).toBe("platform");
    expect(r.destination).toBeNull();
    expect(stk).toHaveBeenCalledWith("0712345678", 5000, { accountReference: "AUC-05752BF6", transactionDesc: "Bid commitment" });
  });
  it("unverifiable seller type fails safe to KAYAD-held", async () => {
    gate.mockRejectedValue(new Error("down"));
    const r = await initiateBidSecurity({ auctionId: CAR, userId: "u1", phone: "0712345678", amount: 5000 });
    expect(r.recipient).toBe("platform");
  });
  it("dealer: recipient account recorded, still a per-car reference", async () => {
    gate.mockResolvedValue({ eligible: true, scope: "not_private_seller" });
    const r = await initiateBidSecurity({ auctionId: CAR, userId: "u1", phone: "0712345678", amount: 5000 });
    expect(r.recipient).toBe("organizer");
    expect(r.destination).toBe("SCAMMER-TILL");
    expect(r.accountReference).toBe("AUC-05752BF6");
  });
  it("refuses instead of defaulting to a hidden amount", async () => {
    gate.mockResolvedValue({ eligible: true, scope: "not_private_seller" });
    const r = await initiateBidSecurity({ auctionId: CAR, userId: "u1", phone: "0712345678" });
    expect(r.success).toBe(false);
    expect(stk).not.toHaveBeenCalled();
  });
});

describe("dealer-direct collection", () => {
  const overrides = { consumerKey: "k", consumerSecret: "s", passkey: "p", shortCode: "174379", transactionType: "CustomerBuyGoodsOnline", partyB: "522522" };
  it("verified dealer account: STK uses the dealer's credentials, custody is dealer", async () => {
    gate.mockResolvedValue({ eligible: true, scope: "not_private_seller" });
    dealerCollection.mockResolvedValueOnce({ overrides, kind: "till", shortcode: "174379" });
    const r = await initiateBidSecurity({ auctionId: CAR, userId: "u1", phone: "0712345678", amount: 5000, holdId: null });
    expect(r.custody).toBe("dealer");
    expect(stk).toHaveBeenCalledWith("0712345678", 5000, { ...overrides, accountReference: "AUC-05752BF6", transactionDesc: "Bid commitment" });
  });
  it("private seller never reaches the dealer account lookup", async () => {
    gate.mockResolvedValue({ eligible: true, scope: "private_seller_proposal" });
    dealerCollection.mockClear();
    const r = await initiateBidSecurity({ auctionId: CAR, userId: "u1", phone: "0712345678", amount: 5000 });
    expect(dealerCollection).not.toHaveBeenCalled();
    expect(r.custody).toBe("kayad");
  });
});

describe("bidder identity", () => {
  it("is stable, per auction, anonymous", () => {
    const a = bidderNumber("u1", CAR);
    expect(a).toMatch(/^K-[0-9A-F]{8}$/);
    expect(bidderNumber("u1", CAR)).toBe(a);
    expect(bidderNumber("u1", "other")).not.toBe(a);
  });
});

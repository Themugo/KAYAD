import { jest, describe, it, expect } from "@jest/globals";
let outcome; let scope = "not_private_seller";
jest.unstable_mockModule("../../services/auctionSettlement.service.js", () => ({ getAuctionOutcome: async () => outcome }));
jest.unstable_mockModule("../../services/privateSellerAuctionEligibility.service.js", () => ({ evaluatePrivateSellerAuctionEligibility: async () => { if (scope === "boom") throw new Error("x"); return { scope }; } }));
jest.unstable_mockModule("../../db/index.js", () => ({ findById: async () => ({ name: "Kenya Motors", phone: "0722000111" }) }));
const { getWinnerHandover } = await import("../../services/auctionHandover.service.js");
const base = { status: "payment_due", winnerUserId: "w1", organizerId: "o1", paymentStatus: "pending", paymentDueAmount: 95000, settlementMode: "direct" };

describe("winner handover", () => {
  it("before payment: no contact, pay step is current", async () => {
    outcome = base; scope = "not_private_seller";
    const h = await getWinnerHandover({ auctionId: "a", userId: "w1" });
    expect(h.contact).toBeNull();
    expect(h.steps.find((s) => s.key === "pay")).toMatchObject({ state: "current", amount: 95000 });
  });
  it("after payment: a dealer's contact is released for direct arrangement", async () => {
    outcome = { ...base, status: "payment_received", paymentStatus: "paid" };
    const h = await getWinnerHandover({ auctionId: "a", userId: "w1" });
    expect(h.contact).toEqual({ name: "Kenya Motors", phone: "0722000111" });
    expect(h.steps.find((s) => s.key === "collect").state).toBe("current");
  });
  it("private sellers' (and unverifiable) contact is never released; KAYAD coordinates", async () => {
    outcome = { ...base, status: "payment_received", paymentStatus: "paid" };
    for (const sc of ["private_seller_proposal", "boom"]) {
      scope = sc;
      const h = await getWinnerHandover({ auctionId: "a", userId: "w1" });
      expect(h.contact).toBeNull(); expect(h.coordinatedByKayad).toBe(true);
    }
  });
  it("only the winner; none for no-sale", async () => {
    outcome = base;
    await expect(getWinnerHandover({ auctionId: "a", userId: "x" })).rejects.toMatchObject({ status: 403 });
    outcome = { ...base, status: "no_sale" };
    await expect(getWinnerHandover({ auctionId: "a", userId: "w1" })).rejects.toMatchObject({ status: 404 });
  });
});

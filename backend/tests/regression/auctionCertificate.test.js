import { jest, describe, it, expect } from "@jest/globals";
let outcome;
jest.unstable_mockModule("../../services/auctionSettlement.service.js", () => ({ getAuctionOutcome: async () => outcome }));
jest.unstable_mockModule("../../db/index.js", () => ({ findById: async () => ({ title: "Toyota Hilux", year: 2021, brand: "Toyota", model: "Hilux" }) }));
const { buildWinnerCertificate } = await import("../../services/auctionCertificate.service.js");
const base = { id: "05752bf6-34b9-40e2-8566-68c01f133179", status: "payment_due", winnerUserId: "w1", winningAmount: 2100000, commitmentAppliedAmount: 5000, paymentDueAmount: 2095000, createdAt: "2026-11-04T08:00:00Z", settlementMode: "direct" };
describe("winner certificate", () => {
  it("is issued to the winner only, with anonymous ID and balance due", async () => {
    outcome = base;
    const c = await buildWinnerCertificate({ auctionId: "a1", userId: "w1" });
    expect(c.certificateNumber).toBe("KAY-AUC-2026-05752BF6");
    expect(c.bidderId).toMatch(/^K-[0-9A-F]{8}$/);
    expect(c.financials).toMatchObject({ winningBid: 2100000, commitmentCredited: 5000, balanceDue: 2095000 });
    await expect(buildWinnerCertificate({ auctionId: "a1", userId: "other" })).rejects.toMatchObject({ status: 403 });
  });
  it("no certificate for a no-sale", async () => {
    outcome = { ...base, status: "no_sale" };
    await expect(buildWinnerCertificate({ auctionId: "a1", userId: "w1" })).rejects.toMatchObject({ status: 404 });
  });
});

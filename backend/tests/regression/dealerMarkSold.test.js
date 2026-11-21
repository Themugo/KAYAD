import { describe, test, expect, beforeEach, jest } from "@jest/globals";
process.env.NODE_ENV = "test";

// The sale is performed by the atomic database function (kayad_dealer_listing_lifecycle_atomic); this suite pins the service contract:
// what it sends, how the database refusals are reported, and that nothing is written outside that single transaction.
const rpc = jest.fn();
const directWrites = jest.fn();
const carRow = { id: "c1", status: "sold", sold: true };
const from = jest.fn(() => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: carRow }) }) }), update: directWrites, insert: directWrites }));
jest.unstable_mockModule("../../utils/supabase.js", () => ({ getSupabase: () => ({ rpc, from }) }));
const { markDealerListingSold } = await import("../../services/dealerListingSale.service.js");

const refuse = (message) => rpc.mockResolvedValueOnce({ data: null, error: { message } });
beforeEach(() => { jest.clearAllMocks(); });

describe("dealer mark as sold", () => {
  test("goes through the single atomic lifecycle function with the sale details and the real actor", async () => {
    rpc.mockResolvedValueOnce({ data: { salePrice: 3400000, buyerName: "Wanjiru", notes: null }, error: null });
    const r = await markDealerListingSold("d1", "c1", { buyerName: "Wanjiru", salePrice: 3400000 }, "staff-9");
    expect(rpc).toHaveBeenCalledWith("kayad_dealer_listing_lifecycle_atomic", { p_car_id: "c1", p_dealer_id: "d1", p_action: "mark_sold", p_actor_id: "staff-9", p_sale: { salePrice: 3400000, buyerName: "Wanjiru", notes: null } });
    expect(r.audit).toEqual({ buyerName: "Wanjiru", salePrice: 3400000, notes: null });
    expect(directWrites).not.toHaveBeenCalled(); // no second, non-atomic writer
  });
  test("the audited sale price defaults to the listing price (decided in the database transaction)", async () => {
    rpc.mockResolvedValueOnce({ data: { salePrice: 3500000, buyerName: null, notes: null }, error: null });
    expect((await markDealerListingSold("d1", "c1", {})).audit.salePrice).toBe(3500000);
    expect(rpc.mock.calls[0][1].p_sale.salePrice).toBeNull();
  });
  test("another dealer's listing is not found", async () => {
    refuse("LISTING_NOT_FOUND");
    await expect(markDealerListingSold("d2", "c1", {})).rejects.toMatchObject({ status: 404, code: "CAR_NOT_FOUND" });
    expect(directWrites).not.toHaveBeenCalled();
  });
  test("an already sold listing is a 409", async () => {
    refuse("ALREADY_SOLD");
    await expect(markDealerListingSold("d1", "c2", {})).rejects.toMatchObject({ status: 409, code: "ALREADY_SOLD" });
  });
  test("a live auction or bids must be settled through the auction flow", async () => {
    refuse("AUCTION_OR_BID_LOCK");
    await expect(markDealerListingSold("d1", "c3", {})).rejects.toMatchObject({ status: 409, code: "AUCTION_OR_BID_LOCK" });
    expect(directWrites).not.toHaveBeenCalled();
  });
  test("a funded escrow / purchase blocks the sale (DA-01)", async () => {
    refuse("TRANSACTION_LOCK");
    await expect(markDealerListingSold("d1", "c4", {})).rejects.toMatchObject({ status: 409, code: "TRANSACTION_LOCK" });
  });
  test("an accepted offer awaiting payment blocks the sale (DA-01)", async () => {
    refuse("OFFER_SETTLEMENT_LOCK");
    await expect(markDealerListingSold("d1", "c5", {})).rejects.toMatchObject({ status: 409, code: "OFFER_SETTLEMENT_LOCK" });
  });
  test("a missing database function is reported as unavailable, never as success and never by falling back to a plain update", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { code: "PGRST202", message: "Could not find the function" } });
    await expect(markDealerListingSold("d1", "c1", {})).rejects.toMatchObject({ status: 503, code: "LISTING_STATUS_SERVICE_UNAVAILABLE" });
    expect(directWrites).not.toHaveBeenCalled();
  });
});

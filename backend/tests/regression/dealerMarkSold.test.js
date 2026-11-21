import { describe, test, expect, beforeEach, jest } from "@jest/globals";
process.env.NODE_ENV = "test";

const rows = {};
const findOne = jest.fn(async (_t, q) => (rows[q.id] && rows[q.id].dealerId === q.dealer ? rows[q.id] : null));
const update = jest.fn(async (_t, id, patch) => ({ ...rows[id], ...patch }));
jest.unstable_mockModule("../../db/index.js", () => ({ findOne, update }));
const { markDealerListingSold } = await import("../../services/dealerListingSale.service.js");

beforeEach(() => {
  jest.clearAllMocks();
  rows.c1 = { id: "c1", dealerId: "d1", status: "available", price: 3500000 };
  rows.c2 = { id: "c2", dealerId: "d1", status: "sold", price: 1 };
  rows.c3 = { id: "c3", dealerId: "d1", status: "available", auctionStatus: "live", price: 1 };
});

describe("dealer mark as sold", () => {
  test("writes only existing columns (sold, status) - no non-existent sale-details column", async () => {
    const r = await markDealerListingSold("d1", "c1", { buyerName: "Wanjiru", salePrice: 3400000 });
    expect(update).toHaveBeenCalledWith("cars", "c1", { sold: true, status: "sold" });
    expect(r.audit).toEqual({ buyerName: "Wanjiru", salePrice: 3400000, notes: null });
  });
  test("defaults the audited sale price to the listing price", async () => {
    expect((await markDealerListingSold("d1", "c1", {})).audit.salePrice).toBe(3500000);
  });
  test("another dealer's listing is not found", async () => {
    await expect(markDealerListingSold("d2", "c1", {})).rejects.toMatchObject({ status: 404 });
    expect(update).not.toHaveBeenCalled();
  });
  test("an already sold listing is a 409", async () => {
    await expect(markDealerListingSold("d1", "c2", {})).rejects.toMatchObject({ status: 409, code: "ALREADY_SOLD" });
  });
  test("a live auction must be settled through the auction flow", async () => {
    await expect(markDealerListingSold("d1", "c3", {})).rejects.toMatchObject({ status: 409, code: "AUCTION_IN_PROGRESS" });
    expect(update).not.toHaveBeenCalled();
  });
});

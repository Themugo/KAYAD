import { jest, describe, test, expect, beforeEach } from "@jest/globals";

const from = jest.fn();
jest.unstable_mockModule("../../utils/supabase.js", () => ({ getSupabase: () => ({ from }) }));
const { getPersonalSellerEnquiries, getPersonalSellerPerformance } = await import("../../services/personalSellerInsights.service.js");

function queryResult(table, result) {
  const q = {
    select: jest.fn(() => q), eq: jest.fn(() => q), is: jest.fn(() => q), in: jest.fn(() => q),
    order: jest.fn(() => q), limit: jest.fn(() => q), gte: jest.fn(() => q),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  };
  from.mockImplementation((name) => { if (name !== table) throw new Error(`Unexpected table ${name}`); return q; });
  return q;
}

describe("personal seller insights", () => {
  beforeEach(() => from.mockReset());

  test("seller enquiry query scopes leads to the owner and their vehicle IDs", async () => {
    let call = 0;
    from.mockImplementation((table) => {
      call += 1;
      const result = call === 1
        ? { data: [{ id: "car-1", title: "Toyota", price: 100, images: [], status: "available" }], error: null }
        : { data: [{ id: "lead-1", vehicle: "car-1", source: "listing", stage: "new", created_at: "2026-01-01" }], error: null };
      const q = { select: jest.fn(() => q), eq: jest.fn(() => q), is: jest.fn(() => q), in: jest.fn(() => q), order: jest.fn(() => q), gte: jest.fn(() => q), limit: jest.fn(() => Promise.resolve(result)), then: (resolve, reject) => Promise.resolve(result).then(resolve, reject) };
      return q;
    });
    const result = await getPersonalSellerEnquiries("owner-1");
    expect(from).toHaveBeenNthCalledWith(1, "cars");
    expect(from).toHaveBeenNthCalledWith(2, "leads");
    expect(result).toMatchObject({ count: 1, enquiries: [{ id: "lead-1", listing: { id: "car-1", title: "Toyota" } }] });
  });

  test("performance uses listing_view events and does not claim conversion", async () => {
    let call = 0;
    from.mockImplementation((table) => {
      call += 1;
      const result = call === 1
        ? { data: [{ id: "car-1", title: "Toyota", status: "available", clicks: 3 }], error: null }
        : call === 2
          ? { data: [{ listing_id: "car-1", visitor_hash: "hash-1" }], count: 1, error: null }
          : { data: [{ id: "lead-1", vehicle: "car-1" }], count: 1, error: null };
      const q = { select: jest.fn(() => q), eq: jest.fn(() => q), is: jest.fn(() => q), in: jest.fn(() => q), gte: jest.fn(() => q), limit: jest.fn(() => Promise.resolve(result)), then: (resolve, reject) => Promise.resolve(result).then(resolve, reject) };
      return q;
    });
    const result = await getPersonalSellerPerformance("owner-1", { days: 30 });
    expect(result.totals).toMatchObject({ listings: 1, listingViews: 1, uniqueVisitors: 1, clicks: 3, enquiries: 1 });
    expect(result.definitions.conversion).toMatch(/Not reported/);
  });
});

import { describe, it, expect } from "vitest";
import { loadInventoryPage, parseInventoryPaging } from "../services/dealerInventoryQuery.js";

// Fake model that records how it is queried, over a dealer with 5,000 listings.
function fakeCar(total = 5000, byStatus = { published: 40, draft: 7, pending: 3, reserved: 2, sold: 100, archived: 9 }) {
  const calls = { find: [], count: [], skip: null, limit: null, fullScan: false };
  return {
    calls,
    find(filter) {
      calls.find.push(filter);
      const q = { sort() { return q; }, skip(n) { calls.skip = n; return q; }, limit(n) { calls.limit = n; return q; },
        then(res, rej) { if (calls.limit == null) calls.fullScan = true; return Promise.resolve(Array.from({ length: calls.limit ?? total }, (_, i) => ({ id: `c${i}` }))).then(res, rej); } };
      return q;
    },
    async countDocuments(filter) { calls.count.push(filter); return filter.status ? byStatus[filter.status] ?? 0 : total; },
  };
}

describe("dealer inventory query", () => {
  it("never loads the whole inventory: the page is limited and skipped in the database", async () => {
    const Car = fakeCar();
    const out = await loadInventoryPage(Car, { dealerId: "d1", page: 3, limit: 20 });
    expect(Car.calls.fullScan).toBe(false);
    expect(Car.calls.skip).toBe(40);
    expect(Car.calls.limit).toBe(20);
    expect(out.items).toHaveLength(20);
    expect(out.pagination).toEqual({ page: 3, limit: 20, total: 5000, pages: 250 });
    expect(out.stats).toEqual({ total: 5000, published: 40, draft: 7, pending: 3, reserved: 2, sold: 100, archived: 9 });
  });
  it("always scopes to the signed-in dealer and excludes soft-deleted listings", async () => {
    const Car = fakeCar();
    await loadInventoryPage(Car, { dealerId: "d1", page: 1, limit: 20 });
    for (const f of [...Car.calls.find, ...Car.calls.count]) { expect(f.dealer).toBe("d1"); expect(f.deletedAt).toEqual({ $exists: false }); }
  });
  it("keeps the existing semantics: counts follow an active status filter", async () => {
    const Car = fakeCar(7);
    const out = await loadInventoryPage(Car, { dealerId: "d1", status: "draft", page: 1, limit: 20 });
    expect(Car.calls.find[0].status).toBe("draft");
    expect(out.stats).toEqual({ total: 7, published: 0, draft: 7, pending: 0, reserved: 0, sold: 0, archived: 0 });
  });
  it("handles an empty inventory", async () => {
    const Car = fakeCar(0, {});
    const out = await loadInventoryPage(Car, { dealerId: "d1", page: 1, limit: 20 });
    expect(out.pagination.pages).toBe(0);
    expect(out.stats.total).toBe(0);
  });
  it("clamps paging input", () => {
    expect(parseInventoryPaging({ page: "-4", limit: "9999" })).toEqual({ pageNum: 1, limitNum: 100 });
    expect(parseInventoryPaging({ page: "abc", limit: "0" })).toEqual({ pageNum: 1, limitNum: 20 });
    expect(parseInventoryPaging({})).toEqual({ pageNum: 1, limitNum: 20 });
  });
});

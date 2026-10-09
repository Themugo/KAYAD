// Auction list integrity regression (Gate 4).
// Root causes covered:
//  1. The Mongo-style filter `deletedAt: null` was silently DROPPED by the Supabase adapter (null values are skipped),
//     so soft-deleted vehicles were returned as public auctions (list, scheduled, active) and total counts included them.
//  2. The adapter now supports `{ $exists: false }` => IS NULL, which the auction endpoints use.
import { describe, test, expect, jest, beforeEach } from "@jest/globals";

// ---- adapter level: records the PostgREST calls the real model builder makes ----
const calls = [];
const recorder = () => {
  const q = new Proxy({}, {
    get: (_t, prop) => {
      if (prop === "then") return (res) => Promise.resolve({ data: [], error: null, count: 0 }).then(res);
      return (...args) => { calls.push([String(prop), ...args]); return q; };
    },
  });
  return q;
};
jest.unstable_mockModule("../../utils/supabase.js", () => ({ getSupabase: () => ({ from: () => recorder() }) }));
const { createModel } = await import("../../models/_base.js");

describe("model adapter: soft-delete filter semantics", () => {
  beforeEach(() => { calls.length = 0; });
  test("bare null is skipped (legacy contract), so callers cannot rely on it for soft-delete", async () => {
    await createModel("Car").find({ deletedAt: null, auctionStatus: "live" }).lean();
    expect(calls.some(([m, c]) => m === "is" && c === "deleted_at")).toBe(false);
  });
  test("{ $exists: false } becomes deleted_at IS NULL", async () => {
    await createModel("Car").find({ deletedAt: { $exists: false }, auctionStatus: "live" }).lean();
    expect(calls).toContainEqual(["is", "deleted_at", null]);
    expect(calls).toContainEqual(["eq", "auction_status", "live"]);
  });
  test("{ $exists: true } becomes deleted_at IS NOT NULL", async () => {
    await createModel("Car").find({ deletedAt: { $exists: true } }).lean();
    expect(calls).toContainEqual(["not", "deleted_at", "is", null]);
  });
});

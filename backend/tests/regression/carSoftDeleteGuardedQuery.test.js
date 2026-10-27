// Phase 14.7 - the REAL models/Car.js softDeleteGuarded puts the whole business guard inside ONE conditional UPDATE
// (race-safe: PostgreSQL evaluates the WHERE against the locked row). Recording query builder, no database.
import { jest, describe, test, expect } from "@jest/globals";

const calls = [];
const q = new Proxy({}, { get: (_t, name) => (...args) => { calls.push([name, ...args]); return name === "select" ? Promise.resolve({ data: [{ id: "c1" }], error: null }) : q; } });
jest.unstable_mockModule("../../utils/supabase.js", () => ({ getSupabase: () => ({ from: (t) => { calls.push(["from", t]); return q; } }) }));
jest.unstable_mockModule("../../models/_base.js", () => ({ createModel: () => ({}) }));
const Car = (await import("../../models/Car.js")).default;

describe("Car.softDeleteGuarded", () => {
  test("filters are part of the single update query", async () => {
    const out = await Car.softDeleteGuarded("c1", "d1");
    expect(out.modifiedCount).toBe(1);
    const flat = JSON.stringify(calls);
    expect(flat).toContain('"from","cars"');
    expect(calls.filter((c) => c[0] === "update")).toHaveLength(1);
    expect(flat).toContain('"deleted_at",null');
    expect(flat).toContain("auction_status.is.null,auction_status.not.in.(live,ended)");
    expect(flat).toContain("bids_count.is.null,bids_count.eq.0");
    expect(flat).toContain('"highest_bidder_id",null');
    expect(flat).toContain("status.is.null,status.not.in.(sold,reserved)"); // 14.8: reserved listings are protected too
    expect(flat).toContain('"deleted_by":"d1"');
  });
  test("14.8 REGRESSION: every filtered column is in the RETURNING list (PostgREST 42703 on a real database otherwise)", async () => {
    calls.length = 0;
    await Car.softDeleteGuarded("c1");
    const sel = calls.filter((c) => c[0] === "select").pop()[1];
    for (const col of ["id", "status", "auction_status", "bids_count", "highest_bidder_id"]) expect(sel.split(",")).toContain(col);
  });
  test("a database error is thrown, never reported as success", async () => {
    const failing = new Proxy({}, { get: (_t, name) => () => (name === "select" ? Promise.resolve({ data: null, error: new Error("db") }) : failing) });
    jest.resetModules();
    jest.unstable_mockModule("../../utils/supabase.js", () => ({ getSupabase: () => ({ from: () => failing }) }));
    jest.unstable_mockModule("../../models/_base.js", () => ({ createModel: () => ({}) }));
    const Real = (await import("../../models/Car.js")).default;
    await expect(Real.softDeleteGuarded("c1")).rejects.toThrow("db");
  });
});

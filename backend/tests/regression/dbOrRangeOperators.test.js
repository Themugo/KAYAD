// Regression: db.findAll $or branches with range / set operators. EVIDENCE TIER: unit test with a recording fake PostgREST builder.
// Defect (seen in the hosted edge logs, hourly): dealerHealthScoreScheduler.calculateChangedScores sent
//   dealers?select=user&or=(updated_at.eq.[object Object],created_at.eq.[object Object])  -> HTTP 400
// because applyFilters serialised the operator object instead of translating $gte.
import { jest, describe, it, expect, beforeEach } from "@jest/globals";

const calls = [];
const builder = new Proxy({}, {
  get: (_t, name) => {
    if (name === "then") return (resolve) => resolve({ data: [], error: null, count: 0 });
    return (...args) => { calls.push([String(name), ...args]); return builder; };
  },
});
jest.unstable_mockModule("../../utils/supabase.js", () => ({ getSupabase: () => ({ from: () => builder }), isSupabaseConnected: () => true }));

const { default: db } = await import("../../db/index.js");
const orExprs = () => calls.filter((c) => c[0] === "or").map((c) => c[1]);

beforeEach(() => { calls.length = 0; });

describe("db.findAll $or with range operators", () => {
  const when = new Date("2026-11-22T07:00:00.000Z");

  it("translates the dealer health scheduler filter (no [object Object])", async () => {
    await db.findAll("dealers", { filters: { $or: [{ updatedAt: { $gte: when } }, { createdAt: { $gte: when } }] }, select: "user" });
    expect(orExprs()).toEqual(["updated_at.gte.2026-11-22T07:00:00.000Z,created_at.gte.2026-11-22T07:00:00.000Z"]);
    expect(orExprs()[0]).not.toContain("[object Object]");
  });

  it("supports $gt, $lt, $lte and $ne", async () => {
    await db.findAll("cars", { filters: { $or: [{ price: { $gt: 5 } }, { price: { $lt: 2 } }, { year: { $lte: 2000 } }, { status: { $ne: "sold" } }] } });
    expect(orExprs()).toEqual(["price.gt.5,price.lt.2,year.lte.2000,status.neq.sold"]);
  });

  it("AND-s several operators on one field inside a branch", async () => {
    await db.findAll("cars", { filters: { $or: [{ price: { $gte: 10, $lt: 20 } }] } });
    expect(orExprs()).toEqual(["and(price.gte.10,price.lt.20)"]);
  });

  it("supports $in and quotes reserved characters", async () => {
    await db.findAll("cars", { filters: { $or: [{ status: { $in: ["a", "b,c"] } }] } });
    expect(orExprs()).toEqual(['status.in.(a,"b,c")']);
  });

  it("fails closed for an unsupported operator object instead of sending [object Object]", async () => {
    await expect(db.findAll("cars", { filters: { $or: [{ price: { $exists: true } }] } })).rejects.toThrow(/Unsupported \$or operator/);
    expect(orExprs()).toEqual([]);
  });

  it("leaves existing equality, null, $ilike and $regex branches unchanged", async () => {
    await db.findAll("cars", { filters: { $or: [{ status: "available" }, { deletedAt: null }] } });
    expect(orExprs()).toEqual(["status.eq.available,deleted_at.is.null"]);
    calls.length = 0;
    await db.findAll("cars", { filters: { $or: [{ title: { $ilike: "%Corolla%" } }] } });
    expect(orExprs()).toEqual(['title.ilike."*Corolla*"']);
  });
});

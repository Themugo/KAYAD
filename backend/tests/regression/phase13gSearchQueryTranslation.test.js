// Phase 13G (Defect B) — keyword-search query translation. EVIDENCE TIER: unit test with a recording fake PostgREST builder.
// The database behaviour itself is certified separately over real HTTP + PostgreSQL (runbooks/phase13g-20261026/http/phase13g_search_alerts_matrix.mjs).
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
const { createModel } = await import("../../models/_base.js");
const orExprs = () => calls.filter((c) => c[0] === "or").map((c) => c[1]);

beforeEach(() => { calls.length = 0; });

describe("db.findAll $or with $ilike (GET /api/search?q=)", () => {
  it("translates $ilike to a quoted PostgREST ilike (it used to fall through to .eq.[object Object])", async () => {
    await db.findAll("cars", { filters: { $or: [{ title: { $ilike: "%Corolla%" } }, { brand: { $ilike: "%Corolla%" } }] } });
    expect(orExprs()).toEqual(['title.ilike."*Corolla*",brand.ilike."*Corolla*"']);
    expect(orExprs()[0]).not.toContain("[object Object]");
  });
  it("quotes hostile text so it cannot leave the filter expression", async () => {
    await db.findAll("cars", { filters: { $or: [{ title: { $ilike: '%x),id.is.null,"y%' } }] } });
    const expr = orExprs()[0];
    expect(expr).toBe('title.ilike."*x)id.is.null\\"y*"');
    expect(expr.split(",")).toHaveLength(1);           // the comma separator was removed, no second condition can be injected
  });
  it("matches nothing (not everything) when only wildcards are supplied", async () => {
    await db.findAll("cars", { filters: { $or: [{ title: { $ilike: "%%" } }] } });
    expect(orExprs()).toEqual(["id.is.null"]);
  });
});

describe("Model.find $text / $or regex (GET /api/cars?keyword=)", () => {
  const Car = createModel("Car");
  it("does not order by the Mongo $meta textScore virtual (ORDER BY score does not exist)", async () => {
    await Car.find({ $text: { $search: "toyota" } }).sort({ score: { $meta: "textScore" }, createdAt: -1 });
    const orders = calls.filter((c) => c[0] === "order").map((c) => c[1]);
    expect(orders).toEqual(["created_at"]);
    expect(orders).not.toContain("score");
  });
  it("quotes the $text term in every searchable field and strips separators", async () => {
    await Car.find({ $text: { $search: "O'Brien),id.is.null" } });
    const expr = orExprs()[0];
    expect(expr.split(",")).toHaveLength(4);            // one condition per searchable column, nothing injected
    expect(expr).toContain('title.ilike."*O\'Brien)id.is.null*"');
  });
  it("a keyword that is only wildcards matches nothing", async () => {
    await Car.find({ $text: { $search: "%*," } });
    expect(orExprs()).toEqual(["id.is.null"]);
  });
  it("the short-keyword regex branch is quoted too", async () => {
    await Car.find({ $or: [{ title: { $regex: "a)", $options: "i" } }, { brand: { $regex: "a)", $options: "i" } }] });
    expect(orExprs()[0]).toBe('title.ilike."*a)*",brand.ilike."*a)*"');
  });
});

describe("chats identity aliases (GET /api/admin/chats)", () => {
  it("map to the real camelCase columns instead of updated_at / is_blocked", async () => {
    const { mapKeyOut } = await import("../../utils/fieldMap.js");
    for (const c of ["createdAt", "updatedAt", "lastMessageAt", "isBlocked"]) expect(mapKeyOut("chats", c)).toBe(c);
  });
});

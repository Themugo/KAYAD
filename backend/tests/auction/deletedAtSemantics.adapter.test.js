// Release-gate proof of `deletedAt` semantics through the REAL model adapter and the REAL auction controller.
// Only the network client is replaced, by an evaluator that applies each PostgREST operator the adapter emits with
// PostgreSQL semantics (IS NULL matches NULL; a row object that lacks the column reads as NULL, as an unselected
// nullable column would). Three vehicle states: column absent, explicit null, non-null deletion timestamp.
import { describe, test, expect, jest, beforeEach } from "@jest/globals";

let tables;
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
function evaluator(name) {
  const f = []; let ord = null; let lim = null; let rng = null; let count = null;
  const q = {
    select(_c, opts) { count = opts?.count ? opts : null; return q; },
    eq: (c, v) => (f.push((r) => String(r[c]) === String(v)), q),
    neq: (c, v) => (f.push((r) => String(r[c]) !== String(v)), q),
    in: (c, vs) => (f.push((r) => vs.map(String).includes(String(r[c]))), q),
    is: (c, v) => { if (v !== null) throw new Error("only IS NULL supported"); f.push((r) => r[c] === null || r[c] === undefined); return q; },
    not: (c, op, v) => { if (op !== "is" || v !== null) throw new Error("only NOT IS NULL supported"); f.push((r) => r[c] !== null && r[c] !== undefined); return q; },
    gte: (c, v) => (f.push((r) => r[c] >= v), q), lte: (c, v) => (f.push((r) => r[c] <= v), q),
    gt: (c, v) => (f.push((r) => r[c] > v), q), lt: (c, v) => (f.push((r) => r[c] < v), q),
    order: (c, o) => { ord = [c, o?.ascending !== false]; return q; },
    limit: (n) => { lim = n; return q; }, range: (a, b) => { rng = [a, b]; return q; },
    or: () => q,
    maybeSingle: async () => ({ data: (tables[name] || []).filter((r) => f.every((x) => x(r)))[0] || null, error: null }),
    then: (res, rej) => {
      let rows = (tables[name] || []).filter((r) => f.every((x) => x(r)));
      const total = rows.length;
      if (ord) rows = [...rows].sort((a, b) => (ord[1] ? 1 : -1) * cmp(a[ord[0]], b[ord[0]]));
      if (rng) rows = rows.slice(rng[0], rng[1] + 1); else if (lim) rows = rows.slice(0, lim);
      return Promise.resolve({ data: count?.head ? null : rows, error: null, count: total }).then(res, rej);
    },
  };
  return q;
}
jest.unstable_mockModule("../../utils/supabase.js", () => ({ getSupabase: () => ({ from: evaluator }) }));
jest.unstable_mockModule("../../services/escrowCapability.service.js", () => ({ getEffectiveEscrowForCar: jest.fn().mockResolvedValue(false) }));

const Car = (await import("../../models/Car.js")).default;
const { listAuctions, getActiveAuctions, getAuction } = await import("../../controllers/auctionController.js");

const FUTURE = new Date(Date.now() + 3 * 3600e3).toISOString();
const base = { auction_status: "live", auction_end: FUTURE, auction_start_time: new Date(Date.now() - 3600e3).toISOString(), allow_bid: true, status: "available", price: 100 };
const ABSENT = { id: "00000000-0000-4000-8000-0000000000a1", ...base };                              // key missing
const NULLED = { id: "00000000-0000-4000-8000-0000000000a2", ...base, deleted_at: null };           // explicit null
const DELETED = { id: "00000000-0000-4000-8000-0000000000d1", ...base, deleted_at: "2026-10-01T00:00:00Z" };
const res = () => ({ statusCode: 200, body: null, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; } });
const ids = (rows) => rows.map((r) => r.id).sort();

beforeEach(() => { tables = { cars: [ABSENT, NULLED, DELETED], auction_setups: [] }; });

describe("Car adapter: deletedAt filter forms", () => {
  test("bare `deletedAt: null` is DROPPED by the adapter (documents the hazard): deleted vehicle is exposed", async () => {
    const rows = await Car.find({ deletedAt: null }).lean();
    expect(ids(rows)).toEqual(ids([ABSENT, NULLED, DELETED]));
  });
  test("`{ $exists:false }` keeps absent + explicit-null vehicles and excludes the deleted one", async () => {
    const rows = await Car.find({ deletedAt: { $exists: false } }).lean();
    expect(ids(rows)).toEqual(ids([ABSENT, NULLED]));
    expect(await Car.countDocuments({ deletedAt: { $exists: false } })).toBe(2);
  });
  test("`{ $exists:true }` returns only the deleted vehicle", async () => {
    expect(ids(await Car.find({ deletedAt: { $exists: true } }).lean())).toEqual(ids([DELETED]));
    expect(await Car.countDocuments({ deletedAt: { $exists: true } })).toBe(1);
  });
});

describe("auction endpoints (real controller + real adapter)", () => {
  test("listAuctions(live): active vehicles listed (absent + null), deleted never; total excludes deleted", async () => {
    const r = res(); await listAuctions({ query: { status: "live" } }, r);
    expect(r.body.auctions.map((a) => a.id).sort()).toEqual([ABSENT.id, NULLED.id]);
    expect(r.body.pagination.total).toBe(2);
  });
  test("getActiveAuctions: same guarantee", async () => {
    const r = res(); await getActiveAuctions({ query: {} }, r);
    expect(r.body.auctions.map((a) => a.id).sort()).toEqual([ABSENT.id, NULLED.id]);
    expect(r.body.pagination.total).toBe(2);
  });
  test("scheduled path never returns a deleted vehicle, still returns active ones", async () => {
    const start = new Date(Date.now() + 86400e3).toISOString();
    tables.cars = [{ ...ABSENT, auction_status: null }, { ...NULLED, auction_status: null }, { ...DELETED, auction_status: null }];
    tables.auction_setups = [ABSENT, NULLED, DELETED].map((c) => ({ id: "s" + c.id.slice(-2), car_id: c.id, publication_status: "published", config: { startsAt: start, endsAt: start } }));
    const r = res(); await listAuctions({ query: { status: "draft" } }, r);
    expect(r.body.auctions.map((a) => a.id).sort()).toEqual([ABSENT.id, NULLED.id]);
  });
  test("detail: active vehicle is not 404 for deletion reasons; deleted vehicle is 404", async () => {
    tables.auction_setups = [ABSENT, NULLED, DELETED].map((c) => ({ id: "s" + c.id.slice(-2), car_id: c.id, publication_status: "published", config: {} }));
    for (const c of [ABSENT, NULLED]) { const r = res(); await getAuction({ params: { id: c.id } }, r); expect(r.statusCode).not.toBe(404); }
    const r = res(); await getAuction({ params: { id: DELETED.id } }, r); expect(r.statusCode).toBe(404);
  });
});

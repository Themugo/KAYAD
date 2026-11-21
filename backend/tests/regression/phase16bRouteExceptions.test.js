// Phase 16B - regression for the application defects reproduced from the Phase 16 "66 application exceptions" list.
// Unit level (recording Supabase double, no database). The real-route proof is runbooks/phase16b-20261027/http + the role/route matrix.
import { jest, describe, test, expect } from "@jest/globals";

const calls = [];
const row = { id: "r1", name: "n", email: "e@example.test", password: "x" };
const q = new Proxy({}, {
  get(_t, name) {
    if (name === "then") return (res, rej) => Promise.resolve({ data: [row], error: null }).then(res, rej);
    if (name === "maybeSingle" || name === "single") return () => Promise.resolve({ data: row, error: null });
    return (...a) => { calls.push([name, ...a]); return q; };
  },
});
jest.unstable_mockModule("../../utils/supabase.js", () => ({ getSupabase: () => ({ from: (t) => { calls.push(["from", t]); return q; } }) }));
const { createModel } = await import("../../models/_base.js");
const { findAll } = await import("../../db/index.js");
const errorHandler = (await import("../../middleware/errorHandler.js")).default;
const asyncHandler = (await import("../../middleware/asyncHandler.js")).default;
const { AppError } = await import("../../utils/AppError.js");
const flush = () => new Promise((r) => setImmediate(r));
const count = (n) => calls.filter((c) => c[0] === n).length;

describe("16B-1 findByIdAndUpdate is chainable (was `x.lean is not a function`)", () => {
  const Model = createModel("MarketData");
  test("no chain: resolves a document, exactly ONE round trip (behaviour unchanged for every existing caller)", async () => {
    calls.length = 0;
    const doc = await Model.findByIdAndUpdate("r1", { name: "n2" }, { new: true });
    expect(doc.id).toBe("r1");
    expect(count("from")).toBe(1);
    expect(count("update")).toBe(1);
  });
  test(".lean() works and returns a plain object via one extra read", async () => {
    calls.length = 0;
    const doc = await Model.findByIdAndUpdate("r1", { name: "n2" }, { new: true, runValidators: true }).lean();
    expect(doc.id).toBe("r1");
    expect(count("update")).toBe(1);
    expect(count("from")).toBe(2);
  });
  test(".select('-password').lean() and .populate() chain without throwing, password is stripped", async () => {
    const a = await Model.findByIdAndUpdate("r1", { name: "n3" }, { new: true }).select("-password").lean();
    expect(a.password).toBeUndefined();
    await expect(Model.findByIdAndUpdate("r1", { name: "n4" }, { new: true }).populate("targetUser", "name email")).resolves.toBeTruthy();
  });
  test("an unused (fire-and-forget) call still performs the update", async () => {
    calls.length = 0;
    Model.findByIdAndUpdate("r1", { name: "fire" });
    await flush();
    expect(count("update")).toBe(1);
  });
  test("missing id resolves null (also through a chain)", async () => {
    expect(await Model.findByIdAndUpdate(undefined, { a: 1 })).toBeNull();
    expect(await Model.findByIdAndUpdate(undefined, { a: 1 }).lean()).toBeNull();
  });
  test(".catch/.finally are available", async () => {
    let fin = false;
    await Model.findByIdAndUpdate("r1", { name: "z" }).catch(() => null).finally(() => { fin = true; });
    expect(fin).toBe(true);
  });
});

describe("16B-2 db.findAll accepts Mongo-style ordering objects (was `s.replace is not a function`)", () => {
  test("{ createdAt: -1 } is descending, { createdAt: 1 } ascending, multi-key kept in order", async () => {
    calls.length = 0;
    await findAll("disputes", { orderBy: { createdAt: -1 } });
    await findAll("bids", { orderBy: { createdAt: 1 } });
    await findAll("feature_flags", { orderBy: { category: 1, key: 1 } });
    const orders = calls.filter((c) => c[0] === "order").map((c) => [c[1], c[2].ascending]);
    expect(orders).toEqual([["created_at", false], ["created_at", true], ["category", true], ["key", true]]);
  });
  test("string and array forms are unchanged", async () => {
    calls.length = 0;
    await findAll("cars", { orderBy: "createdAt", ascending: true });
    await findAll("cars", { orderBy: [{ field: "price", ascending: true }, "createdAt"] });
    const orders = calls.filter((c) => c[0] === "order").map((c) => [c[1], c[2].ascending]);
    expect(orders).toEqual([["created_at", true], ["price", true], ["created_at", false]]);
  });
});

describe("16B-3 database-code classification now applies behind asyncHandler (it was dead code there)", () => {
  const run = async (err, url = "/api/governance/policies/x", method = "PUT") => {
    const req = { originalUrl: url, method, headers: {} };
    const res = { headersSent: false, writableEnded: false, statusCode: 200, body: null, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; } };
    let captured;
    await asyncHandler(async () => { throw err; })(req, res, (e) => { captured = e; });
    errorHandler(captured, req, res, () => undefined);
    return res;
  };
  const pg = (code, message = "m") => Object.assign(new Error(message), { code });
  test("PGRST116 through asyncHandler on a non-financial route -> 404 (was 500)", async () => { expect((await run(pg("PGRST116"))).statusCode).toBe(404); });
  test("22P02 through asyncHandler on a non-financial route -> 400 (was 500)", async () => { expect((await run(pg("22P02"))).statusCode).toBe(400); });
  test("no schema detail leaks in the mapped body", async () => { const r = await run(pg("PGRST116", "JSON object requested, multiple (or no) rows returned")); expect(JSON.stringify(r.body)).not.toMatch(/JSON object|rows returned/); });
  test.each([
    "/api/payments/mpesa/callback", "/api/v1/payments/x", "/api/escrow/x", "/api/admin/escrow/accounts/x", "/api/auctions/x/registration", "/api/auction-admin/x/end",
    "/api/dealer/payouts/x/initiate", "/api/ledger/x", "/api/finance/x", "/api/reconciliation/x", "/api/bids/x", "/api/webhooks/x", "/api/refunds/x",
  ])("financial/settlement path %s keeps the pre-16B behaviour behind asyncHandler (stays 500)", async (url) => {
    expect((await run(pg("PGRST116"), url, "POST")).statusCode).toBe(500);
    expect((await run(pg("22P02"), url, "POST")).statusCode).toBe(500);
  });
  test("an explicit status (err.status / AppError) is never overridden anywhere", async () => {
    expect((await run(Object.assign(pg("22P02"), { status: 409 }))).statusCode).toBe(409);
    expect((await run(AppError.badRequest("x"))).statusCode).toBe(400);
    expect((await run(AppError.internal("x"))).statusCode).toBe(500);
  });
  test("missing tables/columns and other database faults stay 500", async () => {
    for (const code of ["42P01", "42703", "PGRST205", "23502", "23505", "23503"]) expect((await run(pg(code))).statusCode).toBe(500);
  });
});

describe("16B-4 request-caused conditions raise 4xx from the communications admin service", () => {
  test("AppError classes carry the right status", () => {
    expect(AppError.badRequest("x").statusCode).toBe(400);
    expect(AppError.notFound("x").statusCode).toBe(404);
  });
});

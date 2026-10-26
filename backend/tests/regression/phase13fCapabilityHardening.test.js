// PHASE 13F — unit tests (mocked data layer) for the capability/visibility hardening. EVIDENCE TIER: unit.
// The real database + HTTP behaviour of the same changes is covered by runbooks/phase13f-20261025/http/phase13f_http_lifecycle_matrix.mjs
// and supabase/tests/phase13f_private_seller_lifecycle.sql.
import { describe, test, expect, beforeEach, jest } from "@jest/globals";

process.env.NODE_ENV = "test";

// ---- in-memory PostgREST-shaped builder for private_seller_capabilities + events ----
let rows = new Map();
let eventCount = 0;
let dbError = null;
const builder = (table) => {
  const st = { op: "select", filters: [], inF: null, patch: null, head: false, isNull: null };
  const q = {
    select: (_c, opts) => { if (opts?.head) st.head = true; return q; },
    order: () => q, limit: () => q,
    update: (patch) => { st.op = "update"; st.patch = patch; return q; },
    eq: (k, v) => { st.filters.push([k, v]); return q; },
    in: (k, vs) => { st.inF = [k, vs]; return q; },
    is: (k, v) => { st.isNull = [k, v]; return q; },
    _run() {
      if (dbError && st.op === "update") return { data: null, error: dbError };
      if (table === "private_seller_listing_visibility_events") return { data: null, count: eventCount, error: null };
      const match = () => [...rows.values()].filter((r) => st.filters.every(([k, v]) => r[k] === v) && (!st.inF || st.inF[1].includes(r[st.inF[0]])));
      if (st.op === "update") { const m = match(); m.forEach((r) => Object.assign(r, st.patch)); return { data: m.map((r) => ({ ...r })), error: null }; }
      return { data: match().map((r) => ({ ...r })), error: null };
    },
    maybeSingle: async () => { const r = q._run(); return { data: r.data?.[0] ?? null, error: r.error }; },
    single: async () => { const r = q._run(); return { data: r.data?.[0] ?? null, error: r.error }; },
    then: (a, b) => Promise.resolve(q._run()).then(a, b),
  };
  return q;
};
const sb = { from: jest.fn((t) => builder(t)) };
jest.unstable_mockModule("../../utils/supabase.js", () => ({ isSupabaseConnected: () => true, getSupabase: () => sb }));

const invalidate = jest.fn(async () => {});
jest.unstable_mockModule("../../utils/publicListingCache.js", () => ({ invalidatePublicListingCaches: invalidate, PUBLIC_LISTING_CACHE_PATTERNS: [] }));

const svc = await import("../../services/privateSellerCapability.service.js");
const { requirePublicListing } = await import("../../middleware/publicListingVisibility.js");

const U = "11111111-1111-4111-8111-111111111111";
const ADMIN = "99999999-9999-4999-8999-999999999999";
const seed = (status, extra = {}) => rows.set(U, { user_id: U, status, source: "application", ...extra });
beforeEach(() => { rows = new Map(); eventCount = 0; dbError = null; invalidate.mockReset(); invalidate.mockResolvedValue(undefined); });

describe("decideApplication reports the visibility outcome truthfully", () => {
  test("suspension: changed, strict cache invalidation succeeded, hidden-by-policy count returned", async () => {
    seed("approved"); eventCount = 3;
    const r = await svc.decideApplication({ targetUserId: U, decision: "suspend", reason: "policy", adminId: ADMIN });
    expect(invalidate).toHaveBeenCalledWith({ strict: true });
    expect(r.visibility).toEqual({ changed: true, cacheInvalidated: true, listingsHiddenByPolicy: 3 });
    expect(r).toMatchObject({ before: "approved", after: "suspended" });
  });
  test("a cache failure does NOT undo the committed decision and is reported as cacheInvalidated:false", async () => {
    seed("approved");
    invalidate.mockRejectedValue(new Error("redis down"));
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    const r = await svc.decideApplication({ targetUserId: U, decision: "revoke", reason: "fraud", adminId: ADMIN });
    spy.mockRestore();
    expect(rows.get(U).status).toBe("revoked");
    expect(r.visibility.cacheInvalidated).toBe(false);
    expect(r.visibility.changed).toBe(true);
  });
  test("reinstatement from suspended/revoked flags a visibility change; approve from pending and reject do not touch caches", async () => {
    seed("suspended");
    expect((await svc.decideApplication({ targetUserId: U, decision: "approve", adminId: ADMIN })).visibility.changed).toBe(true);
    expect(invalidate).toHaveBeenCalledTimes(1);
    invalidate.mockClear();
    seed("pending");
    const r = await svc.decideApplication({ targetUserId: U, decision: "approve", adminId: ADMIN });
    expect(r.visibility).toEqual({ changed: false, cacheInvalidated: null, listingsHiddenByPolicy: null });
    seed("pending");
    await svc.decideApplication({ targetUserId: U, decision: "reject", reason: "no", adminId: ADMIN });
    expect(invalidate).not.toHaveBeenCalled();
  });
  test("a database failure propagates (no false success) and leaves the state unchanged", async () => {
    seed("approved"); dbError = { code: "XX000", message: "boom" };
    await expect(svc.decideApplication({ targetUserId: U, decision: "suspend", reason: "r", adminId: ADMIN })).rejects.toMatchObject({ message: "boom" });
    expect(rows.get(U).status).toBe("approved");
    expect(invalidate).not.toHaveBeenCalled();
  });
  test("an already-decided retry is a 409 with no side effects", async () => {
    seed("suspended");
    await expect(svc.decideApplication({ targetUserId: U, decision: "suspend", reason: "again", adminId: ADMIN })).rejects.toMatchObject({ status: 409, code: "INVALID_TRANSITION" });
    expect(invalidate).not.toHaveBeenCalled();
  });
  test("the optimistic guard rejects a decision that raced another administrator", async () => {
    seed("approved");
    const realFrom = sb.from.getMockImplementation();
    let first = true;
    sb.from.mockImplementation((t) => { const b = realFrom(t); if (first && t === "private_seller_capabilities") { first = false; return b; } if (t === "private_seller_capabilities") { rows.get(U).status = "revoked"; } return builder(t); });
    await expect(svc.decideApplication({ targetUserId: U, decision: "suspend", reason: "r", adminId: ADMIN })).rejects.toMatchObject({ status: 409 });
    sb.from.mockImplementation(realFrom);
  });
});

describe("syncLegacyApproval (legacy approve-dealer endpoint)", () => {
  test("pending/rejected rows become approved and record the reviewing administrator", async () => {
    seed("pending");
    expect(await svc.syncLegacyApproval(U, ADMIN)).toEqual({ synced: true, status: "approved" });
    expect(rows.get(U)).toMatchObject({ status: "approved", reviewed_by: ADMIN });
    seed("rejected");
    expect((await svc.syncLegacyApproval(U, ADMIN)).synced).toBe(true);
  });
  test("a suspended/revoked row is NOT reinstated and the caller is told the real status", async () => {
    seed("suspended");
    expect(await svc.syncLegacyApproval(U, ADMIN)).toEqual({ synced: false, status: "suspended" });
    seed("revoked");
    expect(await svc.syncLegacyApproval(U, ADMIN)).toEqual({ synced: false, status: "revoked" });
    expect(rows.get(U).status).toBe("revoked");
  });
  test("no row (legacy seller without a capability row) and already-approved are no-ops", async () => {
    expect(await svc.syncLegacyApproval(U, ADMIN)).toEqual({ synced: false, status: null });
    seed("approved");
    expect(await svc.syncLegacyApproval(U, ADMIN)).toEqual({ synced: false, status: "approved" });
  });
  test("database errors are surfaced instead of silently ignored", async () => {
    seed("pending"); dbError = { code: "XX000", message: "write failed" };
    await expect(svc.syncLegacyApproval(U, ADMIN)).rejects.toMatchObject({ message: "write failed" });
  });
});

describe("requirePublicListing (anonymous by-id listing sub-resources)", () => {
  const CAR = "22222222-2222-4222-8222-222222222222";
  let carRow; let carErr;
  beforeEach(() => {
    carRow = null; carErr = null;
    sb.from.mockImplementation((t) => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: t === "cars" ? carRow : null, error: carErr }) }) }) }));
  });
  const run = (id) => new Promise((resolve) => {
    const res = { status(c) { this.c = c; return this; }, json(b) { resolve({ status: this.c, body: b }); } };
    requirePublicListing({ params: { id } }, res, (e) => resolve({ passed: true, error: e }));
  });
  test.each(["available", "sold"])("%s listing passes", async (st) => { carRow = { id: CAR, status: st, deleted_at: null }; expect((await run(CAR)).passed).toBe(true); });
  test.each(["hidden", "pending", "draft", "reserved"])("%s listing answers 404", async (st) => { carRow = { id: CAR, status: st, deleted_at: null }; expect((await run(CAR)).status).toBe(404); });
  test("soft-deleted, missing and malformed ids answer 404", async () => {
    carRow = { id: CAR, status: "available", deleted_at: "2026-10-01" }; expect((await run(CAR)).status).toBe(404);
    carRow = null; expect((await run(CAR)).status).toBe(404);
    expect((await run("not-a-uuid")).status).toBe(404);
  });
  test("fails closed: a lookup error goes to the error handler, never to the response as public", async () => {
    carErr = { message: "db down" };
    const r = await run(CAR);
    expect(r.passed).toBe(true); expect(r.error).toMatchObject({ message: "db down" });
  });
});

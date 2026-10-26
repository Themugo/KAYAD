// PHASE 13E — private-seller capability (C1): service lifecycle, HTTP routes through the REAL protect/rbac, listing guard, dealer isolation.
// EVIDENCE TIER: mocked local runtime (in-memory table behind the real service; no database).
import { describe, test, expect, beforeAll, afterAll, beforeEach, jest } from "@jest/globals";
import http from "http";
import jwt from "jsonwebtoken";
import express from "express";

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-key-32-chars-minimum-x";
process.env.REQUIRE_EMAIL_VERIFICATION = "false";
process.env.NODE_ENV = "test";

const ID = (n) => `${String(n).repeat(8)}-${String(n).repeat(4)}-4${String(n).repeat(3)}-8${String(n).repeat(3)}-${String(n).repeat(12)}`;
const BUYER = ID(1), BUYER2 = ID(2), UNVERIFIED = ID(3), LEGACY_APPROVED = ID(4), LEGACY_PENDING = ID(5), LEGACY_SUSP = ID(6), DEALER = ID(7), ADMIN = ID(8), SUPPORT = ID(9);
const fx = {
  [BUYER]: { role: "user", status: "approved", emailVerified: true },
  [BUYER2]: { role: "user", status: "approved", emailVerified: true },
  [UNVERIFIED]: { role: "user", status: "approved", emailVerified: false },
  [LEGACY_APPROVED]: { role: "individual_seller", status: "approved", emailVerified: true },
  [LEGACY_PENDING]: { role: "individual_seller", status: "pending", emailVerified: true },
  [LEGACY_SUSP]: { role: "individual_seller", status: "suspended", emailVerified: true },
  [DEALER]: { role: "dealer", status: "approved", emailVerified: true },
  [ADMIN]: { role: "admin", status: "approved", emailVerified: true },
  [SUPPORT]: { role: "support_none", status: "approved", emailVerified: true },
};
const users = {}; Object.entries(fx).forEach(([id, f]) => { users[id] = { _id: id, id, email: `${id.slice(0, 3)}@example.test`, name: id.slice(0, 3), ...f }; });
const chain = (v) => { const q = { select: () => q, lean: () => q, catch: () => q, then: (a, b) => Promise.resolve(v).then(a, b) }; return q; };

// in-memory private_seller_capabilities behind a PostgREST-shaped builder
let table = new Map();
const builder = () => {
  const st = { op: "select", filters: [], inF: null, patch: null, row: null };
  const q = {
    select: () => q, order: () => q, limit: () => q,
    insert: (row) => { st.op = "insert"; st.row = row; return q; },
    update: (patch) => { st.op = "update"; st.patch = patch; return q; },
    eq: (k, v) => { st.filters.push([k, v]); return q; },
    in: (k, vs) => { st.inF = [k, vs]; return q; },
    _run() {
      const match = () => [...table.values()].filter((r) => st.filters.every(([k, v]) => r[k] === v) && (!st.inF || st.inF[1].includes(r[st.inF[0]])));
      if (st.op === "insert") {
        if (table.has(st.row.user_id)) return { data: null, error: { code: "23505", message: "duplicate" } };
        const r = { reviewed_by: null, reviewed_at: null, review_reason: null, ...st.row }; table.set(r.user_id, r); return { data: [r], error: null };
      }
      if (st.op === "update") { const rows = match(); rows.forEach((r) => Object.assign(r, st.patch)); return { data: rows.map((r) => ({ ...r })), error: null }; }
      return { data: match().map((r) => ({ ...r })), error: null };
    },
    maybeSingle: async () => { const r = q._run(); return { data: r.data?.[0] ?? null, error: r.error }; },
    single: async () => { const r = q._run(); return { data: r.data?.[0] ?? null, error: r.error }; },
    then: (a, b) => Promise.resolve(q._run()).then(a, b),
  };
  return q;
};
const noop = () => { const q = new Proxy({}, { get: (_t, p) => (p === "then" ? (a, b) => Promise.resolve({ data: [], error: null }).then(a, b) : p === "single" || p === "maybeSingle" ? async () => ({ data: null, error: null }) : () => q) }); return q; };
const sb = { from: jest.fn((t) => (t === "private_seller_capabilities" ? builder() : noop())), rpc: jest.fn(async () => ({ data: null, error: null })) };

jest.unstable_mockModule("../../models/User.js", () => ({ default: { findById: jest.fn((id) => chain(users[id] || null)), findByIdAndUpdate: jest.fn(() => chain({})), findOne: jest.fn(() => chain(null)), find: jest.fn(() => chain([])), countDocuments: jest.fn(async () => 0) } }));
jest.unstable_mockModule("../../models/UserAuth.js", () => ({ default: { findOne: jest.fn(() => chain({ tokenVersion: 0 })) } }));
jest.unstable_mockModule("../../models/RefreshToken.js", () => ({ default: { findActiveSessionById: jest.fn(async () => ({})) } }));
jest.unstable_mockModule("../../utils/logger.js", () => ({ logInfo: jest.fn(), logWarn: jest.fn(), logError: jest.fn(), default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
jest.unstable_mockModule("../../infrastructure/logging/index.js", () => ({ logInfo: jest.fn(), logWarn: jest.fn(), logError: jest.fn() }));
jest.unstable_mockModule("../../utils/supabase.js", () => ({ isSupabaseConnected: () => true, getSupabase: () => sb }));
const audit = jest.fn(async () => {});
jest.unstable_mockModule("../../utils/securityLogger.js", () => ({ logActionFromReq: audit }));

const svc = await import("../../services/privateSellerCapability.service.js");
const { sellerListingAccess } = await import("../../middleware/sellerCapability.js");
const { dealerBusinessOnly } = await import("../../middleware/dealerIsolation.js");
const { default: routes } = await import("../../routes/privateSellerCapabilityRoutes.js");

const token = (id) => jwt.sign({ id, tokenVersion: 0 }, process.env.JWT_SECRET, { expiresIn: "1h" });
let server, base;
beforeAll(async () => { const app = express(); app.use(express.json()); app.use("/api/private-seller-capability", routes); await new Promise((r) => { server = app.listen(0, "127.0.0.1", r); }); base = `http://127.0.0.1:${server.address().port}`; });
afterAll(() => new Promise((r) => { server.closeAllConnections?.(); server.close(() => r()); }));
beforeEach(() => { table = new Map(); audit.mockClear(); });
const call = (method, path, who, body) => new Promise((resolve) => {
  const u = new URL(base + path); const payload = body ? JSON.stringify(body) : undefined;
  const headers = { "Content-Type": "application/json", ...(who ? { Authorization: `Bearer ${token(who)}` } : {}), ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}) };
  const req = http.request({ host: u.hostname, port: u.port, path: u.pathname + u.search, method, headers, agent: false }, (res) => { let d = ""; res.on("data", (c) => { d += c; }); res.on("end", () => { let j = null; try { j = JSON.parse(d); } catch { /* empty */ } resolve({ status: res.statusCode, json: j }); }); });
  req.on("error", () => resolve({ status: 0, json: null })); if (payload) req.write(payload); req.end();
});
const APPLY = { contactPhone: "+254712345678", intendedUse: "Selling my own car", acceptTerms: true };

describe("Identity & application (same users.id, no second account)", () => {
  test("buyer with no application: status none, canApply true, buyer unaffected", async () => {
    const r = await call("GET", "/api/private-seller-capability/me", BUYER);
    expect(r.status).toBe(200); expect(r.json.data).toMatchObject({ status: "none", canApply: true, canList: false });
  });
  test("buyer applies → pending, keyed to the SAME user id, role/status untouched", async () => {
    const r = await call("POST", "/api/private-seller-capability/apply", BUYER, APPLY);
    expect(r.status).toBe(201); expect(r.json.data.status).toBe("pending");
    expect([...table.keys()]).toEqual([BUYER]);
    expect(users[BUYER]).toMatchObject({ role: "user", status: "approved" });
    expect(audit).toHaveBeenCalledWith(expect.anything(), "private_seller_application_submitted", expect.anything());
  });
  test("duplicate submission → 409, still exactly one row", async () => {
    await call("POST", "/api/private-seller-capability/apply", BUYER, APPLY);
    const r = await call("POST", "/api/private-seller-capability/apply", BUYER, APPLY);
    expect(r.status).toBe(409); expect(r.json.code).toBe("SELLER_APPLICATION_EXISTS"); expect(table.size).toBe(1);
  });
  test("server-side validation: bad phone, missing terms, unverified email, anonymous, dealer, legacy seller", async () => {
    expect((await call("POST", "/api/private-seller-capability/apply", BUYER, { ...APPLY, contactPhone: "abc" })).status).toBe(400);
    expect((await call("POST", "/api/private-seller-capability/apply", BUYER, { ...APPLY, acceptTerms: false })).status).toBe(400);
    expect((await call("POST", "/api/private-seller-capability/apply", UNVERIFIED, APPLY)).status).toBe(403);
    expect((await call("POST", "/api/private-seller-capability/apply", null, APPLY)).status).toBe(401);
    expect((await call("POST", "/api/private-seller-capability/apply", DEALER, APPLY)).json.code).toBe("SELLER_APPLICATION_NOT_ALLOWED");
    expect((await call("POST", "/api/private-seller-capability/apply", LEGACY_APPROVED, APPLY)).json.code).toBe("SELLER_APPLICATION_NOT_ALLOWED");
    expect(table.size).toBe(0);
  });
  test("pending applicant keeps buyer identity; reject → may re-apply (back to pending)", async () => {
    await call("POST", "/api/private-seller-capability/apply", BUYER, APPLY);
    await call("PATCH", `/api/private-seller-capability/admin/${BUYER}/decision`, ADMIN, { decision: "reject", reason: "documents unclear" });
    expect((await call("GET", "/api/private-seller-capability/me", BUYER)).json.data).toMatchObject({ status: "rejected", canApply: true });
    expect((await call("POST", "/api/private-seller-capability/apply", BUYER, APPLY)).json.data.status).toBe("pending");
  });
});

describe("Review lifecycle (authorized, validated, audited)", () => {
  beforeEach(async () => { await call("POST", "/api/private-seller-capability/apply", BUYER, APPLY); audit.mockClear(); });
  const decide = (who, body, id = BUYER) => call("PATCH", `/api/private-seller-capability/admin/${id}/decision`, who, body);
  test("buyers, sellers, dealers and anonymous cannot decide or list", async () => {
    for (const who of [BUYER, BUYER2, LEGACY_APPROVED, DEALER]) {
      expect((await decide(who, { decision: "approve" })).status).toBe(403);
      expect((await call("GET", "/api/private-seller-capability/admin/applications", who)).status).toBe(403);
    }
    expect((await decide(null, { decision: "approve" })).status).toBe(401);
    expect(table.get(BUYER).status).toBe("pending");
  });
  test("a user cannot approve their own application", async () => { expect((await decide(BUYER, { decision: "approve" })).status).toBe(403); expect(table.get(BUYER).status).toBe("pending"); });
  test("admin approves → approved, reviewer recorded, audited; buyer account untouched", async () => {
    const r = await decide(ADMIN, { decision: "approve" });
    expect(r.status).toBe(200); expect(r.json.data).toMatchObject({ before: "pending", after: "approved" });
    expect(table.get(BUYER)).toMatchObject({ status: "approved", reviewed_by: ADMIN });
    expect(audit).toHaveBeenCalledWith(expect.anything(), "private_seller_approve", expect.objectContaining({ target: BUYER }));
    expect(users[BUYER]).toMatchObject({ role: "user", status: "approved" });
  });
  test("reject/suspend/revoke need a reason; invalid transitions are 409", async () => {
    expect((await decide(ADMIN, { decision: "reject" })).json.code).toBe("REASON_REQUIRED");
    expect((await decide(ADMIN, { decision: "suspend", reason: "x" })).json.code).toBe("INVALID_TRANSITION"); // pending cannot be suspended
    await decide(ADMIN, { decision: "approve" });
    expect((await decide(ADMIN, { decision: "suspend", reason: "policy breach" })).json.data.after).toBe("suspended");
    expect((await decide(ADMIN, { decision: "approve" })).json.data.after).toBe("approved"); // reinstated
    expect((await decide(ADMIN, { decision: "revoke", reason: "fraud" })).json.data.after).toBe("revoked");
    expect((await decide(ADMIN, { decision: "reject", reason: "late" })).json.code).toBe("INVALID_TRANSITION");
  });
  test("unknown decision / malformed id / no application", async () => {
    expect((await decide(ADMIN, { decision: "promote" })).status).toBe(400);
    expect((await decide(ADMIN, { decision: "approve" }, "not-a-uuid")).status).toBe(400);
    expect((await decide(ADMIN, { decision: "approve" }, BUYER2)).json.code).toBe("SELLER_APPLICATION_NOT_FOUND");
  });
  test("admin list returns applications", async () => {
    const r = await call("GET", "/api/private-seller-capability/admin/applications?status=pending", ADMIN);
    expect(r.status).toBe(200); expect(r.json.data.map((a) => a.userId)).toEqual([BUYER]);
  });
  test("legacy admin approval synchronization updates only an existing pending/rejected capability row", async () => {
    table.set(BUYER, { user_id: BUYER, status: "pending", source: "application", reviewed_at: null });
    await svc.syncLegacyApproval(BUYER);
    expect(table.get(BUYER).status).toBe("approved");
    expect(table.get(BUYER).reviewed_at).toBeTruthy();
    table.set(BUYER2, { user_id: BUYER2, status: "suspended", source: "application" });
    await svc.syncLegacyApproval(BUYER2);
    expect(table.get(BUYER2).status).toBe("suspended");
  });
});

describe("Listing guard (sellerListingAccess): capability enforced at the backend", () => {
  const run = (user, opts) => new Promise((resolve) => {
    const req = { user: { ...user, id: user.id || user._id } };
    const res = { status(c) { this.c = c; return this; }, json(b) { resolve({ status: this.c, body: b, req }); } };
    sellerListingAccess(opts)(req, res, (e) => resolve({ passed: true, error: e, req }));
  });
  const seed = (id, status) => table.set(id, { user_id: id, status, source: "application" });
  test.each([["none", null, false], ["pending", "pending", false], ["rejected", "rejected", false], ["suspended", "suspended", false], ["revoked", "revoked", false]])("buyer (%s) cannot write listings (direct API)", async (_n, st) => {
    if (st) seed(BUYER, st);
    const r = await run(users[BUYER], { write: true });
    expect(r.passed).toBeUndefined(); expect(r.status).toBe(403); expect(r.body.code).toBe("SELLER_CAPABILITY_REQUIRED");
  });
  test("approved buyer-account seller may write; req.sellerCapability is set; no dealer privilege", async () => {
    seed(BUYER, "approved");
    const r = await run(users[BUYER], { write: true });
    expect(r.passed).toBe(true); expect(r.req.sellerCapability.status).toBe("approved");
    const dealerGuard = await new Promise((resolve) => { const res = { status(c) { this.c = c; return this; }, json() { resolve(this.c); } }; dealerBusinessOnly({ user: users[BUYER] }, res, () => resolve("passed")); });
    expect(dealerGuard).toBe(403);
  });
  test("unverified email cannot sell even when approved", async () => { seed(UNVERIFIED, "approved"); expect((await run(users[UNVERIFIED], { write: true })).status).toBe(403); });
  test("seller views (write:false) stay available for every application state, but not for plain buyers", async () => {
    expect((await run(users[BUYER], { write: false })).status).toBe(403);
    for (const st of ["pending", "rejected", "suspended", "revoked", "approved"]) { seed(BUYER, st); expect((await run(users[BUYER], { write: false })).passed).toBe(true); }
  });
  test("suspension/revocation blocks seller writes only; buyer reads of the account are not this guard's concern", async () => {
    seed(BUYER, "suspended"); expect((await run(users[BUYER], { write: true })).status).toBe(403);
    seed(BUYER, "revoked"); expect((await run(users[BUYER], { write: true })).status).toBe(403);
  });
  test("legacy individual_seller: approved and pending keep working; suspended/rejected/revoked are now blocked (DI-5)", async () => {
    expect((await run(users[LEGACY_APPROVED], { write: true })).passed).toBe(true);
    expect((await run(users[LEGACY_PENDING], { write: true })).passed).toBe(true);
    const s = await run(users[LEGACY_SUSP], { write: true }); expect(s.status).toBe(403); expect(s.body.code).toBe("SELLER_CAPABILITY_BLOCKED");
    expect((await run(users[LEGACY_SUSP], { write: false })).passed).toBe(true);
    table.set(LEGACY_APPROVED, { user_id: LEGACY_APPROVED, status: "revoked", source: "legacy_backfill" });
    expect((await run(users[LEGACY_APPROVED], { write: true })).status).toBe(403); // the capability row is authoritative once present
  });
  test("dealers and staff keep dealerOnly behaviour", async () => {
    expect((await run(users[DEALER], { write: true })).passed).toBe(true);
    expect((await run(users[ADMIN], { write: true })).passed).toBe(true);
    expect((await run({ ...users[SUPPORT], role: "buyer_x" }, { write: true })).status).toBe(403);
  });
  test("a seller capability never lets one user act on another's capability (state is per users.id)", async () => {
    seed(BUYER, "approved");
    expect((await run(users[BUYER2], { write: true })).status).toBe(403);
  });
});

describe("Legacy compatibility", () => {
  test("resolveSellerState: legacy seller without a row falls back to users.status; buyer none; dealer/staff not_applicable", async () => {
    expect((await svc.resolveSellerState(users[LEGACY_APPROVED])).status).toBe("approved");
    expect((await svc.resolveSellerState(users[LEGACY_PENDING])).status).toBe("pending");
    expect((await svc.resolveSellerState(users[LEGACY_SUSP])).status).toBe("suspended");
    expect((await svc.resolveSellerState(users[BUYER])).status).toBe("none");
    expect((await svc.resolveSellerState(users[DEALER])).status).toBe("not_applicable");
    expect((await svc.resolveSellerState(users[ADMIN])).status).toBe("not_applicable");
  });
  test("syncLegacyApproval moves only pending/rejected rows to approved", async () => {
    table.set(LEGACY_PENDING, { user_id: LEGACY_PENDING, status: "pending", source: "legacy_backfill" });
    table.set(LEGACY_SUSP, { user_id: LEGACY_SUSP, status: "suspended", source: "legacy_backfill" });
    await svc.syncLegacyApproval(LEGACY_PENDING); await svc.syncLegacyApproval(LEGACY_SUSP);
    expect(table.get(LEGACY_PENDING).status).toBe("approved"); expect(table.get(LEGACY_SUSP).status).toBe("suspended");
  });
});

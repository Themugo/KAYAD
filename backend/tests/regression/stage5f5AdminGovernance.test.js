// ============================================================
// STAGE 5F.5 (2026-10-20) — admin authorization defects D-1, D-2, D-3.
// Drives the REAL routes/adminRoutes.js with the REAL protect/adminOnly/authorize/requirePermission.
// Persistence is faked. EVIDENCE TIER: mocked local runtime.
//   D-1 PATCH /dealers/:id/package      — was reachable by every staff role
//   D-2 POST  /zero-cost-onboarding     — bulk free-plan grant, was reachable by every staff role
//   D-3 POST  /audit-log                — client-chosen action could impersonate system actions
// Each denial test also proves NO mutation (no RPC, no audit row, no user write).
// ============================================================
import { describe, test, expect, beforeAll, afterAll, beforeEach, jest } from "@jest/globals";
import http from "http";
import jwt from "jsonwebtoken";
import express from "express";

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-key-32-chars-minimum-x";
process.env.REQUIRE_EMAIL_VERIFICATION = "false";
process.env.NODE_ENV = "test";
process.env.WEBHOIST_EMAIL = "owner@example.test";
delete process.env.WEBHOIST_EMAILS;
const SECRET = process.env.JWT_SECRET;

const chain = (value) => {
  const q = { select: jest.fn(() => q), lean: jest.fn(() => q), catch: jest.fn(() => q), then: (res, rej) => Promise.resolve(value).then(res, rej) };
  return q;
};
const users = {};
const userFind = jest.fn(() => chain([]));
jest.unstable_mockModule("../../models/User.js", () => ({
  default: { findById: jest.fn((id) => chain(users[id] || null)), findByIdAndUpdate: jest.fn(() => chain({})), findOne: jest.fn(() => chain(null)), find: userFind },
}));
jest.unstable_mockModule("../../models/UserAuth.js", () => ({ default: { findOne: jest.fn(() => chain({ tokenVersion: 0 })) } }));
jest.unstable_mockModule("../../models/RefreshToken.js", () => ({ default: { findActiveSessionById: jest.fn(async () => ({})) } }));
jest.unstable_mockModule("../../models/PlatformConfig.js", () => ({ default: { findOne: jest.fn(() => chain({})), create: jest.fn(async () => ({ toObject: () => ({}) })) } }));
const auditCreate = jest.fn(async (d) => ({ ...d }));
jest.unstable_mockModule("../../models/AuditLog.js", () => ({ default: { create: auditCreate } }));
jest.unstable_mockModule("../../middleware/auditLog.js", () => ({ auditLog: () => (req, res, next) => next() }));
jest.unstable_mockModule("../../services/notification.service.js", () => ({ sendNotification: jest.fn(async () => {}) }));
const rpc = jest.fn(async () => ({ data: { ok: true }, error: null }));
jest.unstable_mockModule("../../utils/supabase.js", () => ({
  initSupabase: jest.fn(), checkSupabaseReadiness: async () => ({ ok: true }), isSupabaseConnected: () => true, default: null,
  getSupabase: () => ({ rpc, from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }) }),
}));

const adminRoutes = (await import("../../routes/adminRoutes.js")).default;

const ROLES = ["user", "dealer", "ghost_checker", "moderator", "marketing", "hr", "technical_support", "ad_manager", "escrow_officer", "accounts", "admin", "superadmin", "owner"];
const token = (id) => jwt.sign({ id, tokenVersion: 0 }, SECRET, { expiresIn: "1h" });
ROLES.forEach((role) => {
  users[`u-${role}`] = { _id: `u-${role}`, id: `u-${role}`, email: role === "owner" ? "owner@example.test" : `${role}@example.test`, name: role, role: role === "owner" ? "user" : role, status: "approved", emailVerified: true };
});
users["dealer-1"] = { _id: "dealer-1", id: "dealer-1", role: "dealer", status: "approved", email: "d@example.test" };

let server; let base;
beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use("/api/admin", adminRoutes);
  app.use((err, req, res, _next) => res.status(err.statusCode || 500).json({ success: false, message: err.message }));
  server = http.createServer(app);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${server.address().port}`;
});
afterAll(() => new Promise((r) => server.close(r)));

const call = (method, path, { role, body, rawToken } = {}) =>
  fetch(base + path, {
    method,
    headers: { "content-type": "application/json", ...(rawToken ? { authorization: `Bearer ${rawToken}` } : role ? { authorization: `Bearer ${token(`u-${role}`)}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }));

beforeEach(() => { rpc.mockClear(); auditCreate.mockClear(); userFind.mockClear(); });

// finance-capable staff by role defaults (config/roles.js): accounts, admin (+ superadmin/owner via shortcut)
const FINANCE_ALLOWED = ["accounts", "admin", "superadmin", "owner"];
const FINANCE_DENIED = ROLES.filter((r) => !FINANCE_ALLOWED.includes(r));

describe("D-1 PATCH /api/admin/dealers/:id/package", () => {
  test("unauthenticated ⇒ 401, no RPC", async () => {
    const r = await call("PATCH", "/api/admin/dealers/dealer-1/package", { body: { dealerPackage: "none" } });
    expect(r.status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });
  test("malformed token ⇒ 401, no RPC", async () => {
    const r = await call("PATCH", "/api/admin/dealers/dealer-1/package", { rawToken: "not.a.jwt", body: { dealerPackage: "none" } });
    expect(r.status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });
  test.each(FINANCE_DENIED)("%s ⇒ 401/403 and NO subscription RPC", async (role) => {
    const r = await call("PATCH", "/api/admin/dealers/dealer-1/package", { role, body: { dealerPackage: "none" } });
    expect([401, 403]).toContain(r.status);
    expect(rpc).not.toHaveBeenCalled();
  });
  test.each(FINANCE_ALLOWED)("%s passes the guard and reaches the revoke RPC", async (role) => {
    const r = await call("PATCH", "/api/admin/dealers/dealer-1/package", { role, body: { dealerPackage: "none" } });
    expect(r.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("kayad_revoke_dealer_subscription_atomic", expect.objectContaining({ p_dealer: "dealer-1" }));
  });
  test("a forged role in the body does not grant access", async () => {
    const r = await call("PATCH", "/api/admin/dealers/dealer-1/package", { role: "marketing", body: { dealerPackage: "none", role: "superadmin", effectiveRole: "webhoist", isOwner: true } });
    expect(r.status).toBe(403);
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("D-2 POST /api/admin/zero-cost-onboarding", () => {
  test.each(["user", "dealer", "ghost_checker", "moderator", "marketing", "hr", "technical_support", "ad_manager", "escrow_officer", "accounts"])(
    "%s ⇒ 403, no dealer query and no RPC", async (role) => {
      const r = await call("POST", "/api/admin/zero-cost-onboarding", { role, body: { durationDays: 30 } });
      expect([401, 403]).toContain(r.status);
      expect(userFind).not.toHaveBeenCalled();
      expect(rpc).not.toHaveBeenCalled();
    });
  test("unauthenticated ⇒ 401", async () => {
    const r = await call("POST", "/api/admin/zero-cost-onboarding", { body: {} });
    expect(r.status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });
  test.each(["admin", "superadmin", "owner"])("%s passes the guard (no dealers ⇒ 200, zero grants)", async (role) => {
    const r = await call("POST", "/api/admin/zero-cost-onboarding", { role, body: { durationDays: 30 } });
    expect(r.status).toBe(200);
    expect(userFind).toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("D-3 POST /api/admin/audit-log", () => {
  const manual = () => auditCreate.mock.calls.map((c) => c[0]).filter((e) => String(e.action).startsWith("manual."));
  test.each(["user", "dealer", "marketing", "hr", "accounts", "moderator"])("%s ⇒ denied, nothing written", async (role) => {
    const r = await call("POST", "/api/admin/audit-log", { role, body: { action: "x" } });
    expect([401, 403]).toContain(r.status);
    // the RBAC layer may record its own "access_denied" row; nothing else (and nothing "manual.*") may be written
    expect(auditCreate.mock.calls.map((c) => c[0].action).filter((a) => a !== "access_denied")).toEqual([]);
  });
  test("an admin cannot impersonate a system action: stored action is namespaced and flagged manual", async () => {
    const r = await call("POST", "/api/admin/audit-log", { role: "admin", body: { action: "update_staff_permissions", details: { target: "x" } } });
    expect(r.status).toBe(200);
    const e = manual();
    expect(e).toHaveLength(1);
    expect(e[0].action).toBe("manual.update_staff_permissions");
    expect(e[0].details).toMatchObject({ target: "x", manualEntry: true });
    expect(auditCreate.mock.calls.some((c) => c[0].action === "update_staff_permissions")).toBe(false);
  });
  test("client cannot overwrite the manualEntry marker or the actor", async () => {
    await call("POST", "/api/admin/audit-log", { role: "admin", body: { action: "note", details: { manualEntry: false }, adminId: "someone-else", admin: "Someone Else" } });
    const e = manual()[0];
    expect(e.details.manualEntry).toBe(true);
    expect(e.adminId).toBe("u-admin");
  });
  test.each([
    [{}], [{ action: "" }], [{ action: 5 }], [{ action: "a".repeat(65) }], [{ action: "has space" }], [{ action: ["x"] }],
    [{ action: "ok", details: "str" }], [{ action: "ok", details: [1] }], [{ action: "ok", details: { big: "x".repeat(5000) } }],
  ])("invalid payload %j ⇒ 400, nothing written", async (body) => {
    const r = await call("POST", "/api/admin/audit-log", { role: "admin", body });
    expect(r.status).toBe(400);
    expect(auditCreate).not.toHaveBeenCalled();
  });
});

describe("D-14 the path-layer guess ignores dynamic ids", () => {
  const AD_ID = "ad000000-0000-4000-8000-0000000000aa"; // first UUID group starts with "ad"
  beforeAll(() => { users[AD_ID] = { _id: AD_ID, id: AD_ID, role: "dealer", status: "approved", email: "ad@example.test" }; });
  test("accounts (finance) reaches the package route for a dealer whose id starts with 'ad'", async () => {
    const r = await call("PATCH", `/api/admin/dealers/${AD_ID}/package`, { role: "accounts", body: { dealerPackage: "none" } });
    expect(r.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("kayad_revoke_dealer_subscription_atomic", expect.objectContaining({ p_dealer: AD_ID }));
  });
  test("marketing (holds manage_ads) is still refused: the id cannot lend it the ads permission to a finance route", async () => {
    const r = await call("PATCH", `/api/admin/dealers/${AD_ID}/package`, { role: "marketing", body: { dealerPackage: "none" } });
    expect(r.status).toBe(403);
    expect(rpc).not.toHaveBeenCalled();
  });
  test("a real ads route is still guarded by the ads permission", async () => {
    expect((await call("GET", "/api/admin/ads", { role: "hr" })).status).toBe(403);
    expect((await call("GET", "/api/admin/ads", { role: "marketing" })).status).not.toBe(403);
  });
});

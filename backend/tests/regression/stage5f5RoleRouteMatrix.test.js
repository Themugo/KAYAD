// ============================================================
// STAGE 5F.5 (2026-10-20) — ROLE × ROUTE authorization matrix over the REAL admin router.
// REAL routes/adminRoutes.js with REAL protect/adminOnly/authorize/requirePermission; persistence faked.
// EVIDENCE TIER: mocked local runtime.
// Expectations are HAND-AUTHORED from the intended role catalogue (config/roles.js role defaults), not derived from the guards.
// 'allowed' = the request got past authentication+authorization (any status other than 401/403, incl. 404/500 from the fake data layer);
// 'denied' must be exactly 403 (or 401 when unauthenticated).
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
const d2 = describe;
const ALL = ["user", "dealer", "ghost_checker", "moderator", "marketing", "hr", "technical_support", "ad_manager", "escrow_officer", "accounts", "admin", "superadmin", "owner"];
const STAFF = ["ghost_checker", "moderator", "marketing", "hr", "technical_support", "ad_manager", "escrow_officer", "accounts", "admin"];
const token = (id) => jwt.sign({ id, tokenVersion: 0 }, SECRET, { expiresIn: "1h" });
ALL.forEach((role) => {
  users[`u-${role}`] = { _id: `u-${role}`, id: `u-${role}`, email: role === "owner" ? "owner@example.test" : `${role}@example.test`, name: role, role: role === "owner" ? "user" : role, status: "approved", emailVerified: true };
});
const U = "00000000-0000-4000-8000-000000000001";
users[U] = { _id: U, id: U, role: "dealer", status: "approved", email: "dealer@example.test" };

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
const call = (method, path, role) => fetch(base + path, { method, headers: { "content-type": "application/json", ...(role ? { authorization: `Bearer ${token(`u-${role}`)}` } : {}) }, body: method === "GET" ? undefined : "{}" }).then((r) => r.status);

// [method, path, roles allowed IN ADDITION to the two platform-owner-capable identities (superadmin, owner)]
const MATRIX = [
  ["GET", "/api/admin/payments", ["accounts", "admin"]],
  ["GET", "/api/admin/escrow/config", ["admin"]],
  ["GET", "/api/admin/cars", ["admin"]],
  ["GET", "/api/admin/users", ["admin", "hr", "technical_support"]],
  ["GET", "/api/admin/ads", ["admin", "marketing", "ad_manager"]],
  ["GET", "/api/admin/audit-log", ["admin", "moderator", "escrow_officer", "technical_support", "accounts"]],
  ["GET", "/api/admin/config", ["admin"]],
  ["GET", "/api/admin/chats", ["admin", "technical_support", "moderator"]],
  ["GET", "/api/admin/market-data", ["admin", "marketing", "ad_manager", "accounts"]],
  ["GET", "/api/admin/staff", []],
  ["POST", `/api/admin/users/${U}/toggle-ban`, ["admin"]],
  ["PATCH", `/api/admin/dealers/${U}/package`, ["accounts", "admin"]],
  ["POST", "/api/admin/zero-cost-onboarding", ["admin"]],
  ["POST", "/api/admin/audit-log", ["admin"]],
  ["PUT", "/api/admin/config", ["admin"]],
  // Any staff role (documented read-only aggregates / operational feeds — see report OD-5):
  ["GET", "/api/admin/stats", STAFF],
  ["GET", "/api/admin/alerts", STAFF],
  ["GET", "/api/admin/system/health", STAFF],
  // staffRole list excludes ghost_checker by design:
  ["GET", "/api/admin/reviews", STAFF.filter((r) => r !== "ghost_checker")],
  // superadmin-class but NOT owner-only today (documented, OD-1):
  ["POST", "/api/admin/system/kill-switch", []],
];
const OWNERISH = ["superadmin", "owner"];
const SUPERADMIN_LOCAL = new Set(["/api/admin/system/kill-switch", "/api/admin/staff"]);

for (const [method, path, extra] of MATRIX) {
  d2(`${method} ${path.replace(U, ":id")}`, () => {
    const allowed = new Set([...extra, ...(path.endsWith("/staff") ? ["owner"] : OWNERISH)]);
    test.each(ALL)("%s", async (role) => {
      const s = await call(method, path, role);
      if (allowed.has(role)) expect([401, 403]).not.toContain(s);
      else expect(s).toBe(403);
    });
    test("unauthenticated ⇒ 401", async () => { expect(await call(method, path, null)).toBe(401); });
  });
}

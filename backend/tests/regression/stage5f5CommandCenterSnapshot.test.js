// STAGE 5F.5 (D-7) — Command Centre snapshot: exact counts, truthful unavailability, role gate over the REAL router.
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

const chain = (value) => { const q = { select: jest.fn(() => q), lean: jest.fn(() => q), catch: jest.fn(() => q), then: (res, rej) => Promise.resolve(value).then(res, rej) }; return q; };
const users = {};
jest.unstable_mockModule("../../models/User.js", () => ({ default: { findById: jest.fn((id) => chain(users[id] || null)), findOne: jest.fn(() => chain(null)), findByIdAndUpdate: jest.fn(() => chain({})) } }));
jest.unstable_mockModule("../../models/UserAuth.js", () => ({ default: { findOne: jest.fn(() => chain({ tokenVersion: 0 })) } }));
jest.unstable_mockModule("../../models/RefreshToken.js", () => ({ default: { findActiveSessionById: jest.fn(async () => ({})) } }));

// fake exact-count store: key = table|json(filters)
let counts; let failing;
const countFn = jest.fn(async (table, filters = {}) => {
  if (failing.has(table)) throw new Error(`relation ${table} does not exist`);
  const key = `${table}|${JSON.stringify(filters)}`;
  if (key in counts) return counts[key];
  return counts[`${table}|*`] ?? 0;
});
jest.unstable_mockModule("../../db/index.js", () => ({ count: countFn, findAll: jest.fn(async () => []), findById: jest.fn(), create: jest.fn(), update: jest.fn() }));
jest.unstable_mockModule("../../services/auditService.js", () => ({ logAuditEvent: jest.fn(async () => {}) }));
jest.unstable_mockModule("../../utils/supabase.js", () => ({
  initSupabase: jest.fn(), checkSupabaseReadiness: async () => ({ ok: true }), isSupabaseConnected: () => true, default: null,
  getSupabase: () => ({ rpc: jest.fn(), from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }) }),
}));
jest.unstable_mockModule("../../utils/io.js", () => ({ getIO: () => null }));

const router = (await import("../../routes/commandCenterRoutes.js")).default;
const ROLES = ["user", "dealer", "ghost_checker", "moderator", "marketing", "hr", "technical_support", "accounts", "admin", "superadmin", "owner"];
ROLES.forEach((role) => { users[`u-${role}`] = { _id: `u-${role}`, id: `u-${role}`, email: role === "owner" ? "owner@example.test" : `${role}@example.test`, name: role, role: role === "owner" ? "user" : role, status: "approved", emailVerified: true }; });
const token = (id) => jwt.sign({ id, tokenVersion: 0 }, SECRET, { expiresIn: "1h" });
let server; let base;
beforeAll(async () => {
  const app = express(); app.use(express.json()); app.use("/api/command-center", router);
  app.use((err, req, res, _n) => res.status(err.status || err.statusCode || 500).json({ success: false, message: err.message }));
  server = http.createServer(app); await new Promise((r) => server.listen(0, "127.0.0.1", r)); base = `http://127.0.0.1:${server.address().port}`;
});
afterAll(() => new Promise((r) => server.close(r)));
beforeEach(() => { counts = {}; failing = new Set(); countFn.mockClear(); });
const snap = (role) => fetch(`${base}/api/command-center/snapshot`, { headers: role ? { authorization: `Bearer ${token(`u-${role}`)}` } : {} }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }));

describe("access", () => {
  test.each(["user", "dealer", "ghost_checker", "moderator", "marketing", "hr", "technical_support", "accounts"])("%s ⇒ 403 and no database read", async (role) => {
    expect((await snap(role)).status).toBe(403);
    expect(countFn).not.toHaveBeenCalled();
  });
  test("unauthenticated ⇒ 401", async () => { expect((await snap(null)).status).toBe(401); });
  test.each(["admin", "superadmin", "owner"])("%s ⇒ 200", async (role) => { expect((await snap(role)).status).toBe(200); });
});

describe("truthful figures", () => {
  test("queues larger than 1000 are reported exactly (no sample cap)", async () => {
    counts['payments|{"status":"pending"}'] = 4321;
    counts['users|{"role":"dealer","status":"pending"}'] = 1507;
    const { body } = await snap("admin");
    expect(body.data.queues.pendingPayments).toBe(4321);
    expect(body.data.queues.pendingDealers).toBe(1507);
  });
  test("zero is reported as zero, an unreadable table as null and is named in `unavailable`", async () => {
    failing.add("support_tickets"); failing.add("incidents");
    const { status, body } = await snap("admin");
    expect(status).toBe(200);
    expect(body.data.queues.disputedEscrows).toBe(0);
    expect(body.data.queues.openSupport).toBeNull();
    expect(body.data.queues.openIncidents).toBeNull();
    expect(body.data.counts.incidents).toBeNull();
    expect(body.data.unavailable.sort()).toEqual(["incidents", "openIncidents", "openSupport"]);
  });
  test("every table failing still answers 200 with all-null figures (never fabricated zeros)", async () => {
    ["users", "cars", "payments", "escrows", "dealers", "vehicle_inspections", "incidents", "alerts", "support_tickets"].forEach((t) => failing.add(t));
    const { status, body } = await snap("admin");
    expect(status).toBe(200);
    expect([...Object.values(body.data.counts), ...Object.values(body.data.queues)].every((v) => v === null)).toBe(true);
  });
  test("the operator queues exist and use the same definitions as the destination pages", async () => {
    await snap("admin");
    const calls = countFn.mock.calls.map(([t, f]) => `${t}|${JSON.stringify(f)}`);
    expect(calls).toEqual(expect.arrayContaining([
      'users|{"role":"dealer","status":"pending"}',                // → Users page, pending approval
      'cars|{"status":"pending","deletedAt":null}',                // → Cars page, pending review
      'support_tickets|{"status":{"$in":["open","pending","in_progress"]}}', // → Support
    ]));
  });
  test("response never contains row data or identifiers", async () => {
    const { body } = await snap("admin");
    expect(Object.keys(body.data).sort()).toEqual(["counts", "generatedAt", "queues", "unavailable"]);
  });
});

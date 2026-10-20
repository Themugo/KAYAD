// STAGE 5F.5 (D-8 / D-9) — GET /api/admin/stats degrades per metric instead of blanking every tile, and the
// pending-dealer queue link lists exactly the rows its tile counts. REAL router + middleware; data layer faked.
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

const chain = (value) => { const q = { select: jest.fn(() => q), sort: jest.fn(() => q), skip: jest.fn(() => q), limit: jest.fn(() => q), populate: jest.fn(() => q), lean: jest.fn(() => q), catch: jest.fn(() => q), then: (res, rej) => Promise.resolve(value).then(res, rej) }; return q; };
const users = {};
let userCounts; let broken; const userFilters = [];
const countFor = (name) => jest.fn(async (filter) => { if (broken.has(name)) throw new Error(`${name} unavailable`); const k = `${name}|${JSON.stringify(filter ?? {})}`; return k in userCounts ? userCounts[k] : (userCounts[`${name}|*`] ?? 0); });
const UserM = { findById: jest.fn((id) => chain(users[id] || null)), findOne: jest.fn(() => chain(null)), findByIdAndUpdate: jest.fn(() => chain({})), countDocuments: countFor("User"), find: jest.fn((f) => { userFilters.push(f); return chain([]); }) };
jest.unstable_mockModule("../../models/User.js", () => ({ default: UserM }));
jest.unstable_mockModule("../../models/UserAuth.js", () => ({ default: { findOne: jest.fn(() => chain({ tokenVersion: 0 })) } }));
jest.unstable_mockModule("../../models/RefreshToken.js", () => ({ default: { findActiveSessionById: jest.fn(async () => ({})) } }));
jest.unstable_mockModule("../../models/PlatformConfig.js", () => ({ default: { findOne: jest.fn(() => chain({})) } }));
jest.unstable_mockModule("../../models/AuditLog.js", () => ({ default: { create: jest.fn(async () => ({})) } }));
jest.unstable_mockModule("../../middleware/auditLog.js", () => ({ auditLog: () => (req, res, next) => next() }));
jest.unstable_mockModule("../../services/notification.service.js", () => ({ sendNotification: jest.fn(async () => {}) }));
jest.unstable_mockModule("../../utils/cache.js", () => ({ cacheMiddleware: () => (req, res, next) => next(), CACHE_TTL: { STATS: 1 }, cacheDelPattern: jest.fn(), cacheGet: jest.fn(), cacheSet: jest.fn() }));
for (const [file, name] of [["Car", "Car"], ["Escrow", "Escrow"], ["Bid", "Bid"], ["Payment", "Payment"], ["AdminAlert", "AdminAlert"], ["SupportTicket", "SupportTicket"], ["FraudDetection", "FraudDetection"], ["DealerVerification", "DealerVerification"]]) {
  jest.unstable_mockModule(`../../models/${file}.js`, () => ({ default: { countDocuments: countFor(name), aggregate: jest.fn(async () => { if (broken.has(`${name}.aggregate`)) throw new Error("agg"); return [{ total: 77 }]; }), find: jest.fn(() => chain([])) } }));
}
jest.unstable_mockModule("../../services/review.service.js", () => ({ listAdminReviews: jest.fn(async () => { if (broken.has("reviews")) throw new Error("reviews"); return { total: 3 }; }), moderateReview: jest.fn(), deleteReview: jest.fn() }));
jest.unstable_mockModule("../../utils/supabase.js", () => ({ initSupabase: jest.fn(), checkSupabaseReadiness: async () => ({ ok: true }), isSupabaseConnected: () => true, default: null, getSupabase: () => ({ rpc: jest.fn(), from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }) }) }));

const adminRoutes = (await import("../../routes/adminRoutes.js")).default;
const ID = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const roles = { admin: ID(3), marketing: ID(4) };
users[roles.admin] = { _id: roles.admin, id: roles.admin, email: "admin@example.test", role: "admin", name: "a", status: "approved", emailVerified: true };
users[roles.marketing] = { _id: roles.marketing, id: roles.marketing, email: "m@example.test", role: "marketing", name: "m", status: "approved", emailVerified: true };
const token = (id) => jwt.sign({ id, tokenVersion: 0 }, SECRET, { expiresIn: "1h" });
let server; let base;
beforeAll(async () => { const app = express(); app.use(express.json()); app.use("/api/admin", adminRoutes); app.use((e, q, r, _n) => r.status(e.statusCode || 500).json({ success: false, message: e.message })); server = http.createServer(app); await new Promise((r) => server.listen(0, "127.0.0.1", r)); base = `http://127.0.0.1:${server.address().port}`; });
afterAll(() => new Promise((r) => server.close(r)));
beforeEach(() => { userCounts = {}; broken = new Set(); userFilters.length = 0; });
const get = (path, who = "admin") => fetch(base + path, { headers: { authorization: `Bearer ${token(roles[who])}` } }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }));

describe("D-8 /stats", () => {
  test("all sources healthy ⇒ numbers, empty unavailable list, real zeros preserved", async () => {
    userCounts['User|{"role":"dealer","status":"pending"}'] = 0;
    const { status, body } = await get("/api/admin/stats");
    expect(status).toBe(200);
    expect(body.unavailable).toEqual([]);
    expect(body.stats.pendingDealers).toBe(0);
    expect(body.stats.totalRevenue).toBe(77);
  });
  test("one unreadable source (SupportTicket, as on the hosted DB) no longer blanks the other tiles", async () => {
    broken.add("SupportTicket");
    userCounts['User|*'] = 12;
    const { status, body } = await get("/api/admin/stats");
    expect(status).toBe(200);
    expect(body.stats.supportQueue).toBeNull();
    expect(body.unavailable).toEqual(["supportQueue"]);
    expect(body.stats.totalUsers).toBe(12);
  });
  test("several unreadable sources are each named, none defaulted to 0", async () => {
    ["AdminAlert", "DealerVerification", "FraudDetection", "Escrow.aggregate"].forEach((b) => broken.add(b));
    broken.add("reviews");
    const { body } = await get("/api/admin/stats");
    expect(body.stats.activeAlerts).toBeNull();
    expect(body.stats.verificationQueue).toBeNull();
    expect(body.stats.fraudAlerts).toBeNull();
    expect(body.stats.totalRevenue).toBeNull();
    expect(body.stats.pendingReviews).toBeNull();
    expect(body.unavailable.sort()).toEqual(["activeAlerts", "fraudAlerts", "pendingReviews", "revenueAgg", "verificationQueue"]);
  });
  test("alerts mirrors disputed escrows and is null (not 0) when that source fails", async () => {
    broken.add("Escrow");
    const { body } = await get("/api/admin/stats");
    expect(body.stats.alerts).toBeNull();
  });
  test("a role without analytics/dashboard rights still passes the any-staff stats gate but nobody unauthenticated does", async () => {
    expect((await get("/api/admin/stats", "marketing")).status).toBe(200); // documented decision OD-5
    expect((await fetch(`${base}/api/admin/stats`)).status).toBe(401);
  });
});

describe("D-9 pending dealer queue link", () => {
  test("pendingApproval with role=dealer lists dealers only", async () => {
    await get("/api/admin/users?pendingApproval=true&role=dealer");
    const f = userFilters.at(-1);
    expect(f.role).toBe("dealer");
    expect(f.status).toBe("pending");
  });
  test("pendingApproval without a role keeps both seller kinds", async () => {
    await get("/api/admin/users?pendingApproval=true");
    expect(userFilters.at(-1).role).toEqual({ $in: ["dealer", "individual_seller"] });
  });
  test("a non-seller role cannot widen the pending queue to arbitrary roles", async () => {
    const r = await get("/api/admin/users?pendingApproval=true&role=superadmin");
    if (r.status === 200) expect(userFilters.at(-1).role).toEqual({ $in: ["dealer", "individual_seller"] });
    else expect(r.status).toBe(400); // rejected by query validation — equally safe
    expect(userFilters.every((f) => f.role !== "superadmin" || f.status !== "pending")).toBe(true);
  });
});

// ============================================================
// All-areas continuation — RUNTIME authorization proof for AA-S1 / AA-S2.
// Drives the REAL routes through the REAL protect/adminOnly/allowRoles
// middleware over HTTP; only persistence and the metrics controller are mocked.
// Policy asserted:
//   /api/marketplace-health/{summary,trends,alerts}: 401 anonymous; 403 for every
//     role except admin/superadmin (incl. marketing, ghost_checker, accounts...).
//   /api/users/search: 401 anonymous; email visible ONLY to admin/superadmin;
//     privileged accounts are excluded from every other caller's results.
// ============================================================
import { describe, test, expect, beforeAll, afterAll, beforeEach, jest } from "@jest/globals";
import http from "http";
import jwt from "jsonwebtoken";
import express from "express";

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-key-32-chars-minimum-x";
process.env.REQUIRE_EMAIL_VERIFICATION = "false";
process.env.NODE_ENV = "test";
const SECRET = process.env.JWT_SECRET;

const chain = (value) => {
  const q = { select: jest.fn(() => q), lean: jest.fn(() => q), catch: jest.fn(() => q), then: (res, rej) => Promise.resolve(value).then(res, rej) };
  return q;
};
const users = {};
const searchFind = jest.fn();
const userModel = {
  findById: jest.fn((id) => chain(users[id] || null)),
  findByIdAndUpdate: jest.fn(() => chain({})),
  findOne: jest.fn(() => chain(null)),
  find: searchFind,
  countDocuments: jest.fn(async () => 0),
};
const metrics = jest.fn((req, res) => res.json({ success: true, data: { fraud: 1, revenue: 2 } }));

jest.unstable_mockModule("../../models/User.js", () => ({ default: userModel }));
jest.unstable_mockModule("../../models/UserAuth.js", () => ({ default: { findOne: jest.fn(() => chain({ tokenVersion: 0 })) } }));
jest.unstable_mockModule("../../models/RefreshToken.js", () => ({ default: { findActiveSessionById: jest.fn(async () => ({})) } }));
jest.unstable_mockModule("../../utils/logger.js", () => ({ logInfo: jest.fn(), logWarn: jest.fn(), logError: jest.fn(), default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
jest.unstable_mockModule("../../infrastructure/logging/index.js", () => ({ logInfo: jest.fn(), logWarn: jest.fn(), logError: jest.fn() }));
jest.unstable_mockModule("../../controllers/marketplaceHealthController.js", () => ({
  getHealthSummary: metrics, getHealthTrendsHandler: metrics, getAlertsHandler: metrics,
  resolveAlert: metrics, getDetailedMetrics: metrics, regenerateHealth: metrics, getAllHealthRecords: metrics,
}));
jest.unstable_mockModule("../../middleware/searchCache.js", () => ({ cacheDealerSearch: (q, s, n) => n(), invalidateDealerSearchCache: () => {} }));
jest.unstable_mockModule("../../middleware/searchTracking.js", () => ({ trackCarSearch: (q, s, n) => n() }));
jest.unstable_mockModule("../../middleware/searchLatencyTracking.js", () => ({ trackDealerSearchLatency: (q, s, n) => n() }));
jest.unstable_mockModule("../../middleware/apiCache.js", () => ({ cacheUserData: (q, s, n) => n(), invalidateCache: () => (q, s, n) => n() }));

const healthRoutes = (await import("../../routes/marketplaceHealthRoutes.js")).default;
const userRoutes = (await import("../../routes/userRoutes.js")).default;

const ROLES = ["user", "individual_seller", "dealer", "ghost_checker", "moderator", "ad_manager", "marketing", "escrow_officer", "technical_support", "hr", "accounts", "admin", "superadmin"];
const token = (id) => jwt.sign({ id, tokenVersion: 0 }, SECRET, { expiresIn: "1h" });
ROLES.forEach((role) => { users[`u-${role}`] = { _id: `u-${role}`, email: `${role}@example.test`, name: role, role, status: "approved", emailVerified: true }; });

let server; let base;
beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use("/api/marketplace-health", healthRoutes);
  app.use("/api/users", userRoutes);
  app.use((err, req, res, _next) => res.status(err.statusCode || 500).json({ success: false, message: err.message }));
  server = http.createServer(app);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${server.address().port}`;
});
afterAll(() => new Promise((r) => server.close(r)));

const call = (path, role) =>
  fetch(base + path, { headers: role ? { authorization: `Bearer ${token(`u-${role}`)}` } : {} });

beforeEach(() => metrics.mockClear());

describe("marketplace health — runtime authorization", () => {
  const PATHS = ["/api/marketplace-health/summary", "/api/marketplace-health/trends", "/api/marketplace-health/alerts"];
  test.each(PATHS)("%s anonymous -> 401 and controller never runs", async (p) => {
    const res = await call(p);
    expect(res.status).toBe(401);
    expect(metrics).not.toHaveBeenCalled();
    expect(JSON.stringify(await res.json())).not.toMatch(/fraud|revenue/);
  });
  const denied = ROLES.filter((r) => !["admin", "superadmin"].includes(r));
  for (const p of PATHS) {
    test.each(denied)(`${p} role %s -> 403 and no metrics leaked`, async (role) => {
      const res = await call(p, role);
      expect(res.status).toBe(403);
      expect(metrics).not.toHaveBeenCalled();
      expect(JSON.stringify(await res.json())).not.toMatch(/fraud|revenue/);
    });
  }
  test.each(["admin", "superadmin"])("%s -> 200", async (role) => {
    for (const p of PATHS) expect((await call(p, role)).status).toBe(200);
  });
});

describe("user search — runtime authorization", () => {
  let lastFilter; let lastSelect;
  beforeEach(() => {
    searchFind.mockImplementation((filter) => {
      lastFilter = filter;
      const q = {
        select: jest.fn((s) => { lastSelect = s; return q; }), sort: jest.fn(() => q), skip: jest.fn(() => q),
        limit: jest.fn(() => q), lean: jest.fn(() => q),
        then: (res, rej) => Promise.resolve([]).then(res, rej),
      };
      return q;
    });
  });

  test("anonymous -> 401 and database never queried", async () => {
    const res = await call("/api/users/search?q=a");
    expect(res.status).toBe(401);
    expect(searchFind).not.toHaveBeenCalled();
  });
  test.each(["admin", "superadmin"])("%s sees email and privileged accounts", async (role) => {
    const res = await call("/api/users/search?q=a", role);
    expect(res.status).toBe(200);
    expect(lastSelect).toMatch(/\bemail\b/);
  });
  const others = ROLES.filter((r) => !["admin", "superadmin"].includes(r));
  test.each(others)("%s never selects email and cannot list privileged roles", async (role) => {
    const res = await call("/api/users/search?q=a", role);
    expect(res.status).toBe(200);
    expect(lastSelect).not.toMatch(/\bemail\b/);
    const excluded = JSON.stringify(lastFilter.role);
    for (const r of ["admin", "superadmin", "moderator", "accounts", "ghost_checker"]) expect(excluded).toContain(r);
    expect(lastFilter.role.$nin).toBeDefined();
  });
  test.each(["admin", "superadmin", "moderator", "ghost_checker"])("non-privileged caller asking role=%s is still excluded", async (asked) => {
    await call(`/api/users/search?role=${asked}`, "dealer");
    expect(lastFilter.role).toEqual({ $nin: expect.arrayContaining(["admin", "superadmin"]) });
  });
  test("a non-privileged caller may still filter by an ordinary role", async () => {
    await call("/api/users/search?role=dealer", "user");
    expect(lastFilter.role).toBe("dealer");
  });
});

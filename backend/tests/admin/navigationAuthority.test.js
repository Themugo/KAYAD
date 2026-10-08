// ============================================================
// STAGE 14A — NAVIGATION AUTHORITY: route-level authorization matrix.
//
// Drives the REAL backend/routes/adminRoutes.js through the REAL protect /
// adminOnly / requirePermission / authorize middleware over HTTP, with only
// the persistence layer mocked. Proves:
//   - only admin / superadmin can mutate navigation (PUT /api/admin/config)
//   - normal user, seller, dealer, inspection provider (ghost_checker) and
//     every departmental staff role cannot
//   - unauthenticated callers can only read the safe public projection
//   - invalid / hostile payloads are rejected before persistence
//   - every successful mutation writes a dedicated audit entry
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
const userModel = {
  findById: jest.fn((id) => chain(users[id] || null)),
  findByIdAndUpdate: jest.fn(() => chain({})),
  findOne: jest.fn(() => chain(null)),
};
const userAuthModel = { findOne: jest.fn(() => chain({ tokenVersion: 0 })) };
const refreshTokenModel = { findActiveSessionById: jest.fn(async () => ({})) };

let stored; // the persisted singleton
let lastSelect = "";
const makeConfigDoc = () => {
  const doc = { ...stored };
  doc.save = jest.fn(async () => { stored = { ...stored, ...Object.fromEntries(Object.entries(doc).filter(([k]) => k !== "save" && k !== "toObject")) }; });
  doc.toObject = () => ({ ...stored });
  return doc;
};
const platformConfigModel = {
  findOne: jest.fn(() => {
    const q = {
      select: jest.fn((s) => { lastSelect = s; return q; }),
      lean: jest.fn(() => q),
      then: (res, rej) => Promise.resolve(q._lean ? { ...stored } : makeConfigDoc()).then(res, rej),
    };
    // `.lean()` marks lean; plain await yields a document with save()
    q.lean = jest.fn(() => { q._lean = true; return q; });
    return q;
  }),
  create: jest.fn(async () => ({ toObject: () => ({}) })),
};
const auditCreate = jest.fn(async () => ({}));

jest.unstable_mockModule("../../models/User.js", () => ({ default: userModel }));
jest.unstable_mockModule("../../models/UserAuth.js", () => ({ default: userAuthModel }));
jest.unstable_mockModule("../../models/RefreshToken.js", () => ({ default: refreshTokenModel }));
jest.unstable_mockModule("../../models/PlatformConfig.js", () => ({ default: platformConfigModel }));
jest.unstable_mockModule("../../models/AuditLog.js", () => ({ default: { create: auditCreate } }));
jest.unstable_mockModule("../../utils/logger.js", () => ({ logInfo: jest.fn(), logWarn: jest.fn(), logError: jest.fn(), default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
jest.unstable_mockModule("../../infrastructure/logging/index.js", () => ({ logInfo: jest.fn(), logWarn: jest.fn(), logError: jest.fn() }));
jest.unstable_mockModule("../../middleware/auditLog.js", () => ({ auditLog: () => (req, res, next) => next() }));
jest.unstable_mockModule("../../utils/supabase.js", () => ({ getSupabase: () => ({ rpc: jest.fn(), from: jest.fn() }), initSupabase: jest.fn(), isSupabaseConnected: () => false, checkSupabaseReadiness: async () => ({ ok: false }), default: null }));

const adminRoutes = (await import("../../routes/adminRoutes.js")).default;

const ROLES = ["user", "individual_seller", "dealer", "ghost_checker", "moderator", "ad_manager", "marketing", "escrow_officer", "technical_support", "hr", "accounts", "admin", "superadmin"];
const token = (id) => jwt.sign({ id, tokenVersion: 0 }, SECRET, { expiresIn: "1h" });
ROLES.forEach((role) => { users[`u-${role}`] = { _id: `u-${role}`, email: `${role}@example.test`, name: role, role, status: "approved", emailVerified: true }; });

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

const call = (method, path, { role, body } = {}) =>
  fetch(base + path, {
    method,
    headers: { "content-type": "application/json", ...(role ? { authorization: `Bearer ${token(`u-${role}`)}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });

const VALID = { items: [{ id: "marketplace", visible: true }, { id: "auction", visible: false }, { id: "support", visible: true }] };

beforeEach(() => {
  stored = { platformName: "KAYAD", daraja: { consumerSecret: "SECRET" }, bank: { account: "123" }, navigation: {} };
  auditCreate.mockClear();
});

describe("PUT /api/admin/config navigation — authorization matrix", () => {
  const denied = ROLES.filter((r) => r !== "admin" && r !== "superadmin");
  test.each(denied)("%s cannot mutate navigation (403) and nothing is persisted or mutation-audited", async (role) => {
    const res = await call("PUT", "/api/admin/config", { role, body: { navigation: VALID } });
    expect(res.status).toBe(403);
    expect(stored.navigation).toEqual({});
    // The existing role middleware audits the denial itself; no mutation entry may exist.
    const actions = auditCreate.mock.calls.map((c) => c[0].action);
    expect(actions).not.toContain("Navigation configuration updated");
    expect(actions).not.toContain("Platform config updated");
  });

  test("unauthenticated caller cannot mutate (401)", async () => {
    const res = await call("PUT", "/api/admin/config", { body: { navigation: VALID } });
    expect(res.status).toBe(401);
    expect(stored.navigation).toEqual({});
  });

  test.each(["admin", "superadmin"])("%s can change navigation; persisted normalised; dedicated audit entry written", async (role) => {
    const res = await call("PUT", "/api/admin/config", { role, body: { navigation: VALID } });
    expect(res.status).toBe(200);
    expect(stored.navigation.items.map((i) => [i.id, i.visible])).toEqual([["marketplace", true], ["auction", false], ["support", true]]);
    const actions = auditCreate.mock.calls.map((c) => c[0].action);
    expect(actions).toContain("Navigation configuration updated");
    const entry = auditCreate.mock.calls.find((c) => c[0].action === "Navigation configuration updated")[0];
    expect(entry.adminId).toBe(`u-${role}`);
    expect(entry.details.after.items).toHaveLength(3);
    expect(entry.details).toHaveProperty("before");
  });

  test("an item can be un-hidden (replace semantics, not merge)", async () => {
    await call("PUT", "/api/admin/config", { role: "admin", body: { navigation: VALID } });
    const res = await call("PUT", "/api/admin/config", { role: "admin", body: { navigation: { items: [{ id: "marketplace" }, { id: "auction", visible: true }, { id: "support" }] } } });
    expect(res.status).toBe(200);
    expect(stored.navigation.items.find((i) => i.id === "auction").visible).toBe(true);
  });

  test("whole-config echo with an untouched navigation ({}) is accepted (other admin screens round-trip it)", async () => {
    const res = await call("PUT", "/api/admin/config", { role: "admin", body: { platformName: "X", navigation: {} } });
    expect(res.status).toBe(200);
  });

  test("a non-navigation config update does not write a navigation audit entry or touch navigation", async () => {
    await call("PUT", "/api/admin/config", { role: "admin", body: { navigation: VALID } });
    auditCreate.mockClear();
    const res = await call("PUT", "/api/admin/config", { role: "admin", body: { platformName: "KAYAD EA" } });
    expect(res.status).toBe(200);
    expect(auditCreate.mock.calls.map((c) => c[0].action)).toEqual(["Platform config updated"]);
    expect(stored.navigation.items).toHaveLength(3);
  });
});

describe("PUT /api/admin/config navigation — hostile / invalid payloads (admin)", () => {
  const bad = {
    "unknown primary id (route creation attempt)": { items: [{ id: "marketplace" }, { id: "evil-admin-panel" }] },
    "hide marketplace": { items: [{ id: "marketplace", visible: false }, { id: "auction" }] },
    "hide support": { items: [{ id: "marketplace" }, { id: "support", visible: false }] },
    "all hidden": { items: [{ id: "auction", visible: false }] },
    "arbitrary css field": { items: [{ id: "marketplace", style: "position:fixed" }] },
    "raw html label": { items: [{ id: "marketplace", label: "<img src=x onerror=alert(1)>" }] },
    "href injection on child": { items: [{ id: "marketplace", children: [{ id: "browse", href: "javascript:alert(1)" }] }] },
    "unknown child id": { items: [{ id: "marketplace", children: [{ id: "nope" }] }] },
    "child of another parent": { items: [{ id: "marketplace", children: [{ id: "live" }] }] },
    "duplicate id": { items: [{ id: "marketplace" }, { id: "marketplace" }] },
    "non-boolean visible": { items: [{ id: "marketplace", visible: "no" }] },
    "items not an array": { items: "marketplace" },
    "extra top-level field": { items: [{ id: "marketplace" }], script: "x" },
    "not an object": "marketplace",
    "array": [],
  };
  test.each(Object.entries(bad))("rejects %s with 400, persists nothing", async (_n, payload) => {
    const res = await call("PUT", "/api/admin/config", { role: "admin", body: { navigation: payload } });
    expect(res.status).toBe(400);
    expect(stored.navigation).toEqual({});
    expect(auditCreate.mock.calls.map((c) => c[0].action)).not.toContain("Navigation configuration updated");
  });
});

describe("GET /api/admin/public/config — public read path", () => {
  test("unauthenticated read returns navigation, normalised, and the projection whitelists navigation but no secrets", async () => {
    stored.navigation = { items: [{ id: "auction", visible: false, dropdown: true, children: [] }, { id: "garbage" }, "x"], secret: "x" };
    const res = await call("GET", "/api/admin/public/config");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.config.navigation.items.map((i) => i.id)).toEqual(["auction"]);
    expect(body.config.navigation).not.toHaveProperty("secret");
    expect(lastSelect.split(/\s+/)).toContain("navigation");
    for (const s of ["daraja", "bank", "reconciliation", "supportEmail", "dealerCommission", "listingFee"]) expect(lastSelect.split(/\s+/)).not.toContain(s);
  });
  test("a null / malformed stored value is served as the safe empty state", async () => {
    for (const v of [null, undefined, "x", 5, [], { items: "nope" }]) {
      stored.navigation = v;
      const body = await (await call("GET", "/api/admin/public/config")).json();
      expect(body.config.navigation).toEqual({ items: [] });
    }
  });
  test("admin config GET (full config) is not public", async () => {
    expect((await call("GET", "/api/admin/config")).status).toBe(401);
    expect((await call("GET", "/api/admin/config", { role: "user" })).status).toBe(403);
    expect((await call("GET", "/api/admin/config", { role: "dealer" })).status).toBe(403);
  });
});

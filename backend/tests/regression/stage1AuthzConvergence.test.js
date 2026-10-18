// ============================================================
// STAGE 1 FOUNDATION (2026-10-18) — authorization convergence regressions.
//
// Behavioural (not source-string) tests for root causes fixed in Stage 1:
//   S1-AUTH-01  middleware/auth.js requireRole denied the platform owner
//               (effectiveRole "webhoist") and superadmin on ['admin'] routes.
//   S1-AUTH-02  governanceController.ensure()/eipController.admin() denied the
//               owner although the route-level allowRoles guards admit it.
//   S1-AUTH-03  protect() dropped req.user.name (security-only re-select).
//   S1-AUTH-04  optionalAuth() honoured revoked tokens (tokenVersion/session).
//   S1-AUTH-05  cross-owner listing authority = staff holding MANAGE_CARS,
//               not "any STAFF_ROLES member" and never a mere seller.
// ============================================================
import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import jwt from "jsonwebtoken";

process.env.JWT_SECRET = "s1".repeat(24);
process.env.REQUIRE_EMAIL_VERIFICATION = "false";
process.env.WEBHOIST_EMAIL = "owner@example.test";
delete process.env.WEBHOIST_EMAILS;

// ── persistence mocks ─────────────────────────────────────────
const SECURITY_ONLY = /deactivatedAt/; // protect()'s security re-select
let rows = {};
let authRows = {};
const chain = (get) => {
  let sel = "";
  const q = {
    select: (s) => { sel = s || ""; return q; },
    lean: () => q,
    then: (r, j) => Promise.resolve(get(sel)).then(r, j),
    catch: () => q,
  };
  return q;
};
// The real adapter returns only the selected columns; model that faithfully.
const pick = (row, sel) => {
  if (!row) return null;
  if (!sel || !SECURITY_ONLY.test(sel)) return { ...row };
  const cols = sel.split(",").map((c) => c.trim().replace(/^_id$/, "id"));
  return Object.fromEntries(Object.entries(row).filter(([k]) => cols.includes(k) || k === "id"));
};
const findById = jest.fn((id) => chain((sel) => pick(rows[id], sel)));
const findByIdAndUpdate = jest.fn(() => Promise.resolve());
const findActiveSessionById = jest.fn(async () => ({ id: "s-1" }));

jest.unstable_mockModule("../../models/User.js", () => ({ default: { findById, findByIdAndUpdate } }));
jest.unstable_mockModule("../../models/UserAuth.js", () => ({
  default: { findOne: jest.fn(({ user }) => chain(() => authRows[user] ?? null)) },
}));
jest.unstable_mockModule("../../models/RefreshToken.js", () => ({ default: { findActiveSessionById } }));

const dbCreate = jest.fn(async (_t, payload) => ({ id: "row-1", ...payload }));
jest.unstable_mockModule("../../db/index.js", () => ({
  findAll: jest.fn(async () => []),
  findById: jest.fn(async () => null),
  create: dbCreate,
  update: jest.fn(async () => ({})),
}));
const auditCreate = jest.fn(async () => ({}));
jest.unstable_mockModule("../../models/AuditLog.js", () => ({ default: { create: auditCreate } }));
jest.unstable_mockModule("../../utils/io.js", () => ({ getIO: () => null }));

const { protect, optionalAuth, requireRole } = await import("../../middleware/auth.js");
const { isRoleAllowed, canManageAnyListing } = await import("../../config/roles.js");
const governance = await import("../../controllers/governanceController.js");

const mkRes = () => {
  const r = { code: 200 };
  r.status = (c) => { r.code = c; return r; };
  r.json = (b) => { r.body = b; return r; };
  r.set = () => r;
  return r;
};
const tok = (id, extra = {}) => jwt.sign({ id, tokenVersion: 0, ...extra }, process.env.JWT_SECRET, { algorithm: "HS256" });
const reqWith = (token) => ({ headers: { authorization: `Bearer ${token}` }, cookies: {} });

const OWNER = { effectiveRole: "webhoist", role: "superadmin", id: "o" };
const SUPER = { effectiveRole: "superadmin", role: "superadmin", id: "s" };
const ADMIN = { effectiveRole: "admin", role: "admin", id: "a" };
const GHOST = { effectiveRole: "ghost_checker", role: "ghost_checker", id: "g" };
const DEALER = { effectiveRole: "dealer", role: "dealer", id: "d" };

describe("S1-AUTH-01 requireRole (middleware/auth.js) uses canonical owner/superadmin semantics", () => {
  const run = (user, roles) => {
    const res = mkRes(); const next = jest.fn();
    requireRole(roles)({ user }, res, next);
    return { res, next };
  };
  test("platform owner passes an ['admin'] route", () => expect(run(OWNER, ["admin"]).next).toHaveBeenCalled());
  test("superadmin passes an ['admin'] route", () => expect(run(SUPER, ["admin"]).next).toHaveBeenCalled());
  test("admin passes", () => expect(run(ADMIN, ["admin"]).next).toHaveBeenCalled());
  test("ghost_checker is denied 403", () => {
    const { res, next } = run(GHOST, ["admin"]);
    expect(next).not.toHaveBeenCalled();
    expect(res.code).toBe(403);
  });
  test("unauthenticated is 401", () => expect(run(undefined, ["admin"]).res.code).toBe(401));
  test("a forged effectiveRole string on a non-owner cannot be produced by protect() (owner is email-derived)", async () => {
    rows.x1 = { id: "x1", email: "someone@example.test", role: "admin", status: "approved", name: "X" };
    authRows.x1 = { tokenVersion: 0 };
    const req = reqWith(tok("x1", { effectiveRole: "webhoist", role: "superadmin" }));
    await protect(req, mkRes(), jest.fn());
    expect(req.user.effectiveRole).toBe("admin");
    expect(req.user.role).toBe("admin");
  });
});

describe("S1-AUTH-02 in-controller role checks honour the owner", () => {
  test("isRoleAllowed: owner/admin allowed, ghost_checker denied, null denied", () => {
    expect(isRoleAllowed(OWNER, ["admin", "superadmin"])).toBe(true);
    expect(isRoleAllowed(ADMIN, ["admin", "superadmin"])).toBe(true);
    expect(isRoleAllowed(GHOST, ["admin", "superadmin"])).toBe(false);
    expect(isRoleAllowed(null, ["admin"])).toBe(false);
  });
  test("governance createPolicy: owner is no longer denied by the controller", async () => {
    const res = mkRes();
    await governance.createPolicy({ user: OWNER, body: { title: "Retention policy" } }, res);
    expect(res.code).toBe(200);
    expect(res.body.success).toBe(true);
    expect(auditCreate).toHaveBeenCalled();
  });
  test("governance createPolicy: ghost_checker is still denied 403 and nothing is written", async () => {
    dbCreate.mockClear();
    const res = mkRes();
    await governance.createPolicy({ user: GHOST, body: { title: "x" } }, res);
    expect(res.code).toBe(403);
    expect(dbCreate).not.toHaveBeenCalled();
  });
});

describe("S1-AUTH-03 protect() carries the display name", () => {
  beforeEach(() => { findActiveSessionById.mockResolvedValue({ id: "s-1" }); });
  test("req.user.name is populated although the security re-select omits it", async () => {
    rows.n1 = { id: "n1", email: "n1@example.test", role: "dealer", status: "approved", name: "Amina Dealer" };
    authRows.n1 = { tokenVersion: 0 };
    const req = reqWith(tok("n1")); const next = jest.fn();
    await protect(req, mkRes(), next);
    expect(next).toHaveBeenCalled();
    expect(req.user.name).toBe("Amina Dealer");
  });
  test("security state still comes from the fresh row (role not taken from the profile cache)", async () => {
    rows.n2 = { id: "n2", email: "n2@example.test", role: "dealer", status: "approved", name: "N2" };
    authRows.n2 = { tokenVersion: 0 };
    await protect(reqWith(tok("n2")), mkRes(), jest.fn()); // warm the profile cache
    rows.n2 = { ...rows.n2, role: "user" }; // role revoked in DB
    const req = reqWith(tok("n2"));
    await protect(req, mkRes(), jest.fn());
    expect(req.user.role).toBe("user");
  });
});

describe("S1-AUTH-04 optionalAuth() rejects revoked tokens", () => {
  beforeEach(() => {
    rows.p1 = { id: "p1", email: "staff@example.test", role: "admin", status: "approved", name: "Staff" };
    authRows.p1 = { tokenVersion: 0 };
    findActiveSessionById.mockResolvedValue({ id: "s-1" });
  });
  const run = async (token) => { const req = reqWith(token); const next = jest.fn(); await optionalAuth(req, mkRes(), next); return { req, next }; };

  test("valid token attaches the caller", async () => {
    const { req, next } = await run(tok("p1"));
    expect(next).toHaveBeenCalled();
    expect(req.user).toMatchObject({ id: "p1", role: "admin", effectiveRole: "admin" });
  });
  test("token-version mismatch (logout-all / password change) is treated as anonymous", async () => {
    authRows.p1 = { tokenVersion: 4 };
    const { req, next } = await run(tok("p1"));
    expect(next).toHaveBeenCalled();
    expect(req.user).toBeUndefined();
  });
  test("revoked session id is treated as anonymous", async () => {
    findActiveSessionById.mockResolvedValue(null);
    const { req } = await run(tok("p1", { sessionId: "gone" }));
    expect(req.user).toBeUndefined();
  });
  test("missing auth row is treated as anonymous", async () => {
    delete authRows.p1;
    const { req } = await run(tok("p1"));
    expect(req.user).toBeUndefined();
  });
  test("owner gets the same role/effectiveRole shape as protect()", async () => {
    rows.p2 = { id: "p2", email: "OWNER@example.test", role: "user", status: "approved" };
    authRows.p2 = { tokenVersion: 0 };
    const { req } = await run(tok("p2"));
    expect(req.user).toMatchObject({ role: "superadmin", effectiveRole: "webhoist" });
  });
});

describe("S1-AUTH-05 cross-owner listing authority", () => {
  test("admin and owner may manage any listing", () => {
    expect(canManageAnyListing(ADMIN)).toBe(true);
    expect(canManageAnyListing(OWNER)).toBe(true);
    expect(canManageAnyListing(SUPER)).toBe(true);
  });
  test("ghost_checker / marketing / moderator may not", () => {
    expect(canManageAnyListing(GHOST)).toBe(false);
    expect(canManageAnyListing({ role: "marketing" })).toBe(false);
    expect(canManageAnyListing({ role: "moderator" })).toBe(false);
  });
  test("a seller holding MANAGE_CARS for own listings has no cross-owner authority", () => {
    expect(canManageAnyListing(DEALER)).toBe(false);
    expect(canManageAnyListing({ role: "individual_seller" })).toBe(false);
    expect(canManageAnyListing({ role: "dealer", grantedPermissions: ["manage_cars"] })).toBe(false);
  });
  test("a staff member explicitly granted MANAGE_CARS gains it; a revoked admin loses it", () => {
    expect(canManageAnyListing({ role: "moderator", grantedPermissions: ["manage_cars"] })).toBe(true);
    expect(canManageAnyListing({ role: "admin", revokedPermissions: ["manage_cars"] })).toBe(false);
  });
});

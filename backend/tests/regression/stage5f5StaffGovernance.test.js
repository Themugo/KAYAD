// ============================================================
// STAGE 5F.5 (2026-10-20) — owner-only staff governance, end to end over HTTP.
// REAL routes/adminRoutes.js, protect, authorize, systemOwnerOnly, protectAccount, owner registry.
// Persistence faked (in-memory users, spy-able save/create/softDelete). EVIDENCE TIER: mocked local runtime.
// Every denial asserts NO mutation. D-4 (isBanned type) and D-5 (main-owner suspension through PUT /staff/:id) are pinned here.
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

const ID = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const chain = (value) => {
  const q = { select: jest.fn(() => q), sort: jest.fn(() => q), lean: jest.fn(() => q), catch: jest.fn(() => q), then: (res, rej) => Promise.resolve(value).then(res, rej) };
  return q;
};
const users = {};
const saves = jest.fn(async () => {});
const userCreate = jest.fn(async (d) => ({ id: ID(99), ...d }));
const softDelete = jest.fn(async () => {});
jest.unstable_mockModule("../../models/User.js", () => ({
  default: {
    findById: jest.fn((id) => { const u = users[id]; return chain(u ? Object.assign(u, { save: () => saves(u.id, { ...u }) }) : null); }),
    findOne: jest.fn((q) => chain(Object.values(users).find((u) => u.email === q?.email) || null)),
    find: jest.fn(() => chain(Object.values(users).filter((u) => u.role !== "user"))),
    findByIdAndUpdate: jest.fn(() => chain({})),
    create: userCreate,
    softDelete,
  },
}));
const authCreate = jest.fn(async () => ({}));
jest.unstable_mockModule("../../models/UserAuth.js", () => ({ default: { findOne: jest.fn(() => chain({ tokenVersion: 0 })), create: authCreate } }));
jest.unstable_mockModule("../../models/RefreshToken.js", () => ({ default: { findActiveSessionById: jest.fn(async () => ({})) } }));
jest.unstable_mockModule("../../models/PlatformConfig.js", () => ({ default: { findOne: jest.fn(() => chain({})), create: jest.fn(async () => ({ toObject: () => ({}) })) } }));
const auditCreate = jest.fn(async () => ({}));
jest.unstable_mockModule("../../models/AuditLog.js", () => ({ default: { create: auditCreate } }));
jest.unstable_mockModule("../../middleware/auditLog.js", () => ({ auditLog: () => (req, res, next) => next() }));
jest.unstable_mockModule("../../services/notification.service.js", () => ({ sendNotification: jest.fn(async () => {}) }));
jest.unstable_mockModule("../../utils/supabase.js", () => ({
  initSupabase: jest.fn(), checkSupabaseReadiness: async () => ({ ok: true }), isSupabaseConnected: () => true, default: null,
  getSupabase: () => ({ rpc: jest.fn(), from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }) }),
}));

const adminRoutes = (await import("../../routes/adminRoutes.js")).default;
const { ASSIGNABLE_PERMISSIONS } = await import("../../config/roles.js");

const CALLERS = { owner: ID(1), superadmin: ID(2), admin: ID(3), marketing: ID(4), user: ID(5), hr: ID(6) };
const mk = (id, role, email) => ({ _id: id, id, email, name: role, role, status: "approved", emailVerified: true, grantedPermissions: [], revokedPermissions: [] });
const TARGET = ID(10);
const token = (id) => jwt.sign({ id, tokenVersion: 0 }, SECRET, { expiresIn: "1h" });

beforeEach(() => {
  for (const k of Object.keys(users)) delete users[k];
  users[CALLERS.owner] = mk(CALLERS.owner, "user", "owner@example.test"); // DB role is not staff: owner status comes from the registry
  users[CALLERS.superadmin] = mk(CALLERS.superadmin, "superadmin", "sa@example.test");
  users[CALLERS.admin] = mk(CALLERS.admin, "admin", "admin@example.test");
  users[CALLERS.marketing] = mk(CALLERS.marketing, "marketing", "marketing@example.test");
  users[CALLERS.user] = mk(CALLERS.user, "user", "user@example.test");
  users[CALLERS.hr] = mk(CALLERS.hr, "hr", "hr@example.test");
  users[TARGET] = mk(TARGET, "marketing", "target@example.test");
  users[ID(11)] = mk(ID(11), "superadmin", "other-sa@example.test");
  saves.mockClear(); userCreate.mockClear(); softDelete.mockClear(); authCreate.mockClear(); auditCreate.mockClear();
});

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

const call = (method, path, { as, body } = {}) =>
  fetch(base + path, {
    method,
    headers: { "content-type": "application/json", ...(as ? { authorization: `Bearer ${token(CALLERS[as])}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }));
const noMutation = () => { expect(saves).not.toHaveBeenCalled(); expect(userCreate).not.toHaveBeenCalled(); expect(authCreate).not.toHaveBeenCalled(); expect(softDelete).not.toHaveBeenCalled(); };

const WRITES = [
  ["POST", "/api/admin/staff", { name: "N", email: "new@example.test", password: "Passw0rd!x", role: "hr" }],
  ["PUT", `/api/admin/staff/${TARGET}`, { role: "accounts" }],
  ["PUT", `/api/admin/staff/${TARGET}/permissions`, { grantedPermissions: [ASSIGNABLE_PERMISSIONS[0]] }],
  ["DELETE", `/api/admin/staff/${TARGET}`, undefined],
];

describe("only the verified System Owner can govern staff", () => {
  test.each(["superadmin", "admin", "marketing", "hr", "user", undefined])("%s is denied every staff write and nothing mutates", async (as) => {
    for (const [m, p, b] of WRITES) {
      const r = await call(m, p, { as, body: b });
      expect([401, 403]).toContain(r.status);
    }
    noMutation();
  });
  test.each(["superadmin", "admin", "marketing", "user", undefined])("%s cannot even list staff or read permissions", async (as) => {
    expect([401, 403]).toContain((await call("GET", "/api/admin/staff", { as })).status);
    expect([401, 403]).toContain((await call("GET", `/api/admin/staff/${TARGET}/permissions`, { as })).status);
    expect([401, 403]).toContain((await call("GET", "/api/admin/staff/permissions/catalog", { as })).status);
  });
  test("non-owner superadmin receives the SYSTEM_OWNER_REQUIRED code", async () => {
    const r = await call("PUT", `/api/admin/staff/${TARGET}`, { as: "superadmin", body: { role: "admin" } });
    expect(r.status).toBe(403);
    expect(r.body.code).toBe("SYSTEM_OWNER_REQUIRED");
  });
  test("forged role/isOwner fields in the body do not elevate a non-owner", async () => {
    const r = await call("PUT", `/api/admin/staff/${TARGET}`, { as: "superadmin", body: { role: "admin", isOwner: true, effectiveRole: "webhoist" } });
    expect(r.status).toBe(403);
    noMutation();
  });
});

describe("owner operations", () => {
  test("owner can list staff and read permissions", async () => {
    expect((await call("GET", "/api/admin/staff", { as: "owner" })).status).toBe(200);
    expect((await call("GET", `/api/admin/staff/${TARGET}/permissions`, { as: "owner" })).status).toBe(200);
  });
  test("owner changes a staff role (saved once)", async () => {
    const r = await call("PUT", `/api/admin/staff/${TARGET}`, { as: "owner", body: { role: "accounts" } });
    expect(r.status).toBe(200);
    expect(saves).toHaveBeenCalledTimes(1);
    expect(saves.mock.calls[0][1].role).toBe("accounts");
  });
  test.each(["superadmin", "webhoist", "owner", "user", "dealer", 5])("assigning role %j is rejected, nothing saved", async (role) => {
    const r = await call("PUT", `/api/admin/staff/${TARGET}`, { as: "owner", body: { role } });
    expect(r.status).toBe(400);
    expect(saves).not.toHaveBeenCalled();
  });
  test("creating a staff account with role superadmin/owner is rejected", async () => {
    for (const role of ["superadmin", "owner", "webhoist"]) {
      expect((await call("POST", "/api/admin/staff", { as: "owner", body: { name: "N", email: "n@example.test", password: "Passw0rd!x", role } })).status).toBe(400);
    }
    noMutation();
  });
  test("owner addresses are reserved: staff create with the owner email is 409", async () => {
    const r = await call("POST", "/api/admin/staff", { as: "owner", body: { name: "N", email: "owner@example.test", password: "Passw0rd!x", role: "hr" } });
    expect(r.status).toBe(409);
    noMutation();
  });
  test("a created staff account stores a hashed password, never the plaintext", async () => {
    const r = await call("POST", "/api/admin/staff", { as: "owner", body: { name: "N", email: "fresh@example.test", password: "Passw0rd!x", role: "hr" } });
    expect(r.status).toBe(200);
    const stored = authCreate.mock.calls[0][0].password;
    expect(stored).not.toBe("Passw0rd!x");
    expect(stored).toMatch(/^\$2[aby]\$/);
    expect(JSON.stringify(r.body)).not.toContain("Passw0rd");
  });
  test("permission grants are filtered to the assignable catalog; unknown keys are dropped", async () => {
    const good = ASSIGNABLE_PERMISSIONS[0];
    const r = await call("PUT", `/api/admin/staff/${TARGET}/permissions`, { as: "owner", body: { grantedPermissions: [good, "owner_only", "superadmin", "__proto__"], revokedPermissions: [good] } });
    expect(r.status).toBe(200);
    expect(saves.mock.calls[0][1].grantedPermissions).toEqual([good]);
    expect(saves.mock.calls[0][1].revokedPermissions).toEqual([]); // grant wins
  });
  test("another superadmin's permissions can't be edited through this endpoint", async () => {
    const r = await call("PUT", `/api/admin/staff/${ID(11)}/permissions`, { as: "owner", body: { grantedPermissions: [ASSIGNABLE_PERMISSIONS[0]] } });
    expect(r.status).toBe(403);
    expect(saves).not.toHaveBeenCalled();
  });
  test("superadmin accounts cannot be deleted; regular staff can (soft delete)", async () => {
    expect((await call("DELETE", `/api/admin/staff/${ID(11)}`, { as: "owner" })).status).toBe(400);
    expect(softDelete).not.toHaveBeenCalled();
    expect((await call("DELETE", `/api/admin/staff/${TARGET}`, { as: "owner" })).status).toBe(200);
    expect(softDelete).toHaveBeenCalledWith(TARGET, CALLERS.owner);
  });
  test("a nonexistent target is 404, nothing saved", async () => {
    expect((await call("PUT", `/api/admin/staff/${ID(404)}`, { as: "owner", body: { role: "hr" } })).status).toBe(404);
    noMutation();
  });
  test("malformed id is 400", async () => {
    expect((await call("PUT", "/api/admin/staff/not-an-id", { as: "owner", body: { role: "hr" } })).status).toBe(400);
    noMutation();
  });
});

const governance = () => auditCreate.mock.calls.map((c) => c[0]).filter((e) => String(e.action).startsWith("Staff governance"));
describe("audit trail for every owner-only staff mutation (before/after, no secrets)", () => {
  test("role change records before/after and the acting owner", async () => {
    await call("PUT", `/api/admin/staff/${TARGET}`, { as: "owner", body: { role: "accounts" } });
    const g = governance();
    expect(g).toHaveLength(1);
    expect(g[0].action).toBe("Staff governance: staff record updated");
    expect(g[0].adminId).toBe(CALLERS.owner);
    expect(g[0].details).toMatchObject({ targetUserId: TARGET, before: { role: "marketing", isBanned: false }, after: { role: "accounts", isBanned: false } });
  });
  test("permission change records the delta", async () => {
    const p = ASSIGNABLE_PERMISSIONS[0];
    await call("PUT", `/api/admin/staff/${TARGET}/permissions`, { as: "owner", body: { grantedPermissions: [p] } });
    const g = governance();
    expect(g[0].details.before).toEqual({ granted: [], revoked: [] });
    expect(g[0].details.after.granted).toEqual([p]);
  });
  test("create and delete are recorded; neither the password nor the e-mail is written to the trail", async () => {
    await call("POST", "/api/admin/staff", { as: "owner", body: { name: "N", email: "fresh@example.test", password: "Passw0rd!x", role: "hr" } });
    await call("DELETE", `/api/admin/staff/${TARGET}`, { as: "owner" });
    const g = governance();
    expect(g.map((e) => e.action)).toEqual(["Staff governance: account created", "Staff governance: account deleted"]);
    const blob = JSON.stringify(g);
    expect(blob).not.toContain("Passw0rd");
    expect(blob).not.toContain("fresh@example.test");
  });
  test("a denied attempt writes no governance record", async () => {
    await call("PUT", `/api/admin/staff/${TARGET}`, { as: "superadmin", body: { role: "admin" } });
    await call("PUT", `/api/admin/staff/${TARGET}`, { as: "owner", body: { isBanned: "false" } });
    expect(governance()).toEqual([]);
  });
});

describe("D-4 / D-5 and owner-account protection", () => {
  test.each(["false", "true", 1, 0, "", null, {}])("isBanned=%j (non-boolean) is rejected, nothing saved", async (isBanned) => {
    const r = await call("PUT", `/api/admin/staff/${TARGET}`, { as: "owner", body: { isBanned } });
    expect(r.status).toBe(400);
    expect(saves).not.toHaveBeenCalled();
  });
  test("a real boolean is accepted", async () => {
    expect((await call("PUT", `/api/admin/staff/${TARGET}`, { as: "owner", body: { isBanned: true } })).status).toBe(200);
    expect(saves.mock.calls[0][1].isBanned).toBe(true);
  });
  test("name must be a bounded string", async () => {
    for (const name of [5, "   ", "x".repeat(121), {}]) expect((await call("PUT", `/api/admin/staff/${TARGET}`, { as: "owner", body: { name } })).status).toBe(400);
    expect(saves).not.toHaveBeenCalled();
  });
  test("D-5: the primary owner cannot be suspended through PUT /staff/:id", async () => {
    const r = await call("PUT", `/api/admin/staff/${CALLERS.owner}`, { as: "owner", body: { isBanned: true } });
    expect(r.status).toBe(403);
    expect(saves).not.toHaveBeenCalled();
  });
  test("owner role/email are immutable even for the owner", async () => {
    expect((await call("PUT", `/api/admin/staff/${CALLERS.owner}`, { as: "owner", body: { role: "hr" } })).status).toBe(403);
    expect((await call("DELETE", `/api/admin/staff/${CALLERS.owner}`, { as: "owner" })).status).toBe(403);
    noMutation();
  });
  test("a non-owner can never reach an owner account", async () => {
    for (const as of ["superadmin", "admin", "marketing"]) {
      expect([401, 403]).toContain((await call("PUT", `/api/admin/staff/${CALLERS.owner}`, { as, body: { isBanned: true } })).status);
    }
    noMutation();
  });
  test("self-escalation: a staff member cannot grant themselves permissions or a role", async () => {
    expect((await call("PUT", `/api/admin/staff/${CALLERS.marketing}/permissions`, { as: "marketing", body: { grantedPermissions: [ASSIGNABLE_PERMISSIONS[0]] } })).status).toBe(403);
    expect((await call("PUT", `/api/admin/staff/${CALLERS.marketing}`, { as: "marketing", body: { role: "admin" } })).status).toBe(403);
    noMutation();
  });
});

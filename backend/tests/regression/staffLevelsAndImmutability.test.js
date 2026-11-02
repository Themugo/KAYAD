// ============================================================
// Super Admin / owner immutability + owner-defined employment levels + company e-mail policy, end to end over HTTP.
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
const updates = [];
const saves = jest.fn(async () => {});
const userCreate = jest.fn(async (d) => ({ id: ID(99), ...d }));
const softDelete = jest.fn(async () => {});
jest.unstable_mockModule("../../models/User.js", () => ({
  default: {
    findById: jest.fn((id) => { const u = users[id]; return chain(u ? Object.assign(u, { save: () => saves(u.id, { ...u }) }) : null); }),
    findOne: jest.fn((q) => chain(Object.values(users).find((u) => u.email === q?.email) || null)),
    find: jest.fn(() => chain(Object.values(users).filter((u) => u.role !== "user"))),
    findByIdAndUpdate: jest.fn((id, patch) => { updates.push([id, patch]); return chain({}); }),
    create: userCreate,
    softDelete,
  },
}));
const authCreate = jest.fn(async () => ({}));
jest.unstable_mockModule("../../models/UserAuth.js", () => ({ default: { findOne: jest.fn(() => chain({ tokenVersion: 0 })), findOneAndUpdate: jest.fn(async () => ({})), create: authCreate } }));
jest.unstable_mockModule("../../models/RefreshToken.js", () => ({ default: { findActiveSessionById: jest.fn(async () => ({})), revokeAllForUser: jest.fn(async () => 0) } }));
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
const { ASSIGNABLE_PERMISSIONS, getEffectivePermissions, ROLE_PERMISSIONS } = await import("../../config/roles.js");
const levels = await import("../../services/staffLevels.service.js");

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
  updates.length = 0; levels.__setStaffLevelsForTests({ companyEmailDomain: 'kayad.space', requireCompanyEmail: false, levels: [], assignments: {} }); saves.mockClear(); userCreate.mockClear(); softDelete.mockClear(); authCreate.mockClear(); auditCreate.mockClear();
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


const PW = "Str0ngPassw0rd!2026";
const SALES = { key: "sales", label: "Sales", description: "Sales team", baseRole: "marketing", permissions: ["manage_cars", "view_analytics"] };

describe("Super Admin / owner accounts are immutable to everyone", () => {
  test.each(["owner", "superadmin", "admin"])("%s cannot ban the owner through toggle-ban, and nothing changes", async (as) => {
    const r = await call("POST", `/api/admin/users/${CALLERS.owner}/toggle-ban`, { as, body: { banned: true } });
    expect([403]).toContain(r.status);
    noMutation();
  });
  test("not even the owner can ban or deactivate ANOTHER Super Admin", async () => {
    const a = await call("POST", `/api/admin/users/${ID(11)}/toggle-ban`, { as: "owner", body: { banned: true } });
    const b = await call("PUT", `/api/admin/users/${ID(11)}/deactivate`, { as: "owner" });
    const c = await call("DELETE", `/api/admin/users/${ID(11)}`, { as: "owner" });
    for (const r of [a, b, c]) { expect(r.status).toBe(403); expect(r.body.code).toBe("IMMUTABLE_ACCOUNT"); }
    noMutation();
  });
  test("a Super Admin's role/email cannot be changed and isBanned cannot be set on them", async () => {
    const r1 = await call("PUT", `/api/admin/staff/${ID(11)}`, { as: "owner", body: { role: "admin" } });
    const r2 = await call("PUT", `/api/admin/staff/${ID(11)}`, { as: "owner", body: { isBanned: true } });
    expect(r1.status).toBe(403); expect(r2.status).toBe(403);
    noMutation();
  });
  test("an ordinary staff member is still manageable (suspend, reactivate) by the owner", async () => {
    expect((await call("PUT", `/api/admin/staff/${TARGET}`, { as: "owner", body: { isBanned: true } })).status).toBe(200);
    expect((await call("PUT", `/api/admin/staff/${TARGET}`, { as: "owner", body: { isBanned: false } })).status).toBe(200);
    expect(saves.mock.calls.map((c) => c[1].isBanned)).toEqual([true, false]);
  });
});

describe("employment levels", () => {
  test("pure: delta makes effective permissions exactly the level's list", () => {
    const delta = levels.permissionDeltaFor(SALES);
    const eff = getEffectivePermissions({ role: "marketing", ...delta }).sort();
    expect(eff).toEqual([...SALES.permissions].sort());
  });
  test("validation rejects built-in names, unknown/ungrantable permissions, admin base roles", () => {
    expect(levels.validateLevel({ ...SALES, key: "admin" }).ok).toBe(false);
    expect(levels.validateLevel({ ...SALES, baseRole: "admin" }).ok).toBe(false);
    expect(levels.validateLevel({ ...SALES, permissions: ["manage_staff"] }).ok).toBe(false);
    expect(levels.validateLevel({ ...SALES, permissions: ["nope"] }).ok).toBe(false);
    expect(levels.validateLevel({ ...SALES, permissions: [] }).ok).toBe(false);
    expect(levels.validateLevel(SALES).ok).toBe(true);
  });
  test("only the owner can manage levels", async () => {
    for (const as of ["superadmin", "admin", "marketing", undefined]) {
      expect([401, 403]).toContain((await call("POST", "/api/admin/staff/levels", { as, body: SALES })).status);
      expect([401, 403]).toContain((await call("GET", "/api/admin/staff/levels", { as })).status);
    }
  });
  test("owner creates, lists, edits and deletes a level; in-use levels cannot be deleted", async () => {
    expect((await call("POST", "/api/admin/staff/levels", { as: "owner", body: SALES })).status).toBe(201);
    expect((await call("POST", "/api/admin/staff/levels", { as: "owner", body: SALES })).status).toBe(409);
    const list = await call("GET", "/api/admin/staff/levels", { as: "owner" });
    expect(list.body.levels[0]).toMatchObject({ key: "sales", members: 0 });
    const created = await call("POST", "/api/admin/staff", { as: "owner", body: { name: "Sam Sales", emailLocalPart: "sam", password: PW, level: "sales" } });
    expect(created.status).toBe(200);
    expect(created.body.user).toMatchObject({ email: "sam@kayad.space", role: "marketing", level: "sales" });
    expect(userCreate.mock.calls[0][0]).toMatchObject({ email: "sam@kayad.space", role: "marketing" });
    expect(updates.find(([, p]) => p.grantedPermissions)[1]).toEqual(levels.permissionDeltaFor(SALES));
    expect((await call("DELETE", "/api/admin/staff/levels/sales", { as: "owner" })).status).toBe(409);
    const edit = await call("PUT", "/api/admin/staff/levels/sales", { as: "owner", body: { ...SALES, permissions: ["manage_cars"] } });
    expect(edit.status).toBe(200); expect(edit.body.membersUpdated).toBe(1);
    const reapplied = updates.filter(([, p]) => p.role === 'marketing').at(-1)[1];
    expect(reapplied).toMatchObject({ revokedPermissions: expect.arrayContaining(['manage_ads']) });
    expect(getEffectivePermissions({ role: 'marketing', ...reapplied })).toEqual(['manage_cars']);
  });
  test("a deletable (unused) level can be removed", async () => {
    await call("POST", "/api/admin/staff/levels", { as: "owner", body: SALES });
    expect((await call("DELETE", "/api/admin/staff/levels/sales", { as: "owner" })).status).toBe(200);
    expect((await call("GET", "/api/admin/staff/levels", { as: "owner" })).body.levels).toEqual([]);
  });
  test("unknown level is refused and nothing is created", async () => {
    const r = await call("POST", "/api/admin/staff", { as: "owner", body: { name: "X Y", email: "x@kayad.space", password: PW, level: "ghost" } });
    expect(r.status).toBe(400); noMutation();
  });
  test("moving a member to a built-in role drops the level and its custom grants", async () => {
    await call("POST", "/api/admin/staff/levels", { as: "owner", body: SALES });
    await call("POST", "/api/admin/staff", { as: "owner", body: { name: "Sam Sales", emailLocalPart: "sam", password: PW, level: "sales" } });
    const cfg = await levels.getStaffConfig(); const uid = Object.keys(cfg.assignments)[0] || ID(99);
    users[uid] = mk(uid, "marketing", "sam@kayad.space");
    const r = await call("PUT", `/api/admin/staff/${uid}`, { as: "owner", body: { role: "hr" } });
    expect(r.status).toBe(200);
    expect(saves.mock.calls.at(-1)[1]).toMatchObject({ role: "hr", grantedPermissions: [], revokedPermissions: [] });
    expect((await levels.getStaffConfig()).assignments[uid]).toBeUndefined();
  });
});

describe("company e-mail policy", () => {
  test("pure resolver builds name@domain and enforces the domain only when required", () => {
    const on = { companyEmailDomain: "kayad.space", requireCompanyEmail: true };
    expect(levels.resolveStaffEmail({ emailLocalPart: "Jane.Doe" }, on)).toEqual({ ok: true, email: "jane.doe@kayad.space" });
    expect(levels.resolveStaffEmail({ email: "jane@gmail.com" }, on).ok).toBe(false);
    expect(levels.resolveStaffEmail({ email: "jane@gmail.com" }, { ...on, requireCompanyEmail: false }).ok).toBe(true);
    expect(levels.resolveStaffEmail({ emailLocalPart: "a b" }, on).ok).toBe(false);
    expect(levels.resolveStaffEmail({ emailLocalPart: "x" }, { companyEmailDomain: "", requireCompanyEmail: false }).ok).toBe(false);
  });
  test("owner turns enforcement on; an outside address is then refused", async () => {
    expect((await call("PUT", "/api/admin/staff/email-policy", { as: "owner", body: { companyEmailDomain: "@Kayad.space", requireCompanyEmail: true } })).body).toMatchObject({ companyEmailDomain: "kayad.space", requireCompanyEmail: true });
    const bad = await call("POST", "/api/admin/staff", { as: "owner", body: { name: "Out Side", email: "out@gmail.com", password: PW, role: "hr" } });
    expect(bad.status).toBe(400); noMutation();
    const ok = await call("POST", "/api/admin/staff", { as: "owner", body: { name: "In Side", emailLocalPart: "inside", password: PW, role: "hr" } });
    expect(ok.status).toBe(200); expect(ok.body.user.email).toBe("inside@kayad.space");
  });
  test("policy validation: bad domain, requiring without a domain, non-owner", async () => {
    expect((await call("PUT", "/api/admin/staff/email-policy", { as: "owner", body: { companyEmailDomain: "not a domain", requireCompanyEmail: false } })).status).toBe(400);
    expect((await call("PUT", "/api/admin/staff/email-policy", { as: "owner", body: { companyEmailDomain: "", requireCompanyEmail: true } })).status).toBe(400);
    expect([401, 403]).toContain((await call("PUT", "/api/admin/staff/email-policy", { as: "admin", body: { companyEmailDomain: "kayad.space", requireCompanyEmail: false } })).status);
  });
});

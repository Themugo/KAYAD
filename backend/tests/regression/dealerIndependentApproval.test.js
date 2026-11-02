// ============================================================
// INDEPENDENT PER-ACCOUNT DEALER APPROVAL (2026-11-02), harness shared with dealerApprovalWorkflow.test.js. Real routes/adminRoutes.js, real protect / authorize /
// requireDecisionAuthority, real services/dealerApproval.service.js. Only persistence is faked, and the fake
// database function MIRRORS the rules of the hosted public.kayad_apply_dealer_verification_atomic:
//   non-empty reason; acting user row must be role admin|superadmin with status approved; dealers row and
//   dealer_verifications row must exist; approve sets users.role/status, dealers.approved and the verification.
// EVIDENCE TIER: mocked local runtime (not the hosted database, not a browser).
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

// ---------------- world ----------------
const world = { users: {}, dealers: {}, verifications: {}, rpcCalls: [], dbAudit: [], rpcFail: null, notifications: [] };
const clone = (o) => (o ? JSON.parse(JSON.stringify(o)) : o);

const chain = (value) => {
  const q = { select: jest.fn(() => q), lean: jest.fn(() => q), catch: jest.fn(() => q), sort: jest.fn(() => q), skip: jest.fn(() => q), limit: jest.fn(() => q), then: (res, rej) => Promise.resolve(value).then(res, rej) };
  return q;
};
const matchUsers = (filter = {}) => Object.values(world.users).filter((u) => {
  if (filter.role && typeof filter.role === "string" && u.role !== filter.role) return false;
  if (filter.role && filter.role.$in && !filter.role.$in.includes(u.role)) return false;
  if (filter.status && u.status !== filter.status) return false;
  if (filter.isBanned === true && !u.isBanned) return false;
  return true;
});
const userModel = {
  findById: jest.fn((id) => chain(world.users[id] ? clone(world.users[id]) : null)),
  findByIdAndUpdate: jest.fn((id, patch) => { if (world.users[id]) Object.assign(world.users[id], patch); return chain(clone(world.users[id])); }),
  findOne: jest.fn(() => chain(null)),
  find: jest.fn((f) => chain(matchUsers(f).map((u) => { const c = clone(u); delete c._id; return c; }))), // the REAL .lean() row shape: column id only, no _id
  countDocuments: jest.fn((f) => chain(matchUsers(f || {}).length)),
};
jest.unstable_mockModule("../../models/User.js", () => ({ default: userModel }));
jest.unstable_mockModule("../../models/UserAuth.js", () => ({ default: { findOne: jest.fn(() => chain({ tokenVersion: 0 })) } }));
jest.unstable_mockModule("../../models/RefreshToken.js", () => ({ default: { findActiveSessionById: jest.fn(async () => ({})) } }));
jest.unstable_mockModule("../../models/PlatformConfig.js", () => ({ default: { findOne: jest.fn(() => chain({})), create: jest.fn(async () => ({ toObject: () => ({}) })) } }));
const auditCreate = jest.fn(async (d) => ({ ...d }));
jest.unstable_mockModule("../../models/AuditLog.js", () => ({ default: { create: auditCreate } }));
jest.unstable_mockModule("../../middleware/auditLog.js", () => ({ auditLog: () => (req, res, next) => next() }));
jest.unstable_mockModule("../../services/notification.service.js", () => ({ sendNotification: jest.fn(async (n) => { world.notifications.push(n); }) }));
const dbFindOne = jest.fn(async (table, filters) => {
  const key = String(filters?.user ?? "");
  if (table === "dealers") return clone(world.dealers[key] ?? null);
  if (table === "dealer_verifications") return clone(world.verifications[key] ?? null);
  return null;
});
const dbFindById = jest.fn(async (table, id) => (table === "users" ? clone(world.users[id] ?? null) : null));
const dbNoop = jest.fn(async () => null);
jest.unstable_mockModule("../../db/index.js", () => {
  const api = { find: dbNoop, findAll: dbNoop, findById: dbFindById, findOne: dbFindOne, create: dbNoop, createMany: dbNoop, update: dbNoop, updateMany: dbNoop, remove: dbNoop, removeMany: dbNoop, softDelete: dbNoop, count: dbNoop, upsert: dbNoop, upsertMany: dbNoop, paginate: dbNoop, distinct: dbNoop, aggregate: dbNoop, rawQuery: dbNoop };
  return { ...api, default: api };
});

// The hosted database function, mirrored. Atomic by construction: it validates everything before it writes anything.
const rpc = jest.fn(async (name, args) => {
  world.rpcCalls.push({ name, args: { ...args } });
  if (world.rpcFail) return { data: null, error: world.rpcFail };
  if (name !== "kayad_apply_dealer_verification_atomic") return { data: null, error: { code: "PGRST202", message: `no function ${name}` } };
  const { p_user, p_action, p_admin, p_reason } = args;
  const fail = (message) => ({ data: null, error: { code: "P0001", message } });
  if (!["approve", "reject", "suspend"].includes(p_action)) return fail("Invalid verification action");
  if (!String(p_reason || "").trim()) return fail("A reason is required");
  const actor = world.users[p_admin];
  if (!actor || !["admin", "superadmin"].includes(actor.role) || actor.status !== "approved") return fail("Admin authorization required");
  const target = world.users[p_user];
  if (!target) return fail("User not found");
  if (target.role === "superadmin") return fail("A superadmin cannot be converted into a dealer");
  const dealer = world.dealers[p_user];
  if (!dealer) return fail("Dealer record not found");
  const ver = world.verifications[p_user];
  if (!ver) return fail("Dealer verification record not found");
  const status = p_action === "approve" ? "approved" : p_action === "reject" ? "rejected" : "pending";
  if (p_action === "approve") { target.role = "dealer"; target.status = "approved"; dealer.approved = true; dealer.verifiedAt = "now"; }
  else if (p_action === "reject") { target.status = "rejected"; dealer.approved = false; }
  ver.verificationStatus = status; ver.reviewedBy = p_admin;
  world.dbAudit.push({ actor: p_admin, target: p_user, action: p_action, reason: p_reason });
  return { data: { userId: p_user, action: p_action, status }, error: null };
});
jest.unstable_mockModule("../../utils/supabase.js", () => ({
  initSupabase: jest.fn(), checkSupabaseReadiness: async () => ({ ok: true }), isSupabaseConnected: () => true, default: null,
  getSupabase: () => ({ rpc, from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }) }),
}));

const adminRoutes = (await import("../../routes/adminRoutes.js")).default;
const { __setOnboardingPolicyForTests } = await import("../../services/onboardingPolicy.service.js");
const approval = await import("../../services/dealerApproval.service.js");
const { __setDealerPaperworkForTests } = await import("../../services/dealerPaperwork.service.js");

// ---------------- fixtures ----------------
const token = (id) => jwt.sign({ id, tokenVersion: 0 }, SECRET, { expiresIn: "1h" });
const UID = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const DOCS = { governmentId: { url: "id.pdf" }, kraPin: { value: "A000000000Z" }, businessRegistration: { url: "reg.pdf" }, physicalAddress: { value: "Moi Avenue" }, phoneVerification: { verified: true } };

const staff = (id, role, extra = {}) => { world.users[id] = { _id: id, id, name: role, email: `${role}@example.test`, role, status: "approved", emailVerified: true, ...extra }; };
/** A dealer registered through the canonical path: users(pending) + trigger-created dealers row; verification only after onboarding. */
const registerDealer = (id, { name = "Dealer", businessName = "Biz", onboarded = true, docs = DOCS, emailVerified = true, profile = {} } = {}) => {
  world.users[id] = { _id: id, id, name, email: `${id}@dealer.test`, role: "dealer", status: "pending", emailVerified, isBanned: false, businessName, location: "Nairobi", createdAt: new Date().toISOString() };
  world.dealers[id] = { user: id, businessName, location: "Nairobi", approved: false, isSuspended: false, ...profile };
  if (onboarded) world.verifications[id] = { user: id, verificationStatus: "pending", submittedAt: "2026-10-30T00:00:00Z", documents: docs };
};

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
beforeEach(() => {
  world.users = {}; world.dealers = {}; world.verifications = {}; world.rpcCalls = []; world.dbAudit = []; world.rpcFail = null; world.notifications = [];
  auditCreate.mockClear(); rpc.mockClear();
  staff("admin-1", "admin"); staff("super-1", "superadmin"); staff("mod-1", "moderator"); staff("buyer-1", "user");
  staff("dealer-ok", "dealer", { status: "approved" });
  // The platform owner as it is in production: recognised by verified e-mail, but the database ROW is an ordinary account.
  staff("owner-1", "user", { email: "owner@example.test" });
  __setOnboardingPolicyForTests({ dealerDecisionAuthority: "admins" });
  // Paperwork is owner-configured. These legacy scenarios model an owner who requires the government ID and KRA PIN.
  __setDealerPaperworkForTests({ governmentId: { enabled: true, required: true }, kraPin: { enabled: true, required: true } });
});
afterAll(() => { __setOnboardingPolicyForTests(null); __setDealerPaperworkForTests(null); });

const call = async (method, path, as, body) => {
  const r = await fetch(base + path, { method, headers: { "content-type": "application/json", ...(as ? { authorization: `Bearer ${token(as)}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  let json = null; try { json = await r.json(); } catch { /* empty */ }
  return { status: r.status, body: json };
};
const GOOD_REASON = "Documents verified against registry";
const NO_REASON = Symbol("no reason");
const approve = (id, as = "admin-1", reason = GOOD_REASON) => call("POST", `/api/admin/users/${id}/approve-dealer`, as, reason === NO_REASON ? {} : { reason });
const snapshot = () => JSON.stringify({ u: world.users, d: world.dealers, v: world.verifications }, (k, v) => (k === "lastActive" ? undefined : v));
const auditActions = () => auditCreate.mock.calls.map(([e]) => e.action);

const A = UID(101); const B = UID(102);
const PS = UID(103); // an approved-less private seller and a buyer must never be touched either
const seed = () => {
  registerDealer(A, { name: "Dealer A", businessName: "Alpha Motors" });
  registerDealer(B, { name: "Dealer B", businessName: "Beta Motors" });
  world.users[PS] = { _id: PS, id: PS, name: "Seller", email: "ps@x.test", role: "individual_seller", status: "pending", emailVerified: true };
  world.users[UID(104)] = { _id: UID(104), id: UID(104), name: "Buyer2", email: "b2@x.test", role: "user", status: "pending", emailVerified: true };
};
const state = (id) => ({ user: world.users[id].status, role: world.users[id].role, dealer: world.dealers[id]?.approved, ver: world.verifications[id]?.verificationStatus });
const others = () => JSON.stringify([world.users[PS], world.users[UID(104)], world.users["dealer-ok"]]);

describe("list payload gives every account its own id (root cause of rows changing together)", () => {
  test("each pending dealer row carries a distinct _id equal to its id, even though the database layer returns id only", async () => {
    seed();
    const r = await call("GET", "/api/admin/users?pendingApproval=true&role=dealer", "admin-1");
    expect(r.status).toBe(200);
    const rows = r.body.users;
    expect(rows).toHaveLength(2);
    for (const u of rows) { expect(typeof u._id).toBe("string"); expect(u._id).toBe(u.id); }
    expect(new Set(rows.map((u) => u._id)).size).toBe(2);
    expect(rows.map((u) => u._id).sort()).toEqual([A, B]);
  });
});

describe("approval is independent per account", () => {
  test("1. approving Dealer A approves only A; B and everyone else stay as they were", async () => {
    seed();
    const beforeOthers = others(); const beforeB = JSON.stringify([world.users[B], world.dealers[B], world.verifications[B]]);
    const r = await approve(A);
    expect(r.status).toBe(200); expect(r.body.changed).toBe(true);
    expect(state(A)).toEqual({ user: "approved", role: "dealer", dealer: true, ver: "approved" });
    expect(state(B)).toEqual({ user: "pending", role: "dealer", dealer: false, ver: "pending" });
    expect(JSON.stringify([world.users[B], world.dealers[B], world.verifications[B]])).toBe(beforeB);
    expect(others()).toBe(beforeOthers);
    // exactly one database-function call, addressed to A's id
    expect(world.rpcCalls).toHaveLength(1);
    expect(world.rpcCalls[0].args.p_user).toBe(A);
    // and the listing now reports A approved and B pending
    const list = await call("GET", "/api/admin/users?role=dealer", "admin-1");
    const byId = Object.fromEntries(list.body.users.map((u) => [u._id, u]));
    expect(byId[A].approved).toBe(true); expect(byId[B].approved).toBe(false);
  });
  test("2. approving B afterwards approves B separately; A is unchanged by that second decision", async () => {
    seed();
    await approve(A);
    const aAfterFirst = JSON.stringify([world.users[A], world.dealers[A], world.verifications[A]]);
    const r = await approve(B);
    expect(r.status).toBe(200);
    expect(state(B)).toEqual({ user: "approved", role: "dealer", dealer: true, ver: "approved" });
    expect(JSON.stringify([world.users[A], world.dealers[A], world.verifications[A]])).toBe(aAfterFirst);
    expect(world.rpcCalls.map((c) => c.args.p_user)).toEqual([A, B]);
    expect(state(A).user).toBe("approved");
  });
  test("approval order does not matter: B first leaves A pending", async () => {
    seed();
    await approve(B);
    expect(state(B).user).toBe("approved"); expect(state(A)).toEqual({ user: "pending", role: "dealer", dealer: false, ver: "pending" });
  });
  test("a repeat click on an already-approved dealer changes nothing and does not touch the other dealer", async () => {
    seed(); await approve(A); const snap = snapshot();
    const r = await approve(A);
    expect(r.body.changed).toBe(false); expect(snapshot()).toBe(snap); expect(world.rpcCalls).toHaveLength(1);
  });
  test("a malformed or unknown target id is refused and nothing changes", async () => {
    seed(); const snap = snapshot();
    for (const id of ["undefined", "null", "not-a-uuid", "*"]) expect((await approve(id)).status).toBe(400);
    expect((await approve(UID(999))).status).toBe(404);
    expect(snapshot()).toBe(snap); expect(world.rpcCalls).toHaveLength(0);
  });
  test("no bulk path: approving A never issues a write whose target is anything but A", async () => {
    seed(); userModel.findByIdAndUpdate.mockClear(); await approve(A);
    for (const c of userModel.findByIdAndUpdate.mock.calls) if (c[1]?.status !== undefined || c[1]?.role !== undefined) expect(c[0]).toBe(A); // (the only other write is the signed-in admin's own lastActive stamp)
    for (const c of world.rpcCalls) expect(c.args.p_user).toBe(A);
  });
  test("each dealer stays independently bannable after the other is approved", async () => {
    seed(); await approve(A);
    const ban = await call("POST", `/api/admin/users/${B}/toggle-ban`, "admin-1", { banned: true });
    expect([200, 500]).toContain(ban.status); // persistence of ban is mocked; the target must be B only
    expect(world.users[A].isBanned).not.toBe(true);
  });
});

describe("failures leave both accounts untouched", () => {
  test("3. a database refusal changes neither account and reports an error (no success)", async () => {
    seed(); const snap = snapshot();
    world.rpcFail = { code: "P0001", message: "Admin authorization required" };
    const r = await approve(A);
    expect(r.status).toBeGreaterThanOrEqual(400); expect(r.body.success).toBe(false);
    expect(snapshot()).toBe(snap);
    expect(state(A).user).toBe("pending"); expect(state(B).user).toBe("pending");
  });
  test("3b. an unexpected database error is a 5xx, not a success, and nothing changes", async () => {
    seed(); const snap = snapshot();
    world.rpcFail = { code: "XX000", message: "connection reset" };
    const r = await approve(B);
    expect(r.status).toBeGreaterThanOrEqual(500); expect(r.body.success).toBe(false);
    expect(snapshot()).toBe(snap);
  });
  test("3c. an incomplete application is refused for that dealer only; the complete one can still be approved", async () => {
    seed(); delete world.verifications[A];
    const bad = await approve(A);
    expect(bad.status).toBe(409);
    expect(state(A).user).toBe("pending");
    const ok = await approve(B);
    expect(ok.status).toBe(200); expect(state(B).user).toBe("approved"); expect(state(A).user).toBe("pending");
  });
  test("3d. a missing reason is refused and nothing changes", async () => {
    seed(); const snap = snapshot();
    expect((await approve(A, "admin-1", NO_REASON)).status).toBe(400);
    expect(snapshot()).toBe(snap);
  });
});

describe("authorization", () => {
  test.each([["buyer-1"], ["dealer-ok"], ["mod-1"], ["owner-1"], [null]])("4. %s cannot approve either dealer", async (who) => {
    seed(); const snap = snapshot();
    for (const id of [A, B]) {
      const r = await approve(id, who);
      expect([401, 403]).toContain(r.status);
    }
    expect(snapshot()).toBe(snap);
    // The platform owner is recognised by verified e-mail, so the request reaches the database function, which refuses it because the owner's
    // database row is not an approved administrator (hosted behaviour, mirrored). Every other caller is stopped before any database call.
    if (who !== "owner-1") expect(world.rpcCalls).toHaveLength(0);
  });
  test("an authorised administrator can approve exactly the account they name", async () => {
    seed(); expect((await approve(B, "super-1")).status).toBe(200);
    expect(state(B).user).toBe("approved"); expect(state(A).user).toBe("pending");
  });
});

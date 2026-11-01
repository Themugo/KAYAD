// ============================================================
// DEALER REGISTRATION → ADMIN APPROVAL (2026-11-01). Real routes/adminRoutes.js, real protect / authorize /
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
  find: jest.fn((f) => chain(matchUsers(f).map(clone))),
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
});
afterAll(() => __setOnboardingPolicyForTests(null));

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

// ================= 1-3: registration contract (service-level pins; the HTTP registration path is covered by registrationFlow / registrationSafety) =================
describe("registration → pending queue (scenarios 1, 4)", () => {
  test("a registered dealer is pending, has a profile row and appears in Seller Management with what it still lacks", async () => {
    registerDealer(UID(1), { name: "Complete", onboarded: true });
    registerDealer(UID(2), { name: "NoDocs", onboarded: false });
    const r = await call("GET", "/api/admin/users?role=dealer&status=pending", "admin-1");
    expect(r.status).toBe(200);
    const rows = Object.fromEntries(r.body.users.map((u) => [u._id, u]));
    expect(Object.keys(rows).sort()).toEqual([UID(1), UID(2)]);
    expect(rows[UID(1)].status).toBe("pending");
    expect(rows[UID(1)].application.blockers).toEqual([]);
    expect(rows[UID(2)].application.blockers.map((b) => b.code)).toContain("DEALER_VERIFICATION_NOT_SUBMITTED");
    expect(rows[UID(2)].approved).toBe(false);
  });
  test("an unreadable application store is reported as unknown (null), never as complete", async () => {
    registerDealer(UID(3));
    dbFindOne.mockRejectedValueOnce(new Error("db down"));
    const r = await call("GET", "/api/admin/users?role=dealer&status=pending", "admin-1");
    expect(r.status).toBe(200);
    expect(r.body.users.find((u) => u._id === UID(3)).application).toBeNull();
  });
});

// ================= 5, 7, 9: approval =================
describe("an authorized administrator approves a valid pending dealer (scenarios 5, 7, 9)", () => {
  test.each(["admin-1", "super-1"])("%s: approves, persists across a reload, and the audit trail names actor, target, previous and new status, reason", async (actor) => {
    registerDealer(UID(10));
    const r = await approve(UID(10), actor);
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ success: true, changed: true });
    // server state (not the response) is what proves it
    expect(world.users[UID(10)]).toMatchObject({ role: "dealer", status: "approved" });
    expect(world.dealers[UID(10)].approved).toBe(true);
    expect(world.verifications[UID(10)].verificationStatus).toBe("approved");
    // reload: the pending queue no longer has it, the approved list does
    const pending = await call("GET", "/api/admin/users?role=dealer&status=pending", actor);
    const approved = await call("GET", "/api/admin/users?role=dealer&status=approved", actor);
    expect(pending.body.users.map((u) => u._id)).not.toContain(UID(10));
    const row = approved.body.users.find((u) => u._id === UID(10));
    expect(row).toMatchObject({ status: "approved", approved: true, verificationStatus: "verified" });
    // audit: database-function row + route audit row
    expect(world.dbAudit).toEqual([{ actor, target: UID(10), action: "approve", reason: "Documents verified against registry" }]);
    const entry = auditCreate.mock.calls.map(([e]) => e).find((e) => e.action === "Dealer decision: approve-dealer");
    expect(entry).toBeTruthy();
    expect(entry.details).toMatchObject({ outcome: "success", targetUserId: UID(10), previousStatus: "pending", newStatus: "approved", reason: "Documents verified against registry" });
    expect(entry.adminId || entry.admin).toBeTruthy();
  });
  test("the dealer is told once", async () => {
    registerDealer(UID(11));
    await approve(UID(11));
    await new Promise((r) => setImmediate(r));
    expect(world.notifications.filter((n) => n.title === "Seller Account Approved")).toHaveLength(1);
  });
});

// ================= 6: authorization =================
describe("who may approve (scenario 6)", () => {
  test.each([["buyer-1"], ["dealer-ok"], ["mod-1"]])("%s is refused and nothing changes", async (actor) => {
    registerDealer(UID(20));
    const before = snapshot();
    const r = await approve(UID(20), actor);
    expect(r.status).toBe(403);
    expect(snapshot()).toBe(before);
    expect(world.rpcCalls).toHaveLength(0);
  });
  test("unauthenticated ⇒ 401", async () => {
    registerDealer(UID(21));
    expect((await approve(UID(21), null)).status).toBe(401);
    expect(world.rpcCalls).toHaveLength(0);
  });
  test("owner-only decision authority refuses a plain admin (server-side), before anything is read or written", async () => {
    __setOnboardingPolicyForTests({ dealerDecisionAuthority: "owner_only" });
    registerDealer(UID(22));
    const before = snapshot();
    const r = await approve(UID(22), "admin-1");
    expect(r.status).toBe(403);
    expect(r.body.code).toBe("DECISION_AUTHORITY_REQUIRED");
    expect(snapshot()).toBe(before);
    expect(world.rpcCalls).toHaveLength(0);
  });
  test("PRODUCTION CONDITION: the owner (recognised by e-mail, database row is an ordinary account) is told exactly what is missing and nothing changes", async () => {
    __setOnboardingPolicyForTests({ dealerDecisionAuthority: "owner_only" });
    registerDealer(UID(23));
    const before = snapshot();
    const r = await approve(UID(23), "owner-1");
    expect(r.status).toBe(403);
    expect(r.body.code).toBe("ADMIN_ACCOUNT_REQUIRED");
    expect(r.body.message).toMatch(/admin or superadmin/);
    expect(snapshot()).toBe(before);
    expect(world.dbAudit).toHaveLength(0);
    const refused = auditCreate.mock.calls.map(([e]) => e).find((e) => e.action === "Dealer decision: approve-dealer refused");
    expect(refused.details).toMatchObject({ outcome: "refused", code: "ADMIN_ACCOUNT_REQUIRED", previousStatus: "pending" });
  });
});

// ================= 8: ineligible records =================
describe("approval is refused for invalid, missing, already-approved or ineligible records (scenario 8)", () => {
  test("missing user ⇒ 404, nothing written", async () => {
    const r = await approve(UID(99));
    expect(r.status).toBe(404);
    expect(world.rpcCalls).toHaveLength(0);
  });
  test("malformed id ⇒ 400/404, never 200", async () => {
    const r = await call("POST", "/api/admin/users/not-an-id/approve-dealer", "admin-1", { reason: "Documents verified against registry" });
    expect([400, 404]).toContain(r.status);
    expect(world.rpcCalls).toHaveLength(0);
  });
  test("a non-seller account cannot be approved here", async () => {
    const r = await approve("buyer-1");
    expect(r.status).toBe(400);
    expect(world.users["buyer-1"].role).toBe("user");
  });
  test("a reason is required and is the operator's: none / too short ⇒ 400, nothing written", async () => {
    registerDealer(UID(30));
    const before = snapshot();
    for (const reason of [NO_REASON, "", "   ", "short"]) {
      const r = await approve(UID(30), "admin-1", reason);
      expect(r.status).toBe(400);
      expect(r.body.code).toBe("REASON_REQUIRED");
    }
    expect(snapshot()).toBe(before);
    expect(world.rpcCalls).toHaveLength(0);
  });
  test.each([
    ["no verification submitted", { onboarded: false }, "DEALER_VERIFICATION_NOT_SUBMITTED"],
    ["required document missing", { docs: { ...DOCS, kraPin: undefined } }, "DEALER_DOCUMENTS_INCOMPLETE"],
    ["business name missing", { profile: { businessName: "" } }, "DEALER_PROFILE_INCOMPLETE"],
    ["dealer suspended", { profile: { isSuspended: true } }, "DEALER_SUSPENDED"],
  ])("incomplete application (%s) is refused with the blocker and is NOT silently approved", async (_n, opts, code) => {
    registerDealer(UID(31), opts);
    const before = snapshot();
    const r = await approve(UID(31));
    expect(r.status).toBe(409);
    expect(r.body.code).toBe("DEALER_APPLICATION_INCOMPLETE");
    expect(r.body.blockers.map((b) => b.code)).toContain(code);
    expect(snapshot()).toBe(before);
    expect(world.rpcCalls).toHaveLength(0);
  });
  test("no dealer profile at all ⇒ DEALER_PROFILE_MISSING blocker (the hosted state of the two pending accounts)", async () => {
    registerDealer(UID(32), { onboarded: false });
    delete world.dealers[UID(32)];
    const r = await approve(UID(32));
    expect(r.status).toBe(409);
    expect(r.body.blockers.map((b) => b.code)).toEqual(expect.arrayContaining(["DEALER_PROFILE_MISSING", "DEALER_VERIFICATION_NOT_SUBMITTED"]));
    expect(world.users[UID(32)].status).toBe("pending");
  });
  test("a previously rejected application is not approved without resubmission", async () => {
    registerDealer(UID(33));
    world.verifications[UID(33)].verificationStatus = "rejected";
    const r = await approve(UID(33));
    expect(r.status).toBe(409);
    expect(r.body.blockers.map((b) => b.code)).toContain("DEALER_VERIFICATION_REJECTED");
  });
  test("a banned account is not approved", async () => {
    registerDealer(UID(34));
    world.users[UID(34)].isBanned = true;
    const r = await approve(UID(34));
    expect(r.status).toBe(409);
    expect(r.body.blockers.map((b) => b.code)).toContain("ACCOUNT_BANNED");
  });
  test("unverified e-mail does not block, but is reported as a warning", async () => {
    registerDealer(UID(35), { emailVerified: false });
    const r = await approve(UID(35));
    expect(r.status).toBe(200);
    expect(r.body.warnings.map((w) => w.code)).toContain("EMAIL_NOT_VERIFIED");
  });
  test("a staff account cannot be pushed through dealer approval", async () => {
    const r = await approve("super-1", "super-1");
    expect(r.status).toBe(400);
    expect(world.users["super-1"].role).toBe("superadmin");
    expect(world.rpcCalls).toHaveLength(0);
  });
});

// ================= 11: failed approval =================
describe("a failed approval leaves state intact and says why (scenario 11)", () => {
  test.each([
    [{ code: "PGRST202", message: "Could not find the function" }, 503, "DATABASE_MIGRATION_REQUIRED"],
    [{ code: "P0001", message: "Administrative changes are locked (changes are locked)" }, 423, "ADMIN_CHANGES_LOCKED"],
    [{ code: "P0001", message: "capability is disabled or unknown" }, 503, "ADMIN_CAPABILITY_UNAVAILABLE"],
  ])("database refusal %j ⇒ %s %s, state untouched", async (error, status, code) => {
    registerDealer(UID(40));
    world.rpcFail = error;
    const before = snapshot();
    const r = await approve(UID(40));
    expect(r.status).toBe(status);
    expect(r.body.code).toBe(code);
    expect(r.body.message.length).toBeGreaterThan(20);
    expect(snapshot()).toBe(before);
    expect(auditActions()).not.toContain("Dealer decision: approve-dealer");
    expect(world.notifications).toHaveLength(0);
  });
  test("an unexpected database error is a 500, not a success, and nothing changes", async () => {
    registerDealer(UID(41));
    world.rpcFail = { code: "XX000", message: "boom" };
    const before = snapshot();
    const r = await approve(UID(41));
    expect(r.status).toBeGreaterThanOrEqual(500);
    expect(r.body.success).toBe(false);
    expect(snapshot()).toBe(before);
    expect(world.notifications).toHaveLength(0);
  });
});

// ================= 12: retry / duplicates =================
describe("retry creates no duplicate records or side effects (scenario 12)", () => {
  test("a second request for an approved dealer is a no-op", async () => {
    registerDealer(UID(50));
    expect((await approve(UID(50))).body.changed).toBe(true);
    const r2 = await approve(UID(50));
    expect(r2.status).toBe(200);
    expect(r2.body).toMatchObject({ changed: false, alreadyApproved: true });
    await new Promise((r) => setImmediate(r));
    expect(world.rpcCalls).toHaveLength(1);
    expect(world.dbAudit).toHaveLength(1);
    expect(auditActions().filter((a) => a === "Dealer decision: approve-dealer")).toHaveLength(1);
    expect(world.notifications.filter((n) => n.title === "Seller Account Approved")).toHaveLength(1);
  });
  test("two simultaneous clicks produce exactly one decision and one set of side effects", async () => {
    registerDealer(UID(51));
    const [a, b] = await Promise.all([approve(UID(51)), approve(UID(51), "super-1")]);
    expect([a.status, b.status]).toEqual([200, 200]);
    expect([a.body.changed, b.body.changed].sort()).toEqual([false, true]);
    await new Promise((r) => setImmediate(r));
    expect(world.rpcCalls).toHaveLength(1);
    expect(world.dbAudit).toHaveLength(1);
    expect(auditActions().filter((x) => x === "Dealer decision: approve-dealer")).toHaveLength(1);
    expect(world.notifications.filter((n) => n.title === "Seller Account Approved")).toHaveLength(1);
  });
  test("retrying after a refusal that was then fixed succeeds once", async () => {
    registerDealer(UID(52), { onboarded: false });
    expect((await approve(UID(52))).status).toBe(409);
    world.verifications[UID(52)] = { user: UID(52), verificationStatus: "pending", submittedAt: "t", documents: DOCS };
    expect((await approve(UID(52))).status).toBe(200);
    expect(world.rpcCalls).toHaveLength(1);
  });
  test("a stale list row (approved by someone else meanwhile) is handled as already approved, not re-decided", async () => {
    registerDealer(UID(53));
    await approve(UID(53), "super-1");
    const stale = await approve(UID(53), "admin-1");
    expect(stale.body.alreadyApproved).toBe(true);
    expect(world.rpcCalls).toHaveLength(1);
  });
});

// ================= verify-dealer (reject / approve) shares the same rules =================
describe("verify-dealer uses the same validation, reason and error mapping", () => {
  test("approve via verify-dealer is validated like approve-dealer", async () => {
    registerDealer(UID(60), { onboarded: false });
    const r = await call("POST", `/api/admin/users/${UID(60)}/verify-dealer`, "admin-1", { action: "approve", reason: "Documents verified against registry" });
    expect(r.status).toBe(409);
    expect(world.users[UID(60)].status).toBe("pending");
  });
  test("reject needs a reason and records it; the account is not approved", async () => {
    registerDealer(UID(61));
    expect((await call("POST", `/api/admin/users/${UID(61)}/verify-dealer`, "admin-1", { action: "reject" })).status).toBe(400);
    const r = await call("POST", `/api/admin/users/${UID(61)}/verify-dealer`, "admin-1", { action: "reject", reason: "KRA PIN does not match registry" });
    expect(r.status).toBe(200);
    expect(world.users[UID(61)].status).toBe("rejected");
    expect(world.dbAudit.at(-1)).toMatchObject({ action: "reject", reason: "KRA PIN does not match registry" });
  });
});

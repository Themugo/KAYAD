// ============================================================
// DEALER PAPERWORK CONFIGURATION + SELLER/BUYER ONE-ACCOUNT CONVERGENCE (2026-11-01).
// Real routes/adminRoutes.js, real protect / authorize / requireDecisionAuthority, real dealerApproval + dealerPaperwork services.
// Only persistence is faked (users, dealers, dealer_verifications, system_settings with the same compare-and-swap rules).
// EVIDENCE TIER: mocked local runtime.
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
  if (filter._id && filter._id.$in && !filter._id.$in.includes(u._id)) return false;
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
const dbUpdate = jest.fn(async (table, id, patch) => {
  if (table !== "dealer_verifications") return null;
  const key = Object.keys(world.verifications).find((k) => world.verifications[k].id === id || k === id);
  if (key) Object.assign(world.verifications[key], patch);
  return clone(world.verifications[key] ?? null);
});
const dbFindAll = jest.fn(async (table, opts) => {
  if (table !== "dealers") return [];
  const f = opts?.filters || {};
  const ids = f.user?.$in || Object.keys(world.dealers);
  return ids.filter((i) => world.dealers[i] && (f.approved === undefined || world.dealers[i].approved === f.approved)).map((i) => clone(world.dealers[i]));
});
jest.unstable_mockModule("../../db/index.js", () => {
  const api = { find: dbNoop, findAll: dbFindAll, findById: dbFindById, findOne: dbFindOne, create: dbNoop, createMany: dbNoop, update: dbUpdate, updateMany: dbNoop, remove: dbNoop, removeMany: dbNoop, softDelete: dbNoop, count: dbNoop, upsert: dbNoop, upsertMany: dbNoop, paginate: dbNoop, distinct: dbNoop, aggregate: dbNoop, rawQuery: dbNoop };
  return { ...api, default: api };
});

// The hosted database function, mirrored. Atomic by construction: it validates everything before it writes anything.
// system_settings fake with the same revision compare-and-swap the real update relies on.
world.settings = {};
const settingsTable = (t) => ({
  select: () => ({ eq: (_c, key) => ({ maybeSingle: async () => ({ data: t === "system_settings" && world.settings[key] ? clone({ value: world.settings[key] }) : null, error: null }) }) }),
  insert: (row) => ({ select: async () => { if (world.settings[row.key]) return { data: null, error: { code: "23505", message: "dup" } }; world.settings[row.key] = clone(row.value); return { data: [{ key: row.key }], error: null }; } }),
  update: (patch) => { const f = {}; const q = { eq: (c, v) => { f[c] = v; return q; }, is: (c, v) => { f[c] = v; return q; }, select: async () => { const cur = world.settings[f.key]; if (!cur) return { data: [], error: null }; const want = f["value->>revision"]; if (want !== undefined && want !== null && String(cur.revision) !== String(want)) return { data: [], error: null }; world.settings[f.key] = clone(patch.value); return { data: [{ key: f.key }], error: null }; } }; return q; },
});
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
  getSupabase: () => ({ rpc, from: (t) => settingsTable(t) }),
}));

const adminRoutes = (await import("../../routes/adminRoutes.js")).default;
const { __setOnboardingPolicyForTests } = await import("../../services/onboardingPolicy.service.js");
const approval = await import("../../services/dealerApproval.service.js");
const { __setDealerPaperworkForTests } = await import("../../services/dealerPaperwork.service.js");


const { getDealerPaperworkPolicy, validateSubmission, evaluateRequirements, checklistFor, updateDealerPaperworkPolicy } = await import("../../services/dealerPaperwork.service.js");

const token = (id) => jwt.sign({ id, tokenVersion: 0 }, SECRET, { expiresIn: "1h" });
const UID = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const staff = (id, role, extra = {}) => { world.users[id] = { _id: id, id, name: role, email: `${role}@example.test`, role, status: "approved", emailVerified: true, ...extra }; };
const register = (id, { role = "dealer", status = "pending", docs, onboarded = true } = {}) => {
  world.users[id] = { _id: id, id, name: "Applicant", email: `${id}@a.test`, role, status, emailVerified: true, isBanned: false, businessName: "Biz", location: "Nairobi", createdAt: new Date().toISOString() };
  world.dealers[id] = { user: id, businessName: "Biz", location: "Nairobi", approved: false, isSuspended: false };
  if (onboarded) world.verifications[id] = { id: `ver-${id}`, user: id, verificationStatus: "pending", submittedAt: "2026-10-30T00:00:00Z", documents: docs ?? {} };
};
let server; let base;
beforeAll(async () => {
  const app = express(); app.use(express.json()); app.use("/api/admin", adminRoutes);
  app.use((err, req, res, _next) => res.status(err.statusCode || 500).json({ success: false, message: err.message }));
  server = http.createServer(app); await new Promise((r) => server.listen(0, "127.0.0.1", r)); base = `http://127.0.0.1:${server.address().port}`;
});
afterAll(() => new Promise((r) => server.close(r)));
beforeEach(() => {
  world.users = {}; world.dealers = {}; world.verifications = {}; world.rpcCalls = []; world.dbAudit = []; world.rpcFail = null; world.notifications = []; world.settings = {};
  auditCreate.mockClear(); rpc.mockClear();
  staff("admin-1", "admin"); staff("super-1", "superadmin");
  staff("owner-1", "user", { email: "owner@example.test" });
  __setOnboardingPolicyForTests({ dealerDecisionAuthority: "admins" });
  __setDealerPaperworkForTests(null);
});
afterAll(() => { __setOnboardingPolicyForTests(null); __setDealerPaperworkForTests(null); });
const call = async (method, path, as, body) => {
  const r = await fetch(base + path, { method, headers: { "content-type": "application/json", ...(as ? { authorization: `Bearer ${token(as)}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  let json = null; try { json = await r.json(); } catch { /* empty */ }
  return { status: r.status, body: json };
};
const REASON = "Reviewed and acceptable";
const approve = (id, as = "admin-1") => call("POST", `/api/admin/users/${id}/approve-dealer`, as, { reason: REASON });
const reject = (id, as = "admin-1") => call("POST", `/api/admin/users/${id}/verify-dealer`, as, { action: "reject", reason: REASON });
const snap = () => JSON.stringify({ u: world.users, d: world.dealers, v: world.verifications }, (k, v) => (k === "lastActive" ? undefined : v));
const ID = { type: "national_id", documentNumber: "12345678" };

describe("D. paperwork is admin-configured; the default is onboarding-friendly", () => {
  test("default configuration: no paperwork is asked for and none is required (the owner can switch items on)", async () => {
    const p = await getDealerPaperworkPolicy();
    expect(p.source).toBe("default");
    expect(Object.values(p.items).every((i) => !i.enabled && !i.required)).toBe(true);
    expect(checklistFor(p.items)).toEqual([]);
  });
  test("DEFAULT: a dealer with no documents is approvable with no paperwork warning at all", async () => {
    register(UID(5), { docs: {} });
    const r = await approve(UID(5));
    expect(r.status).toBe(200);
    expect((r.body.warnings || []).map((w) => w.code)).not.toContain("OPTIONAL_DOCUMENTS_NOT_SUPPLIED");
  });
  test("NO PAPERWORK AT ALL: a dealer with no documents and nothing required is approvable", async () => {
    __setDealerPaperworkForTests(Object.fromEntries(["governmentId", "kraPin", "businessRegistration", "physicalAddress", "phoneVerification"].map((k) => [k, { enabled: false, required: false }])));
    register(UID(1), { docs: {} });
    const r = await approve(UID(1));
    expect(r.status).toBe(200);
    expect(world.users[UID(1)]).toMatchObject({ role: "dealer", status: "approved" });
  });
  test("ALL OPTIONAL: approval proceeds with a non-blocking warning naming what was not supplied", async () => {
    __setDealerPaperworkForTests(Object.fromEntries(["governmentId", "kraPin", "businessRegistration", "physicalAddress", "phoneVerification"].map((k) => [k, { enabled: true, required: false }])));
    register(UID(2), { docs: {} });
    const r = await approve(UID(2));
    expect(r.status).toBe(200);
    expect(r.body.warnings.map((w) => w.code)).toContain("OPTIONAL_DOCUMENTS_NOT_SUPPLIED");
  });
  test("SELECTED REQUIRED + MISSING: refused with the blocker, nothing written", async () => {
    __setDealerPaperworkForTests({ kraPin: { enabled: true, required: true } });
    register(UID(3), { docs: { governmentId: ID } });
    const before = snap();
    const r = await approve(UID(3));
    expect(r.status).toBe(409);
    expect(r.body.blockers.map((b) => b.code)).toContain("DEALER_REQUIRED_DOCUMENTS_MISSING");
    expect(r.body.blockers[0].documents).toEqual(["kraPin"]);
    expect(snap()).toBe(before);
    expect(world.rpcCalls).toHaveLength(0);
  });
  test("SELECTED REQUIRED + supplied: approved even though other (optional) items are missing", async () => {
    __setDealerPaperworkForTests({ kraPin: { enabled: true, required: true } });
    register(UID(4), { docs: { kraPin: { pinNumber: "A000000000Z" } } });
    expect((await approve(UID(4))).status).toBe(200);
  });
  test("CHANGED MID-APPLICATION: relaxing a requirement unblocks, tightening re-blocks; stored documents are never deleted", async () => {
    register(UID(5), { docs: { governmentId: ID } });
    __setDealerPaperworkForTests({ kraPin: { enabled: true, required: true } });
    expect((await call("GET", "/api/admin/users?role=dealer", "admin-1")).body.users.find((u) => u._id === UID(5)).application.blockers.length).toBe(1);
    __setDealerPaperworkForTests({ kraPin: { enabled: false, required: false } });
    expect((await call("GET", "/api/admin/users?role=dealer", "admin-1")).body.users.find((u) => u._id === UID(5)).application.blockers).toEqual([]);
    expect(world.verifications[UID(5)].documents.governmentId).toEqual(ID);
    __setDealerPaperworkForTests({ governmentId: { enabled: false, required: false } });
    expect(world.verifications[UID(5)].documents.governmentId).toEqual(ID); // disabling deletes nothing
    expect((await approve(UID(5))).status).toBe(200);
  });
  test("an unreadable configuration FAILS CLOSED: approval is refused, not waved through", async () => {
    __setDealerPaperworkForTests({}, "unavailable");
    register(UID(6), { docs: {} });
    const r = await approve(UID(6));
    expect(r.status).toBe(409);
    expect(r.body.blockers.map((b) => b.code)).toContain("PAPERWORK_POLICY_UNAVAILABLE");
    expect(world.rpcCalls).toHaveLength(0);
  });
  test("submission validation: disabled items are ignored, present entries are validated, required ones must exist", () => {
    const items = { governmentId: { enabled: true, required: true }, kraPin: { enabled: false, required: false }, businessRegistration: { enabled: true, required: false }, physicalAddress: { enabled: true, required: false }, phoneVerification: { enabled: true, required: false } };
    const missing = validateSubmission({}, items);
    expect(missing.ok).toBe(false);
    expect(missing.errors.map((e) => e.key || e.message).join(" ")).toMatch(/governmentId|Government/i);
    const good = validateSubmission({ governmentId: ID, kraPin: { pinNumber: "A000000000Z" } }, items);
    expect(good.ok).toBe(true);
    expect(good.accepted.kraPin).toBeUndefined();
    expect(good.ignored).toContain("kraPin");
    expect(validateSubmission({ governmentId: ID }, items, { existing: {} }).ok).toBe(true);
    expect(validateSubmission({}, items, { existing: { governmentId: ID } }).ok).toBe(true); // already on file
    expect(validateSubmission({ governmentId: ID, businessRegistration: { bogus: 1 } }, items).ok).toBe(false); // optional but malformed
    expect(evaluateRequirements({ governmentId: ID }, items).requiredMissing).toEqual([]);
  });
});

describe("D. configuration routes: owner-only writes, revisioned, audited", () => {
  const items = { kraPin: { enabled: true, required: true } };
  test("admins can READ the configuration (all supported items, including disabled)", async () => {
    const r = await call("GET", "/api/admin/settings/dealer-paperwork", "admin-1");
    expect(r.status).toBe(200);
    expect(r.body.items.map((i) => i.key)).toEqual(expect.arrayContaining(["governmentId", "kraPin", "businessRegistration", "physicalAddress", "phoneVerification"]));
    expect(r.body.canChange).toBe(false);
    expect(r.body.revision).toBe(0);
  });
  test.each(["admin-1", "super-1"])("%s cannot WRITE (owner-only), nothing is stored", async (who) => {
    const r = await call("PUT", "/api/admin/settings/dealer-paperwork", who, { expectedRevision: 0, items });
    expect(r.status).toBe(403);
    expect(world.settings.dealer_paperwork_policy).toBeUndefined();
  });
  test("an admin ROLE is not enough, an owner email is not an admin role: unauthenticated is 401", async () => {
    expect((await call("PUT", "/api/admin/settings/dealer-paperwork", null, { expectedRevision: 0, items })).status).toBe(401);
  });
  test("the owner saves; it persists and reloads; the audit records before and after", async () => {
    const r = await call("PUT", "/api/admin/settings/dealer-paperwork", "owner-1", { expectedRevision: 0, items });
    expect(r.status).toBe(200);
    expect(r.body.revision).toBe(1);
    const reload = await call("GET", "/api/admin/settings/dealer-paperwork", "admin-1");
    expect(reload.body.items.find((i) => i.key === "kraPin")).toMatchObject({ enabled: true, required: true });
    expect(reload.body.revision).toBe(1);
    const entry = auditCreate.mock.calls.map(([e]) => e).find((e) => e.action === "Dealer paperwork requirements updated");
    expect(entry.details.before.kraPin).toMatchObject({ required: false });
    expect(entry.details.after.kraPin).toMatchObject({ required: true });
  });
  test("a stale revision is a 409 and changes nothing", async () => {
    await call("PUT", "/api/admin/settings/dealer-paperwork", "owner-1", { expectedRevision: 0, items });
    const r = await call("PUT", "/api/admin/settings/dealer-paperwork", "owner-1", { expectedRevision: 0, items: { kraPin: { enabled: true, required: false } } });
    expect(r.status).toBe(409);
    expect(r.body.code).toBe("DEALER_PAPERWORK_CONFLICT");
    expect(world.settings.dealer_paperwork_policy.items.kraPin.required).toBe(true);
  });
  test.each([
    ["required while disabled", { kraPin: { enabled: false, required: true } }],
    ["unknown item", { passportPhoto: { enabled: true, required: false } }],
    ["non-boolean", { kraPin: { enabled: "yes", required: false } }],
    ["empty", {}],
  ])("invalid change (%s) is a 400 with nothing stored", async (_n, bad) => {
    const r = await call("PUT", "/api/admin/settings/dealer-paperwork", "owner-1", { expectedRevision: 0, items: bad });
    expect(r.status).toBe(400);
    expect(world.settings.dealer_paperwork_policy).toBeUndefined();
  });
  test("missing expectedRevision is refused", async () => {
    expect((await call("PUT", "/api/admin/settings/dealer-paperwork", "owner-1", { items })).status).toBe(400);
  });
  test("the saved configuration drives approval end to end (no hard-coded documents)", async () => {
    await call("PUT", "/api/admin/settings/dealer-paperwork", "owner-1", { expectedRevision: 0, items: { businessRegistration: { enabled: true, required: true } } });
    register(UID(7), { docs: { governmentId: ID, kraPin: { pinNumber: "A000000000Z" } } });
    const r = await approve(UID(7));
    expect(r.status).toBe(409);
    expect(r.body.blockers[0].documents).toEqual(["businessRegistration"]);
  });
});

describe("B. a dealer is a separate business account: no personal account is a dealer applicant", () => {
  test("a personal account is never listed as a dealer applicant, even with a legacy draft; dealers carry their application", async () => {
    register(UID(10), { role: "user", status: "approved", docs: {} }); // legacy draft left on a personal account
    staff(UID(11), "user");
    register(UID(12), { role: "dealer", status: "pending", docs: {} });
    const r = await call("GET", "/api/admin/users", "admin-1");
    const rows = Object.fromEntries(r.body.users.map((u) => [u._id, u]));
    expect(rows[UID(10)].dealerApplicant).toBeUndefined();
    expect(rows[UID(10)].application).toBeUndefined();
    expect(rows[UID(11)].application).toBeUndefined();
    expect(rows[UID(12)].application).toBeTruthy();
    expect(rows[UID(12)].dealerApplicant).toBe(false);
  });
  test("the Applicants filter lists only dealer accounts whose application is not approved (never personal accounts)", async () => {
    register(UID(20), { role: "user", status: "approved", docs: {} });
    staff(UID(21), "user");
    register(UID(22), { role: "dealer", status: "pending", docs: {} });
    const r = await call("GET", "/api/admin/users?dealerApplicants=true", "admin-1");
    expect(r.status).toBe(200);
    expect(r.body.users.map((u) => u._id)).toEqual([UID(22)]);
  });
  test("a personal account with a started application can NOT be approved as a dealer: refused, role and data unchanged, no RPC", async () => {
    register(UID(13), { role: "user", status: "approved", docs: {} });
    const before = snap();
    const r = await approve(UID(13));
    expect(r.status).toBe(400);
    expect(r.body.code).toBe("NOT_A_DEALER_ACCOUNT");
    expect(world.users[UID(13)]).toMatchObject({ role: "user", status: "approved" });
    expect(world.rpcCalls).toHaveLength(0);
    expect(snap()).toBe(before);
  });
  test("REJECTING a legacy draft on a personal account (clean-up) leaves the account fully usable and never calls the RPC", async () => {
    register(UID(18), { role: "user", status: "approved", docs: {} });
    const r = await reject(UID(18));
    expect(r.status).toBe(200);
    expect(r.body.changed).toBe(true);
    expect(world.users[UID(18)]).toMatchObject({ role: "user", status: "approved" });
    expect(world.rpcCalls).toHaveLength(0);
    const entry = auditCreate.mock.calls.map(([e]) => e).find((e) => String(e.action).startsWith("Dealer application rejected"));
    expect(entry.details.accountUntouched).toBe(true);
  });
  test("rejecting a pending DEALER (registered as dealer) still goes through the database function", async () => {
    register(UID(14), { role: "dealer", status: "pending", docs: {} });
    expect((await reject(UID(14))).status).toBe(200);
    expect(world.rpcCalls.map((c) => c.args.p_action)).toEqual(["reject"]);
  });
  test("a personal account with NO application cannot be approved as a dealer either", async () => {
    staff(UID(15), "user");
    const before = snap();
    const r = await approve(UID(15));
    expect(r.status).toBe(400);
    expect(snap()).toBe(before);
  });
  test("other roles are not dealer applicants", async () => {
    staff(UID(16), "moderator");
    const r = await approve(UID(16));
    expect(r.status).toBe(400);
  });
  test("a buyer cannot approve their own application; unauthorised roles are refused", async () => {
    register(UID(17), { role: "user", status: "approved", docs: {} });
    const before = snap();
    const r = await approve(UID(17), UID(17));
    expect([401, 403]).toContain(r.status);
    expect(snap()).toBe(before);
  });
});

// ============================================================
// DEALER APPLICATION ROUTES: dealer-account-only applications (a personal account can never become a dealer) + configured paperwork at onboarding.
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
const dbCreate = jest.fn(async (table, row) => {
  if (table === "dealers") { world.dealers[row.user] = { id: `d-${row.user}`, ...clone(row) }; return clone(world.dealers[row.user]); }
  if (table === "dealer_verifications") { world.verifications[row.user] = { id: `ver-${row.user}`, ...clone(row) }; return clone(world.verifications[row.user]); }
  return null;
});
const dbUpdate = jest.fn(async (table, id, patch) => {
  if (table === "dealers") { const k = Object.keys(world.dealers).find((x) => world.dealers[x].id === id || x === id); if (k) Object.assign(world.dealers[k], patch); return clone(world.dealers[k] ?? null); }
  if (table !== "dealer_verifications") return null;
  const key = Object.keys(world.verifications).find((k) => world.verifications[k].id === id || k === id);
  if (key) Object.assign(world.verifications[key], patch);
  return clone(world.verifications[key] ?? null);
});
const dbFindAll = jest.fn(async (table, opts) => {
  if (table !== "dealers") return [];
  const ids = opts?.filters?.user?.$in || [];
  return ids.filter((i) => world.dealers[i]).map((i) => clone(world.dealers[i]));
});
jest.unstable_mockModule("../../db/index.js", () => {
  const api = { find: dbNoop, findAll: dbFindAll, findById: dbFindById, findOne: dbFindOne, create: dbCreate, createMany: dbNoop, update: dbUpdate, updateMany: dbNoop, remove: dbNoop, removeMany: dbNoop, softDelete: dbNoop, count: dbNoop, upsert: dbNoop, upsertMany: dbNoop, paginate: dbNoop, distinct: dbNoop, aggregate: dbNoop, rawQuery: dbNoop };
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

const dealerRoutes = (await import("../../routes/dealerRoutes.js")).default;
const { __setOnboardingPolicyForTests } = await import("../../services/onboardingPolicy.service.js");
const approval = await import("../../services/dealerApproval.service.js");



const { __setDealerPaperworkForTests } = await import("../../services/dealerPaperwork.service.js");
const token = (id) => jwt.sign({ id, tokenVersion: 0 }, SECRET, { expiresIn: "1h" });
const mk = (id, role, extra = {}) => { world.users[id] = { _id: id, id, name: "P", email: `${id}@t.test`, role, status: "approved", emailVerified: true, isBanned: false, ...extra }; };
let server; let base;
beforeAll(async () => {
  const app = express(); app.use(express.json()); app.use("/api/dealer", dealerRoutes);
  app.use((err, req, res, _next) => res.status(err.statusCode || 500).json({ success: false, message: err.message }));
  server = http.createServer(app); await new Promise((r) => server.listen(0, "127.0.0.1", r)); base = `http://127.0.0.1:${server.address().port}`;
});
afterAll(() => new Promise((r) => server.close(r)));
beforeEach(() => {
  world.users = {}; world.dealers = {}; world.verifications = {}; world.rpcCalls = []; world.notifications = []; world.settings = {};
  __setOnboardingPolicyForTests({ dealerOnboardingMode: "approval_required" });
  __setDealerPaperworkForTests(null);
});
afterAll(() => { __setOnboardingPolicyForTests(null); __setDealerPaperworkForTests(null); });
const call = async (method, path, as, body) => {
  const r = await fetch(base + path, { method, headers: { "content-type": "application/json", ...(as ? { authorization: `Bearer ${token(as)}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  let json = null; try { json = await r.json(); } catch { /* empty */ }
  return { status: r.status, body: json };
};
const PAY = { bankName: "KCB", accountName: "Acme Motors", accountNumber: "1234567890", mpesaPhone: "254712345678" };
const profile = (documents) => ({ businessName: "Acme Motors", location: "Nairobi", bio: "x", paymentDetails: PAY, ...(documents === undefined ? {} : { documents }) });
const ID = { type: "national_id", documentNumber: "12345678" };
const KRA = { pinNumber: "A000000000Z" };

describe("B. a personal account can NEVER become a dealer; a dealer is a separate business account", () => {
  const strip = () => JSON.stringify(world.users, (k, v) => (k === "lastActive" ? undefined : v));
  test.each(["user", "individual_seller"])("a %s is refused on every dealer-application route, whatever the policy or account state, and nothing is created", async (role) => {
    for (const mode of ["approval_required", "open", "closed"]) {
      __setOnboardingPolicyForTests({ dealerOnboardingMode: mode });
      world.users = {}; world.dealers = {}; world.verifications = {};
      mk("p1", role);
      const before = strip();
      expect((await call("POST", "/api/dealer/application", "p1")).status).toBe(403);
      expect((await call("GET", "/api/dealer/onboarding", "p1")).status).toBe(403);
      expect((await call("PUT", "/api/dealer/onboarding", "p1", profile())).status).toBe(403);
      expect((await call("GET", "/api/dealer/paperwork-requirements", "p1")).status).toBe(403);
      expect(world.dealers.p1).toBeUndefined();
      expect(world.verifications.p1).toBeUndefined();
      expect(strip()).toBe(before);
    }
  });
  test("an administrator cannot approve a personal account as a dealer: role never changes and no RPC runs", async () => {
    mk("p2", "user");
    world.dealers.p2 = { id: "d-p2", user: "p2", approved: false }; // e.g. a legacy draft left from the retired in-place flow
    world.verifications.p2 = { id: "ver-p2", user: "p2", verificationStatus: "pending" };
    const before = strip();
    await expect(approval.approveDealer({ user: world.users.p2, actorId: "admin-1", reason: "Looks complete to me." })).rejects.toMatchObject({ code: "NOT_A_DEALER_ACCOUNT" });
    expect(world.rpcCalls).toHaveLength(0);
    expect(strip()).toBe(before);
  });
  test("a dealer account (registered as a dealer) can still open its own application, and its role never changes", async () => {
    mk("d1", "dealer", { status: "pending" });
    const r = await call("POST", "/api/dealer/application", "d1");
    expect(r.status).toBe(201);
    expect(world.dealers.d1.approved).toBe(false);
    expect(world.users.d1.role).toBe("dealer");
  });
  test("is idempotent for a dealer: a second call creates nothing and changes nothing", async () => {
    mk("d2", "dealer", { status: "pending" });
    await call("POST", "/api/dealer/application", "d2");
    const snap = JSON.stringify(world.dealers);
    const r = await call("POST", "/api/dealer/application", "d2");
    expect(r.status).toBe(200);
    expect(r.body.alreadyStarted).toBe(true);
    expect(JSON.stringify(world.dealers)).toBe(snap);
  });
  test("a dealer with an unverified e-mail is refused - nothing is created", async () => {
    mk("d3", "dealer", { status: "pending", emailVerified: false });
    const r = await call("POST", "/api/dealer/application", "d3");
    expect(r.status).toBe(403);
    expect(r.body.code).toBe("EMAIL_VERIFICATION_REQUIRED");
    expect(world.dealers.d3).toBeUndefined();
  });
  test("refused while dealer applications are closed", async () => {
    __setOnboardingPolicyForTests({ dealerOnboardingMode: "closed" });
    mk("d4", "dealer", { status: "pending" });
    const r = await call("POST", "/api/dealer/application", "d4");
    expect(r.status).toBe(403);
    expect(r.body.code).toBe("DEALER_APPLICATIONS_CLOSED");
    expect(world.dealers.d4).toBeUndefined();
  });
  test("staff and unauthenticated callers cannot use it", async () => {
    mk("adm", "admin");
    expect((await call("POST", "/api/dealer/application", "adm")).status).toBe(403);
    expect((await call("POST", "/api/dealer/application", null)).status).toBe(401);
  });
  test("the full dealer path: apply → onboard with no documents (none required) → pending verification, role stays dealer", async () => {
    mk("d5", "dealer", { status: "pending" });
    await call("POST", "/api/dealer/application", "d5");
    const r = await call("PUT", "/api/dealer/onboarding", "d5", profile());
    expect(r.status).toBe(200);
    expect(world.verifications.d5.verificationStatus).toBe("pending");
    expect(world.users.d5.role).toBe("dealer");
  });
});

// Paperwork is OFF by default now (owner switches items on in Admin > Settings > Onboarding). Tests that exercise an item turn it on explicitly.
const optionalOn = (keys, extra = {}) => ({ ...Object.fromEntries(keys.map((k) => [k, { enabled: true, required: false }])), ...extra });
describe("D. onboarding follows the saved paperwork configuration", () => {
  test("required item missing ⇒ 400 DEALER_PAPERWORK_INVALID and nothing saved", async () => {
    __setDealerPaperworkForTests({ kraPin: { enabled: true, required: true } });
    mk("d1", "dealer", { status: "pending" });
    const r = await call("PUT", "/api/dealer/onboarding", "d1", profile({ governmentId: ID }));
    expect(r.status).toBe(400);
    expect(r.body.code).toBe("DEALER_PAPERWORK_INVALID");
    expect(world.verifications.d1).toBeUndefined();
    expect(world.dealers.d1?.businessName).not.toBe("Acme Motors");
  });
  test("required item supplied ⇒ saved; optional ones omitted is fine", async () => {
    __setDealerPaperworkForTests({ kraPin: { enabled: true, required: true } });
    mk("d2", "dealer", { status: "pending" });
    const r = await call("PUT", "/api/dealer/onboarding", "d2", profile({ kraPin: KRA }));
    expect(r.status).toBe(200);
    expect(world.verifications.d2.documents.kraPin).toMatchObject(KRA);
    expect(world.verifications.d2.documents.governmentId).toBeUndefined();
  });
  test("no paperwork at all: the dealer submits without any documents", async () => {
    __setDealerPaperworkForTests(Object.fromEntries(["governmentId", "kraPin", "businessRegistration", "physicalAddress", "phoneVerification"].map((k) => [k, { enabled: false, required: false }])));
    mk("d3", "dealer", { status: "pending" });
    expect((await call("PUT", "/api/dealer/onboarding", "d3", profile({}))).status).toBe(200);
    expect(world.verifications.d3.documents).toEqual({});
  });
  test("a disabled item that is sent is ignored (reported), not stored and not an error", async () => {
    __setDealerPaperworkForTests(optionalOn(["governmentId"], { kraPin: { enabled: false, required: false } }));
    mk("d4", "dealer", { status: "pending" });
    const r = await call("PUT", "/api/dealer/onboarding", "d4", profile({ kraPin: KRA, governmentId: ID }));
    expect(r.status).toBe(200);
    expect(r.body.ignoredDocuments).toContain("kraPin");
    expect(world.verifications.d4.documents.kraPin).toBeUndefined();
    expect(world.verifications.d4.documents.governmentId).toBeTruthy();
  });
  test("an optional item that is present but malformed is rejected", async () => {
    __setDealerPaperworkForTests(optionalOn(["kraPin"]));
    mk("d5", "dealer", { status: "pending" });
    const r = await call("PUT", "/api/dealer/onboarding", "d5", profile({ kraPin: { pinNumber: "nope" } }));
    expect(r.status).toBe(400);
  });
  test("an unreadable configuration ⇒ 503 and nothing saved (fail closed)", async () => {
    __setDealerPaperworkForTests({}, "unavailable");
    mk("d6", "dealer", { status: "pending" });
    const r = await call("PUT", "/api/dealer/onboarding", "d6", profile({}));
    expect(r.status).toBe(503);
    expect(r.body.code).toBe("DEALER_PAPERWORK_UNAVAILABLE");
    expect(world.verifications.d6).toBeUndefined();
  });
  test("resubmitting keeps documents already on file (an omitted optional item never wipes them)", async () => {
    __setDealerPaperworkForTests(optionalOn(["governmentId", "kraPin"]));
    mk("d7", "dealer", { status: "pending" });
    await call("PUT", "/api/dealer/onboarding", "d7", profile({ governmentId: ID }));
    await call("PUT", "/api/dealer/onboarding", "d7", profile({ kraPin: KRA }));
    expect(Object.keys(world.verifications.d7.documents).sort()).toEqual(["governmentId", "kraPin"]);
  });
  test("an approved dealer cannot resubmit (locked)", async () => {
    mk("d8", "dealer", { status: "approved" });
    world.dealers.d8 = { id: "d-d8", user: "d8", approved: true };
    world.verifications.d8 = { id: "ver-d8", user: "d8", verificationStatus: "approved", documents: {} };
    const r = await call("PUT", "/api/dealer/onboarding", "d8", profile({}));
    expect(r.status).toBe(409);
  });
  test("the checklist endpoint reflects the configuration (required vs optional, disabled omitted)", async () => {
    __setDealerPaperworkForTests(optionalOn(["governmentId"], { kraPin: { enabled: true, required: true }, businessRegistration: { enabled: false, required: false } }));
    mk("d9", "dealer", { status: "pending" });
    const r = await call("GET", "/api/dealer/paperwork-requirements", "d9");
    expect(r.status).toBe(200);
    const byKey = Object.fromEntries(r.body.checklist.map((c) => [c.key, c]));
    expect(byKey.kraPin.required).toBe(true);
    expect(byKey.governmentId.required).toBe(false);
    expect(byKey.businessRegistration).toBeUndefined();
    expect(r.body.anyRequired).toBe(true);
  });
});

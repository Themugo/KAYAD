// ============================================================
// ONE ACCOUNT, MANY CAPABILITIES: capability view, inspector application bound to the signed-in identity, pending/rejected never reduce buyer/private-seller functions, no self-granting (2026-11-01).
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
const { makeAnalyticsDb: _mk } = await import("../helpers/fakeAnalyticsDb.js");
let fakeDb = _mk();
const world = { created: [], apps: [], sellers: {}, users: {}, dealers: {}, verifications: {}, rpcCalls: [], dbAudit: [], rpcFail: null, notifications: [] };
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
const mkUserDoc = (u) => { const d = clone(u); Object.defineProperty(d, "save", { value: async () => { Object.assign(world.users[u._id], JSON.parse(JSON.stringify(d))); return d; }, enumerable: false }); return d; };
const userModel = {
  findById: jest.fn((id) => chain(world.users[id] ? mkUserDoc(world.users[id]) : null)),
  findByIdAndUpdate: jest.fn((id, patch) => { if (world.users[id]) Object.assign(world.users[id], patch); return chain(clone(world.users[id])); }),
  findOne: jest.fn((f) => chain(f?.email ? (Object.values(world.users).map((u) => mkUserDoc(u)).find((u) => u.email === f.email) || null) : null)),
  create: jest.fn(async (d) => { const id = `new-${Object.keys(world.users).length}`; world.users[id] = { _id: id, id, ...d }; world.created.push(id); return mkUserDoc(world.users[id]); }),
  find: jest.fn((f) => chain(matchUsers(f).map(clone))),
  countDocuments: jest.fn((f) => chain(matchUsers(f || {}).length)),
};
jest.unstable_mockModule("../../models/User.js", () => ({ default: userModel }));
jest.unstable_mockModule("../../models/UserAuth.js", () => ({ default: { findOne: jest.fn(() => chain({ tokenVersion: 0 })) } }));
jest.unstable_mockModule("../../models/RefreshToken.js", () => ({ default: { findActiveSessionById: jest.fn(async () => ({})) } }));
const store = { doc: null };
const makeDoc = (data) => { const d = { ...data }; Object.defineProperty(d, "toObject", { value: () => JSON.parse(JSON.stringify(d)), enumerable: false }); Object.defineProperty(d, "save", { value: async () => { store.doc = JSON.parse(JSON.stringify(d)); return d; }, enumerable: false }); return d; };
function PlatformConfigCtor() { return makeDoc({}); }
PlatformConfigCtor.findOne = jest.fn(() => { const c = store.doc ? makeDoc(store.doc) : null; const q = { lean: () => Promise.resolve(c ? JSON.parse(JSON.stringify(c)) : null), then: (res, rej) => Promise.resolve(c).then(res, rej) }; return q; });
PlatformConfigCtor.create = jest.fn(async (d) => { store.doc = d || {}; return makeDoc(store.doc); });
jest.unstable_mockModule("../../models/PlatformConfig.js", () => ({ default: PlatformConfigCtor }));
const auditCreate = jest.fn(async (d) => ({ ...d }));
const secCreate = jest.fn(async (d) => ({ ...d }));
jest.unstable_mockModule("../../models/SecurityLog.js", () => ({ default: { create: secCreate } }));
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
  const api = { find: dbNoop, findAll: dbFindAll, findById: dbFindById, findOne: dbFindOne, create: dbNoop, createMany: dbNoop, update: dbUpdate, updateMany: dbNoop, remove: dbNoop, removeMany: dbNoop, softDelete: dbNoop, count: jest.fn(async () => world.newUsers ?? 0), upsert: dbNoop, upsertMany: dbNoop, paginate: dbNoop, distinct: dbNoop, aggregate: dbNoop, rawQuery: dbNoop };
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
  getSupabase: () => fakeDb,
}));

const appModel = {
  findOne: jest.fn(async (f) => world.apps.find((a) => (f.user ? a.user === f.user : a.email === f.email) && (!f.status || a.status === f.status)) || null),
  findById: jest.fn(async (id) => world.apps.find((a) => a.id === id) || null),
  find: jest.fn((f) => { const rows = world.apps.filter((a) => !f.user || a.user === f.user); const q = { sort: () => q, lean: () => q, then: (res, rej) => Promise.resolve(rows.map(clone)).then(res, rej) }; return q; }),
  create: jest.fn(async (d) => { const a = { id: `app-${world.apps.length + 1}`, status: "pending", ...d }; a.save = async () => a; world.apps.push(a); return a; }),
};
jest.unstable_mockModule("../../models/InspectorApplication.js", () => ({ default: appModel }));
jest.unstable_mockModule("../../services/privateSellerCapability.service.js", () => ({
  resolveSellerState: async (u) => (["dealer", "ghost_checker"].includes(u.role) ? { status: "not_applicable", source: "role" } : { status: world.sellers[u.id] || "none", source: "capability" }),
  getMySellerCapability: async () => ({}), submitApplication: async () => ({}), decideApplication: async () => ({}), listApplications: async () => [], getCapabilityRow: async () => null, syncLegacyApproval: async () => {},
  DECISION_NAMES: [], SELLER_STATUSES: [],
}));
const providers = [];
const providerSb = { from: () => { const q = { select: () => q, eq: () => q, is: () => q, maybeSingle: async () => ({ data: null, error: null }), single: async () => ({ data: { id: "prov-1" }, error: null }), insert: (row) => { providers.push(row); return q; }, update: () => q }; return q; } };
fakeDb = providerSb;

const router = express.Router();
const capRoutes = (await import("../../routes/accountCapabilitiesRoutes.js")).default;
const inspector = await import("../../controllers/inspectorApplicationController.js");
const { optionalAuth, protect } = await import("../../middleware/auth.js");

const token = (id) => jwt.sign({ id, tokenVersion: 0 }, SECRET, { expiresIn: "1h" });
const person = (id, role = "user", extra = {}) => { world.users[id] = { _id: id, id, name: `Person ${id}`, email: `${id}@example.test`, role, status: "approved", emailVerified: true, ...extra }; return id; };
let server; let base;
beforeAll(async () => {
  const app = express(); app.use(express.json());
  app.use("/api/account", capRoutes);
  app.post("/apply", optionalAuth, inspector.submitApplication);
  app.use((err, req, res, _n) => res.status(500).json({ message: err.message }));
  server = http.createServer(app); await new Promise((r) => server.listen(0, "127.0.0.1", r)); base = `http://127.0.0.1:${server.address().port}`;
});
afterAll(() => new Promise((r) => server.close(r)));
beforeEach(() => { world.users = {}; world.dealers = {}; world.verifications = {}; world.apps = []; world.sellers = {}; world.created = []; providers.length = 0; world.notifications = []; jest.clearAllMocks(); });
const caps = async (who) => { const r = await fetch(`${base}/api/account/capabilities`, { headers: who ? { authorization: `Bearer ${token(who)}` } : {} }); return { status: r.status, body: await r.json() }; };
const resFake = () => { const r = { code: 200, body: null, status(c) { r.code = c; return r; }, json(b) { r.body = b; return r; } }; return r; };
const appBody = { fullName: "Pat Inspector", email: "other@example.test", phone: "+254700000000", idNumber: "12345678", location: "Nairobi", yearsOfExperience: 5, specialties: ["engine"], toolsAvailable: "OBD scanner" };

describe("guest vs account-required", () => {
  test("a guest is refused (401) the account capability view; nothing is exposed", async () => {
    const r = await caps(null); expect(r.status).toBe(401); expect(JSON.stringify(r.body)).not.toMatch(/buyer|dealer/);
  });
  test("the capability endpoint is read-only: no write verbs exist, so nobody can grant themselves a role", async () => {
    person("b1");
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      const r = await fetch(`${base}/api/account/capabilities`, { method, headers: { "content-type": "application/json", authorization: `Bearer ${token("b1")}` }, body: JSON.stringify({ role: "superadmin", dealer: { granted: true } }) });
      expect(r.status).toBe(404);
    }
    expect(world.users.b1.role).toBe("user");
  });
});

describe("one account, several capabilities", () => {
  test("a fresh registered account is a buyer, may ask to sell privately, and may apply for dealer/inspector - none granted", async () => {
    person("b1"); const { body } = await caps("b1"); const d = body.data;
    expect(d.buyer.granted).toBe(true);
    expect(d.privateSeller).toMatchObject({ status: "none", granted: false, canApply: true });
    expect(d.dealer).toMatchObject({ granted: false, status: "none", canApply: true });
    expect(d.inspector).toMatchObject({ granted: false, status: "none", canApply: true });
    expect(d.userId).toBe("b1");
  });
  test("buyer + approved private seller are the SAME user id (no second identity)", async () => {
    person("b1"); world.sellers.b1 = "approved";
    const d = (await caps("b1")).body.data;
    expect(d.buyer.granted).toBe(true); expect(d.privateSeller).toMatchObject({ status: "approved", granted: true, canApply: false });
    expect(Object.keys(world.users)).toEqual(["b1"]);
  });
  test("pending private-seller application grants nothing but keeps buying; rejected can re-apply", async () => {
    person("b1"); world.sellers.b1 = "pending";
    let d = (await caps("b1")).body.data; expect(d.privateSeller.granted).toBe(false); expect(d.buyer.granted).toBe(true);
    world.sellers.b1 = "rejected"; d = (await caps("b1")).body.data; expect(d.privateSeller).toMatchObject({ granted: false, canApply: true }); expect(d.buyer.granted).toBe(true);
  });
  test("a PENDING dealer application on the same user grants no dealer capability and removes nothing", async () => {
    person("b1"); world.sellers.b1 = "approved"; world.dealers.b1 = { id: "d1", user: "b1", approved: false }; world.verifications.b1 = { id: "v1", user: "b1", verificationStatus: "pending" };
    const d = (await caps("b1")).body.data;
    expect(d.dealer).toMatchObject({ granted: false, status: "pending", canApply: false });
    expect(d.buyer.granted).toBe(true); expect(d.privateSeller.granted).toBe(true);
    expect(world.users.b1.role).toBe("user");
  });
  test("a REJECTED dealer application keeps buyer and private-seller functions", async () => {
    person("b1"); world.sellers.b1 = "approved"; world.dealers.b1 = { id: "d1", user: "b1", approved: false }; world.verifications.b1 = { id: "v1", user: "b1", verificationStatus: "rejected" };
    const d = (await caps("b1")).body.data;
    expect(d.dealer).toMatchObject({ granted: false, status: "rejected" });
    expect(d.buyer.granted).toBe(true); expect(d.privateSeller.granted).toBe(true); expect(world.users.b1.status).toBe("approved");
  });
  test("an approved dealer (role set by admin approval) is granted dealer", async () => {
    person("d9", "dealer"); world.dealers.d9 = { id: "d9", user: "d9", approved: true }; world.verifications.d9 = { id: "v", user: "d9", verificationStatus: "approved" };
    const d = (await caps("d9")).body.data; expect(d.dealer).toMatchObject({ granted: true, status: "approved" });
  });
  test("an approved inspector is granted inspector", async () => {
    person("i1", "ghost_checker"); const d = (await caps("i1")).body.data; expect(d.inspector).toMatchObject({ granted: true, status: "approved" });
  });
  test("a pending inspector application grants nothing and cannot be duplicated", async () => {
    person("b1"); world.apps.push({ id: "app-1", user: "b1", email: "b1@example.test", status: "pending" });
    const d = (await caps("b1")).body.data; expect(d.inspector).toMatchObject({ granted: false, status: "pending", canApply: false }); expect(d.buyer.granted).toBe(true);
  });
  test("a rejected inspector application keeps the buyer account and lets them re-apply", async () => {
    person("b1"); world.apps.push({ id: "app-1", user: "b1", email: "b1@example.test", status: "rejected" });
    const d = (await caps("b1")).body.data; expect(d.inspector).toMatchObject({ granted: false, status: "rejected", canApply: true }); expect(d.buyer.granted).toBe(true);
  });
  test("staff are not presented as buyers", async () => {
    person("a1", "admin"); expect((await caps("a1")).body.data.buyer.granted).toBe(false);
  });
});

describe("inspector application uses the SAME user identity", () => {
  const submit = async (who, body = appBody) => {
    const r = await fetch(`${base}/apply`, { method: "POST", headers: { "content-type": "application/json", ...(who ? { authorization: `Bearer ${token(who)}` } : {}) }, body: JSON.stringify(body) });
    return { status: r.status, body: await r.json() };
  };
  test("a signed-in applicant's application is bound to their user id and their account e-mail (typed e-mail is ignored)", async () => {
    person("b1");
    const r = await submit("b1"); expect(r.status).toBe(201);
    expect(world.apps[0]).toMatchObject({ user: "b1", email: "b1@example.test" });
    expect(world.created).toHaveLength(0);
  });
  test("a second pending application from the same account is refused", async () => {
    person("b1"); await submit("b1"); const again = await submit("b1");
    expect(again.status).toBe(400); expect(world.apps).toHaveLength(1);
  });
  test("approval converts THAT user in place: same id, no User.create, buyer data fields intact", async () => {
    person("b1", "user", { name: "Pat Buyer", phone: "+254711111111" }); world.sellers.b1 = "approved"; person("a1", "admin");
    await submit("b1");
    const res = resFake();
    await inspector.approveApplication({ params: { id: "app-1" }, body: {}, user: { id: "a1", role: "admin" } }, res);
    expect(res.code).toBe(200);
    expect(world.created).toHaveLength(0);
    expect(Object.keys(world.users).sort()).toEqual(["a1", "b1"]);
    expect(world.users.b1).toMatchObject({ _id: "b1", role: "ghost_checker", name: "Pat Buyer", email: "b1@example.test", phone: "+254711111111" });
    expect(providers[0].user_id).toBe("b1");
    expect(world.sellers.b1).toBe("approved"); // private-seller capability row is untouched
  });
  test("approval cannot hijack another account that shares the typed e-mail (binding is by user id)", async () => {
    person("b1"); person("victim", "dealer", { email: "other@example.test" }); person("a1", "admin");
    world.apps.push({ id: "app-9", user: "b1", email: "other@example.test", fullName: "X", phone: "1", specialties: [], status: "pending", save: async () => {} });
    const res = resFake();
    await inspector.approveApplication({ params: { id: "app-9" }, body: {}, user: { id: "a1", role: "admin" } }, res);
    expect(world.users.victim.role).toBe("dealer");
    expect(world.users.b1.role).toBe("ghost_checker");
    expect(world.created).toHaveLength(0);
  });
  test("approval refuses a staff/dealer user and never rewrites their role", async () => {
    person("d1", "dealer"); person("a1", "admin");
    world.apps.push({ id: "app-8", user: "d1", email: "d1@example.test", fullName: "X", phone: "1", specialties: [], status: "pending", save: async () => {} });
    const res = resFake();
    await inspector.approveApplication({ params: { id: "app-8" }, body: {}, user: { id: "a1", role: "admin" } }, res);
    expect(res.code).toBe(409); expect(world.users.d1.role).toBe("dealer");
  });
  test("an unverified account cannot be promoted by approval", async () => {
    person("b1", "user", { emailVerified: false }); person("a1", "admin"); await submit("b1");
    const res = resFake();
    await inspector.approveApplication({ params: { id: "app-1" }, body: {}, user: { id: "a1", role: "admin" } }, res);
    expect(res.code).toBe(409); expect(world.users.b1.role).toBe("user");
  });
  test("an applicant can never approve their own application", async () => {
    person("b1", "ghost_checker"); await submit("b1");
    const res = resFake();
    await inspector.approveApplication({ params: { id: "app-1" }, body: {}, user: { id: "b1", role: "admin" } }, res);
    expect(res.code).toBe(403);
  });
});

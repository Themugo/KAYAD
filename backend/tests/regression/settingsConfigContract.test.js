// ============================================================
// SUPER ADMIN SETTINGS: GET/PUT /config contract (auth, validation, secrecy, persistence, audit) (2026-11-01).
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
const store = { doc: null };
const makeDoc = (data) => { const d = { ...data }; Object.defineProperty(d, "toObject", { value: () => JSON.parse(JSON.stringify(d)), enumerable: false }); Object.defineProperty(d, "save", { value: async () => { store.doc = JSON.parse(JSON.stringify(d)); return d; }, enumerable: false }); return d; };
function PlatformConfigCtor() { return makeDoc({}); }
PlatformConfigCtor.findOne = jest.fn(() => { const c = store.doc ? makeDoc(store.doc) : null; const q = { lean: () => Promise.resolve(c ? JSON.parse(JSON.stringify(c)) : null), then: (res, rej) => Promise.resolve(c).then(res, rej) }; return q; });
PlatformConfigCtor.create = jest.fn(async (d) => { store.doc = d || {}; return makeDoc(store.doc); });
jest.unstable_mockModule("../../models/PlatformConfig.js", () => ({ default: PlatformConfigCtor }));
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



const token = (id) => jwt.sign({ id, tokenVersion: 0 }, SECRET, { expiresIn: "1h" });
const staff = (id, role, extra = {}) => { world.users[id] = { _id: id, id, name: role, email: `${role}@example.test`, role, status: "approved", emailVerified: true, ...extra }; };
let server; let base;
beforeAll(async () => {
  const app = express(); app.use(express.json()); app.use("/api/admin", adminRoutes);
  app.use((err, req, res, _next) => res.status(err.statusCode || 500).json({ success: false, message: err.message }));
  server = http.createServer(app); await new Promise((r) => server.listen(0, "127.0.0.1", r)); base = `http://127.0.0.1:${server.address().port}`;
});
afterAll(() => new Promise((r) => server.close(r)));
beforeEach(() => {
  world.users = {}; store.doc = { platformName: "KAYAD", maxListingImages: 10, daraja: { environment: "sandbox", consumerKey: "KEY-SECRET-1", consumerSecret: "SECRET-2", passkey: "PASS-3" }, bank: { bankName: "KCB", accountNumber: "999" } };
  auditCreate.mockClear();
  staff("admin-1", "admin"); staff("mod-1", "moderator"); staff("buyer-1", "user");
});
const call = async (method, path, as, body) => {
  const r = await fetch(base + path, { method, headers: { "content-type": "application/json", ...(as ? { authorization: `Bearer ${token(as)}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  let text = ""; let json = null; try { text = await r.text(); json = JSON.parse(text); } catch { /* empty */ }
  return { status: r.status, body: json, text };
};
const auditEntry = (action) => auditCreate.mock.calls.map(([e]) => e).find((e) => e.action === action);

describe("GET /config", () => {
  test("never returns payment secrets, only presence flags", async () => {
    const r = await call("GET", "/api/admin/config", "admin-1");
    expect(r.status).toBe(200);
    for (const secret of ["KEY-SECRET-1", "SECRET-2", "PASS-3"]) expect(r.text).not.toContain(secret);
    expect(r.body.config.daraja).toMatchObject({ consumerKey: "", consumerSecret: "", passkey: "", hasConsumerKey: true, hasConsumerSecret: true, hasPasskey: true });
  });
  test("tells the UI which settings are recorded only", async () => {
    const r = await call("GET", "/api/admin/config", "admin-1");
    expect(r.body.recordedOnly).toEqual(expect.arrayContaining(["escrowReleaseDays", "bidCommitmentPct", "allowGuestBrowsing"]));
    expect(r.body.recordedOnly).not.toContain("maxListingImages"); // now enforced by carController.addCarImages (see maxListingImagesEffect.test.js)
  });
  test.each([["buyer-1"], [null]])("%s is refused", async (who) => {
    const r = await call("GET", "/api/admin/config", who);
    expect([401, 403]).toContain(r.status);
  });
});

describe("PUT /config", () => {
  test("persists and a fresh GET (reload) returns the saved value", async () => {
    const r = await call("PUT", "/api/admin/config", "admin-1", { platformName: "KAYAD Kenya", maxListingImages: 12 });
    expect(r.status).toBe(200);
    const reload = await call("GET", "/api/admin/config", "admin-1");
    expect(reload.body.config).toMatchObject({ platformName: "KAYAD Kenya", maxListingImages: 12 });
  });
  test.each([
    ["bad e-mail", { supportEmail: "nope" }],
    ["empty platform name", { platformName: "  " }],
    ["commission above 50", { dealerCommission: 80 }],
    ["images 0", { maxListingImages: 0 }],
    ["bad daraja environment", { daraja: { environment: "staging" } }],
    ["bad reconciliation schedule", { reconciliation: { schedule: "yearly" } }],
    ["bad logo url", { branding: { logoUrl: "javascript:alert(1)" } }],
  ])("rejects %s with 400 and changes nothing", async (_n, bad) => {
    const before = JSON.stringify(store.doc);
    const r = await call("PUT", "/api/admin/config", "admin-1", bad);
    expect(r.status).toBe(400);
    expect(JSON.stringify(store.doc)).toBe(before);
  });
  test.each([["buyer-1"], ["mod-1"], [null]])("%s cannot write", async (who) => {
    const before = JSON.stringify(store.doc);
    const r = await call("PUT", "/api/admin/config", who, { platformName: "Hacked" });
    expect([401, 403]).toContain(r.status);
    expect(JSON.stringify(store.doc)).toBe(before);
  });
  test("a blank secret keeps the stored one; a new secret replaces it; neither is ever returned", async () => {
    let r = await call("PUT", "/api/admin/config", "admin-1", { daraja: { environment: "sandbox", consumerKey: "", consumerSecret: "", passkey: "" } });
    expect(r.status).toBe(200);
    expect(store.doc.daraja.consumerKey).toBe("KEY-SECRET-1");
    r = await call("PUT", "/api/admin/config", "admin-1", { daraja: { consumerKey: "NEW-KEY-9" } });
    expect(store.doc.daraja.consumerKey).toBe("NEW-KEY-9");
    expect(r.text).not.toContain("NEW-KEY-9");
    expect(r.text).not.toContain("SECRET-2");
  });
  test("the audit entry names what changed (before/after) and never contains a secret or bank value", async () => {
    await call("PUT", "/api/admin/config", "admin-1", { platformName: "KAYAD Kenya", daraja: { consumerKey: "NEW-KEY-9" }, bank: { accountNumber: "123456789" } });
    const e = auditEntry("Platform config updated");
    expect(e.details.changedKeys).toEqual(expect.arrayContaining(["platformName", "daraja", "bank"]));
    expect(e.details.changes.platformName).toEqual({ from: "KAYAD", to: "KAYAD Kenya" });
    expect(e.details.changes.daraja.consumerKey).toBe("changed");
    const json = JSON.stringify(e);
    for (const secret of ["NEW-KEY-9", "KEY-SECRET-1", "SECRET-2", "PASS-3", "123456789", "999"]) expect(json).not.toContain(secret);
  });
  test("no audit entry is written for a rejected change", async () => {
    await call("PUT", "/api/admin/config", "admin-1", { supportEmail: "nope" });
    expect(auditEntry("Platform config updated")).toBeUndefined();
  });
});

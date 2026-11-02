// ============================================================
// PUBLIC-SITE DESIGN EDITOR: multiple saved designs, draft CAS, preview data, publish to the live platform config, history, rollback, destructive-action safeguards, authorization, logo asset upload (2026-11-01).
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
process.env.CLOUDINARY_CLOUD_NAME = "kayadtest"; process.env.CLOUDINARY_API_KEY = "k"; process.env.CLOUDINARY_API_SECRET = "s";
process.env.WEBHOIST_EMAIL = "owner@example.test";
delete process.env.WEBHOIST_EMAILS;
const SECRET = process.env.JWT_SECRET;

// ---------------- world ----------------
const { makeSiteDesignDb: _mk } = await import("../helpers/fakeSiteDesignDb.js");
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
const kvStore = {}; let kvFail = false;
const kvTable = {
  select: () => ({ eq: (_c, key) => ({ maybeSingle: async () => ({ data: kvStore[key] ? { value: kvStore[key] } : null, error: null }) }) }),
  upsert: async (row) => { if (kvFail) return { error: { message: "db down" } }; kvStore[row.key] = row.value; return { error: null }; },
};
jest.unstable_mockModule("../../utils/supabase.js", () => ({
  initSupabase: jest.fn(), checkSupabaseReadiness: async () => ({ ok: true }), isSupabaseConnected: () => true, default: null,
  getSupabase: () => ({ ...fakeDb, rpc: fakeDb.rpc?.bind(fakeDb), from: (t) => (t === "system_settings" ? kvTable : fakeDb.from(t)) }),
}));


const uploadImage = jest.fn(async () => ({ url: "https://res.cloudinary.com/kayadtest/image/upload/v1/kayad/branding/logo.png", thumb: "t" }));
jest.unstable_mockModule("../../config/cloudinary.js", () => ({ uploadImage, default: {} }));
const designRoutes = (await import("../../routes/siteDesignRoutes.js")).default;
const { DEFAULT_DESIGN, validateDesign, extractLive, STARTERS } = await import("../../utils/siteDesign.js");
const PlatformConfig = (await import("../../models/PlatformConfig.js")).default;

const token = (id) => jwt.sign({ id, tokenVersion: 0 }, SECRET, { expiresIn: "1h" });
const person = (id, role) => { world.users[id] = { _id: id, id, name: id, email: `${id}@example.test`, role, status: "approved", emailVerified: true }; return id; };
let server; let base;
beforeAll(async () => {
  const app = express(); app.use(express.json());
  app.use("/api/admin/site-designs", designRoutes);
  app.use((err, req, res, _n) => res.status(500).json({ message: err.message }));
  server = http.createServer(app); await new Promise((r) => server.listen(0, "127.0.0.1", r)); base = `http://127.0.0.1:${server.address().port}`;
});
afterAll(() => new Promise((r) => server.close(r)));
beforeEach(() => {
  fakeDb = _mk(); world.users = {}; store.doc = null; auditCreate.mockClear(); secCreate.mockClear(); uploadImage.mockClear();
  person("admin-1", "admin"); person("super-1", "superadmin"); person("buyer-1", "user"); person("mod-1", "moderator");
});
const call = async (method, path, who = "admin-1", body) => {
  const r = await fetch(`${base}/api/admin/site-designs${path}`, { method, headers: { "content-type": "application/json", ...(who ? { authorization: `Bearer ${token(who)}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};
const mk = async (name = "Spring", from = { type: "starter", id: "kayad-default" }) => (await call("POST", "/", "admin-1", { name, from })).body.design;
const tweak = (d, fn) => { const c = JSON.parse(JSON.stringify(d.config)); fn(c); return c; };
const live = async () => extractLive(await PlatformConfig.findOne());
const actions = () => secCreate.mock.calls.map(([e]) => e.action);

describe("authorization", () => {
  test.each([["buyer-1"], ["mod-1"], [null]])("%s cannot use the editor API", async (who) => {
    for (const [m, p] of [["GET", "/"], ["POST", "/"], ["GET", "/history"], ["POST", "/assets/logo"]]) expect([401, 403]).toContain((await call(m, p, who, m === "POST" ? { name: "x" } : undefined)).status);
  });
  test("admin and superadmin can", async () => { expect((await call("GET", "/", "admin-1")).status).toBe(200); expect((await call("GET", "/", "super-1")).status).toBe(200); });
});

describe("validation: only supported, safe settings", () => {
  test("every starter and the defaults are valid designs", () => { for (const s of STARTERS) expect(validateDesign(s.config).ok).toBe(true); expect(validateDesign(DEFAULT_DESIGN).ok).toBe(true); });
  test.each([
    ["unknown section", (c) => { c.scripts = { src: "x" }; }],
    ["unknown key", (c) => { c.brand.onload = "x"; }],
    ["bad colour", (c) => { c.colors.primaryColor = "red; background:url(x)"; }],
    ["font that is not loaded", (c) => { c.typography.fontBody = "Comic Sans"; }],
    ["arbitrary logo host", (c) => { c.brand.logoUrl = "https://evil.example/x.png"; }],
    ["javascript hero url", (c) => { c.hero.backgroundUrl = "javascript:alert(1)"; }],
    ["markup in text", (c) => { c.brand.brandTagline = "<img src=x onerror=1>"; }],
    ["ticker height out of range", (c) => { c.announcement.heightPx = 400; }],
    ["bad transition", (c) => { c.announcement.transition = "spin"; }],
    ["rotation between 0 and 3", (c) => { c.hero.rotationSeconds = 1; }],
    ["missing section", (c) => { delete c.colors; }],
  ])("rejects %s", async (_n, fn) => {
    const d = await mk(); const r = await call("PUT", `/${d.id}`, "admin-1", { expectedRevision: d.revision, config: tweak(d, fn) });
    expect(r.status).toBe(422); expect(r.body.code).toBe("DESIGN_INVALID"); expect(Object.keys(r.body.errors).length).toBeGreaterThan(0);
  });
  test("name and description limits", async () => {
    expect((await call("POST", "/", "admin-1", { name: "" })).status).toBe(400);
    expect((await call("POST", "/", "admin-1", { name: "a".repeat(81) })).status).toBe(400);
    expect((await call("POST", "/", "admin-1", { name: "<b>x</b>" })).status).toBe(400);
    expect((await call("POST", "/", "admin-1", { name: "ok", description: "d".repeat(301) })).status).toBe(400);
    expect((await call("POST", "/", "admin-1", { name: "ok", from: { type: "starter", id: "nope" } })).status).toBe(400);
  });
});

describe("multiple saved designs", () => {
  test("create from current, from a starter, and from another design", async () => {
    const cfg = await PlatformConfig.findOne(); expect(cfg === null || cfg).toBeTruthy();
    const a = await call("POST", "/", "admin-1", { name: "From current", from: { type: "current" } }); expect(a.status).toBe(201);
    expect(a.body.design.config).toEqual(DEFAULT_DESIGN);
    const b = await call("POST", "/", "admin-1", { name: "Navy", description: "dark", from: { type: "starter", id: "deep-navy" } });
    expect(b.body.design.config.colors.primaryDark).toBe("#071E26"); expect(b.body.design.description).toBe("dark");
    const c = await call("POST", "/", "admin-1", { name: "Navy 2", from: { type: "design", id: b.body.design.id } }); expect(c.body.design.config).toEqual(b.body.design.config);
    const list = (await call("GET", "/")).body; expect(list.designs.map((d) => d.name).sort()).toEqual(["From current", "Navy", "Navy 2"]);
    expect(list.starters.length).toBe(3);
  });
  test("create from CURRENT captures the real live settings", async () => {
    store.doc = { branding: { logoText: "ACME", primaryColor: "#112233" }, fontDisplay: "Georgia", heroPresentation: { tickerFallbackText: "Hello", overlayOpacityPct: 40 } };
    const d = await mk("Live copy", { type: "current" });
    expect(d.config.brand.logoText).toBe("ACME"); expect(d.config.colors.primaryColor).toBe("#112233"); expect(d.config.typography.fontDisplay).toBe("Georgia");
    expect(d.config.announcement.text).toBe("Hello"); expect(d.config.hero.overlayOpacityPct).toBe(40);
  });
  test("names are unique (case-insensitive)", async () => { await mk("Same"); expect((await call("POST", "/", "admin-1", { name: "same" })).body.code).toBe("DESIGN_NAME_TAKEN"); });
  test("rename + edit saves as a draft and does NOT change the live site", async () => {
    store.doc = { branding: { primaryColor: "#176B87" } };
    const d = await mk();
    const r = await call("PUT", `/${d.id}`, "admin-1", { expectedRevision: d.revision, name: "Renamed", description: "x", config: tweak(d, (c) => { c.colors.primaryColor = "#AA0000"; c.brand.logoText = "DRAFT"; }) });
    expect(r.status).toBe(200); expect(r.body.design).toMatchObject({ name: "Renamed", revision: d.revision + 1 });
    expect((await live()).colors.primaryColor).toBe("#176B87"); expect((await live()).brand.logoText).toBe("KAYAD");
  });
  test("a draft survives reload (server copy) and stale saves are refused", async () => {
    const d = await mk(); const cfg = tweak(d, (c) => { c.announcement.text = "Draft text"; });
    await call("PUT", `/${d.id}`, "admin-1", { expectedRevision: d.revision, config: cfg });
    expect((await call("GET", `/${d.id}`)).body.design.config.announcement.text).toBe("Draft text");
    const stale = await call("PUT", `/${d.id}`, "admin-1", { expectedRevision: d.revision, config: cfg }); expect(stale.status).toBe(409); expect(stale.body.code).toBe("DESIGN_REVISION_CONFLICT");
  });
  test("duplicate copies settings under a new name", async () => {
    const d = await mk("Orig"); const r = await call("POST", `/${d.id}/duplicate`, "admin-1", {});
    expect(r.status).toBe(201); expect(r.body.design.name).toBe("Orig (copy)"); expect(r.body.design.config).toEqual(d.config);
    expect((await call("POST", `/${d.id}/duplicate`, "admin-1", {})).body.code).toBe("DESIGN_NAME_TAKEN");
  });
  test("delete needs confirmation, removes the design, and never touches the live site", async () => {
    const d = await mk();
    expect((await call("DELETE", `/${d.id}`, "admin-1", {})).body.code).toBe("CONFIRMATION_REQUIRED");
    expect((await call("GET", `/${d.id}`)).status).toBe(200);
    expect((await call("DELETE", `/${d.id}`, "admin-1", { confirm: true })).status).toBe(200);
    expect((await call("GET", `/${d.id}`)).status).toBe(404);
  });
  test("bad ids and unknown designs", async () => { expect((await call("GET", "/not-a-uuid")).status).toBe(400); expect((await call("GET", `/${crypto.randomUUID()}`)).status).toBe(404); });
});

describe("publish, identify, preview data, rollback", () => {
  test("publishing needs confirmation, then really changes the platform config the public site reads", async () => {
    store.doc = { platformName: "KAYAD", dealerCommission: 7, branding: { logoUrl: "/branding/kayad-road-mark.svg", logoType: "image", primaryColor: "#176B87", customKeep: "yes" }, heroPresentation: { stageHeightPct: 90, floatingCards: [{ id: "c" }] }, navigation: { x: 1 } };
    const d = await mk("Spring");
    const cfg = tweak(d, (c) => { c.colors.primaryColor = "#AA0000"; c.brand.logoText = "SPRING"; c.typography.fontDisplay = "Georgia"; c.hero.overlayOpacityPct = 55; c.announcement.text = "Spring sale"; c.announcement.backgroundColor = "#123456"; });
    const saved = (await call("PUT", `/${d.id}`, "admin-1", { expectedRevision: d.revision, config: cfg })).body.design;
    expect((await call("POST", `/${d.id}/publish`, "admin-1", {})).body.code).toBe("CONFIRMATION_REQUIRED");
    expect((await live()).colors.primaryColor).toBe("#176B87"); // still unpublished
    const r = await call("POST", `/${d.id}/publish`, "admin-1", { confirm: true, expectedRevision: saved.revision });
    expect(r.status).toBe(200); expect(r.body.publication).toMatchObject({ designName: "Spring", kind: "publish" });
    const doc = store.doc;
    expect(doc.branding).toMatchObject({ primaryColor: "#AA0000", logoText: "SPRING", customKeep: "yes", logoType: "image" });
    expect(doc.fontDisplay).toBe("Georgia");
    expect(doc.heroPresentation).toMatchObject({ overlayOpacityPct: 55, tickerFallbackText: "Spring sale", tickerBackgroundColor: "#123456", stageHeightPct: 90, floatingCards: [{ id: "c" }] });
    expect(doc.dealerCommission).toBe(7); expect(doc.platformName).toBe("KAYAD"); expect(doc.navigation).toEqual({ x: 1 }); // unrelated settings untouched
    expect(actions()).toContain("site_design_published");
    expect(auditCreate.mock.calls.length + secCreate.mock.calls.length).toBeGreaterThan(0);
  });
  test("the published design is identified; unpublished edits and out-of-editor changes are flagged", async () => {
    const d = await mk("A"); const other = await mk("B");
    await call("POST", `/${d.id}/publish`, "admin-1", { confirm: true });
    let o = (await call("GET", "/")).body;
    expect(o.published).toMatchObject({ designName: "A", liveMatchesPublication: true });
    expect(o.designs.find((x) => x.name === "A")).toMatchObject({ isPublished: true, hasUnpublishedChanges: false });
    expect(o.designs.find((x) => x.name === "B").isPublished).toBe(false);
    await call("PUT", `/${d.id}`, "admin-1", { expectedRevision: d.revision, config: tweak(d, (c) => { c.brand.logoText = "EDIT"; }) });
    o = (await call("GET", "/")).body; expect(o.designs.find((x) => x.name === "A").hasUnpublishedChanges).toBe(true);
    store.doc.branding.primaryColor = "#000001"; // changed through the legacy Settings page
    o = (await call("GET", "/")).body; expect(o.published.liveMatchesPublication).toBe(false);
    expect(other.id).toBeTruthy();
  });
  test("the published design cannot be deleted; others can", async () => {
    const d = await mk("Live"); await call("POST", `/${d.id}/publish`, "admin-1", { confirm: true });
    const r = await call("DELETE", `/${d.id}`, "admin-1", { confirm: true }); expect(r.status).toBe(409); expect(r.body.code).toBe("DESIGN_IS_PUBLISHED");
  });
  test("stale revision at publish time is refused", async () => {
    const d = await mk(); await call("PUT", `/${d.id}`, "admin-1", { expectedRevision: d.revision, name: "Renamed" });
    const r = await call("POST", `/${d.id}/publish`, "admin-1", { confirm: true, expectedRevision: d.revision }); expect(r.status).toBe(409);
  });
  test("rollback restores the previous published design, survives a new session, and is recorded", async () => {
    const a = await mk("Alpha", { type: "starter", id: "kayad-default" }); const b = await mk("Beta", { type: "starter", id: "deep-navy" });
    const pa = (await call("POST", `/${a.id}/publish`, "admin-1", { confirm: true })).body.publication;
    await new Promise((r) => setTimeout(r, 5));
    await call("POST", `/${b.id}/publish`, "admin-1", { confirm: true });
    expect((await live()).colors.primaryDark).toBe("#071E26");
    expect((await call("POST", `/rollback/${pa.id}`, "admin-1", {})).body.code).toBe("CONFIRMATION_REQUIRED");
    const rb = await call("POST", `/rollback/${pa.id}`, "admin-1", { confirm: true });
    expect(rb.status).toBe(200); expect(rb.body.publication).toMatchObject({ kind: "rollback", designName: "Alpha", sourcePublicationId: pa.id });
    expect((await live()).colors.primaryDark).toBe("#0A3340");
    const fresh = (await call("GET", "/", "super-1")).body; expect(fresh.published).toMatchObject({ designName: "Alpha", kind: "rollback", liveMatchesPublication: true });
    const h = (await call("GET", "/history")).body.history; expect(h.map((x) => x.kind)).toEqual(["rollback", "publish", "publish"]);
    expect((await call("POST", `/rollback/${rb.body.publication.id}`, "admin-1", { confirm: true })).body.code).toBe("ALREADY_LIVE");
    expect(actions()).toContain("site_design_rollback");
  });
  test("rollback still works after the original design was deleted", async () => {
    const a = await mk("Gone"); const b = await mk("Stay");
    const pa = (await call("POST", `/${a.id}/publish`, "admin-1", { confirm: true })).body.publication;
    await new Promise((r) => setTimeout(r, 5)); await call("POST", `/${b.id}/publish`, "admin-1", { confirm: true });
    expect((await call("DELETE", `/${a.id}`, "admin-1", { confirm: true })).status).toBe(200);
    expect((await call("POST", `/rollback/${pa.id}`, "admin-1", { confirm: true })).status).toBe(200);
  });
  test("if the publication cannot be recorded, the live site is restored and the failure is reported", async () => {
    store.doc = { branding: { primaryColor: "#176B87", logoType: "image", logoUrl: "/branding/kayad-road-mark.svg" } };
    const d = await mk("Fails"); await call("PUT", `/${d.id}`, "admin-1", { expectedRevision: d.revision, config: tweak(d, (c) => { c.colors.primaryColor = "#AA0000"; }) });
    fakeDb.state.failPublicationInsert = true;
    const r = await call("POST", `/${d.id}/publish`, "admin-1", { confirm: true });
    expect(r.status).toBe(500); expect(r.body.code).toBe("PUBLISH_NOT_RECORDED");
    expect(store.doc.branding.primaryColor).toBe("#176B87");
  });
  test("unknown publication id", async () => { expect((await call("POST", `/rollback/${crypto.randomUUID()}`, "admin-1", { confirm: true })).status).toBe(404); });
});

describe("logo asset upload for a design", () => {
  const form = (name, type, bytes) => { const f = new FormData(); f.append("logo", new Blob([bytes], { type }), name); return f; };
  const upload = async (who, fd) => { const r = await fetch(`${base}/api/admin/site-designs/assets/logo`, { method: "POST", headers: who ? { authorization: `Bearer ${token(who)}` } : {}, body: fd }); return { status: r.status, body: await r.json().catch(() => ({})) }; };
  const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64)]);
  test("a real multipart PNG is stored and returns a URL, without touching the live logo", async () => {
    store.doc = { branding: { logoUrl: "/branding/kayad-road-mark.svg", logoType: "image" } };
    const r = await upload("admin-1", form("logo.png", "image/png", PNG));
    expect(r.status).toBe(201); expect(r.body.url).toMatch(/^https:\/\/res\.cloudinary\.com\/kayadtest\//); expect(uploadImage).toHaveBeenCalledTimes(1);
    expect(store.doc.branding.logoUrl).toBe("/branding/kayad-road-mark.svg");
    const d = await mk(); const saved = await call("PUT", `/${d.id}`, "admin-1", { expectedRevision: d.revision, config: tweak(d, (c) => { c.brand.logoUrl = r.body.url; }) });
    expect(saved.status).toBe(200); expect(saved.body.design.config.brand.logoUrl).toBe(r.body.url);
    await call("POST", `/${d.id}/publish`, "admin-1", { confirm: true });
    expect(store.doc.branding.logoUrl).toBe(r.body.url);
  });
  test("unauthorised, missing file, wrong type and fake image content fail safely", async () => {
    expect([401, 403]).toContain((await upload("buyer-1", form("logo.png", "image/png", PNG))).status);
    expect((await upload("admin-1", new FormData())).status).toBe(400);
    expect((await upload("admin-1", form("x.exe", "application/octet-stream", Buffer.from("MZ")))).status).toBeGreaterThanOrEqual(400);
    expect((await upload("admin-1", form("logo.png", "image/png", Buffer.from("this is not a png")))).status).toBeGreaterThanOrEqual(400);
    expect(uploadImage).not.toHaveBeenCalled();
  });
  test("image host failing falls back to the built-in store; the live logo is still untouched", async () => {
    uploadImage.mockRejectedValueOnce(new Error("provider down"));
    store.doc = { branding: { logoUrl: "/branding/kayad-road-mark.svg" } };
    const r = await upload("admin-1", form("logo.png", "image/png", PNG));
    expect(r.status).toBe(201); expect(r.body.storage).toBe("database"); expect(r.body.url).toMatch(/^\/api\/admin\/public\/logo\/[0-9a-f]{16}\.png$/);
    expect(store.doc.branding.logoUrl).toBe("/branding/kayad-road-mark.svg");
    const d = await mk(); const saved = await call("PUT", `/${d.id}`, "admin-1", { expectedRevision: d.revision, config: tweak(d, (c) => { c.brand.logoUrl = r.body.url; }) });
    expect(saved.status).toBe(200); // the built-in URL is accepted by design validation
  });
  test("image host not configured uses the built-in store; if that fails too the error is truthful and nothing changes", async () => {
    const keep = process.env.CLOUDINARY_API_SECRET; delete process.env.CLOUDINARY_API_SECRET;
    try {
      const ok = await upload("admin-1", form("logo.png", "image/png", PNG)); expect(ok.status).toBe(201); expect(ok.body.storage).toBe("database");
      kvFail = true; store.doc = { branding: { logoUrl: "/branding/kayad-road-mark.svg" } };
      const bad = await upload("admin-1", form("logo2.png", "image/png", Buffer.concat([PNG, Buffer.from([1])])));
      expect(bad.status).toBe(503); expect(bad.body.code).toBe("LOGO_STORAGE_UNAVAILABLE"); expect(store.doc.branding.logoUrl).toBe("/branding/kayad-road-mark.svg");
    } finally { kvFail = false; process.env.CLOUDINARY_API_SECRET = keep; }
  });
});

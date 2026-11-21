// ============================================================
// VISITOR ANALYTICS: ingestion, de-duplication, bot/DNT filtering, guest-to-registered handling, aggregation, ranges, export, authorization, privacy (2026-11-01).
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

const analyticsRoutes = (await import("../../routes/analyticsRoutes.js")).default;
const analyticsAdminRoutes = (await import("../../routes/analyticsAdminRoutes.js")).default;
const svc = await import("../../services/analytics.service.js");
const rep = await import("../../services/analyticsReport.service.js");
const cls = await import("../../utils/analyticsClassifiers.js");
const { __setOnboardingPolicyForTests } = await import("../../services/onboardingPolicy.service.js");
const approval = await import("../../services/dealerApproval.service.js");
const { __setDealerPaperworkForTests } = await import("../../services/dealerPaperwork.service.js");




const token = (id) => jwt.sign({ id, tokenVersion: 0 }, SECRET, { expiresIn: "1h" });
const staff = (id, role, extra = {}) => { world.users[id] = { _id: id, id, name: role, email: `${role}@example.test`, role, status: "approved", emailVerified: true, ...extra }; };
const UA_DESKTOP = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const UA_PHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const uid = () => crypto.randomUUID();
let server; let base;
beforeAll(async () => {
  const app = express(); app.use(express.json());
  app.use("/api/analytics", analyticsRoutes); app.use("/api/admin/analytics", analyticsAdminRoutes);
  app.use((err, req, res, _next) => res.status(err.statusCode || 500).json({ success: false, message: err.message }));
  server = http.createServer(app); await new Promise((r) => server.listen(0, "127.0.0.1", r)); base = `http://127.0.0.1:${server.address().port}`;
});
afterAll(() => new Promise((r) => server.close(r)));
beforeEach(() => {
  fakeDb = _mk(); world.users = {}; world.newUsers = 0; auditCreate.mockClear(); secCreate.mockClear();
  svc.__setAnalyticsSettingsForTests(null);
  staff("admin-1", "admin"); staff("super-1", "superadmin"); staff("buyer-1", "user"); staff("mod-1", "moderator");
});
const collect = async (body, { as, headers = {} } = {}) => {
  const r = await fetch(`${base}/api/analytics/collect`, { method: "POST", headers: { "content-type": "application/json", "user-agent": UA_DESKTOP, ...(as ? { authorization: `Bearer ${token(as)}` } : {}), ...headers }, body: JSON.stringify({ eventId: uid(), type: "page_view", path: "/?nav=marketplace", ...body }) });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};
const api = async (path, as, method = "GET") => {
  const r = await fetch(`${base}/api/admin/analytics${path}`, { method, headers: { ...(as ? { authorization: `Bearer ${token(as)}` } : {}) } });
  const text = await r.text(); let json = null; try { json = JSON.parse(text); } catch { /* csv */ }
  return { status: r.status, body: json, text, headers: r.headers };
};
const T = () => fakeDb.tables;

describe("classifiers", () => {
  test("bots, empty and tool user agents are automation; real browsers are not", () => {
    for (const ua of ["", "curl/8.1", "Googlebot/2.1 (+http://www.google.com/bot.html)", "python-requests/2.31", "HeadlessChrome/120", "Mozilla/5.0 (compatible; bingbot/2.0)", "Lighthouse"]) expect(cls.isBot(ua)).toBe(true);
    for (const ua of [UA_DESKTOP, UA_PHONE]) expect(cls.isBot(ua)).toBe(false);
  });
  test("device class", () => {
    expect(cls.deviceClass(UA_PHONE)).toBe("mobile");
    expect(cls.deviceClass("Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15")).toBe("tablet");
    expect(cls.deviceClass("Mozilla/5.0 (Linux; Android 14; SM-X900) AppleWebKit/537.36 Chrome/126 Safari/537.36")).toBe("tablet");
    expect(cls.deviceClass("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126 Mobile Safari/537.36")).toBe("mobile");
    expect(cls.deviceClass(UA_DESKTOP)).toBe("desktop");
  });
  test("referrer channels; own host is internal; utm wins", () => {
    const own = ["www.kayad.space"];
    expect(cls.classifyReferrer({}, own)).toEqual({ channel: "direct", host: null });
    expect(cls.classifyReferrer({ referrer: "https://www.google.com/search?q=x" }, own).channel).toBe("search");
    expect(cls.classifyReferrer({ referrer: "https://l.facebook.com/" }, own).channel).toBe("social");
    expect(cls.classifyReferrer({ referrer: "https://t.co/abc" }, own).channel).toBe("social");
    expect(cls.classifyReferrer({ referrer: "https://carblog.example/post" }, own)).toEqual({ channel: "referral", host: "carblog.example" });
    expect(cls.classifyReferrer({ referrer: "https://www.kayad.space/x" }, own)).toBeNull();
    expect(cls.classifyReferrer({ referrer: "https://www.google.com/", utmMedium: "email", utmSource: "weekly" }, own)).toEqual({ channel: "email", host: "weekly" });
    expect(cls.classifyReferrer({ utmMedium: "cpc", utmSource: "g", utmCampaign: "launch" }, own).channel).toBe("campaign");
  });
  test("path normalisation drops ids and query noise, keeps the app section, refuses admin/api", () => {
    expect(cls.normalizePath("/?nav=marketplace&utm_source=x&email=a@b.c")).toBe("/?nav=marketplace");
    expect(cls.normalizePath("/car/3f2b8c1e-1111-4222-8333-444455556666?token=abc#frag")).toBe("/car/:id");
    expect(cls.normalizePath("/auction/12345")).toBe("/auction/:id");
    expect(cls.normalizePath("/admin/users")).toBeNull();
    expect(cls.normalizePath("/api/auth/login")).toBeNull();
    expect(cls.normalizePath("javascript:alert(1)")).toBeNull();
    expect(cls.normalizePath("/?nav=<script>")).toBe("/");
  });
});

describe("date ranges (Africa/Nairobi)", () => {
  const now = new Date("2026-11-01T20:30:00Z"); // 23:30 EAT on 1 Nov
  test("today / yesterday / 7d / 30d / 90d", () => {
    const iso = (d) => d.toISOString();
    let r = rep.resolveRange({ range: "today" }, now);
    expect([iso(r.from), iso(r.to)]).toEqual(["2026-10-31T21:00:00.000Z", "2026-11-01T21:00:00.000Z"]);
    r = rep.resolveRange({ range: "yesterday" }, now);
    expect([iso(r.from), iso(r.to)]).toEqual(["2026-10-30T21:00:00.000Z", "2026-10-31T21:00:00.000Z"]);
    expect(rep.resolveRange({ range: "7d" }, now).days).toBe(7);
    expect(rep.resolveRange({ range: "30d" }, now).days).toBe(30);
    expect(rep.resolveRange({ range: "90d" }, now).days).toBe(90);
  });
  test("a visit at 22:30 UTC belongs to the NEXT Nairobi day", () => {
    expect(rep.eatDateStr(Date.parse("2026-11-01T22:30:00Z"))).toBe("2026-11-02");
  });
  test("custom ranges validate", () => {
    const ok = rep.resolveRange({ range: "custom", from: "2026-10-01", to: "2026-10-10" }, now);
    expect(ok.ok).toBe(true); expect(ok.days).toBe(10);
    for (const bad of [{ from: "2026-10-10", to: "2026-10-01" }, { from: "nope", to: "2026-10-01" }, { from: "2026-12-01", to: "2026-12-05" }, { from: "2025-01-01", to: "2026-10-01" }, {}]) expect(rep.resolveRange({ range: "custom", ...bad }, now).ok).toBe(false);
    expect(rep.resolveRange({ range: "weekly" }, now).ok).toBe(false);
  });
});

describe("collection", () => {
  test("a guest is counted with no login", async () => {
    const r = await collect({ visitorId: uid(), sessionId: uid() });
    expect(r.status).toBe(202); expect(r.body.counted).toBe(true);
    expect(T().analytics_events).toHaveLength(1); expect(T().analytics_sessions[0].authenticated).toBe(false);
  });
  test.each([
    ["a bot", { "user-agent": "Googlebot/2.1" }],
    ["Do-Not-Track", { dnt: "1" }],
    ["Global Privacy Control", { "sec-gpc": "1" }],
  ])("%s is not counted and nothing is stored", async (_n, headers) => {
    const r = await collect({ visitorId: uid(), sessionId: uid() }, { headers });
    expect(r.status).toBe(202); expect(r.body.counted).toBe(false);
    expect(T().analytics_events).toHaveLength(0); expect(T().analytics_visitors).toHaveLength(0); expect(T().analytics_sessions).toHaveLength(0);
  });
  test("admin and api pages are never tracked", async () => {
    expect((await collect({ visitorId: uid(), sessionId: uid(), path: "/admin/users" })).body.counted).toBe(false);
    expect(T().analytics_events).toHaveLength(0);
  });
  test("collection can be switched off in settings", async () => {
    svc.__setAnalyticsSettingsForTests({ enabled: false });
    expect((await collect({ visitorId: uid(), sessionId: uid() })).body.counted).toBe(false);
    expect(T().analytics_events).toHaveLength(0);
  });
  test("invalid payloads are refused (400) and unknown fields are not accepted", async () => {
    expect((await collect({ visitorId: "not-a-uuid", sessionId: uid() })).status).toBe(400);
    expect((await collect({ visitorId: uid(), sessionId: uid(), type: "keylog" })).status).toBe(400);
    expect((await collect({ visitorId: uid(), sessionId: uid(), email: "a@b.c" })).status).toBe(400);
  });
  test("a refresh inside 2 seconds and a retried event id are de-duplicated; one visitor, one visit", async () => {
    const v = uid(); const s = uid(); const eventId = uid();
    await collect({ visitorId: v, sessionId: s, eventId });
    expect((await collect({ visitorId: v, sessionId: s, eventId })).body.counted).toBe(false); // same event id (network retry)
    expect((await collect({ visitorId: v, sessionId: s })).body.counted).toBe(false); // immediate refresh, new event id
    expect(T().analytics_events).toHaveLength(1);
    expect(T().analytics_visitors).toHaveLength(1); expect(T().analytics_sessions).toHaveLength(1);
  });
  test("different pages in one visit are separate page views but one visit and one visitor", async () => {
    const v = uid(); const s = uid();
    await collect({ visitorId: v, sessionId: s, path: "/?nav=marketplace" });
    await collect({ visitorId: v, sessionId: s, path: "/?nav=support" });
    expect(T().analytics_events).toHaveLength(2); expect(T().analytics_sessions).toHaveLength(1); expect(T().analytics_visitors).toHaveLength(1);
  });
  test("heartbeats keep a session alive without creating page views", async () => {
    const v = uid(); const s = uid();
    await collect({ visitorId: v, sessionId: s });
    await collect({ visitorId: v, sessionId: s, type: "heartbeat" });
    expect(T().analytics_events).toHaveLength(1); expect(T().analytics_sessions[0].page_views).toBe(1);
  });
  test("guest then login in the same browser: ONE visitor, ONE session, upgraded to authenticated", async () => {
    const v = uid(); const s = uid();
    await collect({ visitorId: v, sessionId: s });
    await collect({ visitorId: v, sessionId: s, path: "/?nav=saved" }, { as: "buyer-1" });
    expect(T().analytics_visitors).toHaveLength(1); expect(T().analytics_sessions).toHaveLength(1);
    expect(T().analytics_sessions[0].authenticated).toBe(true); expect(T().analytics_visitors[0].ever_authenticated).toBe(true);
    const r = rep.aggregate({ sessions: T().analytics_sessions, events: T().analytics_events, visitors: T().analytics_visitors, from: new Date(0), to: new Date(Date.now() + 1e6) });
    expect(r.totals).toMatchObject({ uniqueVisitors: 1, registeredVisitors: 1, guestVisitors: 0, totalVisits: 1, authenticatedSessions: 1 });
  });
  test("a session id cannot be replayed by another visitor", async () => {
    const s = uid();
    await collect({ visitorId: uid(), sessionId: s });
    expect((await collect({ visitorId: uid(), sessionId: s, path: "/?nav=support" })).body.counted).toBe(false);
    expect(T().analytics_sessions).toHaveLength(1);
  });
  test("stored rows contain no raw identifiers, user agent, IP or user id", async () => {
    const v = uid(); const s = uid(); const e = uid();
    await collect({ visitorId: v, sessionId: s, eventId: e }, { as: "buyer-1", headers: { "x-forwarded-for": "203.0.113.9", "cf-ipcountry": "KE" } });
    const dump = JSON.stringify(T());
    for (const secret of [v, s, "203.0.113.9", "Chrome/126", "buyer-1", "@example.test"]) expect(dump).not.toContain(secret);
    expect(T().analytics_sessions[0].country_code).toBe("KE");
    expect(T().analytics_sessions[0].device_class).toBe("desktop");
  });
  test("the event time is the server's, not the client's", async () => {
    const before = Date.now();
    await collect({ visitorId: uid(), sessionId: uid() });
    expect(Math.abs(new Date(T().analytics_events[0].occurred_at).getTime() - before)).toBeLessThan(5000);
  });
  test("a returning visit in a new session keeps the original first_seen", async () => {
    const v = uid();
    await collect({ visitorId: v, sessionId: uid() });
    const first = T().analytics_visitors[0].first_seen_at;
    await new Promise((r) => setTimeout(r, 15));
    await collect({ visitorId: v, sessionId: uid(), path: "/?nav=support" });
    expect(T().analytics_visitors).toHaveLength(1); expect(T().analytics_visitors[0].first_seen_at).toBe(first); expect(T().analytics_sessions).toHaveLength(2);
  });
  test("a vehicle view stores the public listing id only", async () => {
    const l = uid();
    await collect({ visitorId: uid(), sessionId: uid(), type: "listing_view", path: `/car/${l}`, listingId: l });
    expect(T().analytics_events[0]).toMatchObject({ event_type: "listing_view", listing_id: l, path: "/car/:id" });
  });
});

// ---- seeded history for aggregation / ranges / comparison ----
const seed = () => {
  const mk = (i, daysAgo, o = {}) => {
    // Anchor to midday EAT of the target calendar day (never in the future) so the suite does not depend on
    // the wall-clock hour it runs at; "now minus 1h" lands on yesterday between 00:00 and 01:00 EAT.
    const eatMidnight = Math.floor((Date.now() + 3 * 3600_000) / 86400_000) * 86400_000 - 3 * 3600_000;
    const t = new Date(Math.min(eatMidnight - daysAgo * 86400_000 + 12 * 3600_000, Date.now() - 60_000)).toISOString();
    const vh = `v${i}`; const sh = `s${i}-${daysAgo}`;
    T().analytics_sessions.push({ session_hash: sh, visitor_hash: vh, started_at: t, last_seen_at: t, authenticated: !!o.auth, user_hash: o.auth ? `u${i}` : null, device_class: o.device || "desktop", country_code: o.country === undefined ? "KE" : o.country, source_channel: o.channel || "direct", source_host: o.host || null, landing_path: "/", page_views: 1 });
    T().analytics_events.push({ event_id: uid(), occurred_at: t, session_hash: sh, visitor_hash: vh, event_type: o.type || "page_view", path: o.path || "/?nav=marketplace", listing_id: o.listing || null, authenticated: !!o.auth, dedupe_key: uid() });
    if (!T().analytics_visitors.some((v) => v.visitor_hash === vh)) T().analytics_visitors.push({ visitor_hash: vh, first_seen_at: o.first || t, last_seen_at: t, ever_authenticated: !!o.auth });
    return { vh, sh, t };
  };
  return mk;
};

describe("aggregation, ranges, comparison", () => {
  const L1 = "11111111-1111-4111-8111-111111111111"; const L2 = "22222222-2222-4222-8222-222222222222";
  test("metrics are computed from persisted rows and add up", async () => {
    const mk = seed();
    mk(1, 0, { device: "mobile", channel: "search", host: "google.com", type: "listing_view", path: "/car/:id", listing: L1 });
    mk(2, 0, { auth: true, channel: "social", host: "facebook.com", type: "listing_view", path: "/car/:id", listing: L1 });
    mk(3, 0, { device: "tablet", country: null, type: "auction_view", path: "/auction/:id" });
    mk(1, 1, { type: "listing_view", path: "/car/:id", listing: L2, first: new Date(Date.now() - 40 * 86400_000).toISOString() });
    T().analytics_events.push({ event_id: uid(), occurred_at: new Date().toISOString(), session_hash: "s2-0", visitor_hash: "v2", event_type: "registration", path: "/register", listing_id: null, authenticated: false, dedupe_key: uid() });
    world.newUsers = 4;
    const r = await api("/summary?range=7d", "admin-1");
    expect(r.status).toBe(200);
    expect(r.body.totals).toMatchObject({ totalVisits: 4, uniqueVisitors: 3, registeredVisitors: 1, guestVisitors: 2, authenticatedSessions: 1, newRegistrations: 4, convertedVisitors: 1, auctionPageViews: 1, pageViews: 4 });
    expect(r.body.totals.registrationConversionRate).toBeCloseTo(33.3, 1);
    expect(r.body.totals.registeredVisitors + r.body.totals.guestVisitors).toBe(r.body.totals.uniqueVisitors);
    expect(r.body.totals.returningVisitors + r.body.totals.newVisitors).toBe(r.body.totals.uniqueVisitors);
    expect(r.body.topListings[0]).toMatchObject({ listingId: L1, views: 2, uniqueVisitors: 2 });
    expect(r.body.devices.map((d) => d.device).sort()).toEqual(["desktop", "mobile", "tablet"]);
    expect(r.body.sources.channels.map((c) => c.channel)).toEqual(expect.arrayContaining(["direct", "search", "social"]));
    expect(r.body.geography.map((g) => g.country)).toEqual(expect.arrayContaining(["KE", "Unknown"]));
    expect(r.body.daily).toHaveLength(7);
    expect(r.body.daily.reduce((n, d) => n + d.visits, 0)).toBe(4);
    expect(r.body.definitions.uniqueVisitors).toMatch(/refresh never adds/);
  });
  test("date filters select only that period; yesterday excludes today", async () => {
    const mk = seed();
    mk(1, 0); mk(2, 1); mk(3, 10); mk(4, 45); mk(5, 120);
    const total = async (q) => (await api(`/summary?${q}`, "admin-1")).body.totals.totalVisits;
    expect(await total("range=today")).toBe(1);
    expect(await total("range=yesterday")).toBe(1);
    expect(await total("range=7d")).toBe(2);
    expect(await total("range=30d")).toBe(3);
    expect(await total("range=90d")).toBe(4);
    const d = (n) => new Date(Date.now() - n * 86400_000 + 3 * 3600_000).toISOString().slice(0, 10);
    expect(await total(`range=custom&from=${d(12)}&to=${d(8)}`)).toBe(1);
  });
  test("invalid custom range is a 400 with a code", async () => {
    const r = await api("/summary?range=custom&from=2026-10-10&to=2026-10-01", "admin-1");
    expect(r.status).toBe(400); expect(r.body.code).toBe("ANALYTICS_RANGE_INVALID");
  });
  test("no data: zeros, never invented, and says tracking has not started", async () => {
    const r = await api("/summary?range=7d", "admin-1");
    expect(r.body.totals).toMatchObject({ totalVisits: 0, uniqueVisitors: 0, pageViews: 0 });
    expect(r.body.tracking).toMatchObject({ hasData: false, begins: null });
    expect(r.body.tracking.note).toMatch(/No visitor analytics have been collected yet/);
    expect(r.body.comparison.available).toBe(false);
  });
  test("history is never invented: a period before tracking began is flagged and comparison is withheld", async () => {
    const mk = seed(); mk(1, 1); mk(2, 2);
    const r = await api("/summary?range=30d", "admin-1");
    expect(r.body.tracking.partialPeriod).toBe(true);
    expect(r.body.tracking.note).toMatch(/Reliable tracking begins/);
    expect(r.body.comparison.available).toBe(false);
  });
  test("comparison is offered when tracking covers the previous period", async () => {
    const mk = seed(); mk(9, 15); mk(1, 9); mk(2, 2); mk(3, 3); mk(4, 4);
    const r = await api("/summary?range=7d", "admin-1");
    expect(r.body.comparison.available).toBe(true);
    expect(r.body.comparison.change.totalVisits).toMatchObject({ current: 3, previous: 1, changePct: 200 });
  });
  test("live activity counts only sessions seen in the last 5 minutes and states its refresh interval", async () => {
    const recent = new Date().toISOString(); const old = new Date(Date.now() - 20 * 60_000).toISOString();
    T().analytics_sessions.push(
      { session_hash: "a", visitor_hash: "v1", started_at: old, last_seen_at: recent, authenticated: true, device_class: "mobile" },
      { session_hash: "b", visitor_hash: "v2", started_at: old, last_seen_at: recent, authenticated: false, device_class: "desktop" },
      { session_hash: "c", visitor_hash: "v3", started_at: old, last_seen_at: old, authenticated: false, device_class: "desktop" });
    const r = await api("/live", "admin-1");
    expect(r.body).toMatchObject({ activeSessions: 2, registeredSessions: 1, guestSessions: 1, refreshSeconds: 30, windowMinutes: 5 });
  });
});

describe("export", () => {
  test("CSV per report kind, audited, formula-injection safe", async () => {
    const mk = seed(); mk(1, 0, { path: "/?nav=marketplace" });
    T().analytics_events.push({ event_id: uid(), occurred_at: new Date().toISOString(), session_hash: "s1-0", visitor_hash: "v1", event_type: "page_view", path: "/=cmd|calc", listing_id: null, authenticated: false, dedupe_key: uid() });
    const r = await api("/export?kind=pages&range=7d", "admin-1");
    expect(r.status).toBe(200); expect(r.headers.get("content-type")).toMatch(/text\/csv/);
    expect(r.text.split("\n")[0]).toBe("path,views,uniqueVisitors");
    expect(r.text).not.toMatch(/^=/m); expect(r.text).toContain("'/=cmd|calc".replace("'/", "/") ) ;
    const entry = secCreate.mock.calls.map(([e]) => e).find((e) => e.action === "analytics_report_exported");
    expect(entry).toBeTruthy();
    for (const kind of rep.EXPORT_KINDS) expect((await api(`/export?kind=${kind}&range=7d`, "super-1")).status).toBe(200);
    expect((await api("/export?kind=raw", "admin-1")).status).toBe(400);
  });
  test("csv escaping and injection guard", () => {
    expect(rep.toCsv(["a"], [{ a: "=SUM(1)" }, { a: "x,\"y\"" }, { a: 5 }, { a: "-3" }])).toBe('a\n\'=SUM(1)\n"x,""y"""\n5\n-3\n');
  });
});

describe("authorization and privacy of the admin API", () => {
  test.each(["buyer-1", "mod-1", null])("%s cannot read analytics", async (who) => {
    for (const p of ["/summary", "/live", "/export?kind=summary"]) expect([401, 403]).toContain((await api(p, who)).status);
  });
  test("purge is superadmin only; admin is refused", async () => {
    expect((await api("/purge", "admin-1", "POST")).status).toBe(403);
    expect((await api("/purge", "super-1", "POST")).status).toBe(200);
  });
  test("retention purge removes only expired rows", async () => {
    const old = new Date(Date.now() - 500 * 86400_000).toISOString(); const fresh = new Date().toISOString();
    T().analytics_events.push({ event_id: uid(), occurred_at: old, session_hash: "x", visitor_hash: "x", event_type: "page_view", path: "/", dedupe_key: "1" }, { event_id: uid(), occurred_at: fresh, session_hash: "y", visitor_hash: "y", event_type: "page_view", path: "/", dedupe_key: "2" });
    T().analytics_sessions.push({ session_hash: "x", visitor_hash: "x", started_at: old, last_seen_at: old }, { session_hash: "y", visitor_hash: "y", started_at: fresh, last_seen_at: fresh });
    const r = await api("/purge", "super-1", "POST");
    expect(r.body.deleted).toMatchObject({ analytics_events: 1, analytics_sessions: 1 });
    expect(T().analytics_events).toHaveLength(1);
  });
  test("responses are aggregates only: no hashes, user ids, IPs or per-person rows", async () => {
    const mk = seed(); mk(1, 0, { auth: true });
    const r = await api("/summary?range=7d", "admin-1");
    const dump = JSON.stringify(r.body);
    for (const k of ["visitor_hash", "session_hash", "user_hash", "\"v1\"", "s1-0", "u1", "\"ip\"", "user_agent"]) expect(dump).not.toContain(k);
  });
});

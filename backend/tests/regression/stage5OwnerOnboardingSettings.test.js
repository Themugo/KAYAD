// ============================================================
// STAGE 5 (2026-10-19) — OWNER-CONTROLLED ONBOARDING SETTINGS.
//
// Drives the REAL routes/adminRoutes.js, REAL protect/adminOnly/requirePermission
// middleware and the REAL services/onboardingPolicy.service.js over HTTP. Only the
// persistence layer is faked (an in-memory `system_settings` table that enforces
// the UNIQUE(key) constraint and applies .eq/.is filters on update, so the
// compare-and-swap logic is exercised for real). EVIDENCE TIER: mocked local
// runtime — see the disposable-PostgreSQL test for the real-constraint tier.
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

const chain = (value) => {
  const q = { select: jest.fn(() => q), lean: jest.fn(() => q), catch: jest.fn(() => q), then: (res, rej) => Promise.resolve(value).then(res, rej) };
  return q;
};
const users = {};
jest.unstable_mockModule("../../models/User.js", () => ({
  default: { findById: jest.fn((id) => chain(users[id] || null)), findByIdAndUpdate: jest.fn(() => chain({})), findOne: jest.fn(() => chain(null)) },
}));
jest.unstable_mockModule("../../models/UserAuth.js", () => ({ default: { findOne: jest.fn(() => chain({ tokenVersion: 0 })) } }));
jest.unstable_mockModule("../../models/RefreshToken.js", () => ({ default: { findActiveSessionById: jest.fn(async () => ({})) } }));
jest.unstable_mockModule("../../models/PlatformConfig.js", () => ({ default: { findOne: jest.fn(() => chain({})), create: jest.fn(async () => ({ toObject: () => ({}) })) } }));
const auditCreate = jest.fn(async () => ({}));
jest.unstable_mockModule("../../models/AuditLog.js", () => ({ default: { create: auditCreate } }));
jest.unstable_mockModule("../../middleware/auditLog.js", () => ({ auditLog: () => (req, res, next) => next() }));
const carFind = jest.fn();
jest.unstable_mockModule("../../models/Car.js", () => ({ default: { findById: jest.fn(() => ({ populate: async () => carFind() })), find: jest.fn() } }));

// ── in-memory system_settings with UNIQUE(key) and a hook to interleave concurrent requests ──
let table; let failRead; let failWrite; let beforeWrite;
const sbModule = {
  initSupabase: jest.fn(),
  checkSupabaseReadiness: async () => ({ ok: true }),
  isSupabaseConnected: () => true,
  default: null,
  getSupabase: () => ({
    rpc: jest.fn(),
    from: (name) => {
      if (name !== "system_settings") return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) };
      const st = { op: "select", filters: [], payload: null, single: false };
      const api = {
        select() { return api; },
        // supports PostgREST JSON-path text filters such as "value->>revision"
        col(r, c) { const m = /^(\w+)->>(\w+)$/.exec(c); if (!m) return r[c]; const x = r[m[1]]?.[m[2]]; return x == null ? x : String(x); },
        eq(c, v) { st.filters.push((r) => api.col(r, c) === v); return api; },
        is(c, v) { st.filters.push((r) => (v === null ? api.col(r, c) == null : api.col(r, c) === v)); return api; },
        insert(p) { st.op = "insert"; st.payload = p; return api; },
        update(p) { st.op = "update"; st.payload = p; return api; },
        maybeSingle() { st.single = true; return api; },
        then(res, rej) { return Promise.resolve(run()).then(res, rej); },
      };
      async function run() {
        if (st.op === "select") {
          if (failRead) return { data: null, error: { message: "boom (read)" } };
          const r = table.filter((x) => st.filters.every((f) => f(x)));
          return { data: st.single ? (r[0] ? { ...r[0] } : null) : r, error: null };
        }
        if (beforeWrite) await beforeWrite();
        if (failWrite) return { data: null, error: { message: "boom (write)" } };
        if (st.op === "insert") {
          if (table.some((x) => x.key === st.payload.key)) return { data: null, error: { code: "23505", message: "duplicate key" } };
          const row = { updated_at: new Date().toISOString(), ...st.payload };
          table.push(row);
          return { data: [{ key: row.key }], error: null };
        }
        const hit = table.filter((x) => st.filters.every((f) => f(x)));
        hit.forEach((x) => Object.assign(x, st.payload));
        return { data: hit.map((x) => ({ key: x.key })), error: null };
      }
      return api;
    },
  }),
};
jest.unstable_mockModule("../../utils/supabase.js", () => sbModule);

const svc = await import("../../services/onboardingPolicy.service.js");
const adminRoutes = (await import("../../routes/adminRoutes.js")).default;
const { mayDecide, INITIAL_DEFAULTS, RESTRICTIVE } = svc;

const ROLES = ["user", "individual_seller", "dealer", "ghost_checker", "moderator", "marketing", "hr", "accounts", "admin", "superadmin", "owner"];
const token = (id) => jwt.sign({ id, tokenVersion: 0 }, SECRET, { expiresIn: "1h" });
ROLES.forEach((role) => {
  users[`u-${role}`] = { _id: `u-${role}`, email: role === "owner" ? "owner@example.test" : `${role}@example.test`, name: role, role: role === "owner" ? "user" : role, status: "approved", emailVerified: true };
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

const call = (method, path, { role, body } = {}) =>
  fetch(base + path, {
    method,
    headers: { "content-type": "application/json", ...(role ? { authorization: `Bearer ${token(`u-${role}`)}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }));

const stored = () => table.find((r) => r.key === svc.ONBOARDING_POLICY_KEY);
const actions = () => auditCreate.mock.calls.map((c) => c[0].action);

beforeEach(() => {
  table = []; failRead = false; failWrite = false; beforeWrite = null;
  auditCreate.mockClear();
  svc.invalidateOnboardingPolicyCache();
  svc.__setOnboardingPolicyForTests(null);
});

// ─────────────────────────────────────────────────────────────
describe("pure policy functions", () => {
  test("launch defaults are deliberate: dealers are NOT silently opened", () => {
    expect(INITIAL_DEFAULTS).toEqual({
      privateSellerRegistration: "enabled", dealerOnboardingMode: "approval_required", listingModeration: "hold_for_review",
      dealerDecisionAuthority: "owner_only", listingDecisionAuthority: "owner_only",
    });
  });
  test("restrictive fallback closes registration and holds listings", () => {
    expect(RESTRICTIVE).toMatchObject({ privateSellerRegistration: "disabled", dealerOnboardingMode: "closed", listingModeration: "hold_for_review" });
  });
  test("corrupt values become restrictive per field and are reported", () => {
    const { policy, issues } = svc.normalizePolicyValue({ privateSellerRegistration: "yes", dealerOnboardingMode: "self_onboarding", listingModeration: 7 });
    expect(policy.privateSellerRegistration).toBe("disabled");
    expect(policy.dealerOnboardingMode).toBe("self_onboarding");
    expect(policy.listingModeration).toBe("hold_for_review");
    expect(issues.length).toBe(2);
  });
  test.each([null, "x", 5, [], undefined])("non-object stored value %j is fully restrictive", (v) => {
    expect(svc.normalizePolicyValue(v).policy).toEqual(RESTRICTIVE);
  });
  test.each([
    [{ dealerOnboardingMode: "open" }], [{ privateSellerRegistration: true }], [{ listingModeration: "auto" }],
    [{ nope: "x" }], [{}], [null], [[]], [{ revision: 99 }], [{ updatedBy: "attacker" }], [JSON.parse('{"__proto__":{"x":1}}')],
  ])("validatePolicyChanges rejects %j", (input) => {
    expect(svc.validatePolicyChanges(input).ok).toBe(false);
  });
  test("validatePolicyChanges accepts exactly the allowed enums", () => {
    expect(svc.validatePolicyChanges({ dealerOnboardingMode: "self_onboarding", listingModeration: "auto_publish" })).toMatchObject({ ok: true });
  });
  test("mayDecide: owner_only admits the owner only; admins admits admin/superadmin; untrusted ⇒ owner only", () => {
    const owner = { role: "superadmin", effectiveRole: "webhoist", emailVerified: true };
    const admin = { role: "admin", effectiveRole: "admin" };
    const sup = { role: "superadmin", effectiveRole: "superadmin" };
    const mk = (a, src = "database") => ({ policy: { ...INITIAL_DEFAULTS, dealerDecisionAuthority: a, listingDecisionAuthority: a }, source: src });
    expect([owner, admin, sup].map((u) => mayDecide(u, "dealer", mk("owner_only")))).toEqual([true, false, false]);
    expect([owner, admin, sup, { role: "marketing" }].map((u) => mayDecide(u, "listing", mk("admins")))).toEqual([true, true, true, false]);
    expect(mayDecide(admin, "dealer", { policy: RESTRICTIVE, source: "unavailable" })).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────
describe("read path fails safe", () => {
  test("no row ⇒ deliberate defaults, source 'default'", async () => {
    const r = await svc.getOnboardingPolicy({ fresh: true });
    expect(r).toMatchObject({ source: "default", revision: 0 });
    expect(r.policy).toEqual(INITIAL_DEFAULTS);
  });
  test("read error ⇒ restrictive, source 'unavailable' (never throws)", async () => {
    failRead = true;
    const r = await svc.getOnboardingPolicy({ fresh: true });
    expect(r.source).toBe("unavailable");
    expect(r.policy).toEqual(RESTRICTIVE);
    expect(svc.isPolicyTrusted(r)).toBe(false);
  });
  test("a failed read is not cached as success", async () => {
    failRead = true;
    await svc.getOnboardingPolicy({ fresh: true });
    failRead = false;
    expect((await svc.getOnboardingPolicy()).source).toBe("default");
  });
  test("corrupt stored row ⇒ source 'invalid' with restrictive fields; trusted=false", async () => {
    table.push({ key: svc.ONBOARDING_POLICY_KEY, value: { dealerOnboardingMode: "wide_open", privateSellerRegistration: "enabled", revision: 3 }, updated_at: "2026-10-01T00:00:00.000Z" });
    const r = await svc.getOnboardingPolicy({ fresh: true });
    expect(r.source).toBe("invalid");
    expect(r.policy.dealerOnboardingMode).toBe("closed");
    expect(r.policy.privateSellerRegistration).toBe("enabled");
    expect(svc.isPolicyTrusted(r)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────
describe("GET /api/admin/settings/onboarding — who can view", () => {
  const denied = ROLES.filter((r) => !["admin", "superadmin", "owner"].includes(r));
  test.each(denied)("%s cannot view (403)", async (role) => {
    const r = await call("GET", "/api/admin/settings/onboarding", { role });
    expect(r.status).toBe(403);
    expect(r.body.policy).toBeUndefined();
  });
  test("unauthenticated ⇒ 401", async () => {
    expect((await call("GET", "/api/admin/settings/onboarding")).status).toBe(401);
  });
  test("admin and superadmin can view read-only (canChange=false); owner canChange=true", async () => {
    const s = await call("GET", "/api/admin/settings/onboarding", { role: "superadmin" });
    expect(s.status).toBe(200);
    expect(s.body.canChange).toBe(false);
    expect(s.body.policy).toMatchObject({ ...INITIAL_DEFAULTS, source: "default", revision: 0, emailVerificationRequiredForSellers: true });
    const a = await call("GET", "/api/admin/settings/onboarding", { role: "admin" });
    expect([a.status, a.body.canChange]).toEqual([200, false]);
    const o = await call("GET", "/api/admin/settings/onboarding", { role: "owner" });
    expect(o.status).toBe(200);
    expect(o.body.canChange).toBe(true);
    expect(o.body.options.dealerOnboardingMode).toEqual(["self_onboarding", "approval_required", "closed"]);
  });
  test("an owner whose email is NOT verified can view but not change (no inherited owner power from an unclaimed address)", async () => {
    users["u-owner"].emailVerified = false;
    try {
      const g = await call("GET", "/api/admin/settings/onboarding", { role: "owner" });
      expect([g.status, g.body.canChange]).toEqual([200, false]);
      const p = await call("PUT", "/api/admin/settings/onboarding", { role: "owner", body: { dealerOnboardingMode: "closed", expectedRevision: 0 } });
      expect([p.status, p.body.code]).toEqual([403, "OWNER_EMAIL_UNVERIFIED"]);
      expect(stored()).toBeUndefined();
      carFind.mockReturnValue(null);
      const m = await call("POST", `/api/admin/cars/11111111-1111-4111-8111-111111111111/moderate`, { role: "owner", body: { action: "approve" } });
      expect(m.status).toBe(403);
    } finally { users["u-owner"].emailVerified = true; }
  });
  test("a read failure is shown honestly as 'unavailable' with restrictive values — never as open", async () => {
    failRead = true;
    const o = await call("GET", "/api/admin/settings/onboarding", { role: "owner" });
    expect(o.status).toBe(200);
    expect(o.body.policy.source).toBe("unavailable");
    expect(o.body.policy.dealerOnboardingMode).toBe("closed");
    expect(o.body.policy.privateSellerRegistration).toBe("disabled");
  });
});

// ─────────────────────────────────────────────────────────────
describe("PUT /api/admin/settings/onboarding — who can change, validation, audit", () => {
  const ok = { dealerOnboardingMode: "self_onboarding", expectedRevision: 0 };
  const denied = ROLES.filter((r) => r !== "owner");
  test.each(denied)("%s cannot change (never persisted, never success-audited)", async (role) => {
    const r = await call("PUT", "/api/admin/settings/onboarding", { role, body: ok });
    expect([401, 403]).toContain(r.status);
    expect(stored()).toBeUndefined();
    expect(actions()).not.toContain("Onboarding policy updated");
  });
  test("superadmin who is not the owner gets OWNER_ONLY", async () => {
    const r = await call("PUT", "/api/admin/settings/onboarding", { role: "superadmin", body: ok });
    expect(r.status).toBe(403);
    expect(r.body.code).toBe("OWNER_ONLY");
  });
  test("unauthenticated ⇒ 401", async () => {
    expect((await call("PUT", "/api/admin/settings/onboarding", { body: ok })).status).toBe(401);
  });
  test.each([
    [{ dealerOnboardingMode: "open", expectedRevision: 0 }],
    [{ listingModeration: "yolo", expectedRevision: 0 }],
    [{ unknownSetting: "x", expectedRevision: 0 }],
    [{ expectedRevision: 0 }],
    [{ dealerOnboardingMode: "closed" }],
    [{ dealerOnboardingMode: "closed", expectedRevision: "0" }],
    [{ dealerOnboardingMode: "closed", expectedRevision: -1 }],
    [{ dealerOnboardingMode: "closed", expectedRevision: 0, updatedBy: "x" }],
  ])("invalid payload %j ⇒ 400 and nothing persisted", async (body) => {
    const r = await call("PUT", "/api/admin/settings/onboarding", { role: "owner", body });
    expect(r.status).toBe(400);
    expect(stored()).toBeUndefined();
  });
  test("owner change persists, bumps revision, and writes a no-secret audit entry with before/after/actor", async () => {
    const r = await call("PUT", "/api/admin/settings/onboarding", { role: "owner", body: { dealerOnboardingMode: "self_onboarding", listingModeration: "auto_publish", expectedRevision: 0 } });
    expect(r.status).toBe(200);
    expect(r.body.policy).toMatchObject({ dealerOnboardingMode: "self_onboarding", listingModeration: "auto_publish", revision: 1, source: "database" });
    expect(stored().value).toMatchObject({ dealerOnboardingMode: "self_onboarding", listingModeration: "auto_publish", revision: 1, privateSellerRegistration: "enabled" });
    const entry = auditCreate.mock.calls.find((c) => c[0].action === "Onboarding policy updated")[0];
    expect(entry.adminId).toBe("u-owner");
    expect(entry.details).toMatchObject({ outcome: "success" });
    expect(entry.details.before.dealerOnboardingMode).toBe("approval_required");
    expect(entry.details.after.dealerOnboardingMode).toBe("self_onboarding");
    expect(JSON.stringify(entry)).not.toMatch(/password|secret|token/i);
  });
  test("restart persistence: a fresh read (cache dropped) returns what was saved", async () => {
    await call("PUT", "/api/admin/settings/onboarding", { role: "owner", body: { privateSellerRegistration: "disabled", expectedRevision: 0 } });
    svc.invalidateOnboardingPolicyCache();
    const r = await svc.getOnboardingPolicy({ fresh: true });
    expect(r).toMatchObject({ source: "database", revision: 1 });
    expect(r.policy.privateSellerRegistration).toBe("disabled");
  });
  test("stale revision ⇒ 409 with the current settings; nothing overwritten; rejection is audited", async () => {
    await call("PUT", "/api/admin/settings/onboarding", { role: "owner", body: { dealerOnboardingMode: "closed", expectedRevision: 0 } });
    auditCreate.mockClear();
    const r = await call("PUT", "/api/admin/settings/onboarding", { role: "owner", body: { dealerOnboardingMode: "self_onboarding", expectedRevision: 0 } });
    expect(r.status).toBe(409);
    expect(r.body.code).toBe("ONBOARDING_POLICY_CONFLICT");
    expect(r.body.current.dealerOnboardingMode).toBe("closed");
    expect(stored().value.dealerOnboardingMode).toBe("closed");
    expect(actions()).toEqual(["Onboarding policy update rejected"]);
  });
  test("two concurrent saves from the same revision: exactly one wins, one gets 409, final state is the winner's", async () => {
    // Make both requests read before either writes.
    let release; const gate = new Promise((res) => { release = res; });
    let waiting = 0;
    beforeWrite = async () => { waiting += 1; if (waiting === 2) release(); await gate; };
    const [a, b] = await Promise.all([
      call("PUT", "/api/admin/settings/onboarding", { role: "owner", body: { dealerOnboardingMode: "self_onboarding", expectedRevision: 0 } }),
      call("PUT", "/api/admin/settings/onboarding", { role: "owner", body: { dealerOnboardingMode: "closed", expectedRevision: 0 } }),
    ]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
    const winner = a.status === 200 ? "self_onboarding" : "closed";
    expect(stored().value.dealerOnboardingMode).toBe(winner);
    expect(stored().value.revision).toBe(1);
  });
  test("concurrent update on an EXISTING row (zero rows affected) is a 409, not a silent success", async () => {
    await call("PUT", "/api/admin/settings/onboarding", { role: "owner", body: { listingModeration: "auto_publish", expectedRevision: 0 } });
    let release; const gate = new Promise((res) => { release = res; });
    let waiting = 0;
    beforeWrite = async () => { waiting += 1; if (waiting === 2) release(); await gate; };
    // updated_at granularity: force distinct stamps for the winner so the loser's eq(updated_at) misses.
    const [a, b] = await Promise.all([
      call("PUT", "/api/admin/settings/onboarding", { role: "owner", body: { listingModeration: "hold_for_review", expectedRevision: 1 } }),
      call("PUT", "/api/admin/settings/onboarding", { role: "owner", body: { dealerOnboardingMode: "closed", expectedRevision: 1 } }),
    ]);
    expect([a.status, b.status].filter((s) => s === 200)).toHaveLength(1);
    expect([a.status, b.status]).toContain(409);
  });
  test("failed persistence ⇒ 500, no success audit, stored value untouched, cache does not claim the change", async () => {
    await call("PUT", "/api/admin/settings/onboarding", { role: "owner", body: { dealerOnboardingMode: "closed", expectedRevision: 0 } });
    auditCreate.mockClear();
    failWrite = true;
    const r = await call("PUT", "/api/admin/settings/onboarding", { role: "owner", body: { dealerOnboardingMode: "self_onboarding", expectedRevision: 1 } });
    expect(r.status).toBe(500);
    expect(r.body.code).toBe("ONBOARDING_POLICY_WRITE_FAILED");
    expect(stored().value.dealerOnboardingMode).toBe("closed");
    expect(actions()).not.toContain("Onboarding policy updated");
    failWrite = false;
    expect((await svc.getOnboardingPolicy({ fresh: true })).policy.dealerOnboardingMode).toBe("closed");
  });
  test("store unavailable on write ⇒ 503", async () => {
    failRead = true;
    const r = await call("PUT", "/api/admin/settings/onboarding", { role: "owner", body: { dealerOnboardingMode: "closed", expectedRevision: 0 } });
    expect(r.status).toBe(503);
    expect(stored()).toBeUndefined();
  });
  test("a corrupt stored policy is repaired to a safe value on the next save (never to an unsafe one)", async () => {
    table.push({ key: svc.ONBOARDING_POLICY_KEY, value: { dealerOnboardingMode: "wide_open", revision: 2 }, updated_at: "2026-10-01T00:00:00.000Z" });
    const r = await call("PUT", "/api/admin/settings/onboarding", { role: "owner", body: { listingModeration: "hold_for_review", expectedRevision: 2 } });
    expect(r.status).toBe(200);
    expect(stored().value.dealerOnboardingMode).toBe("closed");
    expect(r.body.policy.source).toBe("database");
  });
});

// ─────────────────────────────────────────────────────────────
describe("public registration modes", () => {
  test("anonymous callers see only the two registration modes + a trust flag", async () => {
    const r = await call("GET", "/api/admin/public/onboarding-policy");
    expect(r.status).toBe(200);
    expect(Object.keys(r.body.policy).sort()).toEqual(["available", "dealerOnboardingMode", "emailVerificationRequiredForSellers", "privateSellerRegistration"]);
    expect(r.body.policy).toMatchObject({ privateSellerRegistration: "enabled", dealerOnboardingMode: "approval_required", available: true });
  });
  test("when the store is unavailable the page learns 'unavailable' and the restrictive values", async () => {
    failRead = true;
    const r = await call("GET", "/api/admin/public/onboarding-policy");
    expect(r.body.policy).toMatchObject({ available: false, dealerOnboardingMode: "closed", privateSellerRegistration: "disabled" });
  });
});

// ─────────────────────────────────────────────────────────────
describe("decision authority is enforced on the real approval/moderation routes", () => {
  const ID = "11111111-1111-4111-8111-111111111111";
  beforeEach(() => carFind.mockReset());
  test("owner_only (default): an ordinary admin cannot moderate a listing or decide a dealer", async () => {
    for (const [path, body] of [
      [`/api/admin/cars/${ID}/moderate`, { action: "approve" }],
      [`/api/admin/users/${ID}/verify-dealer`, { action: "approve" }],
      [`/api/admin/users/${ID}/approve-dealer`, {}],
    ]) {
      const r = await call("POST", path, { role: "admin", body });
      expect(r.status).toBe(403);
      expect(r.body.code).toBe("DECISION_AUTHORITY_REQUIRED");
    }
  });
  test("owner_only: a non-owner superadmin is also refused", async () => {
    const r = await call("POST", `/api/admin/cars/${ID}/moderate`, { role: "superadmin", body: { action: "approve" } });
    expect(r.status).toBe(403);
    expect(r.body.code).toBe("DECISION_AUTHORITY_REQUIRED");
  });
  test("owner_only: the owner passes the guard (reaches the handler: 404 for an unknown car)", async () => {
    carFind.mockReturnValue(null);
    const r = await call("POST", `/api/admin/cars/${ID}/moderate`, { role: "owner", body: { action: "approve" } });
    expect(r.status).toBe(404);
  });
  test("when the owner delegates (admins) an admin passes the guard", async () => {
    svc.__setOnboardingPolicyForTests({ listingDecisionAuthority: "admins" });
    carFind.mockReturnValue(null);
    const r = await call("POST", `/api/admin/cars/${ID}/moderate`, { role: "admin", body: { action: "approve" } });
    expect(r.status).toBe(404);
  });
  test("unavailable policy ⇒ admin refused even if delegation was previously configured", async () => {
    svc.__setOnboardingPolicyForTests({ listingDecisionAuthority: "admins" }, "unavailable");
    const r = await call("POST", `/api/admin/cars/${ID}/moderate`, { role: "admin", body: { action: "approve" } });
    expect(r.status).toBe(403);
  });
  test("a marketing/hr/accounts role never reaches the decision (blocked earlier by role/permission layers)", async () => {
    svc.__setOnboardingPolicyForTests({ listingDecisionAuthority: "admins", dealerDecisionAuthority: "admins" });
    for (const role of ["marketing", "hr", "accounts", "dealer", "individual_seller", "user"]) {
      const r = await call("POST", `/api/admin/cars/${ID}/moderate`, { role, body: { action: "approve" } });
      expect(r.status).toBe(403);
    }
  });
});

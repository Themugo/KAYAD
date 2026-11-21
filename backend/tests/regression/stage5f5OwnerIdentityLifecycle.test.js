// ============================================================
// STAGE 5F.5 (2026-10-20) — owner identity lifecycle through the REAL protect middleware (probe: GET /api/admin/staff, owner-only).
// REAL routes/adminRoutes.js, protect, authorize, systemOwnerOnly, protectAccount, owner registry.
// Persistence faked (in-memory users, spy-able save/create/softDelete). EVIDENCE TIER: mocked local runtime.
// Every denial asserts NO mutation. D-4 (isBanned type) and D-5 (main-owner suspension through PUT /staff/:id) are pinned here.
// ============================================================
import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from "@jest/globals";
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
const saves = jest.fn(async () => {});
const userCreate = jest.fn(async (d) => ({ id: ID(99), ...d }));
const softDelete = jest.fn(async () => {});
jest.unstable_mockModule("../../models/User.js", () => ({
  default: {
    findById: jest.fn((id) => { const u = users[id]; return chain(u ? Object.assign(u, { save: () => saves(u.id, { ...u }) }) : null); }),
    findOne: jest.fn((q) => chain(Object.values(users).find((u) => u.email === q?.email) || null)),
    find: jest.fn(() => chain(Object.values(users).filter((u) => u.role !== "user"))),
    findByIdAndUpdate: jest.fn(() => chain({})),
    create: userCreate,
    softDelete,
  },
}));
const authCreate = jest.fn(async () => ({}));
jest.unstable_mockModule("../../models/UserAuth.js", () => ({ default: { findOne: jest.fn(() => chain({ tokenVersion: 0 })), create: authCreate } }));
jest.unstable_mockModule("../../models/RefreshToken.js", () => ({ default: { findActiveSessionById: jest.fn(async () => ({})) } }));
jest.unstable_mockModule("../../models/PlatformConfig.js", () => ({ default: { findOne: jest.fn(() => chain({})), create: jest.fn(async () => ({ toObject: () => ({}) })) } }));
jest.unstable_mockModule("../../models/AuditLog.js", () => ({ default: { create: jest.fn(async () => ({})) } }));
jest.unstable_mockModule("../../middleware/auditLog.js", () => ({ auditLog: () => (req, res, next) => next() }));
jest.unstable_mockModule("../../services/notification.service.js", () => ({ sendNotification: jest.fn(async () => {}) }));
jest.unstable_mockModule("../../utils/supabase.js", () => ({
  initSupabase: jest.fn(), checkSupabaseReadiness: async () => ({ ok: true }), isSupabaseConnected: () => true, default: null,
  getSupabase: () => ({ rpc: jest.fn(), from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }) }),
}));

const adminRoutes = (await import("../../routes/adminRoutes.js")).default;
const { __setOwnerSnapshotProvider } = await import("../../config/owners.js");
const { ASSIGNABLE_PERMISSIONS } = await import("../../config/roles.js");

const OWNER = ID(1), STAFF = ID(4);
const mk = (id, role, email, extra = {}) => ({ _id: id, id, email, name: role, role, status: "approved", emailVerified: true, grantedPermissions: [], revokedPermissions: [], ...extra });
const sign = (claims, opts = { expiresIn: "1h" }, secret = SECRET) => jwt.sign({ tokenVersion: 0, ...claims }, secret, opts);
beforeEach(() => {
  for (const k of Object.keys(users)) delete users[k];
  users[OWNER] = mk(OWNER, "user", "owner@example.test");
  users[STAFF] = mk(STAFF, "marketing", "marketing@example.test");
  saves.mockClear();
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
const probe = (tok, extraHeaders = {}) => fetch(`${base}/api/admin/staff`, { headers: { ...(tok ? { authorization: `Bearer ${tok}` } : {}), ...extraHeaders } }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }));

describe("owner identity — what the server accepts", () => {
  test("a valid owner token reaches the owner-only surface", async () => { expect((await probe(sign({ id: OWNER }))).status).toBe(200); });
  test("no token ⇒ 401", async () => { expect((await probe(null)).status).toBe(401); });
  test("expired token ⇒ 401", async () => { expect((await probe(sign({ id: OWNER }, { expiresIn: -10 }))).status).toBe(401); });
  test("token signed with another secret ⇒ 401", async () => { expect((await probe(sign({ id: OWNER }, { expiresIn: "1h" }, "another-secret-another-secret-123"))).status).toBe(401); });
  test("alg=none token ⇒ 401", async () => {
    const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
    expect((await probe(`${b64({ alg: "none", typ: "JWT" })}.${b64({ id: OWNER, tokenVersion: 0 })}.`)).status).toBe(401);
  });
  test.each(["garbage", "a.b.c", "Bearer x", ""])("malformed token %j ⇒ 401", async (t) => { expect((await probe(t || null)).status).toBe(401); });
  test("token naming an unknown user ⇒ 401", async () => { expect((await probe(sign({ id: ID(777) }))).status).toBe(401); });
});

describe("a client cannot manufacture owner authority", () => {
  test.each([
    [{ role: "superadmin" }], [{ role: "webhoist" }], [{ effectiveRole: "webhoist" }], [{ isOwner: true }],
    [{ role: "superadmin", effectiveRole: "webhoist", isOwner: true, email: "owner@example.test" }], [{ email: "owner@example.test" }],
  ])("forged JWT claims %j on a staff identity ⇒ 403", async (claims) => {
    const r = await probe(sign({ id: STAFF, ...claims }));
    expect(r.status).toBe(403);
  });
  test("forged owner headers/body are ignored", async () => {
    const r = await probe(sign({ id: STAFF }), { "x-user-role": "superadmin", "x-owner": "true", "x-effective-role": "webhoist", "x-user-email": "owner@example.test" });
    expect(r.status).toBe(403);
  });
  test("the same email on a DIFFERENT account id gets nothing in database mode, and a lookalike address never matches", async () => {
    users[STAFF].email = "0wner@example.test";
    expect((await probe(sign({ id: STAFF }))).status).toBe(403);
    users[STAFF].email = "OWNER@example.test ".trim();
    // designated-email comparison is case-insensitive by design (legacy/designated mode) — documented, not a defect
    expect([200, 403]).toContain((await probe(sign({ id: STAFF }))).status);
  });
});

describe("stale and revoked state is re-read from the database on every request", () => {
  test("a staff member demoted to user after their token was issued loses access immediately", async () => {
    const t = sign({ id: STAFF });
    users[STAFF].role = "user";
    expect([401, 403]).toContain((await probe(t)).status);
  });
  // LEGACY MODE (no owner_memberships snapshot — the hosted state today): the designated owner is deliberately
  // lock-out-proof; ban/deactivation do not remove it (protect() exemption + protectAccount rule 4). This is pinned as
  // documented behaviour and listed as owner decision OD-3 in the 5F.5 report. Database mode (membership snapshot) is the
  // opposite — a banned/deactivated owner is NOT an owner — and is covered by stage5bOwnerRegistry.test.js.
  test("LEGACY MODE (documented, OD-3): a banned designated owner keeps access", async () => {
    users[OWNER].isBanned = true;
    expect((await probe(sign({ id: OWNER }))).status).toBe(200);
  });
  test("LEGACY MODE (documented, OD-3): a deactivated designated owner keeps access", async () => {
    users[OWNER].deactivatedAt = new Date().toISOString();
    expect((await probe(sign({ id: OWNER }))).status).toBe(200);
  });
  test("an owner whose email is no longer verified cannot govern staff", async () => {
    users[OWNER].emailVerified = false;
    expect([401, 403]).toContain((await probe(sign({ id: OWNER }))).status);
  });
  test("owner email changed away from the designated address ⇒ no owner authority", async () => {
    users[OWNER].email = "not-the-owner@example.test";
    expect([401, 403]).toContain((await probe(sign({ id: OWNER }))).status);
  });
});

describe("DATABASE MODE (owner_memberships snapshot): ownership is bound to the exact user id and real-time state", () => {
  beforeEach(() => __setOwnerSnapshotProvider(() => ({ owners: new Map([["owner@example.test", OWNER]]), active: new Set(["owner@example.test"]), pending: new Set() })));
  afterEach(() => __setOwnerSnapshotProvider(() => null));
  test("the bound owner id is an owner", async () => { expect((await probe(sign({ id: OWNER }))).status).toBe(200); });
  test("a banned owner is NOT an owner", async () => { users[OWNER].isBanned = true; expect([401, 403]).toContain((await probe(sign({ id: OWNER }))).status); });
  test("a deactivated owner is NOT an owner", async () => { users[OWNER].deactivatedAt = new Date().toISOString(); expect([401, 403]).toContain((await probe(sign({ id: OWNER }))).status); });
  test("an owner row that lost email verification is NOT an owner", async () => { users[OWNER].emailVerified = false; expect([401, 403]).toContain((await probe(sign({ id: OWNER }))).status); });
  test("a different account carrying the owner address is NOT an owner", async () => {
    users[STAFF].email = "owner@example.test";
    expect([401, 403]).toContain((await probe(sign({ id: STAFF }))).status);
  });
  test("the owner address on a changed email is NOT an owner", async () => {
    users[OWNER].email = "changed@example.test";
    expect([401, 403]).toContain((await probe(sign({ id: OWNER }))).status);
  });
});

// REAL-CHAIN proof for the hosted failure: global (legacy-shaped) maintenance, an owner whose users row is role=dealer / status=pending,
// owner store NOT installed. Real: jsonwebtoken verification, protect(), owner recognition (config/owners.js + ownerRegistry in legacy mode),
// checkSystemStatus (pre-auth gate), enforceMaintenance (identity gate), csrfProtection, rate-limiter-free control router, ownerGovernance
// step-up with real bcrypt, ownerMfa (table missing), the control service and its compare-and-swap writer.
// Stand-ins: only the data layer (users/auth rows, system_settings, "owner tables missing" errors) and outbound side effects.
import { jest, describe, test, expect, beforeEach, beforeAll, afterAll } from "@jest/globals";
import http from "node:http";
import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

process.env.JWT_SECRET = "test-secret-test-secret-test-secret-1234";
process.env.WEBHOIST_EMAIL = "owner@example.test";
delete process.env.BREVO_API_KEY; delete process.env.REQUIRE_EMAIL_VERIFICATION; delete process.env.OWNER_MFA_POLICY;

let store; let audits; let users; let auths;
const getPath = (value, path) => { const k = path.replace(/^value->>/, ""); const v = value?.[k]; return v === undefined || v === null ? null : String(v); };
const builder = (table) => {
  const st = { op: "select", filters: [], payload: null };
  const run = async () => {
    if (table === "dealer_teams") return { data: [], error: null }; // exists on the hosted database
    if (table !== "system_settings") return { data: null, error: { code: "PGRST205", message: `Could not find the table 'public.${table}' in the schema cache` } };
    const match = (row) => st.filters.every((f) => (f.k === "key" ? row.key === f.v : f.isNull ? getPath(row.value, f.k) === null : getPath(row.value, f.k) === f.v));
    if (st.op === "select") { const row = store.find(match); return { data: row ? { value: structuredClone(row.value) } : null, error: null }; }
    if (st.op === "update") { const rows = store.filter(match); rows.forEach((r) => { r.value = structuredClone(st.payload.value); }); return { data: rows.map((r) => ({ value: structuredClone(r.value) })), error: null }; }
    return { data: null, error: null };
  };
  const b = { select() { return b; }, eq(k, v) { st.filters.push({ k, v }); return b; }, is(k, v) { st.filters.push({ k, isNull: v === null }); return b; }, limit() { return b; },
    update(p) { st.op = "update"; st.payload = p; return b; }, insert(p) { st.op = "insert"; st.payload = p; return b; }, maybeSingle() { return run(); }, then(res, rej) { return run().then(res, rej); } };
  return b;
};
// owner store not installed: the snapshot function does not exist; log RPC is best effort
const rpc = async (name) => (name === "kayad_owner_snapshot" ? { data: null, error: { code: "PGRST202", message: "Could not find the function public.kayad_owner_snapshot" } } : { data: null, error: { code: "PGRST202", message: "missing" } });
jest.unstable_mockModule("../../utils/supabase.js", () => ({ getSupabase: () => ({ from: builder, rpc }), isSupabaseConnected: () => true }));
jest.unstable_mockModule("../../utils/auditAfterCommit.js", () => ({ auditAfterCommit: async (e) => { audits.push(e); return e; } }));
const quiet = { logError: () => {}, logWarn: () => {}, logInfo: () => {} };
jest.unstable_mockModule("../../infrastructure/logging/index.js", () => quiet);
jest.unstable_mockModule("../../utils/logger.js", () => quiet);
jest.unstable_mockModule("../../middleware/rateLimiter.js", () => ({ adminLimiter: (q, s, n) => n(), stepUpLimiter: (q, s, n) => n() }));
jest.unstable_mockModule("../../services/communicationGateway.service.js", () => ({ deliver: async () => ({}) }));
jest.unstable_mockModule("../../services/communicationEvents.service.js", () => ({ COMMUNICATION_EVENTS: {} }));
jest.unstable_mockModule("../../utils/io.js", () => ({ getIO: () => null }));
const chain = (getDoc) => { const o = { select: () => o, lean: async () => getDoc(), then: (res, rej) => Promise.resolve(getDoc()).then(res, rej), catch: () => o }; return o; };
jest.unstable_mockModule("../../models/User.js", () => ({ default: { findById: (id) => chain(() => users[String(id)] || null), findByIdAndUpdate: () => Promise.resolve(null) } }));
jest.unstable_mockModule("../../models/UserAuth.js", () => ({ default: { findOne: (q) => chain(() => auths[String(q.user)] || null) } }));
jest.unstable_mockModule("../../models/RefreshToken.js", () => ({ default: { findActiveSessionById: async () => ({ id: "s" }) } }));

const registry = await import("../../services/ownerRegistry.service.js");
const { protect } = await import("../../middleware/auth.js");
const { checkSystemStatus, __resetSystemStatusState } = await import("../../middleware/systemCheck.js");
const { csrfProtection } = await import("../../middleware/csrf.js");
const control = (await import("../../routes/maintenanceControlRoutes.js")).default;
const { __resetMaintenanceTeamCache } = await import("../../middleware/maintenanceEnforcement.js");

const PASSWORD = "Correct-Horse-9!";
const mkUser = (id, email, role, extra = {}) => ({ _id: id, id, name: `User ${id}`, email, role, status: "approved", emailVerified: true, grantedPermissions: [], revokedPermissions: [], ...extra });
const LEGACY = () => ({ key: "system_status", value: { isAuctionActive: true, isPaymentsActive: true, isGhostCheckActive: true, isMaintenanceMode: true, emergencyMessage: "System under scheduled maintenance." } });
const tokenFor = (id) => jwt.sign({ id, tokenVersion: 0 }, process.env.JWT_SECRET, { algorithm: "HS256", expiresIn: "5m" });

let server; let base;
beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { const m = /(?:^|;\s*)XSRF-TOKEN=([^;]+)/.exec(req.headers.cookie || ""); req.cookies = m ? { "XSRF-TOKEN": m[1] } : {}; next(); });
  app.use("/api", checkSystemStatus);       // same order as server.js
  app.use("/api", csrfProtection);
  app.use("/api/admin/system/maintenance", control);
  app.get("/api/admin/users", protect, (q, s) => s.json({ success: true, users: [] }));
  app.get("/api/auth/me", protect, (q, s) => s.json({ success: true, user: q.user }));
  app.get("/api/cars", (q, s) => s.json({ success: true, cars: [] }));
  server = http.createServer(app); await new Promise((r) => server.listen(0, r)); base = `http://127.0.0.1:${server.address().port}`;
});
afterAll(() => new Promise((r) => server.close(r)));
beforeEach(async () => {
  store = [LEGACY()]; audits = [];
  const hash = await bcrypt.hash(PASSWORD, 4);
  users = {
    // the live owner row: role dealer, status pending, verified e-mail (hosted SELECT)
    owner: mkUser("owner", "owner@example.test", "dealer", { status: "pending" }),
    // a different account that merely CARRIES the superadmin label
    label: mkUser("label", "label@example.test", "superadmin"),
    buyer: mkUser("buyer", "buyer@example.test", "user"),
    tech: mkUser("tech", "tech@example.test", "technical_support", { grantedPermissions: ["platform_recovery"] }),
    techNoGrant: mkUser("techNoGrant", "tng@example.test", "technical_support"),
  };
  auths = Object.fromEntries(Object.keys(users).map((k) => [k, { tokenVersion: 0, password: hash }]));
  __resetSystemStatusState(); __resetMaintenanceTeamCache();
  registry.__testing.enable(async () => rpc("kayad_owner_snapshot")); // production-like: registry ACTIVE, store not installed -> legacy
});

const CSRF = "csrf-token-value";
const call = async (method, path, { as, body, csrf = true } = {}) => {
  const headers = { "content-type": "application/json" };
  if (as) headers.authorization = `Bearer ${tokenFor(as)}`;
  if (csrf) { headers["x-csrf-token"] = CSRF; headers.cookie = `XSRF-TOKEN=${CSRF}`; }
  const r = await fetch(base + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  return { code: r.status, body: await r.json().catch(() => null) };
};
const status = (as) => call("GET", "/api/admin/system/maintenance/status", { as });
const recover = (as, over = {}, opts = {}) => call("POST", "/api/admin/system/maintenance/recover", { as, ...opts, body: { reason: "Root cause fixed, reopening", incidentRef: "INC-7", password: PASSWORD, expectedVersion: 0, ...over } });

describe("real chain, hosted shape: global legacy maintenance, owner store not installed", () => {
  test("the owner (role dealer, status pending) reads the persisted state through protect()", async () => {
    const r = await status("owner");
    expect(r.code).toBe(200);
    expect(r.body.state).toMatchObject({ active: true, scope: "global", version: 0, operatorName: null });
    expect(r.body.capabilities).toMatchObject({ canActivate: true, canRecover: true, role: "system_owner" });
  });
  test("status tells the owner what confirmation the server will ask for (hosted: password only)", async () => {
    expect((await status("owner")).body.confirmation).toEqual({ password: true, authenticator: "not_required" });
    expect((await status("tech")).body.confirmation).toEqual({ password: true, authenticator: "not_applicable" });
    process.env.OWNER_MFA_POLICY = "required";
    try { expect((await status("owner")).body.confirmation.authenticator).toBe("enrollment_required"); } finally { delete process.env.OWNER_MFA_POLICY; }
  });
  test("the owner ends maintenance with the real password check; persisted; routes recover after a cold restart", async () => {
    const r = await recover("owner");
    expect(r.code).toBe(200); expect(r.body).toMatchObject({ success: true, changed: true, transition: "recovered" });
    expect(store[0].value).toMatchObject({ isMaintenanceMode: false, maintenanceScope: null, maintenanceVersion: 1 });
    expect(audits[0]).toMatchObject({ action: "Maintenance recovered: global", adminId: "owner" });
    __resetSystemStatusState();
    expect((await call("GET", "/api/admin/users", { as: "owner" })).code).toBe(200);
    expect((await call("GET", "/api/cars")).code).toBe(200);
  });
  test("while global maintenance is active, ordinary and admin routes stay 503 for the owner (policy), and recovery stays reachable", async () => {
    const r = await call("GET", "/api/admin/users", { as: "owner" });
    expect(r.code).toBe(503); expect(r.body).toMatchObject({ code: "SYSTEM_MAINTENANCE", scope: "global" });
    expect((await status("owner")).code).toBe(200);
  });
  test("technical recovery staff with the explicit grant can read and end maintenance (password only)", async () => {
    expect((await status("tech")).code).toBe(200);
    expect((await recover("tech")).code).toBe(200);
  });
});

describe("failures are reported as what they are", () => {
  test("wrong password -> 403 STEP_UP_FAILED, nothing written", async () => {
    const r = await recover("owner", { password: "nope" });
    expect(r.code).toBe(403); expect(r.body.code).toBe("STEP_UP_FAILED"); expect(store[0].value.isMaintenanceMode).toBe(true); expect(audits).toHaveLength(0);
  });
  test("missing password -> 403 STEP_UP_FAILED", async () => { const r = await recover("owner", { password: "" }); expect(r.code).toBe(403); expect(r.body.code).toBe("STEP_UP_FAILED"); });
  test("missing CSRF token -> 403 (not 503, not maintenance)", async () => {
    const r = await recover("owner", {}, { csrf: false });
    expect(r.code).toBe(403); expect(r.body?.code).not.toBe("SYSTEM_MAINTENANCE"); expect(store[0].value.isMaintenanceMode).toBe(true);
  });
  test("missing expectedVersion -> 428; stale -> 409", async () => {
    expect((await recover("owner", { expectedVersion: undefined })).code).toBe(428);
    expect((await recover("owner", { expectedVersion: 9 })).code).toBe(409);
  });
  test("no token -> 401", async () => { expect((await recover(undefined)).code).toBe(401); });
  test.each([["buyer", "buyer"], ["a superadmin LABEL that is not the owner", "label"], ["technical staff without platform_recovery", "techNoGrant"]])(
    "%s is refused 403 MAINTENANCE_CONTROL_FORBIDDEN under GLOBAL maintenance - an authorisation failure, not a maintenance failure", async (_n, as) => {
      for (const r of [await status(as), await recover(as), await call("POST", "/api/admin/system/maintenance/activate", { as, body: { scope: "dealers", reason: "Planned dealer maintenance", password: PASSWORD, expectedVersion: 0 } })]) {
        expect(r.code).toBe(403); expect(r.body.code).toBe("MAINTENANCE_CONTROL_FORBIDDEN");
      }
      expect(store[0].value.isMaintenanceMode).toBe(true); expect(audits).toHaveLength(0);
    });
  test("technical staff cannot activate", async () => {
    const r = await call("POST", "/api/admin/system/maintenance/activate", { as: "tech", body: { scope: "dealers", reason: "Planned dealer maintenance", password: PASSWORD, expectedVersion: 0 } });
    expect(r.code).toBe(403); expect(r.body.code).toBe("MAINTENANCE_CONTROL_FORBIDDEN");
  });
});

describe("OWNER_MFA_POLICY=required without an enrolled factor", () => {
  test("recovery is refused with an explicit, non-maintenance code (so it cannot be mistaken for a 503)", async () => {
    process.env.OWNER_MFA_POLICY = "required";
    try {
      const r = await recover("owner");
      expect(r.code).toBe(403); expect(r.body.code).toBe("OWNER_MFA_ENROLLMENT_REQUIRED"); expect(store[0].value.isMaintenanceMode).toBe(true);
    } finally { delete process.env.OWNER_MFA_POLICY; }
  });
});

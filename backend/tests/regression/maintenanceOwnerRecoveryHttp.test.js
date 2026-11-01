// HTTP-level proof of the owner recovery path against the hosted-shaped LEGACY row (flag on, no scope, no version):
// pre-auth gate -> control plane -> step-up -> compare-and-swap -> persisted -> screens reachable again. Real express app, real policy,
// real service and real systemCheck over an in-memory emulation of the PostgREST calls. Authentication / step-up are stand-ins for the
// session and password check (their own tests exist); everything that DECIDES access is the production code.
import { jest, describe, test, expect, beforeEach, beforeAll, afterAll } from "@jest/globals";
import http from "node:http";
import express from "express";

let store; let audits; let stepUps;
const getPath = (value, path) => { const k = path.replace(/^value->>/, ""); const v = value?.[k]; return v === undefined || v === null ? null : String(v); };
const builder = () => {
  const st = { op: "select", filters: [], payload: null };
  const run = async () => {
    const match = (row) => st.filters.every((f) => (f.k === "key" ? row.key === f.v : f.isNull ? getPath(row.value, f.k) === null : getPath(row.value, f.k) === f.v));
    if (st.op === "select") { const row = store.find(match); return { data: row ? { value: structuredClone(row.value) } : null, error: null }; }
    if (st.op === "update") { const rows = store.filter(match); rows.forEach((r) => { r.value = structuredClone(st.payload.value); }); return { data: rows.map((r) => ({ value: structuredClone(r.value) })), error: null }; }
    return { data: null, error: null };
  };
  const b = { select() { return b; }, eq(k, v) { st.filters.push({ k, v }); return b; }, is(k, v) { st.filters.push({ k, isNull: v === null }); return b; },
    update(p) { st.op = "update"; st.payload = p; return b; }, insert(p) { st.op = "insert"; st.payload = p; return b; }, maybeSingle() { return run(); }, then(res, rej) { return run().then(res, rej); } };
  return b;
};
class OwnerError extends Error { constructor(code, message, status) { super(message); this.code = code; this.status = status; } }
jest.unstable_mockModule("../../utils/supabase.js", () => ({ getSupabase: () => ({ from: builder }), isSupabaseConnected: () => true }));
jest.unstable_mockModule("../../utils/auditAfterCommit.js", () => ({ auditAfterCommit: async (e) => { audits.push(e); return e; } }));
jest.unstable_mockModule("../../infrastructure/logging/index.js", () => ({ logError: () => {}, logWarn: () => {}, logInfo: () => {} }));
jest.unstable_mockModule("../../middleware/rateLimiter.js", () => ({ adminLimiter: (q, s, n) => n(), stepUpLimiter: (q, s, n) => n() }));
// Session stand-in: the x-test-user header carries the already-verified principal; no header = 401.
jest.unstable_mockModule("../../middleware/auth.js", () => ({ protect: (req, res, next) => { try { req.user = JSON.parse(req.headers["x-test-user"]); next(); } catch { res.status(401).json({ success: false, message: "Not authenticated" }); } } }));
jest.unstable_mockModule("../../config/owners.js", () => ({ isOwnerUser: (u) => u?.__verifiedOwner === true }));
const stepUpImpl = async (u, password, mfa) => { stepUps.push({ id: u.id, mfa: mfa || null }); if (password !== "correct-password") throw new OwnerError("STEP_UP_FAILED", "Your password is incorrect.", 403); };
jest.unstable_mockModule("../../services/ownerGovernance.service.js", () => ({ OwnerError, requireStepUp: stepUpImpl, passwordStepUp: stepUpImpl }));
jest.unstable_mockModule("../../services/ownerMfa.service.js", () => ({ mfaPolicy: () => "off", isEnforcedFor: async () => false }));
const control = (await import("../../routes/maintenanceControlRoutes.js")).default;
const { checkSystemStatus, __resetSystemStatusState } = await import("../../middleware/systemCheck.js");

const OWNER = { id: "own-1", name: "James Mugo", email: "o@example.test", role: "superadmin", status: "approved", __verifiedOwner: true };
const SUPERADMIN = { id: "sa-2", name: "Super Admin", email: "sa@example.test", role: "superadmin", status: "approved" };
const TECH = { id: "t-1", name: "Tech", email: "t@example.test", role: "technical_support", status: "approved", grantedPermissions: ["platform_recovery"] };
const TECH_NO_GRANT = { ...TECH, id: "t-2", grantedPermissions: [] };
const BUYER = { id: "b-1", name: "Buyer", email: "b@example.test", role: "user", status: "approved" };
const LEGACY = () => ({ key: "system_status", value: { isAuctionActive: true, isPaymentsActive: true, isGhostCheckActive: true, isMaintenanceMode: true, emergencyMessage: "System under scheduled maintenance." } });

let server; let base;
beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use("/api", checkSystemStatus);
  app.use("/api/admin/system/maintenance", control);
  app.get("/api/admin/users", (q, s) => s.json({ success: true, users: [] }));
  app.get("/api/cars", (q, s) => s.json({ success: true, cars: [] }));
  server = http.createServer(app); await new Promise((r) => server.listen(0, r)); base = `http://127.0.0.1:${server.address().port}`;
});
afterAll(() => new Promise((r) => server.close(r)));
beforeEach(() => { store = [LEGACY()]; audits = []; stepUps = []; __resetSystemStatusState(); });

const call = async (method, path, { user, body } = {}) => {
  const r = await fetch(base + path, { method, headers: { "content-type": "application/json", ...(user ? { "x-test-user": JSON.stringify(user) } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { code: r.status, body: await r.json().catch(() => null) };
};
const status = (user) => call("GET", "/api/admin/system/maintenance/status", { user });
const recover = (user, over = {}) => call("POST", "/api/admin/system/maintenance/recover", { user, body: { reason: "Root cause fixed, reopening", incidentRef: "INC-7", password: "correct-password", expectedVersion: 0, ...over } });

describe("legacy hosted row: what everyone sees", () => {
  test("every ordinary and admin route is refused 503 SYSTEM_MAINTENANCE (global) - this is the production symptom", async () => {
    for (const p of ["/api/admin/users", "/api/cars"]) { const r = await call("GET", p, { user: OWNER }); expect(r.code).toBe(503); expect(r.body).toMatchObject({ code: "SYSTEM_MAINTENANCE", maintenance: true, scope: "global" }); }
  });
  test("owner can read the persisted state: active, global, version 0, no operator (legacy normalisation, not corruption)", async () => {
    const r = await status(OWNER);
    expect(r.code).toBe(200);
    expect(r.body.state).toMatchObject({ active: true, scope: "global", version: 0, operatorName: null, reason: null });
    expect(r.body.capabilities).toMatchObject({ canActivate: true, canRecover: true, role: "system_owner" });
    expect(r.body.state.featureSwitches).toMatchObject({ auctions: true, payments: true, registrations: true, messaging: true });
  });
  test("an authorised technical-recovery user can read it too, but cannot activate", async () => {
    const r = await status(TECH); expect(r.code).toBe(200); expect(r.body.capabilities).toMatchObject({ canActivate: false, role: "technical_recovery" });
  });
});

describe("unauthorised attempts are refused by the server", () => {
  test.each([["unauthenticated", undefined], ["buyer", BUYER], ["superadmin label that is not the owner", SUPERADMIN], ["technical staff WITHOUT platform_recovery", TECH_NO_GRANT]])("%s: read, end and activate are refused and nothing changes", async (_n, user) => {
    const expected = user ? 403 : 401;
    expect((await status(user)).code).toBe(expected);
    expect((await recover(user)).code).toBe(expected);
    expect((await call("POST", "/api/admin/system/maintenance/activate", { user, body: { scope: "dealers", reason: "Planned dealer maintenance", password: "correct-password", expectedVersion: 0 } })).code).toBe(expected);
    expect(store[0].value.isMaintenanceMode).toBe(true); expect(store[0].value.maintenanceVersion).toBeUndefined(); expect(audits).toHaveLength(0); expect(stepUps).toHaveLength(0);
  });
  test("technical recovery staff may not activate or change scope", async () => {
    const r = await call("POST", "/api/admin/system/maintenance/activate", { user: TECH, body: { scope: "dealers", reason: "Planned dealer maintenance", password: "correct-password", expectedVersion: 0 } });
    expect(r.code).toBe(403); expect(audits).toHaveLength(0);
  });
});

describe("confirmation is enforced", () => {
  test("wrong password: 401, nothing written, nothing audited, still in maintenance", async () => {
    const r = await recover(OWNER, { password: "wrong" });
    expect(r.code).toBe(403); expect(r.body.code).toBe("STEP_UP_FAILED");
    expect(store[0].value.isMaintenanceMode).toBe(true); expect(audits).toHaveLength(0);
  });
  test("missing password: refused", async () => { const r = await recover(OWNER, { password: "" }); expect(r.code).toBe(403); expect(store[0].value.isMaintenanceMode).toBe(true); });
  test("missing/short reason: 400; missing expectedVersion: 428 - checked BEFORE any password is evaluated", async () => {
    expect((await recover(OWNER, { reason: "x" })).code).toBe(400);
    expect((await recover(OWNER, { expectedVersion: undefined })).code).toBe(428);
    expect(stepUps).toHaveLength(0);
  });
  test("a stale version is refused 409 and the real state is not overwritten", async () => {
    const r = await recover(OWNER, { expectedVersion: 5 }); expect(r.code).toBe(409); expect(store[0].value.isMaintenanceMode).toBe(true);
  });
  test("the authenticator code is passed to the owner step-up", async () => {
    await recover(OWNER, { mfaCode: "123456" }); expect(stepUps[0]).toMatchObject({ id: "own-1", mfa: "123456" });
  });
});

describe("owner recovery end to end", () => {
  test("owner ends maintenance: persisted, version bumped, audited, then the screens answer 200 again; repeating is a no-op", async () => {
    const r = await recover(OWNER);
    expect(r.code).toBe(200); expect(r.body).toMatchObject({ success: true, changed: true, transition: "recovered" });
    expect(r.body.state).toMatchObject({ active: false, scope: null, version: 1 });
    expect(r.body.state.lastRecovery).toMatchObject({ previousScope: "global", reason: "Root cause fixed, reopening", incidentRef: "INC-7" });
    expect(store[0].value).toMatchObject({ isMaintenanceMode: false, maintenanceScope: null, maintenanceVersion: 1 }); // persisted
    expect(audits).toHaveLength(1); expect(audits[0]).toMatchObject({ action: "Maintenance recovered: global", adminId: "own-1" });
    expect(audits[0].details).toMatchObject({ previousScope: "global", reason: "Root cause fixed, reopening", incidentRef: "INC-7", version: 1 });
    __resetSystemStatusState(); // restart
    expect((await call("GET", "/api/admin/users", { user: OWNER })).code).toBe(200);
    expect((await call("GET", "/api/cars")).code).toBe(200);
    const again = await recover(OWNER, { expectedVersion: 1 });
    expect(again.code).toBe(200); expect(again.body.changed).toBe(false); expect(audits).toHaveLength(1);
  });
  test("authorised technical recovery can end maintenance with a password (not activate)", async () => {
    const r = await recover(TECH); expect(r.code).toBe(200); expect(r.body.state.active).toBe(false);
  });
  test("owner NARROWS global to dealers: only the dealer audience stays restricted, persisted with metadata", async () => {
    const r = await call("POST", "/api/admin/system/maintenance/activate", { user: OWNER, body: { scope: "dealers", reason: "Narrowing to dealer-only work", incidentRef: "INC-8", password: "correct-password", expectedVersion: 0 } });
    expect(r.code).toBe(200); expect(r.body).toMatchObject({ transition: "scope_changed" });
    expect(r.body.state).toMatchObject({ active: true, scope: "dealers", version: 1, operatorName: "James Mugo" });
    expect(store[0].value.maintenanceScope).toBe("dealers"); expect(audits[0].action).toBe("Maintenance scope changed: global -> dealers");
    __resetSystemStatusState();
    expect((await call("GET", "/api/cars")).code).toBe(200); // anonymous browsing is unaffected by a dealers scope
  });
  test("global activation needs the typed phrase", async () => {
    store = [{ key: "system_status", value: { ...LEGACY().value, isMaintenanceMode: false } }]; __resetSystemStatusState();
    const body = { scope: "global", reason: "Full outage for failover", password: "correct-password", expectedVersion: 0 };
    expect((await call("POST", "/api/admin/system/maintenance/activate", { user: OWNER, body })).body.code).toBe("MAINTENANCE_CONFIRMATION_REQUIRED");
    expect(store[0].value.isMaintenanceMode).toBe(false);
  });
});

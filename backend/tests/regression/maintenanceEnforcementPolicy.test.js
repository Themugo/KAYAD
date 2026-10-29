// enforceMaintenance (identity-aware gate), checkSystemStatus (pre-auth gate), and wiring contracts for protect/login/refresh/routes.
import { jest, describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

let teamRows = []; let teamError = null; let settingsRow; let settingsError = null; let teamQueries = 0;
const from = (table) => {
  const st = {};
  const b = { select() { return b; }, eq(k, v) { st[k] = v; return b; }, limit() { return b; }, maybeSingle: async () => (settingsError ? { data: null, error: settingsError } : { data: settingsRow ? { value: settingsRow } : null, error: null }),
    then(res, rej) { teamQueries += 1; return Promise.resolve(teamError ? { data: null, error: teamError } : { data: teamRows.filter((r) => r.member === st.member && r.status === st.status), error: null }).then(res, rej); } };
  return b;
};
jest.unstable_mockModule("../../utils/supabase.js", () => ({ getSupabase: () => ({ from }), isSupabaseConnected: () => true }));
const { enforceMaintenance, __resetMaintenanceTeamCache } = await import("../../middleware/maintenanceEnforcement.js");
const { checkSystemStatus, invalidateSystemStatusCache } = await import("../../middleware/systemCheck.js");

const mkRes = () => { const r = { code: 0, body: null, headers: {}, setHeader(k, v) { r.headers[k] = v; }, status(c) { r.code = c; return r; }, json(b) { r.body = b; return r; } }; return r; };
const mkReq = (method, url, scope) => ({ method, originalUrl: `/api${url}`, path: url, maintenance: scope ? { active: true, scope, message: "m" } : undefined });
const U = (role, extra = {}) => ({ id: `${role}-id`, role, status: "approved", grantedPermissions: [], revokedPermissions: [], ...extra });
const run = async (method, url, scope, user, isOwner = false) => { const req = mkReq(method, url, scope), res = mkRes(); const sent = await enforceMaintenance(req, res, user, isOwner); return { sent, res, req }; };
beforeEach(() => { teamRows = []; teamError = null; settingsRow = null; settingsError = null; teamQueries = 0; __resetMaintenanceTeamCache(); invalidateSystemStatusCache(); });

describe("enforceMaintenance (authenticated gate)", () => {
  test("no-op (and no database access) while maintenance is not active", async () => {
    const { sent } = await run("GET", "/auth/me", undefined, U("user"));
    expect(sent).toBe(false); expect(teamQueries).toBe(0);
  });
  test("global: a buyer / dealer / staff session is refused 503 with scope, code and Retry-After", async () => {
    for (const u of [U("user"), U("dealer"), U("admin")]) {
      const { sent, res } = await run("GET", "/cars/mine", "global", u);
      expect(sent).toBe(true); expect(res.code).toBe(503); expect(res.body).toMatchObject({ code: "SYSTEM_MAINTENANCE", maintenance: true, scope: "global", message: "m" }); expect(res.headers["Retry-After"]).toBe("60");
    }
  });
  test("global: the owner and an explicitly authorised technical user keep ONLY session + control routes", async () => {
    const tech = U("technical_support", { grantedPermissions: ["platform_recovery"] });
    expect((await run("GET", "/auth/me", "global", U("user"), true)).sent).toBe(false);
    expect((await run("GET", "/admin/system/maintenance/status", "global", tech)).sent).toBe(false);
    expect((await run("GET", "/admin/users", "global", U("user"), true)).res.code).toBe(503);
    expect((await run("GET", "/payments/history", "global", tech)).res.code).toBe(503);
    expect((await run("POST", "/admin/system/maintenance/activate", "global", tech)).res.code).toBe(503);
  });
  test("global: ordinary staff and a non-owner 'superadmin' role label cannot use the control plane or any route", async () => {
    for (const u of [U("technical_support"), U("admin"), U("superadmin")]) {
      expect((await run("GET", "/admin/system/maintenance/status", "global", u)).res.code).toBe(503);
      expect((await run("POST", "/auth/refresh", "global", u)).res.code).toBe(503);
    }
  });
  test("dealers scope: a dealer and an ACTIVE dealer-team member are refused; buyers and staff are not", async () => {
    teamRows = [{ member: "member-id", status: "active" }];
    expect((await run("GET", "/dealer/inventory", "dealers", U("dealer"))).res.code).toBe(503);
    expect((await run("GET", "/dealer/inventory", "dealers", U("user", { id: "member-id" }))).res.code).toBe(503);
    expect((await run("GET", "/bids/mine", "dealers", U("user", { id: "someone-else" }))).sent).toBe(false);
    expect((await run("GET", "/admin/users", "dealers", U("admin"))).sent).toBe(false);
  });
  test("buyers_sellers scope: a dealer-team member is a dealer audience and is NOT affected; plain buyers and sellers are", async () => {
    teamRows = [{ member: "member-id", status: "active" }, { member: "inv-id", status: "invited" }];
    expect((await run("GET", "/bids/mine", "buyers_sellers", U("user", { id: "member-id" }))).sent).toBe(false);
    expect((await run("GET", "/bids/mine", "buyers_sellers", U("user", { id: "inv-id" }))).res.code).toBe(503); // an unaccepted invitation is not dealer staff
    expect((await run("GET", "/bids/mine", "buyers_sellers", U("individual_seller"))).res.code).toBe(503);
    expect((await run("GET", "/dealer/inventory", "buyers_sellers", U("dealer"))).sent).toBe(false);
  });
  test("a refresh or login attempt by a restricted audience is refused the same way (no stale-session or refresh bypass)", async () => {
    expect((await run("POST", "/auth/refresh", "ordinary_users", U("user"))).res.code).toBe(503);
    expect((await run("POST", "/v1/auth/login", "dealers", U("dealer"))).res.code).toBe(503);
    expect((await run("POST", "/auth/login", "dealers", U("user"))).sent).toBe(false);
  });
  test("controls under a scoped maintenance are a 403 (authorisation), not a maintenance 503, for unauthorised staff", async () => {
    const r = await run("GET", "/admin/system/maintenance/status", "dealers", U("admin"));
    expect(r.res.code).toBe(403); expect(r.res.body.code).toBe("MAINTENANCE_CONTROL_FORBIDDEN");
  });
  test("a dealer-team lookup failure fails closed with an honest retryable 503 (not a guess, not a false 'maintenance')", async () => {
    teamError = { code: "57P01", message: "terminated" };
    const { res } = await run("GET", "/bids/mine", "dealers", U("user"));
    expect(res.code).toBe(503); expect(res.body.code).toBe("MAINTENANCE_POLICY_UNAVAILABLE"); expect(res.body.retryable).toBe(true);
  });
});

describe("checkSystemStatus (pre-authentication gate)", () => {
  const go = async (method, url) => { const req = { method, path: url }, res = mkRes(); let nexted = false; await checkSystemStatus(req, res, () => { nexted = true; }); return { req, res, nexted }; };
  test("not in maintenance: pass through untouched", async () => {
    settingsRow = { isMaintenanceMode: false };
    const r = await go("GET", "/cars"); expect(r.nexted).toBe(true); expect(r.req.maintenance).toBeUndefined();
  });
  test("global: only session routes and the control plane pass; everything else is 503 with the server's message", async () => {
    settingsRow = { isMaintenanceMode: true, maintenanceScope: "global", emergencyMessage: "Down for failover" };
    for (const [m, p] of [["POST", "/auth/login"], ["GET", "/auth/me"], ["GET", "/admin/system/maintenance/status"], ["POST", "/admin/system/maintenance/recover"]]) { const r = await go(m, p); expect({ p, nexted: r.nexted }).toEqual({ p, nexted: true }); expect(r.req.maintenance).toMatchObject({ active: true, scope: "global", message: "Down for failover" }); }
    for (const [m, p] of [["GET", "/cars"], ["GET", "/admin/users"], ["POST", "/auth/register"], ["POST", "/admin/system/recover"], ["POST", "/payments/stk"]]) { const r = await go(m, p); expect({ p, nexted: r.nexted, code: r.res.code }).toEqual({ p, nexted: false, code: 503 }); expect(r.res.body).toMatchObject({ code: "SYSTEM_MAINTENANCE", scope: "global", message: "Down for failover" }); }
  });
  test("the hosted legacy row (no scope) behaves as global", async () => {
    settingsRow = { isMaintenanceMode: true, emergencyMessage: "System under scheduled maintenance." };
    expect((await go("GET", "/cars")).res.code).toBe(503); expect((await go("POST", "/auth/login")).nexted).toBe(true);
  });
  test("scoped: public browsing and sign-in reach their handlers; only registration is paused where the buyer audience is restricted", async () => {
    settingsRow = { isMaintenanceMode: true, maintenanceScope: "dealers" };
    expect((await go("GET", "/cars")).nexted).toBe(true); expect((await go("POST", "/auth/register")).nexted).toBe(true);
    invalidateSystemStatusCache(); settingsRow = { isMaintenanceMode: true, maintenanceScope: "buyers_sellers" };
    expect((await go("GET", "/cars")).nexted).toBe(true); const reg = await go("POST", "/auth/register"); expect(reg.res.code).toBe(503); expect(reg.res.body.scope).toBe("buyers_sellers");
  });
  test("a settings read failure keeps the marketplace up (documented fail-open); it does not invent a maintenance state", async () => {
    settingsError = { code: "57P01", message: "terminated" };
    const r = await go("GET", "/cars"); expect(r.nexted).toBe(true); expect(r.res.code).toBe(0);
  });
});

describe("wiring contracts", () => {
  const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  const read = (f) => fs.readFileSync(path.join(dir, f), "utf8");
  test("protect, login and refresh all call the central enforcement, login after the password check and before MFA", () => {
    expect(read("middleware/auth.js")).toMatch(/await enforceMaintenance\(req, res, user, isOwner\)/);
    const ctl = read("controllers/authController.js");
    expect((ctl.match(/await enforceMaintenance\(req, res, user, isOwnerUser\(user\)\)/g) || []).length).toBe(2);
    const login = ctl.slice(ctl.indexOf("export const login"));
    expect(login.indexOf("matchPassword(password)")).toBeGreaterThan(-1);
    expect(login.indexOf("matchPassword(password)")).toBeLessThan(login.indexOf("enforceMaintenance"));
    expect(login.indexOf("enforceMaintenance")).toBeLessThan(login.indexOf("ownerMfa.isEnforcedFor"));
  });
  test("the control router is mounted before the general admin router and is itself rate limited and authenticated", () => {
    const srv = read("server.js");
    expect(srv.indexOf('app.use("/api/admin/system/maintenance"')).toBeGreaterThan(-1);
    expect(srv.indexOf('app.use("/api/admin/system/maintenance"')).toBeLessThan(srv.indexOf('app.use("/api/admin", adminLimiter, adminRoutes)'));
    const r = read("routes/maintenanceControlRoutes.js");
    expect(r).toMatch(/router\.use\(adminLimiter\)/);
    for (const route of ["status", "activate", "recover"]) expect(r).toMatch(new RegExp(`router\\.(get|post)\\("/${route}", protect, authorizeControl\\("${route}"\\)`));
    expect(r).toMatch(/gov\.requireStepUp\(req\.user, b\.password, b\.mfaCode\)/);
  });
  test("the legacy kill-switch can no longer start maintenance and the legacy recover can no longer end it", () => {
    const a = read("routes/adminRoutes.js");
    expect(a).toMatch(/type === "full_maintenance"[\s\S]{0,500}MAINTENANCE_USE_SCOPED_CONTROL/);
    expect(a).toMatch(/type === "maintenance"[\s\S]{0,500}MAINTENANCE_USE_SCOPED_CONTROL/);
    expect(a).not.toMatch(/isMaintenanceMode\s*=\s*(true|false)/);
  });
  test("the user payload carries only a derived recovery hint (never the raw permission lists) and only for non-owner holders", () => {
    const ctl = read("controllers/authController.js");
    expect(ctl).toMatch(/if \(!safe\.isOwner && hasTechnicalRecovery\(raw\)\) safe\.platformRecovery = true;/);
    expect(ctl.slice(ctl.indexOf("const SAFE_USER_FIELDS"), ctl.indexOf("export const serializeUser"))).not.toMatch(/grantedPermissions|revokedPermissions/);
  });
  test("the explicit recovery permission is assignable but is in NO named role default (superadmin lists every PERM constant by construction, and the policy never reads role defaults)", async () => {
    const roles = await import("../../config/roles.js");
    expect(roles.ASSIGNABLE_PERMISSIONS).toContain("platform_recovery");
    for (const [role, perms] of Object.entries(roles.ROLE_PERMISSIONS).filter(([r]) => r !== "superadmin")) expect({ role, has: perms.includes("platform_recovery") }).toEqual({ role, has: false });
  });
});

describe("safe logout (never blocked)", () => {
  test("every identity can POST /auth/logout under every scope, so a restricted user can always end (and revoke) their own session", async () => {
    const tech = U("technical_support", { grantedPermissions: ["platform_recovery"] });
    for (const scope of ["global", "ordinary_users", "buyers_sellers", "dealers"]) {
      for (const [u, owner] of [[U("user"), false], [U("dealer"), false], [U("individual_seller"), false], [U("admin"), false], [U("superadmin"), false], [tech, false], [U("user"), true]]) {
        const r = await run("POST", "/auth/logout", scope, u, owner);
        expect({ scope, role: u.role, sent: r.sent }).toEqual({ scope, role: u.role, sent: false });
      }
    }
  });
  test("logout is the ONLY signed-in route that stays open for a restricted user", async () => {
    expect((await run("POST", "/auth/logout", "global", U("user"))).sent).toBe(false);
    expect((await run("GET", "/auth/me", "global", U("user"))).res.code).toBe(503);
    expect((await run("POST", "/auth/refresh", "dealers", U("dealer"))).res.code).toBe(503);
    expect((await run("DELETE", "/auth/logout", "global", U("user"))).res.code).toBe(503); // only the exact POST route is special
  });
});

describe("settings store unavailable: fail-static policy", () => {
  const go = async (method, url) => { const req = { method, path: url }, res = mkRes(); let nexted = false; await checkSystemStatus(req, res, () => { nexted = true; }); return { req, res, nexted }; };
  let now; let spy;
  beforeEach(() => { now = 1_000_000; spy = jest.spyOn(Date, "now").mockImplementation(() => now); });
  afterEach(() => { spy.mockRestore(); });

  test("an ACTIVE shutdown keeps being enforced when the store becomes unreadable after the cache expires", async () => {
    settingsRow = { isMaintenanceMode: true, maintenanceScope: "global", emergencyMessage: "Down" };
    expect((await go("GET", "/cars")).res.code).toBe(503);
    settingsError = { code: "57P01", message: "terminated" }; now += 60_000;
    const r = await go("GET", "/cars"); expect(r.nexted).toBe(false); expect(r.res.code).toBe(503); expect(r.res.body).toMatchObject({ code: "SYSTEM_MAINTENANCE", scope: "global" });
  });
  test("an INACTIVE platform stays open when the store becomes unreadable (no invented maintenance)", async () => {
    settingsRow = { isMaintenanceMode: false };
    expect((await go("GET", "/cars")).nexted).toBe(true);
    settingsError = { code: "57P01", message: "terminated" }; now += 60_000;
    expect((await go("GET", "/cars")).nexted).toBe(true);
  });
  test("with no prior knowledge at all (cold start) it fails open, as before", async () => {
    settingsError = { code: "57P01", message: "terminated" };
    expect((await go("GET", "/cars")).nexted).toBe(true);
  });
  test("the store is not hammered: after an error it retries only after a short back-off", async () => {
    settingsRow = { isMaintenanceMode: true, maintenanceScope: "dealers" };
    await go("GET", "/cars");
    settingsError = { code: "57P01", message: "terminated" }; now += 60_000; await go("GET", "/cars");
    settingsError = null; settingsRow = { isMaintenanceMode: false }; now += 500; // within the back-off: still the last known state
    expect((await go("POST", "/auth/register")).nexted).toBe(true); // dealers scope never paused registration; just proves no throw
    now += 5_000; // back-off over: fresh read sees the recovery
    const r = await go("GET", "/cars"); expect(r.req.maintenance).toBeUndefined();
  });
  test("a locally-applied change drops the stale last-known state (recovery is not undone by a later read failure)", async () => {
    settingsRow = { isMaintenanceMode: true, maintenanceScope: "global" };
    expect((await go("GET", "/cars")).res.code).toBe(503);
    invalidateSystemStatusCache(); // what every successful write does
    settingsError = { code: "57P01", message: "terminated" };
    expect((await go("GET", "/cars")).nexted).toBe(true);
  });
});

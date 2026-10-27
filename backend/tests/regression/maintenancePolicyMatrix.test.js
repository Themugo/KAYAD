// Central maintenance policy: pure decision matrix, state normalisation, technical-recovery rules. No I/O.
import { describe, test, expect } from "@jest/globals";
import {
  decide, classifyRoute, buildIdentity, audienceForUser, hasTechnicalRecovery, normalizeSystemStatus, isValidScope, SCOPE_IDS,
  isAudienceRestricted, PLATFORM_RECOVERY_PERMISSION, normalizeRoutePath,
} from "../../config/maintenancePolicy.js";

const R = (m, p) => classifyRoute(m, p);
const u = (role, extra = {}) => ({ role, status: "approved", grantedPermissions: [], revokedPermissions: [], ...extra });
const id = (user, o = {}) => buildIdentity(user, o);
const allow = (scope, method, path, identity) => decide({ scope, route: R(method, path), identity }).allow;

describe("route classification", () => {
  test.each([
    ["POST", "/auth/login", "session"], ["POST", "/v1/auth/login", "session"], ["GET", "/auth/me", "session"], ["POST", "/auth/refresh", "session"],
    ["POST", "/auth/logout", "session"], ["GET", "/auth/csrf", "session"], ["GET", "/auth/profile", "session"],
    ["POST", "/auth/register", "registration"],
    ["GET", "/admin/system/maintenance/status", "control"], ["POST", "/admin/system/maintenance/recover", "control"], ["POST", "/admin/system/maintenance/activate", "control"],
    ["GET", "/admin/users", "other"], ["GET", "/cars", "other"], ["POST", "/payments/stk", "other"], ["POST", "/admin/system/recover", "other"],
    ["PUT", "/auth/login", "other"], ["GET", "/auth/login", "other"], ["POST", "/auth/login-evil", "other"], ["GET", "/admin/system/maintenance", "other"],
  ])("%s %s -> %s", (m, p, kind) => expect(R(m, p).kind).toBe(kind));
  test("trailing slash, query string and /vN prefix are normalised", () => {
    expect(normalizeRoutePath("/v1/auth/me/?x=1")).toBe("/auth/me");
    expect(R("get", "/v2/admin/system/maintenance/status/").kind).toBe("control");
  });
});

describe("identity and technical recovery", () => {
  test("owner is the only audience no scope restricts; staff are restricted only by global", () => {
    for (const s of SCOPE_IDS) expect(isAudienceRestricted(s, "owner")).toBe(false);
    expect(isAudienceRestricted("global", "staff")).toBe(true);
    for (const s of ["ordinary_users", "buyers_sellers", "dealers"]) expect(isAudienceRestricted(s, "staff")).toBe(false);
  });
  test("audience mapping", () => {
    expect(audienceForUser(u("user"))).toBe("buyers_sellers");
    expect(audienceForUser(u("individual_seller"))).toBe("buyers_sellers");
    expect(audienceForUser(u("dealer"))).toBe("dealers");
    expect(audienceForUser(u("user"), { dealerTeamMember: true })).toBe("dealers");
    expect(audienceForUser(u("technical_support"))).toBe("staff");
    expect(audienceForUser(u("admin"))).toBe("staff");
    expect(audienceForUser(u("anything-new"))).toBe("buyers_sellers");
    expect(audienceForUser(u("dealer"), { isOwner: true })).toBe("owner");
  });
  test("technical recovery needs the explicit permission ON A STAFF ACCOUNT; nothing else confers it", () => {
    const P = PLATFORM_RECOVERY_PERMISSION;
    expect(hasTechnicalRecovery(u("technical_support", { grantedPermissions: [P] }))).toBe(true);
    expect(hasTechnicalRecovery(u("technical_support"))).toBe(false);
    expect(hasTechnicalRecovery(u("admin"))).toBe(false);
    expect(hasTechnicalRecovery(u("superadmin"))).toBe(false); // role label alone never confers it
    expect(hasTechnicalRecovery(u("technical_support", { grantedPermissions: [P], revokedPermissions: [P] }))).toBe(false);
    expect(hasTechnicalRecovery(u("technical_support", { grantedPermissions: [P], status: "pending" }))).toBe(false);
    for (const role of ["user", "dealer", "individual_seller"]) expect(hasTechnicalRecovery(u(role, { grantedPermissions: [P] }))).toBe(false);
    expect(hasTechnicalRecovery(u("technical_support", { grantedPermissions: [P], email: "jimmythemugo@gmail.com" }))).toBe(true);
    expect(hasTechnicalRecovery(u("technical_support", { email: "jimmythemugo@gmail.com" }))).toBe(false); // an e-mail address confers nothing
    expect(hasTechnicalRecovery(null)).toBe(false);
  });
});

describe("decision matrix: GLOBAL shutdown", () => {
  const owner = id(u("user"), { isOwner: true }), tech = id(u("technical_support", { grantedPermissions: ["platform_recovery"] })), staff = id(u("admin")), buyer = id(u("user")), dealer = id(u("dealer"));
  test("owner and technical recovery reach ONLY the session endpoints and the control plane", () => {
    for (const who of [owner, tech]) {
      expect(allow("global", "POST", "/auth/login", who)).toBe(true);
      expect(allow("global", "GET", "/auth/me", who)).toBe(true);
      expect(allow("global", "POST", "/auth/refresh", who)).toBe(true);
      expect(allow("global", "GET", "/admin/system/maintenance/status", who)).toBe(true);
      expect(allow("global", "POST", "/admin/system/maintenance/recover", who)).toBe(true);
      // exempt from the shutdown, NOT exempt from authorization: sensitive admin / financial APIs stay closed
      for (const [m, p] of [["GET", "/admin/users"], ["POST", "/payments/stk"], ["GET", "/admin/finance"], ["POST", "/owner/members"], ["GET", "/cars"], ["PUT", "/admin/staff/x/permissions"]]) expect(allow("global", m, p, who)).toBe(false);
    }
  });
  test("activation is owner-only, never technical staff", () => {
    expect(allow("global", "POST", "/admin/system/maintenance/activate", owner)).toBe(true);
    expect(allow("global", "POST", "/admin/system/maintenance/activate", tech)).toBe(false);
    expect(allow("dealers", "POST", "/admin/system/maintenance/activate", tech)).toBe(false);
    expect(allow("dealers", "POST", "/admin/system/maintenance/activate", staff)).toBe(false);
  });
  test("ordinary staff, buyers, dealers and anonymous traffic are refused everywhere, including sign-in once identified", () => {
    for (const who of [staff, buyer, dealer]) {
      for (const [m, p] of [["POST", "/auth/login"], ["GET", "/auth/me"], ["POST", "/auth/refresh"], ["GET", "/cars"], ["GET", "/admin/users"], ["GET", "/admin/system/maintenance/status"]]) expect(allow("global", m, p, who)).toBe(false);
    }
    expect(allow("global", "GET", "/cars", null)).toBe(false);
    expect(allow("global", "POST", "/auth/register", null)).toBe(false);
    expect(allow("global", "POST", "/auth/login", null)).toBe(true); // pre-auth only: the handler refuses non-recovery identities after the password check
  });
});

describe("decision matrix: SCOPED maintenance", () => {
  const owner = id(u("user"), { isOwner: true }), tech = id(u("technical_support", { grantedPermissions: ["platform_recovery"] })), staff = id(u("admin")),
    buyer = id(u("user")), seller = id(u("individual_seller")), dealer = id(u("dealer")), dealerStaff = id(u("user"), { dealerTeamMember: true });
  const matrix = {
    dealers: { dealer: false, dealerStaff: false, buyer: true, seller: true, staff: true, owner: true },
    buyers_sellers: { dealer: true, dealerStaff: true, buyer: false, seller: false, staff: true, owner: true },
    ordinary_users: { dealer: false, dealerStaff: false, buyer: false, seller: false, staff: true, owner: true },
  };
  const who = { dealer, dealerStaff, buyer, seller, staff, owner };
  for (const [scope, row] of Object.entries(matrix)) {
    test(`${scope}: only the intended audience loses signed-in routes`, () => {
      for (const [name, expected] of Object.entries(row)) {
        for (const [m, p] of [["GET", "/auth/me"], ["POST", "/auth/refresh"], ["GET", "/bids/mine"], ["GET", "/dealer/inventory"], ["POST", "/payments/stk"]]) {
          expect({ scope, name, p, allowed: allow(scope, m, p, who[name]) }).toEqual({ scope, name, p, allowed: expected });
        }
      }
    });
    test(`${scope}: public browsing (anonymous reads) is unchanged; the staff console keeps working for staff`, () => {
      expect(allow(scope, "GET", "/cars", null)).toBe(true);
      expect(allow(scope, "GET", "/search", null)).toBe(true);
      expect(allow(scope, "POST", "/auth/login", null)).toBe(true);
      expect(allow(scope, "GET", "/admin/users", staff)).toBe(true);
      expect(allow(scope, "GET", "/admin/users", owner)).toBe(true);
    });
  }
  test("registration pause follows the buyer audience only", () => {
    expect(allow("buyers_sellers", "POST", "/auth/register", null)).toBe(false);
    expect(allow("ordinary_users", "POST", "/auth/register", null)).toBe(false);
    expect(allow("dealers", "POST", "/auth/register", null)).toBe(true);
  });
  test("technical staff keep their staff access in scoped modes and gain only status + recover", () => {
    expect(allow("dealers", "GET", "/admin/system/maintenance/status", tech)).toBe(true);
    expect(allow("dealers", "POST", "/admin/system/maintenance/recover", tech)).toBe(true);
    expect(allow("dealers", "GET", "/admin/system/maintenance/status", staff)).toBe(false);
    expect(allow("dealers", "POST", "/admin/system/maintenance/recover", staff)).toBe(false);
    expect(allow("dealers", "GET", "/admin/system/maintenance/status", buyer)).toBe(false);
  });
  test("an invalid or missing scope fails closed", () => {
    expect(decide({ scope: "nope", route: R("GET", "/cars"), identity: owner }).allow).toBe(false);
    expect(isValidScope(undefined)).toBe(false);
  });
});

describe("stored state is backward compatible and fails closed", () => {
  test("the hosted row today (flag on, no scope) is a GLOBAL shutdown exactly as before", () => {
    const s = normalizeSystemStatus({ isMaintenanceMode: true, emergencyMessage: "System under scheduled maintenance.", isAuctionActive: true });
    expect(s.isMaintenanceMode).toBe(true);
    expect(s.maintenanceScope).toBe("global");
    expect(s.maintenanceVersion).toBe(0);
  });
  test("an unknown stored scope is treated as global; an inactive row has no scope", () => {
    expect(normalizeSystemStatus({ isMaintenanceMode: true, maintenanceScope: "bogus" }).maintenanceScope).toBe("global");
    expect(normalizeSystemStatus({ isMaintenanceMode: false, maintenanceScope: "dealers" }).maintenanceScope).toBeNull();
    expect(normalizeSystemStatus(null).isMaintenanceMode).toBe(false);
    expect(normalizeSystemStatus({ isMaintenanceMode: "true" }).isMaintenanceMode).toBe(false); // only a real boolean activates
  });
});

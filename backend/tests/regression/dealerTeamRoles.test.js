// Dealer team roles: built-in templates, owner-defined custom roles, honest invitation e-mail result, resend, no privilege expansion.
// REAL dealerPlatformController + REAL dealerTeamRoles.service; persistence is an in-memory fake (mocked-persistence evidence tier).
import { describe, test, expect, beforeEach, jest } from "@jest/globals";
process.env.NODE_ENV = "test";

const store = { teams: {}, roles: {} };
const audit = [];
let emailResult; let rolesTableMissing = false;
const matches = (row, f) => Object.entries(f).every(([k, v]) => row[k] === v);
const tbl = (t) => (t === "dealer_teams" ? store.teams : t === "dealer_team_roles" ? store.roles : null);
const dbMock = {
  findAll: jest.fn(async (t, o = {}) => { if (t === "dealer_team_roles" && rolesTableMissing) throw Object.assign(new Error('relation "dealer_team_roles" does not exist'), { code: "42P01" }); const s = tbl(t); return s ? Object.values(s).filter((r) => matches(r, o.filters || {})) : []; }),
  findOne: jest.fn(async (t, f) => { const s = tbl(t); return s ? Object.values(s).find((r) => matches(r, f)) || null : null; }),
  create: jest.fn(async (t, d) => { const s = tbl(t); const row = { id: `${t}-${Object.keys(s).length + 1}`, ...d }; s[row.id] = row; return { ...row }; }),
  update: jest.fn(async (t, id, d) => { const s = tbl(t); Object.assign(s[id], d); return { ...s[id] }; }),
  remove: jest.fn(async (t, id) => { delete tbl(t)[id]; }),
};
const empty = { find: jest.fn(async () => []), findOne: jest.fn(async () => null) };
jest.unstable_mockModule("../../models/User.js", () => ({ default: { findById: jest.fn(), find: jest.fn(async () => []) } }));
jest.unstable_mockModule("../../models/Dealer.js", () => ({ default: empty }));
for (const m of ["InspectionOrder", "DealerAnalytics", "Car", "Escrow", "MarketingCampaign"]) jest.unstable_mockModule(`../../models/${m}.js`, () => ({ default: empty }));
jest.unstable_mockModule("../../services/review.service.js", () => ({ listDealerReviews: jest.fn(async () => ({ total: 0, averageRating: 0 })) }));
jest.unstable_mockModule("../../controllers/carController.js", () => ({ createCar: jest.fn(), updateCar: jest.fn(), deleteCar: jest.fn() }));
jest.unstable_mockModule("../../utils/logger.js", () => ({ logInfo: jest.fn(), logWarn: jest.fn(), logError: jest.fn(), default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
jest.unstable_mockModule("../../services/dealerSubscription.service.js", () => ({ getDealerEntitlement: jest.fn(async () => ({})) }));
jest.unstable_mockModule("../../services/leadService.js", () => ({ getDealerLeads: jest.fn(async () => []), getLeadById: jest.fn(), updateLeadStage: jest.fn(), addLeadActivity: jest.fn() }));
jest.unstable_mockModule("../../db/index.js", () => dbMock);
jest.unstable_mockModule("../../services/auditService.js", () => ({ logAuditEvent: jest.fn(async (e) => { audit.push(e); }) }));
jest.unstable_mockModule("../../services/onboardingPolicy.service.js", () => ({ sellerMayPublishDirectly: jest.fn(), PUBLICATION_REVIEW_REQUIRED: "review" }));
const sendInvite = jest.fn(async () => emailResult);
jest.unstable_mockModule("../../services/email.service.js", () => ({ sendTeamInviteEmail: sendInvite }));
jest.unstable_mockModule("../../middleware/dealerOrgAccess.js", () => ({
  DEALER_TEAM_PERMISSIONS: ["canListCars", "canEditCars", "canDeleteCars", "canViewEarnings", "canManageTeam", "canApproveDeals", "canChatBuyers", "canEditSettings"],
}));

const ctrl = await import("../../controllers/dealerPlatformController.js");
const D1 = "11111111-1111-4111-8111-111111111111";
const mkRes = () => { const r = { statusCode: 200, body: null }; r.status = (c) => { r.statusCode = c; return r; }; r.json = (b) => { r.body = b; return r; }; return r; };
const call = async (fn, req) => { const res = mkRes(); await fn({ ip: "127.0.0.1", get: () => "jest", id: "r1", params: {}, body: {}, ...req }, res); return res; };
const ALL = Object.fromEntries(["canListCars", "canEditCars", "canDeleteCars", "canViewEarnings", "canManageTeam", "canApproveDeals", "canChatBuyers", "canEditSettings"].map((k) => [k, true]));
const OWNER = { user: { id: D1, role: "dealer", email: "owner@x.test", name: "Amani" }, dealerOrg: { isOwner: true, role: "dealer", permissions: ALL }, dealerId: D1 };
const MGR = { user: { id: "m1", role: "user", email: "m@x.test", name: "Mgr" }, dealerOrg: { isOwner: false, role: "finance_officer", permissions: { canManageTeam: true, canListCars: true } }, dealerId: D1 };

beforeEach(() => { store.teams = {}; store.roles = {}; audit.length = 0; emailResult = { success: true }; rolesTableMissing = false; sendInvite.mockClear(); });

describe("roles catalogue", () => {
  test("lists the five built-in templates with real permissions, and the permission catalogue", async () => {
    const r = await call(ctrl.getTeamRoles, OWNER);
    expect(r.body.data.roles.map((x) => x.key)).toEqual(["manager", "sales_agent", "lot_agent", "finance_officer", "viewer"]);
    expect(r.body.data.roles.find((x) => x.key === "sales_agent").permissions).toMatchObject({ canListCars: true, canChatBuyers: true, canDeleteCars: false, canManageTeam: false });
    expect(r.body.data.roles.find((x) => x.key === "viewer").permissions.canListCars).toBe(false);
    expect(r.body.data.customRolesAvailable).toBe(true);
    expect(r.body.data.permissions.length).toBe(8);
  });
  test("when the custom-roles table is not created yet, built-in roles still work and the API says so", async () => {
    rolesTableMissing = true;
    const r = await call(ctrl.getTeamRoles, OWNER);
    expect(r.statusCode).toBe(200); expect(r.body.data.customRolesAvailable).toBe(false); expect(r.body.data.roles).toHaveLength(5);
    const c = await call(ctrl.createTeamRole, { ...OWNER, body: { label: "Photographer", permissions: { canEditCars: true } } });
    expect(c.statusCode).toBe(503); expect(c.body.code).toBe("CUSTOM_ROLES_UNAVAILABLE");
  });
});

describe("custom roles", () => {
  test("owner creates a role; it is listed, audited, and usable for an invitation that carries its permissions", async () => {
    const c = await call(ctrl.createTeamRole, { ...OWNER, body: { label: "Photographer", description: "Photos only", permissions: { canEditCars: true } } });
    expect(c.statusCode).toBe(201); expect(c.body.data.key).toBe("custom_photographer");
    expect(audit.map((a) => a.action)).toContain("dealer_team_role_created");
    const inv = await call(ctrl.inviteTeamMember, { ...OWNER, body: { email: "Pat@X.test", role: "custom_photographer" } });
    expect(inv.statusCode).toBe(201);
    expect(Object.values(store.teams)[0]).toMatchObject({ role: "custom_photographer", permissions: { canEditCars: true, canListCars: false, canManageTeam: false } });
  });
  test("validation: bad name, unknown permission, non-boolean, duplicate and built-in name are refused", async () => {
    expect((await call(ctrl.createTeamRole, { ...OWNER, body: { label: "x", permissions: {} } })).statusCode).toBe(400);
    expect((await call(ctrl.createTeamRole, { ...OWNER, body: { label: "Valid", permissions: { canFly: true } } })).body.code).toBe("UNKNOWN_PERMISSION");
    expect((await call(ctrl.createTeamRole, { ...OWNER, body: { label: "Valid", permissions: { canEditCars: "yes" } } })).statusCode).toBe(400);
    expect((await call(ctrl.createTeamRole, { ...OWNER, body: { label: "Sales agent", permissions: {} } })).statusCode).toBe(409);
    await call(ctrl.createTeamRole, { ...OWNER, body: { label: "Valid", permissions: {} } });
    expect((await call(ctrl.createTeamRole, { ...OWNER, body: { label: "valid", permissions: {} } })).statusCode).toBe(409);
  });
  test("editing a role's permissions updates members already in it; built-ins cannot be edited or deleted", async () => {
    await call(ctrl.createTeamRole, { ...OWNER, body: { label: "Clerk", permissions: { canListCars: true } } });
    await call(ctrl.inviteTeamMember, { ...OWNER, body: { email: "c@x.test", role: "custom_clerk" } });
    const u = await call(ctrl.updateTeamRole, { ...OWNER, params: { roleKey: "custom_clerk" }, body: { permissions: { canListCars: true, canChatBuyers: true } } });
    expect(u.statusCode).toBe(200); expect(u.body.updatedMembers).toBe(1);
    expect(Object.values(store.teams)[0].permissions.canChatBuyers).toBe(true);
    expect((await call(ctrl.updateTeamRole, { ...OWNER, params: { roleKey: "viewer" }, body: { label: "Seer" } })).body.code).toBe("ROLE_BUILTIN");
    expect((await call(ctrl.deleteTeamRole, { ...OWNER, params: { roleKey: "viewer" } })).body.code).toBe("ROLE_BUILTIN");
  });
  test("a role in use cannot be deleted; an unused one can", async () => {
    await call(ctrl.createTeamRole, { ...OWNER, body: { label: "Clerk", permissions: {} } });
    await call(ctrl.inviteTeamMember, { ...OWNER, body: { email: "c@x.test", role: "custom_clerk" } });
    const blocked = await call(ctrl.deleteTeamRole, { ...OWNER, params: { roleKey: "custom_clerk" } });
    expect(blocked.statusCode).toBe(409); expect(blocked.body.code).toBe("ROLE_IN_USE");
    store.teams = {};
    expect((await call(ctrl.deleteTeamRole, { ...OWNER, params: { roleKey: "custom_clerk" } })).statusCode).toBe(200);
  });
  test("only the owner may create, edit or delete roles", async () => {
    for (const [fn, extra] of [[ctrl.createTeamRole, { body: { label: "Zed", permissions: {} } }], [ctrl.updateTeamRole, { params: { roleKey: "custom_x" }, body: { label: "Y" } }], [ctrl.deleteTeamRole, { params: { roleKey: "custom_x" } }]]) {
      const r = await call(fn, { ...MGR, ...extra }); expect(r.statusCode).toBe(403); expect(r.body.code).toBe("TEAM_ROLE_OWNER_ONLY");
    }
  });
});

describe("invitations", () => {
  test("built-in role invitation carries the template permissions and reports e-mail success", async () => {
    const r = await call(ctrl.inviteTeamMember, { ...OWNER, body: { email: "a@x.test", role: "lot_agent" } });
    expect(r.statusCode).toBe(201); expect(r.body.email.sent).toBe(true);
    expect(Object.values(store.teams)[0].permissions).toMatchObject({ canListCars: true, canEditCars: true, canDeleteCars: false });
    expect(JSON.stringify(r.body)).not.toMatch(/inviteTokenHash|invite_token/i);
  });
  test("a failed or unconfigured e-mail is reported, not hidden; the invitation still exists for resend", async () => {
    emailResult = { success: false, disabled: true };
    const r = await call(ctrl.inviteTeamMember, { ...OWNER, body: { email: "a@x.test", role: "viewer" } });
    expect(r.statusCode).toBe(201); expect(r.body.email.sent).toBe(false); expect(r.body.email.reason).toMatch(/not configured/i);
    emailResult = undefined; // provider adapter returned nothing
    const r2 = await call(ctrl.inviteTeamMember, { ...OWNER, body: { email: "b@x.test", role: "viewer" } });
    expect(r2.body.email.sent).toBe(false);
  });
  test("resend issues a NEW token for a pending invite only", async () => {
    await call(ctrl.inviteTeamMember, { ...OWNER, body: { email: "a@x.test", role: "viewer" } });
    const row = Object.values(store.teams)[0]; const oldHash = row.inviteTokenHash;
    const r = await call(ctrl.resendTeamInvite, { ...OWNER, params: { memberId: row.id } });
    expect(r.statusCode).toBe(200); expect(r.body.email.sent).toBe(true);
    expect(store.teams[row.id].inviteTokenHash).not.toBe(oldHash);
    expect(sendInvite).toHaveBeenCalledTimes(2);
    store.teams[row.id].status = "active";
    expect((await call(ctrl.resendTeamInvite, { ...OWNER, params: { memberId: row.id } })).statusCode).toBe(409);
  });
  test("no privilege expansion: a delegate cannot invite into a role holding permissions they lack", async () => {
    const r = await call(ctrl.inviteTeamMember, { ...MGR, body: { email: "a@x.test", role: "finance_officer" } });
    expect(r.statusCode).toBe(403); expect(r.body.code).toBe("PERMISSION_GRANT_FORBIDDEN");
    const ok = await call(ctrl.inviteTeamMember, { ...MGR, body: { email: "b@x.test", role: "viewer" } });
    expect(ok.statusCode).toBe(201);
  });
  test("moving a member to another role swaps the permission set; unknown roles are refused", async () => {
    await call(ctrl.inviteTeamMember, { ...OWNER, body: { email: "a@x.test", role: "viewer" } });
    const row = Object.values(store.teams)[0];
    const r = await call(ctrl.updateTeamMember, { ...OWNER, params: { memberId: row.id }, body: { role: "sales_agent" } });
    expect(r.statusCode).toBe(200); expect(store.teams[row.id].permissions.canChatBuyers).toBe(true);
    expect((await call(ctrl.updateTeamMember, { ...OWNER, params: { memberId: row.id }, body: { role: "nonsense" } })).statusCode).toBe(400);
  });
});

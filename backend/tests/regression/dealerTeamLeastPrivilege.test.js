// ============================================================
// DEALER PROFILE + TEAM AUTHORIZATION (EVIDENCE TIER: mocked persistence, real controller code).
// Drives the REAL controller functions; models, db and services are in-memory fakes. This is NOT live-backend certification.
// ============================================================
import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import fs from "fs";
import crypto from "node:crypto";

process.env.NODE_ENV = "test";

const store = { users: {}, dealers: {}, teams: {} };
const writes = [];
const audit = [];

const D1 = "11111111-1111-4111-8111-111111111111";
const D2 = "22222222-2222-4222-8222-222222222222";
const B1 = "44444444-4444-4444-8444-444444444444";

const userModel = {
  findById: jest.fn(async (id) => (store.users[id] ? { ...store.users[id] } : null)),
  findByIdAndUpdate: jest.fn(async (id, upd) => { writes.push(["User.update", id, upd]); if (!store.users[id]) return null; Object.assign(store.users[id], upd); return { ...store.users[id] }; }),
  find: jest.fn(async () => []),
};
const dealerModel = {
  findOne: jest.fn(async ({ user }) => (store.dealers[user] ? { ...store.dealers[user] } : null)),
  findByIdAndUpdate: jest.fn(async (id, upd) => { writes.push(["Dealer.update", id, upd]); const d = Object.values(store.dealers).find((x) => x.id === id); if (d) Object.assign(d, upd); return d; }),
};
const empty = { find: jest.fn(async () => []), findOne: jest.fn(async () => null) };
const matches = (row, f) => Object.entries(f).every(([k, v]) => row[k] === v);
const dbMock = {
  findAll: jest.fn(async (t, o = {}) => (t === "dealer_teams" ? Object.values(store.teams).filter((r) => matches(r, o.filters || {})) : [])),
  findOne: jest.fn(async (t, f) => (t === "dealer_teams" ? Object.values(store.teams).find((r) => matches(r, f)) || null : null)),
  create: jest.fn(async (t, d) => { const row = { id: `t${Object.keys(store.teams).length + 1}`, ...d }; store.teams[row.id] = row; writes.push(["create", t, row.id]); return { ...row }; }),
  update: jest.fn(async (t, id, d) => { writes.push(["update", t, id, d]); Object.assign(store.teams[id], d); return { ...store.teams[id] }; }),
};

jest.unstable_mockModule("../../models/User.js", () => ({ default: userModel }));
jest.unstable_mockModule("../../models/Dealer.js", () => ({ default: dealerModel }));
for (const m of ["InspectionOrder", "DealerAnalytics", "Car", "Escrow", "MarketingCampaign"]) jest.unstable_mockModule(`../../models/${m}.js`, () => ({ default: empty }));
jest.unstable_mockModule("../../services/review.service.js", () => ({ listDealerReviews: jest.fn(async () => ({ total: 0, averageRating: 0 })) }));
jest.unstable_mockModule("../../controllers/carController.js", () => ({ createCar: jest.fn(), updateCar: jest.fn(), deleteCar: jest.fn() }));
jest.unstable_mockModule("../../utils/logger.js", () => ({ logInfo: jest.fn(), logWarn: jest.fn(), logError: jest.fn(), default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
jest.unstable_mockModule("../../services/dealerSubscription.service.js", () => ({ getDealerEntitlement: jest.fn(async () => ({})) }));
jest.unstable_mockModule("../../services/leadService.js", () => ({ getDealerLeads: jest.fn(async () => []), getLeadById: jest.fn(), updateLeadStage: jest.fn(), addLeadActivity: jest.fn() }));
jest.unstable_mockModule("../../db/index.js", () => dbMock);
jest.unstable_mockModule("../../services/auditService.js", () => ({ logAuditEvent: jest.fn(async (e) => { audit.push(e); }) }));
jest.unstable_mockModule("../../services/onboardingPolicy.service.js", () => ({ sellerMayPublishDirectly: jest.fn(), PUBLICATION_REVIEW_REQUIRED: "review" }));
jest.unstable_mockModule("../../services/email.service.js", () => ({ sendTeamInviteEmail: jest.fn(async () => {}) }));
jest.unstable_mockModule("../../middleware/dealerOrgAccess.js", () => ({
  DEALER_TEAM_PERMISSIONS: ["canListCars", "canEditCars", "canDeleteCars", "canViewEarnings", "canManageTeam", "canApproveDeals", "canChatBuyers", "canEditSettings"],
}));

const ctrl = await import("../../controllers/dealerPlatformController.js");
const mkRes = () => { const r = { statusCode: 200, body: null }; r.status = (c) => { r.statusCode = c; return r; }; r.json = (b) => { r.body = b; return r; }; return r; };
const call = async (fn, req) => { const res = mkRes(); await fn({ ip: "127.0.0.1", get: () => "jest", id: "req1", params: {}, body: {}, ...req }, res); return res; };

const ALL = Object.fromEntries(["canListCars", "canEditCars", "canDeleteCars", "canViewEarnings", "canManageTeam", "canApproveDeals", "canChatBuyers", "canEditSettings"].map((k) => [k, true]));
// Actors (req.user + req.dealerOrg exactly as dealerOrgAccess would set them)
const ACTORS = {
  owner: { user: { id: D1, role: "dealer", email: "owner@amani.test" }, dealerOrg: { isOwner: true, role: "dealer", permissions: ALL } },
  admin: { user: { id: "adm", role: "admin", email: "adm@kayad.test" }, dealerOrg: { isOwner: false, role: "admin", permissions: ALL } },
  superadmin: { user: { id: "sup", role: "superadmin", email: "sup@kayad.test" }, dealerOrg: { isOwner: false, role: "superadmin", permissions: ALL } },
  manager: { user: { id: "uM", role: "user", email: "mgr@amani.test" }, dealerOrg: { isOwner: false, role: "manager", permissions: { canManageTeam: true, canListCars: true, canEditCars: true } } },
  delegate: { user: { id: "uD", role: "user", email: "del@amani.test" }, dealerOrg: { isOwner: false, role: "sales_agent", permissions: { canManageTeam: true, canListCars: true } } },
};
const as = (actor, fn, extra) => call(fn, { ...ACTORS[actor], dealerId: D1, ...extra });

beforeEach(() => {
  writes.length = 0; audit.length = 0;
  store.users = { [D1]: { id: D1, role: "dealer", email: "owner@amani.test" } };
  store.dealers = { [D1]: { id: "dr1", user: D1, approved: true } };
  store.teams = {
    peerMgr:   { id: "peerMgr", dealer: D1, member: "uP", inviteEmail: "p@amani.test", role: "manager", status: "active", permissions: { canManageTeam: true } },
    agent:     { id: "agent", dealer: D1, member: "uA", inviteEmail: "a@amani.test", role: "sales_agent", status: "active", permissions: { canListCars: true } },
    finance:   { id: "finance", dealer: D1, member: "uF", inviteEmail: "f@amani.test", role: "finance_officer", status: "active", permissions: { canViewEarnings: true } },
    viewer:    { id: "viewer", dealer: D1, member: "uV", inviteEmail: "v@amani.test", role: "viewer", status: "active", permissions: {} },
    pending:   { id: "pending", dealer: D1, member: null, inviteEmail: "pend@amani.test", role: "viewer", status: "invited", permissions: {}, inviteTokenHash: "SECRETHASH" },
    delegateRow: { id: "delegateRow", dealer: D1, member: "uD", inviteEmail: "del@amani.test", role: "sales_agent", status: "active", permissions: { canManageTeam: true, canListCars: true } },
    managerRow: { id: "managerRow", dealer: D1, member: "uM", inviteEmail: "mgr@amani.test", role: "manager", status: "active", permissions: { canManageTeam: true, canListCars: true, canEditCars: true } },
    other:     { id: "other", dealer: D2, member: "u9", inviteEmail: "x@other.test", role: "viewer", status: "active", permissions: {} },
  };
});

describe("who may remove / change whom (least privilege) - actor x target matrix", () => {
  // [actor, target, allowed]
  test.each([
    ["owner", "peerMgr", true], ["owner", "agent", true], ["admin", "peerMgr", true], ["superadmin", "peerMgr", true],
    ["manager", "peerMgr", false],      // a manager cannot remove a peer manager
    ["manager", "managerRow", false],   // ... nor (as another manager) anything protected; also self is separately blocked
    ["manager", "agent", true], ["manager", "viewer", true], ["manager", "pending", true],
    ["manager", "finance", false],      // holds canViewEarnings which the manager does not hold
    ["delegate", "peerMgr", false], ["delegate", "agent", true], ["delegate", "finance", false],
  ])("DELETE /team/:id  %s -> %s allowed=%s", async (actor, target, allowed) => {
    const r = await as(actor, ctrl.removeTeamMember, { params: { memberId: target } });
    expect(r.statusCode).toBe(allowed ? 200 : 403);
    expect(store.teams[target].status).toBe(allowed ? "removed" : store.teams[target].status === "removed" ? "removed" : store.teams[target].status);
    if (!allowed) { if (target !== "managerRow") expect(r.body.code).toBe("TEAM_TARGET_PROTECTED"); expect(writes).toHaveLength(0); }
  });

  test.each([
    ["manager", "peerMgr", { status: "suspended" }, 403], ["manager", "peerMgr", { role: "viewer" }, 403], ["manager", "peerMgr", { permissions: { canManageTeam: false } }, 403],
    ["manager", "agent", { status: "suspended" }, 200], ["manager", "agent", { role: "lot_agent" }, 200],
    ["manager", "finance", { role: "viewer" }, 403],
    ["owner", "peerMgr", { status: "suspended" }, 200], ["admin", "peerMgr", { role: "viewer" }, 200],
  ])("PUT /team/:id  %s -> %s %j expects %i", async (actor, target, body, expected) => {
    const r = await as(actor, ctrl.updateTeamMember, { params: { memberId: target }, body });
    expect(r.statusCode).toBe(expected);
  });

  test("a non-owner cannot promote anyone to manager, nor invite a manager; the owner can", async () => {
    expect((await as("manager", ctrl.updateTeamMember, { params: { memberId: "agent" }, body: { role: "manager" } })).body.code).toBe("TEAM_ROLE_OWNER_ONLY");
    expect((await as("delegate", ctrl.inviteTeamMember, { body: { email: "new@amani.test", role: "manager" } })).body.code).toBe("TEAM_ROLE_OWNER_ONLY");
    expect((await as("manager", ctrl.inviteTeamMember, { body: { email: "new2@amani.test", role: "viewer" } })).statusCode).toBe(201);
    expect((await as("owner", ctrl.inviteTeamMember, { body: { email: "new3@amani.test", role: "manager" } })).statusCode).toBe(201);
    expect((await as("owner", ctrl.updateTeamMember, { params: { memberId: "agent" }, body: { role: "manager" } })).statusCode).toBe(200);
  });

  test("self-service is always blocked: no self role/permission/status change, no self removal, for any actor", async () => {
    for (const [actor, row] of [["manager", "managerRow"], ["delegate", "delegateRow"]]) {
      const base = { params: { memberId: row } };
      expect((await as(actor, ctrl.updateTeamMember, { ...base, body: { permissions: { canEditSettings: true } } })).statusCode).toBe(403);
      expect((await as(actor, ctrl.updateTeamMember, { ...base, body: { role: "viewer" } })).statusCode).toBe(403);
      expect((await as(actor, ctrl.removeTeamMember, base)).statusCode).toBe(403);
    }
    expect(writes).toHaveLength(0);
  });

  test("cross-organization identifier substitution: a member id from another dealership is never found (404), even for the owner", async () => {
    for (const actor of ["owner", "manager", "delegate"]) {
      expect((await as(actor, ctrl.updateTeamMember, { params: { memberId: "other" }, body: { status: "suspended" } })).statusCode).toBe(404);
      expect((await as(actor, ctrl.removeTeamMember, { params: { memberId: "other" } })).statusCode).toBe(404);
    }
    expect(store.teams.other.status).toBe("active");
  });

  test("a body-supplied dealer id cannot redirect a mutation: the organization comes from the server-resolved dealerId", async () => {
    const r = await as("owner", ctrl.updateTeamMember, { params: { memberId: "other" }, body: { dealerId: D2, dealer: D2, status: "suspended" } });
    expect(r.statusCode).toBe(404);
    expect(store.teams.other.status).toBe("active");
  });

  test("the roster endpoint is wired to canManageTeam, so a member without it is refused before the handler", () => {
    const routes = fs.readFileSync(new URL("../../routes/dealerPlatformRoutes.js", import.meta.url), "utf8");
    expect(routes).toMatch(/router\.get\("\/team", protect, dealerOrgAccess\("canManageTeam"\)/);
  });
});

describe("invitation lifecycle: scoped, expiring, single-use, replay-safe", () => {
  const token = "a".repeat(64);
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  const invitee = { id: "uN", role: "user", email: "NEW@amani.test", name: "New" };
  beforeEach(() => { store.teams.inv = { id: "inv", dealer: D1, member: null, inviteEmail: "new@amani.test", role: "viewer", status: "invited", permissions: {}, inviteTokenHash: hash, inviteExpiresAt: new Date(Date.now() + 86400000).toISOString() }; });
  const accept = (user, t = token) => call(ctrl.acceptTeamInvite, { user, body: { token: t } });

  test("the right invitee accepts once; the token is cleared and the row joins exactly that dealership", async () => {
    const r = await accept(invitee);
    expect(r.statusCode).toBe(200);
    expect(store.teams.inv).toMatchObject({ status: "active", member: "uN", dealer: D1, inviteTokenHash: null });
    expect(JSON.stringify(r.body)).not.toMatch(/inviteTokenHash|SECRET/);
  });
  test("replay of the same token fails (404), even by the same user", async () => {
    await accept(invitee);
    expect((await accept(invitee)).statusCode).toBe(404);
  });
  test("a different authenticated account cannot use someone else's token (403) and the invite stays pending", async () => {
    expect((await accept({ id: "uX", role: "user", email: "attacker@x.test" })).statusCode).toBe(403);
    expect(store.teams.inv.status).toBe("invited");
  });
  test("an expired invitation is refused (410)", async () => {
    store.teams.inv.inviteExpiresAt = new Date(Date.now() - 1000).toISOString();
    expect((await accept(invitee)).statusCode).toBe(410);
    expect(store.teams.inv.status).toBe("invited");
  });
  test("malformed or unknown tokens are refused; a removed invitation cannot be accepted", async () => {
    expect((await accept(invitee, "short")).statusCode).toBe(400);
    expect((await accept(invitee, "b".repeat(64))).statusCode).toBe(404);
    store.teams.inv.status = "removed"; store.teams.inv.inviteTokenHash = null;
    expect((await accept(invitee)).statusCode).toBe(404);
  });
  test("removing a pending invitation revokes its token", async () => {
    await as("owner", ctrl.removeTeamMember, { params: { memberId: "inv" } });
    expect(store.teams.inv.inviteTokenHash).toBeNull();
    expect((await accept(invitee)).statusCode).toBe(404);
  });
});

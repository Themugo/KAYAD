// ============================================================
// DEALER PROFILE + TEAM AUTHORIZATION (EVIDENCE TIER: mocked persistence, real controller code).
// Drives the REAL controller functions; models, db and services are in-memory fakes. This is NOT live-backend certification.
// ============================================================
import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import fs from "fs";

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
jest.unstable_mockModule("../../models/UserAuth.js", () => ({ default: { findOne: () => ({ select: async () => ({ matchPassword: async (p) => p === "Right#Pass1" }) }) } }));
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
const dealerUser = (id = D1, extra = {}) => ({ id, role: "dealer", name: "Amani", email: "owner@amani.test", ...extra });

beforeEach(() => {
  writes.length = 0; audit.length = 0;
  store.users = {
    [D1]: { id: D1, role: "dealer", name: "Amani", phone: "254711111111", phoneVerified: true, bio: "old", location: "Nairobi", businessName: "Amani Motors" },
    [D2]: { id: D2, role: "dealer", name: "Other", phone: "254722222222", phoneVerified: true },
    [B1]: { id: B1, role: "user", name: "Buyer", phone: "254733333333", phoneVerified: true, bio: "buyer bio" },
  };
  store.dealers = { [D1]: { id: "dr1", user: D1, businessName: "Amani Motors", location: "Nairobi", approved: true } };
  store.teams = {
    m1: { id: "m1", dealer: D1, member: "u2", inviteEmail: "a@amani.test", role: "sales_agent", status: "active", permissions: {}, inviteTokenHash: "SECRETHASH1" },
    m2: { id: "m2", dealer: D1, member: null, inviteEmail: "b@amani.test", role: "viewer", status: "invited", permissions: {}, inviteTokenHash: "SECRETHASH2" },
    m3: { id: "m3", dealer: D1, member: "u4", inviteEmail: "c@amani.test", role: "viewer", status: "suspended", permissions: {} },
    m4: { id: "m4", dealer: D1, member: "u5", inviteEmail: "d@amani.test", role: "viewer", status: "removed", permissions: {} },
    x1: { id: "x1", dealer: D2, member: "u9", inviteEmail: "x@other.test", role: "viewer", status: "active", permissions: {}, inviteTokenHash: "OTHERHASH" },
  };
});

describe("updateDealerProfile — authorization before mutation", () => {
  const put = (user, body, dealerId = D1) => call(ctrl.updateDealerProfile, { user, params: { dealerId }, body });

  test("authorized dealer updates supported fields; fresh read shows them", async () => {
    const r = await put(dealerUser(), { businessName: "Amani Motors Ltd", location: "Mombasa", bio: "new bio" });
    expect(r.statusCode).toBe(200);
    expect(r.body.data).toMatchObject({ businessName: "Amani Motors Ltd", location: "Mombasa", bio: "new bio" });
    expect(store.users[D1].bio).toBe("new bio");
    expect(store.dealers[D1].businessName).toBe("Amani Motors Ltd");
    expect(audit.map((a) => a.action)).toContain("dealer_profile_updated");
  });

  test("unauthenticated request is refused with no writes", async () => {
    const r = await put(undefined, { bio: "x" });
    expect(r.statusCode).toBe(403);
    expect(writes).toHaveLength(0);
  });

  test("wrong role (buyer editing own id) is refused BEFORE any write — bio/phone untouched", async () => {
    const r = await put({ id: B1, role: "user", email: "b@x.test" }, { bio: "hacked", phone: "0712345678" }, B1);
    expect(r.statusCode).toBe(403);
    expect(writes).toHaveLength(0);
    expect(store.users[B1].bio).toBe("buyer bio");
    expect(store.users[B1].phone).toBe("254733333333");
  });

  test("cross-organization: dealer D2 cannot edit D1; state unchanged", async () => {
    const r = await put(dealerUser(D2), { bio: "pwn" }, D1);
    expect(r.statusCode).toBe(403);
    expect(writes).toHaveLength(0);
    expect(store.users[D1].bio).toBe("old");
  });

  test.each([["role", "admin"], ["permissions", { canManageTeam: true }], ["approved", true], ["dealer", D2], ["verificationStatus", "approved"], ["email", "evil@x.test"], ["phoneVerified", true]])(
    "attempted escalation / identity reassignment via %s is rejected with no writes", async (field, value) => {
      const r = await put(dealerUser(), { bio: "ok", [field]: value });
      expect(r.statusCode).toBe(400);
      expect(r.body.code).toBe("PROFILE_FIELD_NOT_ALLOWED");
      expect(writes).toHaveLength(0);
    });

  test.each([[null], ["string"], [["a"]], [42]])("malformed body %p is rejected", async (body) => {
    const r = await put(dealerUser(), body);
    expect(r.statusCode).toBe(400);
    expect(writes).toHaveLength(0);
  });

  test("validation: empty business name, oversize bio, non-string values rejected; nothing written", async () => {
    for (const body of [{ businessName: "  " }, { bio: "x".repeat(2001) }, { location: 5 }, { businessName: null }]) {
      const r = await put(dealerUser(), body);
      expect(r.statusCode).toBe(400);
    }
    expect(writes).toHaveLength(0);
  });

  test("empty body / only unknown fields => 400 'no valid changes'", async () => {
    expect((await put(dealerUser(), {})).statusCode).toBe(400);
    expect((await put(dealerUser(), { color: "red" })).statusCode).toBe(400);
    expect(writes).toHaveLength(0);
  });

  test("omitted fields are NOT erased; empty string clears bio/location only", async () => {
    await put(dealerUser(), { location: "Kisumu" });
    expect(store.users[D1].bio).toBe("old");
    expect(store.users[D1].phone).toBe("254711111111");
    await put(dealerUser(), { bio: "" });
    expect(store.users[D1].bio).toBe("");
  });

  test("phone: empty/null/invalid rejected; valid number normalised; changed number resets phoneVerified; same number does not", async () => {
    for (const phone of ["", null, "12345", "abc"]) expect((await put(dealerUser(), { phone })).statusCode).toBe(400);
    expect(writes).toHaveLength(0);
    const same = await put(dealerUser(), { phone: "0711111111".replace("0711111111", "0711111111") });
    // 0711111111 normalises to 254711111111 which equals the stored number
    expect(same.statusCode).toBe(200);
    expect(store.users[D1].phoneVerified).toBe(true);
    // Phase 14.9: a changed number needs the current password (payout destination); nothing is written without it.
    const before = writes.length;
    const noStep = await put(dealerUser(), { phone: "+254 700 000 001" });
    expect(noStep.statusCode).toBe(403);
    expect(noStep.body.code).toBe("STEP_UP_REQUIRED");
    const badStep = await put(dealerUser(), { phone: "+254 700 000 001", currentPassword: "nope" });
    expect(badStep.statusCode).toBe(403);
    expect(badStep.body.code).toBe("STEP_UP_FAILED");
    expect(writes.length).toBe(before);
    const changed = await put(dealerUser(), { phone: "+254 700 000 001", currentPassword: "Right#Pass1" });
    expect(changed.statusCode).toBe(200);
    expect(store.users[D1].phone).toBe("254700000001");
    expect(store.users[D1].phoneVerified).toBe(false);
    expect(changed.body.data.phone).toBe("254700000001");
  });

  test("audit never contains the phone number value", async () => {
    await put(dealerUser(), { phone: "0700000002", currentPassword: "Right#Pass1" });
    expect(JSON.stringify(audit)).not.toContain("254700000002");
  });

  test("failure of the second write restores the first (no partial state)", async () => {
    userModel.findByIdAndUpdate.mockImplementationOnce(async () => { throw new Error("db down"); });
    const r = await put(dealerUser(), { businessName: "Changed Co" });
    expect(r.statusCode).toBe(500);
    expect(JSON.stringify(r.body)).not.toMatch(/db down|stack/i);
    expect(store.dealers[D1].businessName).toBe("Amani Motors");
  });
});

describe("getDealerProfile — phone is owner-only", () => {
  const get = (user) => call(ctrl.getDealerProfile, { user, params: { dealerId: D1 } });
  test("anonymous, buyer and other dealer never receive phone", async () => {
    for (const u of [undefined, { id: B1, role: "user" }, dealerUser(D2)]) {
      const r = await get(u);
      expect(r.statusCode).toBe(200);
      expect(Object.keys(r.body.data)).not.toContain("phone");
      expect(JSON.stringify(r.body)).not.toContain("254711111111");
    }
  });
  test("the owner receives their own phone", async () => {
    const r = await get(dealerUser());
    expect(r.body.data.phone).toBe("254711111111");
  });
});

describe("team lifecycle — server enforcement", () => {
  const org = { isOwner: true, permissions: {}, dealerId: D1 };
  const upd = (id, body, extra = {}) => call(ctrl.updateTeamMember, { user: dealerUser(), dealerId: D1, dealerOrg: org, params: { memberId: id }, body, ...extra });
  const rm = (id) => call(ctrl.removeTeamMember, { user: dealerUser(), dealerId: D1, dealerOrg: org, params: { memberId: id } });

  test("list never exposes invitation token hashes", async () => {
    const r = await call(ctrl.getTeamMembers, { user: dealerUser(), dealerId: D1, dealerOrg: org });
    expect(JSON.stringify(r.body)).not.toMatch(/SECRETHASH|inviteTokenHash|OTHERHASH/);
    expect(r.body.data.items.every((i) => i.dealer === D1)).toBe(true);
  });

  test("a dealer cannot act on another dealer's member (404, no write)", async () => {
    expect((await upd("x1", { role: "manager" })).statusCode).toBe(404);
    expect((await rm("x1")).statusCode).toBe(404);
    expect(writes).toHaveLength(0);
  });

  test("a pending invitation cannot be activated through update (client-side state manipulation)", async () => {
    const r = await upd("m2", { status: "active" });
    expect(r.statusCode).toBe(409);
    expect(store.teams.m2.status).toBe("invited");
    expect(writes).toHaveLength(0);
  });

  test("valid transitions work; invalid ones are rejected", async () => {
    expect((await upd("m1", { status: "suspended" })).statusCode).toBe(200);
    expect((await upd("m1", { status: "active" })).statusCode).toBe(200);
    expect((await upd("m1", { status: "invited" })).statusCode).toBe(409);
    expect((await upd("m3", { status: "active" })).statusCode).toBe(200);
    expect((await upd("m4", { status: "active" })).statusCode).toBe(409);
    expect((await upd("m4", { role: "manager" })).statusCode).toBe(409);
  });

  test("role must come from the server catalogue", async () => {
    expect((await upd("m1", { role: "owner" })).statusCode).toBe(400);
    expect((await upd("m1", { role: "manager" })).statusCode).toBe(200);
  });

  test("permissions: unknown keys, non-boolean values and non-object rejected", async () => {
    expect((await upd("m1", { permissions: { isAdmin: true } })).statusCode).toBe(400);
    expect((await upd("m1", { permissions: { canListCars: "yes" } })).statusCode).toBe(400);
    expect((await upd("m1", { permissions: [] })).statusCode).toBe(400);
    expect((await upd("m1", { permissions: { canListCars: true } })).statusCode).toBe(200);
  });

  test("no privilege expansion: a non-owner cannot grant a permission they lack", async () => {
    const delegate = { isOwner: false, permissions: { canManageTeam: true, canListCars: true } };
    const asDelegate = (body) => call(ctrl.updateTeamMember, { user: { id: "u7", role: "user", email: "m@x.test" }, dealerId: D1, dealerOrg: delegate, params: { memberId: "m1" }, body });
    expect((await asDelegate({ permissions: { canViewEarnings: true } })).statusCode).toBe(403);
    expect((await asDelegate({ permissions: { canListCars: true } })).statusCode).toBe(200);
  });

  test("self change/removal blocked", async () => {
    const self = { ...dealerUser("u2", { role: "user" }) };
    const r = await call(ctrl.updateTeamMember, { user: self, dealerId: D1, dealerOrg: org, params: { memberId: "m1" }, body: { role: "manager" } });
    expect(r.statusCode).toBe(403);
    const r2 = await call(ctrl.removeTeamMember, { user: self, dealerId: D1, dealerOrg: org, params: { memberId: "m1" } });
    expect(r2.statusCode).toBe(403);
  });

  test("remove: clears invite token, is idempotent-safe (second remove 409), response has no token hash", async () => {
    const r = await rm("m2");
    expect(r.statusCode).toBe(200);
    expect(store.teams.m2.inviteTokenHash).toBeNull();
    expect(JSON.stringify(r.body)).not.toMatch(/SECRETHASH/);
    expect((await rm("m2")).statusCode).toBe(409);
  });

  test("audit trail for team changes contains no token hash", async () => {
    await upd("m1", { role: "manager" });
    await rm("m2");
    expect(JSON.stringify(audit)).not.toMatch(/SECRETHASH|inviteTokenHash/);
    expect(audit.map((a) => a.action)).toEqual(expect.arrayContaining(["dealer_team_member_updated", "dealer_team_member_removed"]));
  });

  test("invite: validation, own-email refusal, duplicate 409, response has no token material", async () => {
    const inv = (body) => call(ctrl.inviteTeamMember, { user: dealerUser(), dealerId: D1, dealerOrg: org, body });
    expect((await inv({ email: "nope" })).statusCode).toBe(400);
    expect((await inv({ email: "OWNER@amani.test", role: "viewer" })).statusCode).toBe(400);
    expect((await inv({ email: "z@amani.test", role: "root" })).statusCode).toBe(400);
    expect((await inv({ email: "a@amani.test", role: "viewer" })).statusCode).toBe(409);
    const ok = await inv({ email: "New@Amani.test", role: "viewer" });
    expect(ok.statusCode).toBe(201);
    expect(ok.body.data.inviteEmail).toBe("new@amani.test");
    expect(ok.body.data.status).toBe("invited");
    expect(JSON.stringify(ok.body)).not.toMatch(/inviteTokenHash|inviteToken"/);
  });
});

describe("route wiring (source assertions: guard order, limiter, optionalAuth)", () => {
  const src = fs.readFileSync(new URL("../../routes/dealerPlatformRoutes.js", import.meta.url), "utf8");
  test("profile PUT requires protect + rate limiter before the handler; GET uses optionalAuth (not public-anonymous-only)", () => {
    expect(src).toMatch(/router\.put\("\/profile\/:dealerId", protect, createLimiter, stepUpLimiter, asyncHandler\(updateDealerProfile\)\)/);
    expect(src).toMatch(/router\.get\("\/profile\/:dealerId", optionalAuth, asyncHandler\(getDealerProfile\)\)/);
  });
  test("team routes keep dealerOrgAccess permission guards", () => {
    expect(src).toMatch(/team\/invite", protect, dealerOrgAccess\("canManageTeam"\)/);
    expect(src).toMatch(/team\/:memberId", protect, dealerOrgAccess\("canManageTeam"\), createLimiter, asyncHandler\(updateTeamMember\)/);
    expect(src).toMatch(/router\.delete\("\/team\/:memberId", protect, dealerOrgAccess\("canManageTeam"\), createLimiter/);
  });
});

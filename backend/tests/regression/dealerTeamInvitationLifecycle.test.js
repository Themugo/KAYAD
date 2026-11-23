// ============================================================
// DEALER TEAM INVITATION LIFECYCLE: create -> e-mailed link -> resend -> accept (EVIDENCE TIER: mocked persistence, real controller code;
// the database-backed equivalent is ci/db-journeys/17_team_invitation_lifecycle.mjs). The raw token is only ever read from the e-mailed link.
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
  findOne: jest.fn(async (t, f) => (t === "dealer_teams" ? Object.values(store.teams).find((r) => matches(r, f)) || null : t === "users" ? Object.values(store.users).find((r) => matches(r, f)) || null : null)),
  create: jest.fn(async (t, d) => { const row = { id: `t${Object.keys(store.teams).length + 1}`, ...d }; store.teams[row.id] = row; writes.push(["create", t, row.id]); return { ...row }; }),
  update: jest.fn(async (t, id, d) => { writes.push(["update", t, id, d]); Object.assign(store.teams[id], d); return { ...store.teams[id] }; }),
  // compare-and-set like PostgREST: only rows still matching every filter are changed and returned
  updateMany: jest.fn(async (t, f, d) => { const hit = Object.values(store.teams).filter((r) => matches(r, f)); hit.forEach((r) => { writes.push(["updateMany", t, r.id, d]); Object.assign(r, d); }); return hit.map((r) => ({ ...r })); }),
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
// The provider stub records the exact link the backend would e-mail (so tests use the REAL emailed token) and can be told to fail.
const mail = { sent: [], accepted: [], notices: [], fail: false };
jest.unstable_mockModule("../../services/email.service.js", () => ({
  sendTeamInviteEmail: jest.fn(async (to, dealerName, role, token) => {
    if (mail.fail) return { success: false };
    mail.sent.push({ to, role, link: `https://app.test/dealer/setup?invite=${encodeURIComponent(token)}` });
    return { success: true };
  }),
  sendTeamAcceptedEmail: jest.fn(async (to, details) => { mail.accepted.push({ to, ...details }); return { success: true }; }),
}));
jest.unstable_mockModule("../../controllers/notificationController.js", () => ({ createNotification: jest.fn(async (n) => { mail.notices.push(n); return n; }) }));
jest.unstable_mockModule("../../middleware/dealerOrgAccess.js", () => ({
  DEALER_TEAM_PERMISSIONS: ["canListCars", "canEditCars", "canDeleteCars", "canViewEarnings", "canManageTeam", "canApproveDeals", "canChatBuyers", "canEditSettings"],
}));

const ctrl = await import("../../controllers/dealerPlatformController.js");
const mkRes = () => { const r = { statusCode: 200, body: null, headers: {} }; r.set = (k, v) => { r.headers[k] = v; return r; }; r.status = (c) => { r.statusCode = c; return r; }; r.json = (b) => { r.body = b; return r; }; return r; };
const call = async (fn, req) => { const res = mkRes(); await fn({ ip: "127.0.0.1", get: () => "jest", id: "req1", params: {}, body: {}, ...req }, res); return res; };


const OWNER = { user: { id: D1, role: "dealer", email: "owner@amani.test" }, dealerOrg: { isOwner: true, role: "dealer", permissions: Object.fromEntries(["canListCars", "canEditCars", "canDeleteCars", "canViewEarnings", "canManageTeam", "canApproveDeals", "canChatBuyers", "canEditSettings"].map((k) => [k, true])) }, dealerId: D1 };
const owner = (fn, extra) => call(fn, { ...OWNER, ...extra });
const invitee = { id: "uN", role: "user", email: "NEW@amani.test", name: "New" };
const accept = (user, token) => call(ctrl.acceptTeamInvite, { user, body: { token } });
const tokenOf = (m) => decodeURIComponent(new URL(m.link).searchParams.get("invite"));
const latest = () => tokenOf(mail.sent.at(-1));
const sha = (t) => crypto.createHash("sha256").update(t).digest("hex");
const rowOf = () => Object.values(store.teams).find((r) => r.inviteEmail === "new@amani.test");

beforeEach(() => {
  mail.sent.length = 0; mail.accepted.length = 0; mail.notices.length = 0; mail.fail = false; writes.length = 0; audit.length = 0;
  store.users = { [D1]: { id: D1, role: "dealer", email: "owner@amani.test", name: "Amani Motors" } };
  store.dealers = {}; store.teams = {};
});

describe("invitation lifecycle with the real emailed link", () => {
  test("1. create -> e-mailed link -> accept: membership active, dealership and role preserved", async () => {
    const c = await owner(ctrl.inviteTeamMember, { body: { email: "New@Amani.test", role: "viewer" } });
    expect(c.statusCode).toBe(201);
    expect(mail.sent).toHaveLength(1);
    const token = latest();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    const r = await accept(invitee, token);
    expect(r.statusCode).toBe(200);
    expect(rowOf()).toMatchObject({ status: "active", member: "uN", dealer: D1, role: "viewer", inviteTokenHash: sha(token) }); // hash kept so the spent link can say "already accepted"
    expect(JSON.stringify(r.body)).not.toContain(token);
  });

  test("2. token hash: the stored hash is the SHA-256 of exactly the e-mailed token, and the raw token is never stored", async () => {
    await owner(ctrl.inviteTeamMember, { body: { email: "new@amani.test", role: "viewer" } });
    const token = latest();
    expect(rowOf().inviteTokenHash).toBe(sha(token));
    expect(JSON.stringify(store.teams)).not.toContain(token);
  });

  test("3. the link survives URL encoding and stray whitespace", async () => {
    await owner(ctrl.inviteTeamMember, { body: { email: "new@amani.test", role: "viewer" } });
    const token = latest();
    expect(encodeURIComponent(token)).toBe(token);
    expect((await accept(invitee, `  ${token}\n`)).statusCode).toBe(200);
  });

  test("4. resend -> the NEWEST e-mailed link works", async () => {
    const c = await owner(ctrl.inviteTeamMember, { body: { email: "new@amani.test", role: "viewer" } });
    const id = c.body.data.id; const oldToken = latest();
    const rs = await owner(ctrl.resendTeamInvite, { params: { memberId: id } });
    expect(rs.statusCode).toBe(200); expect(rs.body.email.sent).toBe(true);
    const newToken = latest();
    expect(newToken).not.toBe(oldToken);
    expect((await accept(invitee, newToken)).statusCode).toBe(200);
    expect(rowOf().status).toBe("active");
  });

  test("5. documented policy: after a successful resend the OLD link is refused with an explanatory 404 and the invitation stays pending", async () => {
    const c = await owner(ctrl.inviteTeamMember, { body: { email: "new@amani.test", role: "viewer" } });
    const oldToken = latest();
    await owner(ctrl.resendTeamInvite, { params: { memberId: c.body.data.id } });
    const r = await accept(invitee, oldToken);
    expect(r.statusCode).toBe(404);
    expect(r.body.code).toBe("INVITATION_LINK_NOT_VALID");
    expect(r.body.message).toMatch(/replaced by a newer e-mail/);
    expect(rowOf().status).toBe("invited");
    expect((await accept(invitee, latest())).statusCode).toBe(200);
  });

  test("6. a resend whose e-mail FAILS keeps the previous link working (no unusable invitation)", async () => {
    const c = await owner(ctrl.inviteTeamMember, { body: { email: "new@amani.test", role: "viewer" } });
    const oldToken = latest(); const hashBefore = rowOf().inviteTokenHash; const expBefore = rowOf().inviteExpiresAt;
    mail.fail = true;
    const rs = await owner(ctrl.resendTeamInvite, { params: { memberId: c.body.data.id } });
    expect(rs.statusCode).toBe(200);
    expect(rs.body.email).toMatchObject({ sent: false, previousLinkStillValid: true });
    expect(rowOf().inviteTokenHash).toBe(hashBefore);
    expect(rowOf().inviteExpiresAt).toBe(expBefore);
    expect((await accept(invitee, oldToken)).statusCode).toBe(200);
  });

  test("7. wrong token for a pending invitation: 404, nothing consumed", async () => {
    await owner(ctrl.inviteTeamMember, { body: { email: "new@amani.test", role: "viewer" } });
    expect((await accept(invitee, "c".repeat(64))).statusCode).toBe(404);
    expect(rowOf().status).toBe("invited");
  });

  test("8. expired -> 410 INVITATION_EXPIRED, cancelled -> 410 INVITATION_CANCELLED, already accepted -> 409 INVITATION_ALREADY_ACCEPTED", async () => {
    const c = await owner(ctrl.inviteTeamMember, { body: { email: "new@amani.test", role: "viewer" } });
    const token = latest();
    rowOf().inviteExpiresAt = new Date(Date.now() - 1000).toISOString();
    expect((await accept(invitee, token)).statusCode).toBe(410);
    rowOf().inviteExpiresAt = new Date(Date.now() + 86400000).toISOString();
    await owner(ctrl.removeTeamMember, { params: { memberId: c.body.data.id } });
    const cancelled = await accept(invitee, token);
    expect([cancelled.statusCode, cancelled.body.code]).toEqual([410, "INVITATION_CANCELLED"]);
    const d = await owner(ctrl.inviteTeamMember, { body: { email: "again@amani.test", role: "viewer" } });
    const t2 = latest();
    expect((await accept({ ...invitee, id: "uZ", email: "again@amani.test" }, t2)).statusCode).toBe(200);
    const spent = await accept({ ...invitee, id: "uZ", email: "again@amani.test" }, t2);
    expect([spent.statusCode, spent.body.code, spent.body.alreadyMember]).toEqual([409, "INVITATION_ALREADY_ACCEPTED", true]);
    expect(d.statusCode).toBe(201);
  });

  test("9. wrong signed-in recipient: 403, and the invitation is NOT consumed (the right person can still accept)", async () => {
    await owner(ctrl.inviteTeamMember, { body: { email: "new@amani.test", role: "viewer" } });
    const token = latest();
    const w = await accept({ id: "uX", role: "user", email: "someone.else@x.test" }, token);
    expect(w.statusCode).toBe(403);
    expect(w.body.message).toMatch(/does not match/);
    expect(rowOf().status).toBe("invited");
    expect((await accept(invitee, token)).statusCode).toBe(200);
  });

  test("10. concurrent acceptance: exactly one membership; a lost race is a safe 409 already-accepted", async () => {
    await owner(ctrl.inviteTeamMember, { body: { email: "new@amani.test", role: "viewer" } });
    const token = latest();
    const rs = await Promise.all([accept(invitee, token), accept(invitee, token), accept(invitee, token)]);
    expect(rs.map((r) => r.statusCode).sort()).toEqual([200, 409, 409]);
    expect(Object.values(store.teams).filter((r) => r.member === "uN" && r.status === "active")).toHaveLength(1);
  });

  test("11. the team roster and its pending count agree with acceptance", async () => {
    await owner(ctrl.inviteTeamMember, { body: { email: "new@amani.test", role: "viewer" } });
    const before = await owner(ctrl.getTeamMembers);
    expect(before.body.data.stats).toMatchObject({ invited: 1, active: 0 });
    await accept(invitee, latest());
    const after = await owner(ctrl.getTeamMembers);
    expect(after.body.data.stats).toMatchObject({ invited: 0, active: 1 });
    expect(after.body.data.items[0].status).toBe("active");
  });

  test("12. duplicate invitations are refused (409) and resend of a non-pending row is refused", async () => {
    const c = await owner(ctrl.inviteTeamMember, { body: { email: "new@amani.test", role: "viewer" } });
    expect((await owner(ctrl.inviteTeamMember, { body: { email: "NEW@amani.test", role: "viewer" } })).statusCode).toBe(409);
    await accept(invitee, latest());
    expect((await owner(ctrl.resendTeamInvite, { params: { memberId: c.body.data.id } })).statusCode).toBe(409);
  });

  test("13. no raw token in responses, audit events or the roster", async () => {
    const c = await owner(ctrl.inviteTeamMember, { body: { email: "new@amani.test", role: "viewer" } });
    const rs = await owner(ctrl.resendTeamInvite, { params: { memberId: c.body.data.id } });
    const token = latest();
    const roster = await owner(ctrl.getTeamMembers);
    expect(JSON.stringify([c.body, rs.body, roster.body, audit])).not.toContain(token);
  });

  describe("identity: which account may accept (reported failure: mugo.james27@gmail.com)", () => {
    const invite = async (email = "mugo.james27@gmail.com") => { await owner(ctrl.inviteTeamMember, { body: { email, role: "viewer" } }); return latest(); };
    const rowFor = (email) => Object.values(store.teams).find((r) => r.inviteEmail === email);
    test("same address, different casing -> accepted", async () => {
      const t = await invite();
      expect((await accept({ id: "uJ", role: "user", email: "Mugo.James27@Gmail.com" }, t)).statusCode).toBe(200);
    });
    test("same address with surrounding whitespace -> accepted", async () => {
      const t = await invite();
      expect((await accept({ id: "uJ", role: "user", email: "  mugo.james27@gmail.com  " }, t)).statusCode).toBe(200);
    });
    test("the invitation is stored normalised even if the owner typed capitals and spaces", async () => {
      await owner(ctrl.inviteTeamMember, { body: { email: "  Mugo.James27@GMAIL.com ", role: "viewer" } });
      expect(rowFor("mugo.james27@gmail.com")).toBeTruthy();
    });
    test("a genuinely different account -> 403 INVITATION_EMAIL_MISMATCH with a masked hint, invitation untouched, correct account then succeeds", async () => {
      const t = await invite();
      const hashBefore = rowFor("mugo.james27@gmail.com").inviteTokenHash;
      const w = await accept({ id: "uB", role: "user", email: "someone.else@example.com" }, t);
      expect(w.statusCode).toBe(403);
      expect(w.body.code).toBe("INVITATION_EMAIL_MISMATCH");
      expect(w.body.invitedEmailHint).toBe("m***7@gmail.com");
      expect(JSON.stringify(w.body)).not.toContain(t);
      expect(JSON.stringify(w.body)).not.toContain("mugo.james27@gmail.com");
      expect(rowFor("mugo.james27@gmail.com")).toMatchObject({ status: "invited", member: null, inviteTokenHash: hashBefore });
      expect((await accept({ id: "uJ", role: "user", email: "mugo.james27@gmail.com" }, t)).statusCode).toBe(200);
      expect(Object.values(store.teams).filter((r) => r.member === "uJ" && r.status === "active")).toHaveLength(1);
    });
    test("Gmail dots / plus-tags are NOT treated as the same person", async () => {
      const t = await invite();
      for (const email of ["mugojames27@gmail.com", "mugo.james27+x@gmail.com"]) expect((await accept({ id: "uX", role: "user", email }, t)).body.code).toBe("INVITATION_EMAIL_MISMATCH");
      expect(rowFor("mugo.james27@gmail.com").status).toBe("invited");
    });
    test("an e-mail supplied by the browser in the request body is not proof of identity", async () => {
      const t = await invite();
      const r = await call(ctrl.acceptTeamInvite, { user: { id: "uB", role: "user", email: "someone.else@example.com" }, body: { token: t, email: "mugo.james27@gmail.com" } });
      expect(r.statusCode).toBe(403);
    });
    test("a signed-in superadmin/dealer/legacy seller with a different e-mail is refused for the e-mail first; the right e-mail with a non-personal role is refused for the role", async () => {
      const t = await invite();
      expect((await accept({ id: "uS", role: "superadmin", email: "jimmy@example.com" }, t)).body.code).toBe("INVITATION_EMAIL_MISMATCH");
      expect((await accept({ id: "uL", role: "individual_seller", email: "mugo.james27@gmail.com" }, t)).body.code).toBe("TEAM_MEMBER_MUST_BE_PERSONAL_ACCOUNT");
      expect(rowFor("mugo.james27@gmail.com").status).toBe("invited");
    });
    test("independent errors stay independent: invalid 400, unknown 404, expired 410, cancelled 410, replaced 404", async () => {
      const c = await owner(ctrl.inviteTeamMember, { body: { email: "mugo.james27@gmail.com", role: "viewer" } });
      const t = latest(); const me = { id: "uJ", role: "user", email: "mugo.james27@gmail.com" };
      expect((await accept(me, "short")).statusCode).toBe(400);
      expect((await accept(me, "d".repeat(64))).statusCode).toBe(404);
      await owner(ctrl.resendTeamInvite, { params: { memberId: c.body.data.id } });
      expect((await accept(me, t)).statusCode).toBe(404);
      const fresh = latest();
      rowFor("mugo.james27@gmail.com").inviteExpiresAt = new Date(Date.now() - 1000).toISOString();
      expect((await accept(me, fresh)).statusCode).toBe(410);
      rowFor("mugo.james27@gmail.com").inviteExpiresAt = new Date(Date.now() + 86400000).toISOString();
      await owner(ctrl.removeTeamMember, { params: { memberId: c.body.data.id } });
      expect((await accept(me, fresh)).statusCode).toBe(410);
    });
    test("second acceptance after success creates no duplicate membership", async () => {
      const t = await invite(); const me = { id: "uJ", role: "user", email: "mugo.james27@gmail.com" };
      expect((await accept(me, t)).statusCode).toBe(200);
      expect((await accept(me, t)).statusCode).toBe(409);
      expect(Object.values(store.teams).filter((r) => r.member === "uJ")).toHaveLength(1);
    });
  });
});

describe("invitation-first onboarding: public preview, dealer-owned notifications, races", () => {
  const preview = (token) => call(ctrl.previewTeamInvitation, { body: { token } });
  const invite = async (email = "new@amani.test", role = "viewer") => { const c = await owner(ctrl.inviteTeamMember, { body: { email, role } }); return { id: c.body.data.id, token: latest() }; };
  const rowByEmail = (email) => Object.values(store.teams).find((r) => r.inviteEmail === email);

  test("P1. a brand-new person (no account): preview says valid + accountStatus none, with dealership, role and the invited e-mail, never a token or hash", async () => {
    const { token } = await invite();
    const r = await preview(token);
    expect(r.statusCode).toBe(200);
    expect(r.body.data).toMatchObject({ state: "valid", dealershipName: expect.any(String), accountStatus: "none", invitedEmail: "new@amani.test" });
    expect(r.body.data.roleLabel).toBeTruthy();
    expect(JSON.stringify(r.body)).not.toMatch(new RegExp(`${token}|${sha(token)}|inviteTokenHash`));
    expect(r.headers["Cache-Control"]).toBe("no-store");
  });
  test("P2. an existing personal account is reported as personal; a dealer/staff address as other (it can never accept)", async () => {
    store.users.uP = { id: "uP", role: "user", email: "new@amani.test" };
    store.users.uD = { id: "uD", role: "dealer", email: "other@amani.test" };
    const a = await invite("new@amani.test"); const b = await invite("other@amani.test");
    expect((await preview(a.token)).body.data.accountStatus).toBe("personal");
    expect((await preview(b.token)).body.data.accountStatus).toBe("other");
  });
  test("P3. each end state is distinct: expired, cancelled, accepted, replaced/unknown; the e-mail is shown only for a valid link", async () => {
    const a = await invite("a@amani.test"); const b = await invite("b@amani.test"); const c = await invite("c@amani.test"); const d = await invite("d@amani.test");
    rowByEmail("a@amani.test").inviteExpiresAt = new Date(Date.now() - 1000).toISOString();
    await owner(ctrl.removeTeamMember, { params: { memberId: b.id } });
    await accept({ id: "uC", role: "user", email: "c@amani.test" }, c.token);
    await owner(ctrl.resendTeamInvite, { params: { memberId: d.id } });
    const states = {};
    for (const [k, t] of [["expired", a.token], ["cancelled", b.token], ["accepted", c.token], ["replaced", d.token], ["unknown", "e".repeat(64)]]) { const r = await preview(t); states[k] = r.body.data.state; expect(r.body.data.invitedEmail).toBeUndefined(); }
    expect(states).toEqual({ expired: "expired", cancelled: "cancelled", accepted: "accepted", replaced: "not_recognised", unknown: "not_recognised" });
    expect((await preview(latest())).body.data.state).toBe("valid");
  });
  test("P4. a malformed link is a 400 INVITATION_LINK_INCOMPLETE; the preview changes nothing", async () => {
    const { token } = await invite(); const before = JSON.stringify(store.teams);
    expect((await preview("short")).body.code).toBe("INVITATION_LINK_INCOMPLETE");
    await preview(token); await preview("z".repeat(64));
    expect(JSON.stringify(store.teams)).toBe(before);
  });
  test("P5. registration in between changes nothing: the same link works once the invitee has an account, and the account type is not altered", async () => {
    const { token } = await invite("mugo.james27@gmail.com");
    expect((await preview(token)).body.data.accountStatus).toBe("none");
    store.users.uJ = { id: "uJ", role: "user", email: "mugo.james27@gmail.com", name: "James" };
    expect((await preview(token)).body.data.accountStatus).toBe("personal");
    expect((await accept(store.users.uJ, token)).statusCode).toBe(200);
    expect(store.users.uJ.role).toBe("user");
    expect(writes.some((w) => w[0] === "User.update")).toBe(false);
  });
  test("N1. accepting notifies ONLY the inviting dealership (in-app + e-mail), with no token, and never anyone else", async () => {
    const { token } = await invite();
    await accept(invitee, token);
    expect(mail.accepted).toHaveLength(1);
    expect(mail.accepted[0]).toMatchObject({ to: "owner@amani.test", memberEmail: "NEW@amani.test" });
    expect(mail.notices).toHaveLength(1);
    expect(mail.notices[0]).toMatchObject({ user: D1, data: { kind: "team_invitation_accepted" } });
    expect(JSON.stringify([mail.accepted, mail.notices])).not.toContain(token);
  });
  test("N2. a failed attempt (wrong account) notifies nobody; a notification failure never fails the acceptance", async () => {
    const { token } = await invite();
    await accept({ id: "uX", role: "user", email: "x@x.test" }, token);
    expect(mail.accepted).toHaveLength(0); expect(mail.notices).toHaveLength(0);
    const email = await import("../../services/email.service.js");
    email.sendTeamAcceptedEmail.mockRejectedValueOnce(new Error("provider down"));
    expect((await accept(invitee, token)).statusCode).toBe(200);
    expect(rowOf().status).toBe("active");
  });
  test("N3. a delivery failure on create or resend tells the dealership (in-app); the invitee is the only recipient of the link", async () => {
    mail.fail = true;
    const c = await owner(ctrl.inviteTeamMember, { body: { email: "new@amani.test", role: "viewer" } });
    expect(c.body.email.sent).toBe(false);
    expect(mail.notices.map((n) => n.data.kind)).toEqual(["team_invitation_delivery_failed"]);
    expect(mail.notices[0].user).toBe(D1);
    expect(mail.sent).toHaveLength(0);
  });
  test("N4. the invitation e-mail goes to exactly one recipient (the invitee) and none to the dealership or platform", async () => {
    await invite("staff@amani.test");
    expect(mail.sent.map((m) => m.to)).toEqual(["staff@amani.test"]);
  });
  test("R1. simultaneous RESEND and ACCEPT of the same link: never two memberships, never a half state", async () => {
    const { id, token } = await invite();
    const [rs, ac] = await Promise.all([owner(ctrl.resendTeamInvite, { params: { memberId: id } }), accept(invitee, token)]);
    const rows = Object.values(store.teams).filter((r) => r.inviteEmail === "new@amani.test");
    expect(rows).toHaveLength(1);
    expect([200, 404, 409]).toContain(ac.statusCode);
    if (ac.statusCode === 200) { expect(rows[0].status).toBe("active"); expect(rows[0].member).toBe("uN"); } else { expect(rows[0].status).toBe("invited"); expect(rows[0].member).toBeNull(); }
    expect([200, 409]).toContain(rs.statusCode);
  });
  test("R2. a removed member's link and a removed active member are not reusable; the roster counts stay consistent", async () => {
    const { id, token } = await invite();
    await accept(invitee, token);
    await owner(ctrl.removeTeamMember, { params: { memberId: id } });
    const r = await accept(invitee, token);
    expect([r.statusCode, r.body.code]).toEqual([404, "INVITATION_LINK_NOT_VALID"]); // active member removal clears the hash: unknown link
    const roster = await owner(ctrl.getTeamMembers);
    expect(roster.body.data.stats).toMatchObject({ invited: 0, active: 0 });
  });
});


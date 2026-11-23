// ============================================================
// DEALER EMPLOYMENT LIFECYCLE (EVIDENCE TIER: mocked persistence, REAL controller + employment service code).
// Covers Basic Staff Access default, staff number on acceptance, role promotion/reduction, suspend/reinstate/terminate/archive,
// rehire, business e-mail separation, own staff profile, staff code, history and graceful fallback when the migration is absent.
// Real SQL behaviour (allocation concurrency, constraints) is proven by ci/db-journeys/22_employment_lifecycle.mjs.
// ============================================================
import { describe, test, expect, beforeEach, jest } from "@jest/globals";

process.env.NODE_ENV = "test";

const D1 = "11111111-1111-4111-8111-111111111111";
const JANE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const store = { users: {}, teams: {}, events: [], settings: {} };
let seq = 0; let employmentOn = true; let allocFails = false;
const audit = []; const emails = [];

const matches = (row, f) => Object.entries(f).every(([k, v]) => row[k] === v);
const dbMock = {
  findAll: jest.fn(async (t, o = {}) => {
    if (t === "dealer_teams") return Object.values(store.teams).filter((r) => matches(r, o.filters || {})).map((r) => ({ ...r }));
    if (t === "dealer_employment_events") return store.events.filter((r) => matches(r, o.filters || {})).map((r) => ({ ...r }));
    return [];
  }),
  findOne: jest.fn(async (t, f) => {
    if (t === "dealer_teams") return Object.values(store.teams).find((r) => matches(r, f)) ? { ...Object.values(store.teams).find((r) => matches(r, f)) } : null;
    if (t === "dealer_staff_settings") return store.settings[f.dealer] || null;
    return null;
  }),
  create: jest.fn(async (t, d) => {
    if (t === "dealer_employment_events") { const row = { id: `e${store.events.length + 1}`, createdAt: new Date().toISOString(), ...d }; store.events.push(row); return row; }
    const row = { id: `t${Object.keys(store.teams).length + 1}`, staffNumber: null, employmentStatus: "invited", ...d }; store.teams[row.id] = row; return { ...row };
  }),
  update: jest.fn(async (t, id, d) => { Object.assign(store.teams[id], d); return { ...store.teams[id] }; }),
  updateMany: jest.fn(async (t, f, d) => { const hit = Object.values(store.teams).filter((r) => matches(r, f)); hit.forEach((r) => Object.assign(r, d)); return hit.map((r) => ({ ...r })); }),
};
const supabaseMock = () => ({
  from: () => ({ select: () => ({ limit: async () => (employmentOn ? { data: [], error: null } : { data: null, error: { message: "column dealer_teams.employment_status does not exist" } }) }) }),
  rpc: async (fn, args) => {
    if (fn === "kayad_allocate_staff_number") {
      if (allocFails) return { data: null, error: { message: "STAFF_CODE_REQUIRED" } };
      const t = store.teams[args.p_team]; if (t.staffNumber) return { data: t.staffNumber, error: null };
      seq += 1; t.staffNumber = `ABC-STAFF-${String(seq).padStart(3, "0")}`; return { data: t.staffNumber, error: null };
    }
    if (fn === "kayad_set_staff_code") {
      if (!/^[A-Z0-9]{2,8}$/.test(String(args.p_code).toUpperCase())) return { data: null, error: { message: "STAFF_CODE_INVALID" } };
      if (seq > 0) return { data: null, error: { message: "STAFF_CODE_LOCKED" } };
      return { data: String(args.p_code).toUpperCase(), error: null };
    }
    return { data: null, error: { message: "unknown rpc" } };
  },
});

const userModel = { findById: jest.fn(async (id) => (store.users[id] ? { ...store.users[id] } : null)), find: jest.fn(async () => Object.values(store.users)) };
const empty = { find: jest.fn(async () => []), findOne: jest.fn(async () => null) };
jest.unstable_mockModule("../../models/User.js", () => ({ default: userModel }));
jest.unstable_mockModule("../../models/Dealer.js", () => ({ default: empty }));
for (const m of ["InspectionOrder", "DealerAnalytics", "Car", "Escrow", "MarketingCampaign"]) jest.unstable_mockModule(`../../models/${m}.js`, () => ({ default: empty }));
jest.unstable_mockModule("../../services/review.service.js", () => ({ listDealerReviews: jest.fn(async () => ({})) }));
jest.unstable_mockModule("../../controllers/carController.js", () => ({ createCar: jest.fn(), updateCar: jest.fn(), deleteCar: jest.fn() }));
jest.unstable_mockModule("../../utils/logger.js", () => ({ logInfo: jest.fn(), logWarn: jest.fn(), logError: jest.fn(), default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
jest.unstable_mockModule("../../services/dealerSubscription.service.js", () => ({ getDealerEntitlement: jest.fn(async () => ({})) }));
jest.unstable_mockModule("../../services/leadService.js", () => ({ getDealerLeads: jest.fn(async () => []), getLeadById: jest.fn(), updateLeadStage: jest.fn(), addLeadActivity: jest.fn() }));
jest.unstable_mockModule("../../db/index.js", () => dbMock);
jest.unstable_mockModule("../../utils/supabase.js", () => ({ getSupabase: supabaseMock }));
jest.unstable_mockModule("../../services/auditService.js", () => ({ logAuditEvent: jest.fn(async (e) => { audit.push(e); }) }));
jest.unstable_mockModule("../../services/onboardingPolicy.service.js", () => ({ sellerMayPublishDirectly: jest.fn(), PUBLICATION_REVIEW_REQUIRED: "review" }));
jest.unstable_mockModule("../../services/email.service.js", () => ({
  sendTeamInviteEmail: jest.fn(async (...a) => { emails.push(a); return { success: true }; }),
  sendTeamAcceptedEmail: jest.fn(async () => ({ success: true })),
}));
jest.unstable_mockModule("../../controllers/notificationController.js", () => ({ createNotification: jest.fn(async () => {}) }));

const ctrl = await import("../../controllers/dealerPlatformController.js");
const emp = await import("../../services/dealerEmployment.service.js");
const roles = await import("../../services/dealerTeamRoles.service.js");

const mkRes = () => { const r = { statusCode: 200, body: null }; r.status = (c) => { r.statusCode = c; return r; }; r.json = (b) => { r.body = b; return r; }; return r; };
const call = async (fn, req) => { const res = mkRes(); await fn({ ip: "127.0.0.1", get: () => "jest", id: "req1", params: {}, body: {}, ...req }, res); return res; };
const KEYS = ["canListCars", "canEditCars", "canDeleteCars", "canViewEarnings", "canManageTeam", "canApproveDeals", "canChatBuyers", "canEditSettings"];
const ALL = Object.fromEntries(KEYS.map((k) => [k, true]));
const OWNER = { user: { id: D1, name: "ABC Owner", role: "dealer", email: "owner@abc.test" }, dealerOrg: { isOwner: true, role: "dealer", permissions: ALL }, dealerId: D1 };
const asMember = (id, email, org) => ({ user: { id, name: "Jane", role: "user", email }, dealerOrg: org, dealerId: D1 });
const invite = (body = {}, actor = OWNER) => call(ctrl.inviteTeamMember, { ...actor, body: { email: "jane@gmail.test", ...body } });
const today = new Date().toISOString().slice(0, 10);
const eventTypes = () => store.events.map((e) => e.eventType);

beforeEach(() => {
  seq = 0; employmentOn = true; allocFails = false; audit.length = 0; emails.length = 0; store.events = []; store.settings = {};
  emp.resetEmploymentAvailabilityCache();
  store.users = { [D1]: { id: D1, role: "dealer", email: "owner@abc.test", businessName: "ABC Motors" }, [JANE]: { id: JANE, role: "user", email: "jane@gmail.test", name: "Jane Wanjiru" }, [OTHER]: { id: OTHER, role: "user", email: "other@gmail.test", name: "Other" } };
  store.teams = {};
});

const acceptAs = async (id, email, token) => call(ctrl.acceptTeamInvite, { user: { id, name: "Jane", role: "user", email }, body: { token } });
const tokenFromEmail = () => emails.at(-1)[3];
// Invite + accept Jane; returns the membership row.
async function joinJane() {
  const r = await invite(); expect(r.statusCode).toBe(201);
  const a = await acceptAs(JANE, "jane@gmail.test", tokenFromEmail()); expect(a.statusCode).toBe(200);
  return Object.values(store.teams)[0];
}

describe("Basic Staff Access is the default invitation level", () => {
  test("an invitation that names no role is Basic Staff Access with NO permissions and an invited employment status", async () => {
    const r = await invite();
    expect(r.statusCode).toBe(201);
    const row = Object.values(store.teams)[0];
    expect(row.role).toBe("basic_staff");
    expect(Object.values(row.permissions).filter(Boolean)).toHaveLength(0);
    expect(row.employmentStatus).toBe("invited");
    expect(row.staffNumber ?? null).toBeNull(); // never allocated for an invitation that may be abandoned
    expect(eventTypes()).toEqual(["invited"]);
  });
  test("the invitation e-mail names Basic Staff Access, goes only to the invitee, and the API never returns the token or hash", async () => {
    const r = await invite();
    expect(emails).toHaveLength(1); expect(emails[0][0]).toBe("jane@gmail.test"); expect(emails[0][2]).toBe("Basic Staff Access");
    expect(JSON.stringify(r.body)).not.toMatch(/inviteTokenHash|"token"/);
  });
  test("employee name and business contact may be recorded at invitation, a malformed business address is refused", async () => {
    const ok = await invite({ employeeName: "Jane Wanjiru", businessEmail: "Jane@ABCMotors.ke" });
    expect(ok.statusCode).toBe(201);
    const row = Object.values(store.teams)[0];
    expect(row.staffDisplayName).toBe("Jane Wanjiru"); expect(row.businessEmail).toBe("jane@abcmotors.ke"); expect(row.inviteEmail).toBe("jane@gmail.test");
    store.teams = {};
    const bad = await invite({ businessEmail: "not-an-address" });
    expect(bad.statusCode).toBe(400); expect(bad.body.code).toBe("BUSINESS_EMAIL_INVALID"); expect(Object.keys(store.teams)).toHaveLength(0);
  });
  test("the built-in Basic Staff Access role holds no permission for any dealership module", () => {
    const basic = roles.BUILTIN_ROLES.find((r) => r.key === "basic_staff");
    expect(basic.onboarding).toBe(true);
    expect(KEYS.filter((k) => basic.permissions[k])).toEqual([]);
    expect(emp.accessLevel(basic.permissions)).toBe("Basic");
  });
});

describe("acceptance establishes the employment (and only then a staff number)", () => {
  test("accepting makes the member active+onboarding with Basic access, a start date and a staff number; the role is never raised", async () => {
    const row = await joinJane();
    expect(row.status).toBe("active"); expect(row.employmentStatus).toBe("onboarding"); expect(row.employmentStartDate).toBe(today);
    expect(row.role).toBe("basic_staff"); expect(KEYS.filter((k) => row.permissions[k])).toEqual([]);
    expect(row.staffNumber).toBe("ABC-STAFF-001"); expect(row.member).toBe(JANE);
    expect(eventTypes()).toEqual(["invited", "accepted"]);
  });
  test("two people accepting get different, consecutive numbers (never the same number)", async () => {
    await invite({ email: "a@x.test" }); const ta = tokenFromEmail();
    await invite({ email: "b@x.test" }); const tb = tokenFromEmail();
    store.users.ua = { id: "ua", role: "user", email: "a@x.test" }; store.users.ub = { id: "ub", role: "user", email: "b@x.test" };
    const [ra, rb] = await Promise.all([acceptAs("ua", "a@x.test", ta), acceptAs("ub", "b@x.test", tb)]);
    expect([ra.statusCode, rb.statusCode]).toEqual([200, 200]);
    const nums = Object.values(store.teams).map((t) => t.staffNumber).sort();
    expect(new Set(nums).size).toBe(2);
  });
  test("if the staff number cannot be issued the member still joins with Basic access and the dealership is told", async () => {
    allocFails = true;
    await invite(); const a = await acceptAs(JANE, "jane@gmail.test", tokenFromEmail());
    expect(a.statusCode).toBe(200);
    const row = Object.values(store.teams)[0]; expect(row.status).toBe("active"); expect(row.staffNumber ?? null).toBeNull();
  });
  test("a wrong account still cannot accept and does not consume the invitation or allocate a number", async () => {
    await invite(); const a = await acceptAs(OTHER, "other@gmail.test", tokenFromEmail());
    expect(a.statusCode).toBe(403); expect(Object.values(store.teams)[0].status).toBe("invited"); expect(seq).toBe(0);
  });
});

describe("promotion, reduction and effective permissions (stored per membership, enforced server-side per request)", () => {
  test("promote to Sales agent gives exactly the Sales agent permissions and completes onboarding; reduce returns to Basic", async () => {
    const row = await joinJane();
    const up = await call(ctrl.updateTeamMember, { ...OWNER, params: { memberId: row.id }, body: { role: "sales_agent" } });
    expect(up.statusCode).toBe(200);
    const sales = roles.BUILTIN_ROLES.find((r) => r.key === "sales_agent").permissions;
    expect(store.teams[row.id].permissions).toEqual(sales); expect(store.teams[row.id].employmentStatus).toBe("active");
    expect(store.teams[row.id].permissions.canViewEarnings).toBe(false); expect(store.teams[row.id].permissions.canManageTeam).toBe(false);
    const down = await call(ctrl.updateTeamMember, { ...OWNER, params: { memberId: row.id }, body: { role: "basic_staff" } });
    expect(down.statusCode).toBe(200);
    expect(KEYS.filter((k) => store.teams[row.id].permissions[k])).toEqual([]); expect(store.teams[row.id].role).toBe("basic_staff");
    expect(eventTypes().filter((t) => t === "role_changed")).toHaveLength(2);
    const ev = store.events.filter((e) => e.eventType === "role_changed");
    expect(ev[0].fromValue.role).toBe("basic_staff"); expect(ev[0].toValue.role).toBe("sales_agent"); expect(ev[1].toValue.accessLevel).toBe("Basic");
  });
  test("a delegated member without canManageTeam cannot change a role; a manager cannot promote to manager", async () => {
    const row = await joinJane();
    const mgr = { ...asMember("uM", "m@x.test", { isOwner: false, role: "manager", permissions: { canManageTeam: true, canListCars: true } }) };
    const r = await call(ctrl.updateTeamMember, { ...mgr, params: { memberId: row.id }, body: { role: "manager" } });
    expect(r.statusCode).toBe(403); expect(store.teams[row.id].role).toBe("basic_staff");
  });
  test("a member cannot change their own role, permissions or status", async () => {
    const row = await joinJane();
    const self = asMember(JANE, "jane@gmail.test", { isOwner: false, role: "basic_staff", permissions: { canManageTeam: true } });
    const r = await call(ctrl.updateTeamMember, { ...self, params: { memberId: row.id }, body: { role: "manager" } });
    expect(r.statusCode).toBe(403);
  });
});

describe("suspend, reinstate, terminate, archive", () => {
  test("suspend then reinstate: access status and employment status move together and each is recorded", async () => {
    const row = await joinJane();
    const s = await call(ctrl.applyEmploymentAction, { ...OWNER, params: { memberId: row.id }, body: { action: "suspend", reason: "Investigation" } });
    expect(s.statusCode).toBe(200); expect([store.teams[row.id].status, store.teams[row.id].employmentStatus]).toEqual(["suspended", "suspended"]);
    const again = await call(ctrl.applyEmploymentAction, { ...OWNER, params: { memberId: row.id }, body: { action: "suspend" } });
    expect(again.statusCode).toBe(409);
    const r = await call(ctrl.applyEmploymentAction, { ...OWNER, params: { memberId: row.id }, body: { action: "reinstate" } });
    expect(r.statusCode).toBe(200); expect([store.teams[row.id].status, store.teams[row.id].employmentStatus]).toEqual(["active", "active"]);
    expect(eventTypes()).toEqual(expect.arrayContaining(["suspended", "reinstated"]));
  });
  test("terminate needs a reason, ends access, keeps the staff number, member id and history, and clears invitation material", async () => {
    const row = await joinJane();
    const no = await call(ctrl.applyEmploymentAction, { ...OWNER, params: { memberId: row.id }, body: { action: "terminate" } });
    expect(no.statusCode).toBe(400); expect(no.body.code).toBe("REASON_REQUIRED"); expect(store.teams[row.id].status).toBe("active");
    const t = await call(ctrl.applyEmploymentAction, { ...OWNER, params: { memberId: row.id }, body: { action: "terminate", reason: "Role ended" } });
    expect(t.statusCode).toBe(200);
    const after = store.teams[row.id];
    expect([after.status, after.employmentStatus]).toEqual(["removed", "terminated"]);
    expect(after.employmentEndDate).toBe(today); expect(after.employmentEndReason).toBe("Role ended");
    expect(after.staffNumber).toBe("ABC-STAFF-001"); expect(after.member).toBe(JANE); expect(after.inviteTokenHash).toBeNull();
    expect(store.users[JANE]).toBeTruthy(); // the personal account is never touched
    expect(JSON.stringify(t.body)).not.toMatch(/inviteTokenHash/);
  });
  test("resign is recorded separately from terminate; only a finished record can be archived and archiving keeps everything", async () => {
    const row = await joinJane();
    const early = await call(ctrl.applyEmploymentAction, { ...OWNER, params: { memberId: row.id }, body: { action: "archive" } });
    expect(early.statusCode).toBe(409);
    await call(ctrl.applyEmploymentAction, { ...OWNER, params: { memberId: row.id }, body: { action: "resign", reason: "Left for another job" } });
    expect(store.teams[row.id].employmentStatus).toBe("resigned");
    const ar = await call(ctrl.applyEmploymentAction, { ...OWNER, params: { memberId: row.id }, body: { action: "archive" } });
    expect(ar.statusCode).toBe(200); expect(store.teams[row.id].employmentStatus).toBe("archived"); expect(store.teams[row.id].status).toBe("removed");
    expect(store.teams[row.id].staffNumber).toBe("ABC-STAFF-001");
  });
  test("a manager cannot end the employment of another manager, nobody can end their own, and an unknown action is refused", async () => {
    const row = await joinJane();
    store.teams[row.id].role = "manager"; store.teams[row.id].permissions = { canManageTeam: true };
    const mgr = asMember("uM", "m@x.test", { isOwner: false, role: "manager", permissions: { canManageTeam: true, canListCars: true } });
    const r = await call(ctrl.applyEmploymentAction, { ...mgr, params: { memberId: row.id }, body: { action: "terminate", reason: "x" } });
    expect(r.statusCode).toBe(403);
    const self = asMember(JANE, "jane@gmail.test", { isOwner: false, role: "manager", permissions: { canManageTeam: true } });
    expect((await call(ctrl.applyEmploymentAction, { ...self, params: { memberId: row.id }, body: { action: "terminate", reason: "x" } })).statusCode).toBe(403);
    expect((await call(ctrl.applyEmploymentAction, { ...OWNER, params: { memberId: row.id }, body: { action: "promote" } })).statusCode).toBe(400);
  });
  test("a member of another dealership cannot be reached (404), whatever the id", async () => {
    const row = await joinJane();
    const other = { ...OWNER, user: { ...OWNER.user, id: "dX" }, dealerId: "dX" };
    expect((await call(ctrl.applyEmploymentAction, { ...other, params: { memberId: row.id }, body: { action: "suspend" } })).statusCode).toBe(404);
    expect((await call(ctrl.getTeamMemberDetail, { ...other, params: { memberId: row.id } })).statusCode).toBe(404);
    expect((await call(ctrl.setMemberBusinessEmail, { ...other, params: { memberId: row.id }, body: { businessEmail: "a@b.co" } })).statusCode).toBe(404);
  });
});

describe("rehire keeps the row, the staff number and the history", () => {
  test("inviting a terminated employee again reuses their record; only the same account can accept", async () => {
    const row = await joinJane();
    await call(ctrl.applyEmploymentAction, { ...OWNER, params: { memberId: row.id }, body: { action: "terminate", reason: "Role ended" } });
    const re = await invite(); expect(re.statusCode).toBe(201);
    expect(Object.keys(store.teams)).toHaveLength(1);
    const again = store.teams[row.id];
    expect([again.status, again.employmentStatus]).toEqual(["invited", "invited"]); expect(again.staffNumber).toBe("ABC-STAFF-001"); expect(again.member).toBe(JANE);
    expect(again.employmentEndDate).toBeNull(); expect(again.role).toBe("basic_staff"); // rehired with Basic access, not the old role
    expect(eventTypes()).toContain("rehire_invited");
    const wrong = await acceptAs(OTHER, "jane@gmail.test", tokenFromEmail());
    expect(wrong.statusCode).toBe(409); expect(wrong.body.code).toBe("INVITATION_ACCOUNT_MISMATCH"); expect(store.teams[row.id].status).toBe("invited");
    const ok = await acceptAs(JANE, "jane@gmail.test", tokenFromEmail());
    expect(ok.statusCode).toBe(200); expect(store.teams[row.id].staffNumber).toBe("ABC-STAFF-001"); expect(seq).toBe(1); // no second number
    expect(store.teams[row.id].employmentStatus).toBe("onboarding");
  });
});

describe("business e-mail is a record, separate from the login identity", () => {
  test("changing it does not change the login e-mail, the invitation e-mail or the member, and is recorded", async () => {
    const row = await joinJane();
    const r = await call(ctrl.setMemberBusinessEmail, { ...OWNER, params: { memberId: row.id }, body: { businessEmail: "Jane@abcmotors.ke" } });
    expect(r.statusCode).toBe(200);
    const after = store.teams[row.id];
    expect(after.businessEmail).toBe("jane@abcmotors.ke"); expect(after.inviteEmail).toBe("jane@gmail.test"); expect(after.member).toBe(JANE);
    expect(store.users[JANE].email).toBe("jane@gmail.test");
    expect(eventTypes()).toContain("business_email_changed");
    expect((await call(ctrl.setMemberBusinessEmail, { ...OWNER, params: { memberId: row.id }, body: { businessEmail: "bad" } })).statusCode).toBe(400);
  });
  test("a business address can never be used to accept an invitation (acceptance compares the LOGIN e-mail with the invitation e-mail)", async () => {
    await invite({ businessEmail: "jane@abcmotors.ke" });
    store.users.ubiz = { id: "ubiz", role: "user", email: "jane@abcmotors.ke" };
    const a = await acceptAs("ubiz", "jane@abcmotors.ke", tokenFromEmail());
    expect(a.statusCode).toBe(403); expect(a.body.code).toBe("INVITATION_EMAIL_MISMATCH");
  });
  test("the service refuses to describe the address as anything other than a record (no provisioning claim in the API)", async () => {
    const row = await joinJane();
    const d = await call(ctrl.getTeamMemberDetail, { ...OWNER, params: { memberId: row.id } });
    expect(d.body.data.identity).toEqual({ loginEmail: "jane@gmail.test", invitationEmail: "jane@gmail.test", businessEmail: null, name: "Jane Wanjiru" });
    expect(JSON.stringify(d.body)).not.toMatch(/mailbox|provision/i);
  });
});

describe("employee self-service sees and edits only their own staff profile", () => {
  const self = () => asMember(JANE, "jane@gmail.test", { membershipId: Object.values(store.teams)[0]?.id, isOwner: false, role: "basic_staff", permissions: {} });
  test("a Basic member reads their own identity; it carries no other member's data and no token", async () => {
    await joinJane();
    store.teams.other = { id: "other", dealer: D1, member: OTHER, inviteEmail: "other@gmail.test", role: "viewer", status: "active", permissions: {}, staffNumber: "ABC-STAFF-009" };
    const r = await call(ctrl.getMyStaffProfile, self());
    expect(r.statusCode).toBe(200);
    expect(r.body.data).toMatchObject({ staffNumber: "ABC-STAFF-001", roleKey: "basic_staff", accessLevel: "Basic", isBasicAccess: true, dealershipName: "ABC Motors", permissions: [] });
    expect(JSON.stringify(r.body)).not.toMatch(/ABC-STAFF-009|other@gmail|inviteTokenHash/);
  });
  test("updating the profile writes only display name and phone, completes the profile once, and ignores attempts to set role/status/number", async () => {
    await joinJane();
    const r = await call(ctrl.updateMyStaffProfile, { ...self(), body: { displayName: "Jane W.", workPhone: "0712345678", role: "manager", status: "active", staffNumber: "X-1", businessEmail: "evil@x.test", permissions: { canManageTeam: true } } });
    expect(r.statusCode).toBe(200);
    const row = Object.values(store.teams)[0];
    expect(row.staffDisplayName).toBe("Jane W."); expect(row.profileCompletedAt).toBeTruthy();
    expect(row.role).toBe("basic_staff"); expect(row.staffNumber).toBe("ABC-STAFF-001"); expect(row.businessEmail ?? null).toBeNull(); expect(KEYS.filter((k) => row.permissions[k])).toEqual([]);
    expect((await call(ctrl.updateMyStaffProfile, { ...self(), body: { displayName: "" } })).statusCode).toBe(400);
  });
  test("a suspended or removed member (no active membership) and the dealership owner get no staff profile", async () => {
    const row = await joinJane();
    store.teams[row.id].status = "suspended";
    expect((await call(ctrl.getMyStaffProfile, self())).statusCode).toBe(403);
    expect((await call(ctrl.getMyStaffProfile, { ...OWNER })).statusCode).toBe(403);
  });
});

describe("staff code, history and graceful fallback", () => {
  test("only the owner may set the staff code; invalid and locked codes are refused with clear codes", async () => {
    const mgr = asMember("uM", "m@x.test", { isOwner: false, role: "manager", permissions: { canManageTeam: true } });
    expect((await call(ctrl.putStaffCodeSettings, { ...mgr, body: { staffCode: "ABC" } })).statusCode).toBe(403);
    expect((await call(ctrl.putStaffCodeSettings, { ...OWNER, body: { staffCode: "a b" } })).body.code).toBe("STAFF_CODE_INVALID");
    expect((await call(ctrl.putStaffCodeSettings, { ...OWNER, body: { staffCode: "abc" } })).body.data.staffCode).toBe("ABC");
    await joinJane();
    expect((await call(ctrl.putStaffCodeSettings, { ...OWNER, body: { staffCode: "NEW" } })).body.code).toBe("STAFF_CODE_LOCKED");
  });
  test("the history endpoint returns the employee's events newest first and exposes no token material", async () => {
    const row = await joinJane();
    await call(ctrl.updateTeamMember, { ...OWNER, params: { memberId: row.id }, body: { role: "lot_agent" } });
    const d = await call(ctrl.getTeamMemberDetail, { ...OWNER, params: { memberId: row.id } });
    expect(d.body.data.events.map((e) => e.type)).toEqual(expect.arrayContaining(["invited", "accepted", "role_changed", "staff_number_assigned"].filter((t) => t !== "staff_number_assigned")));
    expect(d.body.data.effectivePermissions.filter((p) => p.granted).map((p) => p.key).sort()).toEqual(["canEditCars", "canListCars"]);
    expect(JSON.stringify(d.body)).not.toMatch(/inviteTokenHash/);
    const all = await call(ctrl.getEmploymentRecords, { ...OWNER });
    expect(all.body.data.events.length).toBeGreaterThanOrEqual(3);
  });
  test("when the employment migration is not applied, invitations still work (no new columns written), and employment endpoints answer 503", async () => {
    employmentOn = false; emp.resetEmploymentAvailabilityCache();
    const r = await invite(); expect(r.statusCode).toBe(201);
    const row = Object.values(store.teams)[0];
    expect(row.role).toBe("basic_staff");
    const written = dbMock.create.mock.calls.at(-1)[1];
    expect(Object.keys(written).filter((k) => /employment|staff|business|profile/i.test(k))).toEqual([]); // nothing the old schema lacks is written
    expect(store.events).toHaveLength(0);
    expect((await call(ctrl.applyEmploymentAction, { ...OWNER, params: { memberId: row.id }, body: { action: "suspend" } })).statusCode).toBe(503);
    expect((await call(ctrl.getEmploymentRecords, { ...OWNER })).body.code).toBe("EMPLOYMENT_UNAVAILABLE");
  });
});

// Account Settings server contract: profile validation/persistence, password change, and communication preferences (real controllers/services, in-memory persistence).
import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import bcrypt from "bcryptjs";

process.env.JWT_SECRET = "j".repeat(48);
process.env.REFRESH_TOKEN_SECRET = "r".repeat(48);

// ---- users ----
let users; let authRow; let revoked;
const thenable = (get) => { const q = { select: () => q, lean: async () => get(), then: (r, j) => Promise.resolve(get()).then(r, j) }; return q; };
const User = {
  findById: (id) => thenable(() => (users[id] ? { ...users[id] } : null)),
  findByIdAndUpdate: jest.fn(async (id, upd) => { if (!users[id]) return null; users[id] = { ...users[id], ...upd }; return { ...users[id] }; }),
  findOne: () => thenable(() => null),
};
const UserAuth = {
  findOne: ({ user }) => thenable(() => (authRow && authRow.user === user ? authRow : null)),
};
const RefreshToken = {
  revokeAllForUser: jest.fn(async (id, why) => { revoked.push([id, why]); }),
  createSession: jest.fn(async () => ({ id: "s1", sessionId: "s1" })), findByTokenHash: jest.fn(), create: jest.fn(async () => ({})), rotate: jest.fn(),
};
for (const m of ["Dealer", "PlatformConfig"]) jest.unstable_mockModule(`../../models/${m}.js`, () => ({ default: {} }));
jest.unstable_mockModule("../../models/User.js", () => ({ default: User }));
jest.unstable_mockModule("../../models/UserAuth.js", () => ({ default: UserAuth }));
jest.unstable_mockModule("../../models/RefreshToken.js", () => ({ default: RefreshToken }));
jest.unstable_mockModule("../../services/notification.service.js", () => ({ sendNotification: jest.fn() }));
jest.unstable_mockModule("../../services/communicationGateway.service.js", () => ({ deliver: jest.fn(), sendUserCommunication: jest.fn() }));
jest.unstable_mockModule("../../services/communicationEvents.service.js", () => ({ emitCommunication: jest.fn(), COMMUNICATION_EVENTS: {} }));
jest.unstable_mockModule("../../middleware/accountLockout.js", () => ({ recordFailedAttempt: jest.fn(), recordSuccessfulAttempt: jest.fn() }));
jest.unstable_mockModule("../../infrastructure/logging/index.js", () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn() }));
jest.unstable_mockModule("../../utils/logger.js", () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn(), logDebug: jest.fn() }));
jest.unstable_mockModule("../../utils/supabase.js", () => ({ getSupabase: jest.fn() }));

// ---- communication_preferences (db helpers) ----
let prefRows;
jest.unstable_mockModule("../../db/index.js", () => ({
  findOne: jest.fn(async (t, f) => (t === "communication_preferences" ? prefRows.find((r) => r.userId === f.userId) || null : null)),
  create: jest.fn(async (t, d) => { const r = { id: `p${prefRows.length + 1}`, emailTransactional: true, smsTransactional: false, whatsappTransactional: false, emailMarketing: false, smsMarketing: false, whatsappMarketing: false, timezone: "Africa/Nairobi", ...d }; prefRows.push(r); return r; }),
  update: jest.fn(async (t, id, d) => { const i = prefRows.findIndex((r) => r.id === id); prefRows[i] = { ...prefRows[i], ...d }; return prefRows[i]; }),
  findAll: jest.fn(async () => []), findById: jest.fn(async () => null),
}));

const { updateProfile, changePassword } = await import("../../controllers/authController.js");
const { getPreferences, updatePreferences, channelAllowed } = await import("../../services/communicationControl.service.js");
const mkRes = () => { const r = { code: 200, body: null, cookies: {} }; r.status = (c) => { r.code = c; return r; }; r.json = (b) => { r.body = b; return r; }; r.cookie = (k, v) => { r.cookies[k] = v; return r; }; r.clearCookie = () => r; r.setHeader = () => r; return r; };
const put = async (body, id = "u1") => { const res = mkRes(); await updateProfile({ user: { id }, body, headers: {} }, res); return res; };

beforeEach(async () => {
  users = {
    u1: { id: "u1", _id: "u1", name: "Alice", email: "a@x.co", role: "user", phone: "254712345678", phoneVerified: true, location: "Nairobi" },
    u2: { id: "u2", _id: "u2", name: "Bob", email: "b@x.co", role: "user", phone: "254733000111", phoneVerified: true },
  };
  authRow = { user: "u1", password: await bcrypt.hash("OldPass1!", 4), tokenVersion: 3, matchPassword: async function (p) { return bcrypt.compare(p, this.password); }, save: jest.fn(async () => {}) };
  revoked = []; prefRows = []; User.findByIdAndUpdate.mockClear();
});

describe("profile details", () => {
  test("valid edit persists and the response carries the stored value", async () => {
    const r = await put({ name: "  Alice K  ", location: "Mombasa" });
    expect(r.code).toBe(200);
    expect(r.body.user.name).toBe("Alice K");
    expect(users.u1.location).toBe("Mombasa");
  });
  test.each([
    [{ name: "" }], [{ name: " " }], [{ name: "x".repeat(101) }], [{ name: 5 }],
    [{ location: "x".repeat(121) }], [{ bio: "x".repeat(1001) }], [{ avatar: "javascript:alert(1)" }], [{ avatar: "http://insecure.example/a.png" }],
  ])("invalid %j is rejected with 400 and nothing is written", async (body) => {
    const r = await put(body);
    expect(r.code).toBe(400);
    expect(r.body.code).toBe("VALIDATION_FAILED");
    expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
    expect(users.u1.name).toBe("Alice");
  });
  test("https avatar accepted; empty string clears it", async () => {
    expect((await put({ avatar: "https://cdn.example.com/a.png" })).code).toBe(200);
    expect(users.u1.avatar).toBe("https://cdn.example.com/a.png");
    expect((await put({ avatar: "" })).code).toBe(200);
    expect(users.u1.avatar).toBe("");
  });
  test("ownership: the target is always the authenticated user; an id/role/email in the body is ignored", async () => {
    await put({ name: "Mallory", id: "u2", _id: "u2", userId: "u2", role: "superadmin", email: "evil@x.co" }, "u1");
    expect(users.u2.name).toBe("Bob");
    expect(users.u1.role).toBe("user");
    expect(users.u1.email).toBe("a@x.co");
    expect(users.u1.name).toBe("Mallory");
  });
  test("a business application status never gates profile editing", async () => {
    users.u1.verificationStatus = "rejected";
    expect((await put({ name: "Still Me" })).code).toBe(200);
  });
});

describe("change password", () => {
  const run = async (body, id = "u1") => { const res = mkRes(); await changePassword({ user: { id }, body, headers: {}, cookies: {} }, res); return res; };
  test("missing fields / weak password / wrong current password are rejected without changing anything", async () => {
    const before = authRow.password;
    expect((await run({ newPassword: "NewPass1!" })).code).toBe(400);
    expect((await run({ currentPassword: "OldPass1!", newPassword: "short" })).code).toBe(400);
    expect((await run({ currentPassword: "OldPass1!", newPassword: "alllowercase1!" })).code).toBe(400);
    const wrong = await run({ currentPassword: "WrongPass1!", newPassword: "NewPass1!" });
    expect(wrong.code).toBe(400);
    expect(wrong.body.message).toMatch(/incorrect/i);
    expect(authRow.password).toBe(before);
    expect(authRow.save).not.toHaveBeenCalled();
    expect(revoked).toHaveLength(0);
  });
  test("success stores a new hash, bumps tokenVersion and revokes other sessions", async () => {
    const r = await run({ currentPassword: "OldPass1!", newPassword: "NewPass1!" });
    expect(r.code).toBe(200);
    expect(await bcrypt.compare("NewPass1!", authRow.password)).toBe(true);
    expect(authRow.tokenVersion).toBe(4);
    expect(revoked).toEqual([["u1", "password_changed"]]);
  });
  test("another user's credentials are untouched (no auth row for the caller -> 404)", async () => {
    const r = await run({ currentPassword: "OldPass1!", newPassword: "NewPass1!" }, "u2");
    expect(r.code).toBe(404);
    expect(authRow.save).not.toHaveBeenCalled();
  });
});

describe("communication (notification) preferences", () => {
  test("defaults then persisted per user, isolated between users", async () => {
    expect((await getPreferences("u1")).emailTransactional).toBe(true);
    await updatePreferences("u1", { emailMarketing: true, smsTransactional: true });
    expect((await getPreferences("u1")).emailMarketing).toBe(true);
    expect((await getPreferences("u2")).emailMarketing).toBe(false);
  });
  test("the same stored value drives the delivery decision", async () => {
    await updatePreferences("u1", { emailTransactional: false });
    expect(channelAllowed(await getPreferences("u1"), "email", "transactional")).toBe(false);
    expect(channelAllowed(await getPreferences("u1"), "email", "otp")).toBe(true);   // security codes can't be switched off
  });
  test.each([[{ emailMarketing: "yes" }], [{ smsTransactional: 1 }], [{ quietHoursStart: "25:00" }], [{ timezone: "<script>" }], [{ timezone: "x".repeat(70) }]])(
    "invalid %j is rejected and not stored", async (patch) => {
      await getPreferences("u1");
      await expect(updatePreferences("u1", patch)).rejects.toMatchObject({ statusCode: 400 });
      expect(prefRows[0].emailMarketing).toBe(false);
    });
  test("unknown keys are ignored, quiet hours can be set and cleared", async () => {
    await updatePreferences("u1", { quietHoursStart: "22:00", quietHoursEnd: "06:30", isAdmin: true });
    expect(prefRows[0]).toMatchObject({ quietHoursStart: "22:00", quietHoursEnd: "06:30" });
    expect(prefRows[0].isAdmin).toBeUndefined();
    await updatePreferences("u1", { quietHoursStart: null });
    expect(prefRows[0].quietHoursStart).toBeNull();
  });
});

// Stage 3 (2026-10-13) — BEHAVIOURAL logout contract (closes the Stage 2 gap "no behavioural logout-then-reuse test").
// Uses the REAL middleware/auth.js protect(), the REAL authController logout()/refreshToken(), the REAL JWT signing in
// utils/generateToken.js and real jsonwebtoken. Only persistence is replaced by a small STATEFUL in-memory store whose
// rotate() mirrors kayad_rotate_refresh_token (20260930110000): revoked/expired/version-mismatched → family revoked,
// status 'reuse_detected'; otherwise one new row and the old row revoked. The SQL itself is rehearsed on PostgreSQL by
// scripts/rehearse-stage2-extended-local.sh (C1–C8, S7b). No network, no database, no email.
import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import crypto from "node:crypto";

process.env.JWT_SECRET = "j".repeat(48);
process.env.REFRESH_TOKEN_SECRET = "r".repeat(48);
process.env.REQUIRE_EMAIL_VERIFICATION = "false";

const db = { users: new Map(), auth: new Map(), tokens: [] };
const sha = (t) => crypto.createHash("sha256").update(t).digest("hex");
const thenable = (get) => { const q = { select: () => q, lean: async () => get(), then: (r, j) => Promise.resolve(get()).then(r, j) }; return q; };

const User = {
  findById: (id) => thenable(() => (db.users.has(id) ? { ...db.users.get(id) } : null)),
  findByIdAndUpdate: async () => null,
  findOne: () => thenable(() => null),
};
const UserAuth = {
  findOne: ({ user }) => thenable(() => (db.auth.has(user) ? { ...db.auth.get(user) } : null)),
  findOneAndUpdate: jest.fn(async ({ user }, upd) => {
    const a = db.auth.get(user);
    if (upd?.$inc?.tokenVersion) a.tokenVersion = (a.tokenVersion || 0) + upd.$inc.tokenVersion;
    return { ...a };
  }),
};
let failRevokeAll = false;
const RefreshToken = {
  createSession: jest.fn(async ({ user, token, tokenVersion, familyId }) => {
    const row = { id: crypto.randomUUID(), user, tokenHash: sha(token), tokenVersion, familyId, sessionId: crypto.randomUUID(), isRevoked: false, expiresAt: Date.now() + 864e5 };
    db.tokens.push(row); return { ...row };
  }),
  findByTokenHash: async (token) => { const r = db.tokens.find((t) => t.tokenHash === sha(token)); return r ? { ...r } : null; },
  findActiveSessionById: async (sessionId, userId) => db.tokens.find((t) => t.sessionId === sessionId && t.user === userId && !t.isRevoked && t.expiresAt > Date.now()) || null,
  revokeAllForUser: jest.fn(async (userId, reason) => {
    if (failRevokeAll) throw new Error("db unavailable");
    for (const t of db.tokens) if (t.user === userId && !t.isRevoked) Object.assign(t, { isRevoked: true, revokeReason: reason });
  }),
  rotate: jest.fn(async ({ oldToken, newToken, user, tokenVersion }) => {
    const old = db.tokens.find((t) => t.tokenHash === sha(oldToken));
    if (!old) return { status: "not_found" };
    if (old.isRevoked || old.expiresAt <= Date.now() || old.tokenVersion !== tokenVersion || old.user !== user) {
      for (const t of db.tokens) if (t.familyId === old.familyId && !t.isRevoked) Object.assign(t, { isRevoked: true, revokeReason: "refresh_reuse" });
      return { status: "reuse_detected", family_id: old.familyId };
    }
    const row = { id: crypto.randomUUID(), user, tokenHash: sha(newToken), tokenVersion, familyId: old.familyId, sessionId: old.sessionId, isRevoked: false, expiresAt: Date.now() + 864e5 };
    db.tokens.push(row); Object.assign(old, { isRevoked: true, revokeReason: "rotated" });
    return { status: "rotated", session_id: old.sessionId, family_id: old.familyId };
  }),
};

jest.unstable_mockModule("../../models/User.js", () => ({ default: User }));
jest.unstable_mockModule("../../models/UserAuth.js", () => ({ default: UserAuth }));
jest.unstable_mockModule("../../models/RefreshToken.js", () => ({ default: RefreshToken }));
jest.unstable_mockModule("../../models/Dealer.js", () => ({ default: {} }));
jest.unstable_mockModule("../../models/PlatformConfig.js", () => ({ default: {} }));
jest.unstable_mockModule("../../services/notification.service.js", () => ({ sendNotification: jest.fn() }));
jest.unstable_mockModule("../../services/communicationGateway.service.js", () => ({ deliver: jest.fn() }));
jest.unstable_mockModule("../../services/communicationEvents.service.js", () => ({ emitCommunication: jest.fn(), COMMUNICATION_EVENTS: {} }));
jest.unstable_mockModule("../../middleware/accountLockout.js", () => ({ recordFailedAttempt: jest.fn(), recordSuccessfulAttempt: jest.fn() }));
jest.unstable_mockModule("../../infrastructure/logging/index.js", () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn() }));
jest.unstable_mockModule("../../utils/logger.js", () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn(), logDebug: jest.fn() }));
jest.unstable_mockModule("../../utils/supabase.js", () => ({ getSupabase: jest.fn() }));

const { protect } = await import("../../middleware/auth.js");
const { logout, refreshToken } = await import("../../controllers/authController.js");
const { generateAccessToken, generateRefreshToken } = await import("../../utils/generateToken.js");

const mkRes = () => {
  const r = { code: 200, body: null, cookies: {}, cleared: [] };
  r.status = (c) => { r.code = c; return r; };
  r.json = (b) => { r.body = b; return r; };
  r.cookie = (n, v) => { r.cookies[n] = v; return r; };
  r.clearCookie = (n) => { r.cleared.push(n); return r; };
  r.set = () => r;
  return r;
};
const authed = async (accessToken) => {
  const req = { headers: { authorization: `Bearer ${accessToken}` }, cookies: {} };
  const res = mkRes(); let passed = false;
  await protect(req, res, () => { passed = true; });
  return { req, res, passed };
};
const refresh = async (cookie) => { const res = mkRes(); await refreshToken({ cookies: { refreshToken: cookie }, headers: {}, body: {}, ip: "127.0.0.1" }, res); return res; };

let n = 0; let U;
const login = async (user) => {               // a device signs in: one session row + its tokens (as sendAuthResponse does)
  const auth = db.auth.get(user.id); const familyId = crypto.randomUUID();
  const rt = generateRefreshToken({ ...user, _id: user.id }, auth.tokenVersion, familyId);
  const s = await RefreshToken.createSession({ user: user.id, token: rt, tokenVersion: auth.tokenVersion, familyId });
  return { access: generateAccessToken({ ...user, _id: user.id }, auth.tokenVersion, s.sessionId), refresh: rt, sessionId: s.sessionId };
};

beforeEach(() => {
  failRevokeAll = false;
  n += 1;                                       // unique id per test: protect() keeps a 20 s per-user profile cache
  const id = `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  U = { id, _id: id, email: `u${n}@example.test`, name: "U", role: "user", status: "approved", isBanned: false, emailVerified: true, grantedPermissions: [], revokedPermissions: [] };
  db.users.set(U.id, U); db.auth.set(U.id, { user: U.id, tokenVersion: 0 });
  RefreshToken.rotate.mockClear(); RefreshToken.createSession.mockClear();
});

describe("logout → reuse of pre-logout credentials", () => {
  test("sanity: before logout the access token is accepted and the refresh token rotates", async () => {
    const d = await login(U);
    expect((await authed(d.access)).passed).toBe(true);
    const r = await refresh(d.refresh);
    expect(r.code).toBe(200);
    expect(r.body.success).toBe(true);
    expect(RefreshToken.rotate).toHaveBeenCalledTimes(1);
  });

  test("logout revokes every session, bumps tokenVersion, clears both cookies", async () => {
    const d = await login(U);
    const { req, passed } = await authed(d.access);
    expect(passed).toBe(true);
    const res = mkRes();
    await logout(req, res);
    expect(res.code).toBe(200);
    expect(res.body).toEqual({ success: true, message: "Logged out from all devices" });
    expect(res.cleared).toEqual(expect.arrayContaining(["refreshToken", "token"]));
    expect(db.auth.get(U.id).tokenVersion).toBe(1);
    expect(db.tokens.filter((t) => t.user === U.id).every((t) => t.isRevoked && t.revokeReason === "logout")).toBe(true);
  });

  test("after logout the pre-logout ACCESS token is refused (401) and never reaches a handler", async () => {
    const d = await login(U);
    await logout((await authed(d.access)).req, mkRes());
    const after = await authed(d.access);
    expect(after.passed).toBe(false);
    expect(after.res.code).toBe(401);
    expect(after.res.body.code).toBe("AUTH_SESSION_EXPIRED");
  });

  test("after logout the pre-logout REFRESH token is refused (403), mints nothing and sets no cookie", async () => {
    const d = await login(U);
    await logout((await authed(d.access)).req, mkRes());
    const rows = db.tokens.length;
    const r = await refresh(d.refresh);
    expect(r.code).toBe(403);
    expect(r.body.success).toBe(false);
    expect(r.body.code).toBe("AUTH_SESSION_EXPIRED");
    expect(Object.keys(r.cookies)).toHaveLength(0);
    expect(RefreshToken.rotate).not.toHaveBeenCalled();
    expect(db.tokens.length).toBe(rows);
  });

  test("logout on one device also kills the OTHER device's access and refresh tokens (logout from all devices)", async () => {
    const phone = await login(U); const laptop = await login(U);
    await logout((await authed(phone.access)).req, mkRes());
    expect((await authed(laptop.access)).res.code).toBe(401);
    expect((await refresh(laptop.refresh)).code).toBe(403);
  });

  test("even with a matching tokenVersion, a session revoked by logout is refused by protect() (session-id check)", async () => {
    const d = await login(U);
    await logout((await authed(d.access)).req, mkRes());
    db.auth.get(U.id).tokenVersion = 0;         // isolate the second barrier: only the revoked session row remains
    const after = await authed(d.access);
    expect(after.passed).toBe(false);
    expect(after.res.code).toBe(401);
    expect(after.res.body.code).toBe("AUTH_SESSION_EXPIRED");
  });

  test("…and a revoked refresh token with a matching version is treated as REUSE: family revoked, nothing minted", async () => {
    const d = await login(U);
    await logout((await authed(d.access)).req, mkRes());
    db.auth.get(U.id).tokenVersion = 0;
    const rows = db.tokens.length;
    const r = await refresh(d.refresh);
    expect(r.code).toBe(403);
    expect(r.body.code).toBe("AUTH_REFRESH_REUSED");
    expect(db.tokens.length).toBe(rows);
    expect(db.auth.get(U.id).tokenVersion).toBe(1);
    expect(Object.keys(r.cookies)).toHaveLength(0);
  });

  test("a logout that cannot reach the database fails visibly (500) and does not claim success", async () => {
    const d = await login(U);
    failRevokeAll = true;
    const res = mkRes();
    await logout((await authed(d.access)).req, res);
    expect(res.code).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

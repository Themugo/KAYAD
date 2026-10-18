// ============================================================
// 2026-10-18 STAGE 2 ENTRY CORRECTIONS — S2-AUTH-07
// /auth/refresh issued fresh tokens to a suspended (isBanned) or deactivated
// account; protect() refuses those states on every request, but the refresh
// endpoint did not. Harness reused verbatim from
// tests/auth/logoutRevocationBehaviour.test.js (REAL protect/refreshToken/JWT,
// stateful in-memory persistence only).
// ============================================================
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


describe("S2-AUTH-07 refresh refuses suspended / deactivated accounts", () => {
  test("control: an active account's refresh token rotates", async () => {
    const d = await login(U);
    const res = await refresh(d.refresh);
    expect(res.code).toBe(200);
  });
  test("suspended account: 403 AUTH_FORBIDDEN, no new session row", async () => {
    const d = await login(U);
    db.users.set(U.id, { ...U, isBanned: true });
    RefreshToken.rotate.mockClear();
    const res = await refresh(d.refresh);
    expect(res.code).toBe(403);
    expect(res.body.code).toBe("AUTH_FORBIDDEN");
    expect(RefreshToken.rotate).not.toHaveBeenCalled();
    expect(res.cookies.token).toBeUndefined();
  });
  test("deactivated account: 403 AUTH_FORBIDDEN", async () => {
    const d = await login(U);
    db.users.set(U.id, { ...U, deactivatedAt: new Date().toISOString() });
    const res = await refresh(d.refresh);
    expect(res.code).toBe(403);
    expect(res.body.code).toBe("AUTH_FORBIDDEN");
  });
});

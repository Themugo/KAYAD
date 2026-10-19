// ============================================================
// STAGE 5A (2026-10-19) — GATE A: OWNER IDENTITY & BOOTSTRAP SECURITY.
//
// Defect demonstrated before the fix (see KAYAD_STAGE5A report, finding A1):
//   the owner is identified purely by EMAIL (config/owners.js). Public registration did not
//   reserve owner emails, and protect()/login exempted the owner from email verification.
//   With no email provider configured (login gate off) a public registrant using the owner's
//   address could therefore register, log in and act as `webhoist` (full privilege) without
//   ever proving ownership of that mailbox.
//
// These tests drive the REAL controller + middleware. Persistence is emulated
// (EVIDENCE TIER: mocked local runtime; the disposable-PostgreSQL tier is covered by the
// Stage 5A PG checks and browser journeys).
// ============================================================
import { jest, describe, test, expect, beforeEach } from "@jest/globals";

process.env.JWT_SECRET = "j".repeat(48);
process.env.REFRESH_TOKEN_SECRET = "r".repeat(48);
process.env.REQUIRE_EMAIL_VERIFICATION = "false"; // worst case: provider not configured, login gate OFF
process.env.WEBHOIST_EMAIL = "owner@example.test";
process.env.NODE_ENV = "test";
delete process.env.WEBHOIST_EMAILS;
delete process.env.BREVO_API_KEY;

import jwt from "jsonwebtoken";

const rpcCalls = [];
const users = new Map();
const auths = new Map();
const thenable = (get) => { const q = { select: () => q, lean: async () => get(), then: (r, j) => Promise.resolve(get()).then(r, j) }; return q; };
const User = {
  findOne: jest.fn((f) => thenable(() => [...users.values()].find((u) => u.email === f?.email) ?? null)),
  findById: jest.fn((id) => thenable(() => users.get(id) ?? null)),
  findByIdAndUpdate: jest.fn(() => ({ catch: () => {} })),
};
const UserAuth = {
  findOne: jest.fn((f) => thenable(() => auths.get(String(f?.user)) ?? null)),
  findOneAndUpdate: jest.fn(async () => null),
};
const RefreshToken = {
  createSession: jest.fn(async () => ({ sessionId: "s1" })),
  findActiveSessionById: jest.fn(async () => ({ id: "s1" })),
  findByTokenHash: jest.fn(async () => ({ id: "rt" })),
};
const rpc = jest.fn(async (fn, args) => {
  rpcCalls.push({ fn, args });
  return { data: { id: "u-new", name: args.p_name, email: args.p_email, role: args.p_role, status: "pending", email_verified: false }, error: null };
});
jest.unstable_mockModule("../../models/User.js", () => ({ default: User }));
jest.unstable_mockModule("../../models/UserAuth.js", () => ({ default: UserAuth }));
jest.unstable_mockModule("../../models/RefreshToken.js", () => ({ default: RefreshToken }));
jest.unstable_mockModule("../../models/Dealer.js", () => ({ default: {} }));
jest.unstable_mockModule("../../models/PlatformConfig.js", () => ({ default: {} }));
jest.unstable_mockModule("../../models/Referral.js", () => ({ default: { create: jest.fn(async () => ({})) } }));
jest.unstable_mockModule("../../services/notification.service.js", () => ({ sendNotification: jest.fn(async () => {}) }));
jest.unstable_mockModule("../../services/communicationGateway.service.js", () => ({ deliver: jest.fn(async () => ({ status: "sent" })) }));
jest.unstable_mockModule("../../services/communicationEvents.service.js", () => ({ emitCommunication: jest.fn(), COMMUNICATION_EVENTS: { EMAIL_VERIFICATION: "ev", REGISTRATION: "reg" } }));
jest.unstable_mockModule("../../middleware/accountLockout.js", () => ({ recordFailedAttempt: jest.fn(), recordSuccessfulAttempt: jest.fn() }));
const logWarn = jest.fn();
jest.unstable_mockModule("../../infrastructure/logging/index.js", () => ({ logError: jest.fn(), logWarn, logInfo: jest.fn(), logDebug: jest.fn() }));
jest.unstable_mockModule("../../utils/logger.js", () => ({ logError: jest.fn(), logWarn, logInfo: jest.fn(), logDebug: jest.fn() }));
jest.unstable_mockModule("../../utils/supabase.js", () => ({ getSupabase: () => ({ rpc }) }));

const { register, login, refreshToken } = await import("../../controllers/authController.js");
const { protect, optionalAuth } = await import("../../middleware/auth.js");
const { resolveSocketUser } = await import("../../services/socketAuth.service.js");
const { __setOnboardingPolicyForTests } = await import("../../services/onboardingPolicy.service.js");

const mkRes = () => { const r = { code: 200, body: null, headers: {} }; r.status = (c) => { r.code = c; return r; }; r.json = (b) => { r.body = b; return r; }; r.cookie = () => r; r.clearCookie = () => r; r.set = (k, v) => { r.headers[k] = v; return r; }; return r; };
const reg = async (body) => { const res = mkRes(); await register({ body: { name: "N", email: "n@example.test", password: "Str0ng!Passw0rd", ...body }, query: {}, headers: {} }, res); return res; };

const seedAccount = ({ id, email, role = "user", emailVerified, isBanned = false }) => {
  users.set(id, { _id: id, id, email, role, name: "X", status: "approved", emailVerified, isBanned, deactivatedAt: null, grantedPermissions: [], revokedPermissions: [] });
  auths.set(String(id), { user: id, tokenVersion: 0, loginAttempts: 0, lockUntil: null, matchPassword: async (p) => p === "Str0ng!Passw0rd", save: async () => {} });
};
const bearer = (id) => jwt.sign({ id, tokenVersion: 0, sessionId: "s1" }, process.env.JWT_SECRET, { algorithm: "HS256", expiresIn: "5m" });
const runProtect = async (id) => {
  const res = mkRes(); let nextCalled = false; const req = { headers: { authorization: `Bearer ${bearer(id)}` }, cookies: {}, ip: "127.0.0.1", originalUrl: "/x", method: "GET" };
  await protect(req, res, () => { nextCalled = true; });
  return { res, req, nextCalled };
};

beforeEach(() => { rpcCalls.length = 0; users.clear(); auths.clear(); jest.clearAllMocks(); __setOnboardingPolicyForTests({}); });

describe("A1 — public registration can never claim the owner identity", () => {
  test.each([
    "owner@example.test",
    "OWNER@Example.Test",
    "  owner@example.test  ",
    "owner@example.test​", // zero-width suffix must not slip past normalisation into a different row
    "ｏｗｎｅｒ@example.test", // full-width letters normalise (NFKC) to the owner address
  ])("register(%j) ⇒ 403 OWNER_IDENTITY_RESERVED, zero database writes", async (email) => {
    const r = await reg({ email });
    // The zero-width variant is not the owner address after normalisation; it must still never reach the owner.
    if (/​/.test(email)) { expect(r.code === 403 || r.code === 400 || rpcCalls.every((c) => c.args.p_email !== "owner@example.test")).toBe(true); return; }
    expect([r.code, r.body.code]).toEqual([403, "OWNER_IDENTITY_RESERVED"]);
    expect(rpcCalls).toHaveLength(0);
  });

  test("an EXISTING owner account is answered identically (no owner-existence oracle)", async () => {
    seedAccount({ id: "o1", email: "owner@example.test", role: "superadmin", emailVerified: true });
    const r = await reg({ email: "owner@example.test" });
    expect([r.code, r.body.code]).toEqual([403, "OWNER_IDENTITY_RESERVED"]);
    expect(rpcCalls).toHaveLength(0);
  });

  test("the rejection message names no mailbox and says how it is recoverable", async () => {
    const r = await reg({ email: "owner@example.test" });
    expect(JSON.stringify(r.body)).not.toMatch(/owner@example\.test/);
    expect(r.body.message).toMatch(/cannot be used for public registration/i);
  });
});

describe("A2 — privilege fields can never be injected through registration", () => {
  test.each(["superadmin", "admin", "webhoist", "owner", "moderator", "accounts", "escrow_officer", ""])(
    "role %j in the body is reduced to an ordinary self-registration role",
    async (role) => {
      const r = await reg({ role, isAdmin: true, super_admin: true, superAdmin: true, status: "approved", emailVerified: true, email_verified: true, permissions: ["*"], grantedPermissions: ["*"], isOwner: true, approved: true, kycStatus: "verified" });
      expect(r.code).toBe(201);
      const a = rpcCalls.at(-1).args;
      expect(a.p_role).toBe("user");
      expect(Object.keys(a).every((k) => k.startsWith("p_"))).toBe(true);
      expect(JSON.stringify(a)).not.toMatch(/superadmin|webhoist|permissions|isOwner|kyc/i);
    },
  );
});

describe("A3 — an owner-email account that is not verified holds NO owner privilege (fails closed, recoverable)", () => {
  beforeEach(() => seedAccount({ id: "o1", email: "owner@example.test", role: "user", emailVerified: false }));

  test("login with correct password but unverified owner email ⇒ 403 OWNER_IDENTITY_UNVERIFIED (even with the provider gate off)", async () => {
    const res = mkRes();
    await login({ body: { email: "owner@example.test", password: "Str0ng!Passw0rd" }, headers: {}, cookies: {}, ip: "127.0.0.1" }, res);
    expect([res.code, res.body.code]).toEqual([403, "OWNER_IDENTITY_UNVERIFIED"]);
    expect(res.body.message).toMatch(/verif/i);
    expect(RefreshToken.createSession).not.toHaveBeenCalled();
  });

  test("a still-valid access token for an unverified owner account is refused by protect()", async () => {
    const { res, nextCalled } = await runProtect("o1");
    expect(nextCalled).toBe(false);
    expect([res.code, res.body.code]).toEqual([403, "OWNER_IDENTITY_UNVERIFIED"]);
  });

  test("refresh for an unverified owner account is refused", async () => {
    const rt = jwt.sign({ id: "o1", tokenVersion: 0 }, process.env.REFRESH_TOKEN_SECRET, { algorithm: "HS256", expiresIn: "5m" });
    const res = mkRes();
    await refreshToken({ cookies: { refreshToken: rt }, headers: {}, ip: "127.0.0.1" }, res);
    expect([res.code, res.body.code]).toEqual([403, "OWNER_IDENTITY_UNVERIFIED"]);
  });

  test("emailVerified that is merely truthy-ish (string/1) is not verification", async () => {
    users.get("o1").emailVerified = "true";
    const { nextCalled } = await runProtect("o1");
    expect(nextCalled).toBe(false);
  });
});

describe("A4 — a provisioned + verified owner keeps the established owner model", () => {
  test("protect(): verified owner ⇒ webhoist effective role, owner exempt from suspension flags", async () => {
    seedAccount({ id: "o1", email: "owner@example.test", role: "user", emailVerified: true, isBanned: true });
    const { req, nextCalled } = await runProtect("o1");
    expect(nextCalled).toBe(true);
    expect(req.user.effectiveRole).toBe("webhoist");
    expect(req.user.role).toBe("superadmin");
  });

  test("login: verified owner is not blocked by the owner-identity gate", async () => {
    seedAccount({ id: "o1", email: "owner@example.test", role: "superadmin", emailVerified: true });
    const res = mkRes();
    await login({ body: { email: "owner@example.test", password: "Str0ng!Passw0rd" }, headers: {}, cookies: {}, ip: "127.0.0.1" }, res);
    expect(res.body?.code).not.toBe("OWNER_IDENTITY_UNVERIFIED");
  });
});

describe("A5 — email verification alone never grants a privileged role", () => {
  test.each(["admin", "superadmin", "accounts", "escrow_officer", "moderator", "dealer", "individual_seller", "user"])(
    "protect(): verified non-owner with stored role %s keeps exactly that role, never webhoist",
    async (role) => {
      seedAccount({ id: "u1", email: "someone@example.test", role, emailVerified: true });
      const { req, nextCalled } = await runProtect("u1");
      expect(nextCalled).toBe(true);
      expect(req.user.effectiveRole).toBe(role);
      expect(req.user.role).toBe(role);
    },
  );

  test("lookalike addresses of the owner are not owners", async () => {
    for (const [i, email] of ["owner@example.test.evil.com", "owner+x@example.test", "0wner@example.test", "owner@example.tes"].entries()) {
      seedAccount({ id: `l${i}`, email, role: "user", emailVerified: true });
      const { req, nextCalled } = await runProtect(`l${i}`);
      expect(nextCalled).toBe(true);
      expect(req.user.effectiveRole).toBe("user");
    }
  });
});

describe("A6 — optional-auth and realtime paths apply the same owner-identity rule", () => {
  test("optionalAuth never attaches an unverified owner-email row as webhoist", async () => {
    seedAccount({ id: "o1", email: "owner@example.test", role: "user", emailVerified: false });
    const req = { headers: { authorization: `Bearer ${bearer("o1")}` }, cookies: {} };
    await optionalAuth(req, mkRes(), () => {});
    expect(req.user).toBeUndefined();
  });
  test("optionalAuth attaches a verified owner", async () => {
    seedAccount({ id: "o1", email: "owner@example.test", role: "user", emailVerified: true });
    const req = { headers: { authorization: `Bearer ${bearer("o1")}` }, cookies: {} };
    await optionalAuth(req, mkRes(), () => {});
    expect(req.user?.effectiveRole).toBe("webhoist");
  });
  test("socket identity resolution rejects an unverified owner-email row and accepts a verified one", async () => {
    seedAccount({ id: "o1", email: "owner@example.test", role: "user", emailVerified: false });
    expect(await resolveSocketUser({ id: "o1", tokenVersion: 0, sessionId: "s1" })).toBeNull();
    users.get("o1").emailVerified = true;
    expect((await resolveSocketUser({ id: "o1", tokenVersion: 0, sessionId: "s1" }))?.role).toBe("superadmin");
  });
});

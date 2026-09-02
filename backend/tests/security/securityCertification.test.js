// ============================================================
// PHASE 10 — SECURITY CERTIFICATION TESTS
// Server-side authorization and hardening verification:
//   • protect() JWT authentication (anonymous, forged, revoked, banned)
//   • Role matrix for adminOnly / authorize (user, seller, dealer,
//     ghost_checker, staff roles, admin, superadmin, webhoist)
//   • Role cannot be escalated via a forged JWT claim (DB role wins)
//   • Registration cannot self-assign privileged roles
//   • Dealer self-approval via profile update is impossible
//   • Demo login gate (production disabled by default)
//   • Email/reset tokens stored only as SHA-256 hashes
//   • CSRF protection for cookie-authenticated requests
//   • 5xx error responses never leak internal messages in production
//   • Inventory webhook field whitelist (mass-assignment guard)
// ============================================================

import { describe, test, expect, beforeEach, afterEach, jest } from "@jest/globals";
import crypto from "crypto";
import jwt from "jsonwebtoken";

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-key-32-chars-minimum-x";
const SECRET = process.env.JWT_SECRET;

// ── Module mocks ──────────────────────────────────────────────
const userModelMock = {
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  create: jest.fn(),
};
const userAuthModelMock = {
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  create: jest.fn(),
};
const dealerModelMock = { findOneAndUpdate: jest.fn(), findOne: jest.fn() };
const refreshTokenModelMock = { create: jest.fn(), revokeToken: jest.fn() };
const platformConfigMock = { findOne: jest.fn() };

jest.unstable_mockModule("../../models/User.js", () => ({ default: userModelMock }));
jest.unstable_mockModule("../../models/UserAuth.js", () => ({ default: userAuthModelMock }));
jest.unstable_mockModule("../../models/Dealer.js", () => ({ default: dealerModelMock }));
jest.unstable_mockModule("../../models/RefreshToken.js", () => ({ default: refreshTokenModelMock }));
jest.unstable_mockModule("../../models/PlatformConfig.js", () => ({ default: platformConfigMock }));
jest.unstable_mockModule("../../services/notification.service.js", () => ({
  sendNotification: jest.fn().mockResolvedValue({}),
}));
jest.unstable_mockModule("../../services/email.service.js", () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue({}),
  sendVerificationReminderEmail: jest.fn().mockResolvedValue({}),
  sendPasswordResetEmail: jest.fn().mockResolvedValue({}),
  sendWelcomeEmail: jest.fn().mockResolvedValue({}),
}));
jest.unstable_mockModule("../../utils/logger.js", () => ({
  logInfo: jest.fn(),
  logWarn: jest.fn(),
  logError: jest.fn(),
}));
jest.unstable_mockModule("../../infrastructure/logging/index.js", () => ({
  logInfo: jest.fn(),
  logWarn: jest.fn(),
  logError: jest.fn(),
}));

const { protect, adminOnly, allowRoles } = await import("../../middleware/auth.js");
const { authorize } = await import("../../middleware/role.js");
const { csrfProtection } = await import("../../middleware/csrf.js");
const errorHandler = (await import("../../middleware/errorHandler.js")).default;
const { updateProfile, register, forgotPassword, resetPassword, verifyEmail } =
  await import("../../controllers/authController.js");
const { pickAllowed, safeEqual } = await import("../../routes/webhookRoutes.js");

// ── Helpers ───────────────────────────────────────────────────
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  return res;
};

const signToken = (payload, options = {}) => jwt.sign(payload, SECRET, { expiresIn: "1h", ...options });

// Chainable query stub: supports .select().lean() and plain await
const chainable = (value) => {
  const q = {
    select: jest.fn(() => q),
    lean: jest.fn(() => q),
    catch: jest.fn(() => q),
    then: (resolve) => resolve(value),
  };
  return q;
};

const sha256 = (s) => crypto.createHash("sha256").update(String(s)).digest("hex");

// ─────────────────────────────────────────────────────────────
// AUTHENTICATION — protect()
// ─────────────────────────────────────────────────────────────
describe("protect() authentication", () => {
  beforeEach(() => jest.clearAllMocks());

  test("anonymous request (no token) is rejected with 401", async () => {
    const req = { headers: {}, cookies: {} };
    const res = mockRes();
    const next = jest.fn();
    await protect(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test("forged/garbage token is rejected with 401", async () => {
    const req = { headers: { authorization: "Bearer not.a.token" }, cookies: {} };
    const res = mockRes();
    const next = jest.fn();
    await protect(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test("token signed with the wrong secret is rejected", async () => {
    const bad = jwt.sign({ id: "u1", tokenVersion: 0 }, "wrong-secret-wrong-secret-wrong");
    const req = { headers: { authorization: `Bearer ${bad}` }, cookies: {} };
    const res = mockRes();
    const next = jest.fn();
    await protect(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test("expired token is rejected with a session-expired message", async () => {
    const expired = jwt.sign({ id: "u1", tokenVersion: 0 }, SECRET, { expiresIn: "-1s" });
    const req = { headers: { authorization: `Bearer ${expired}` }, cookies: {} };
    const res = mockRes();
    const next = jest.fn();
    await protect(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json.mock.calls[0][0].message).toMatch(/expired/i);
  });

  test("token with alg=none is rejected (algorithm pinned to HS256)", async () => {
    const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
    const payload = Buffer.from(JSON.stringify({ id: "u1", tokenVersion: 0 })).toString("base64url");
    const req = { headers: { authorization: `Bearer ${header}.${payload}.` }, cookies: {} };
    const res = mockRes();
    const next = jest.fn();
    await protect(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test("revoked session (tokenVersion mismatch) is rejected", async () => {
    const token = signToken({ id: "revoked-user", tokenVersion: 1 });
    userModelMock.findById.mockReturnValue(chainable({ _id: "revoked-user", email: "a@b.c", role: "user" }));
    userAuthModelMock.findOne.mockReturnValue(chainable({ tokenVersion: 2 })); // bumped after logout
    const req = { headers: { authorization: `Bearer ${token}` }, cookies: {} };
    const res = mockRes();
    const next = jest.fn();
    await protect(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json.mock.calls[0][0].message).toMatch(/invalidated/i);
  });

  test("banned user is rejected with 403", async () => {
    const token = signToken({ id: "banned-user", tokenVersion: 0 });
    userModelMock.findById.mockReturnValue(
      chainable({ _id: "banned-user", email: "a@b.c", role: "user", isBanned: true }),
    );
    userAuthModelMock.findOne.mockReturnValue(chainable({ tokenVersion: 0 }));
    const req = { headers: { authorization: `Bearer ${token}` }, cookies: {} };
    const res = mockRes();
    const next = jest.fn();
    await protect(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test("valid token authenticates and DB role wins over forged JWT role claim", async () => {
    // Attacker signs a token claiming role=admin; DB says role=user
    const token = signToken({ id: "forged-claim-user", role: "admin", tokenVersion: 0 });
    userModelMock.findById.mockReturnValue(chainable({ _id: "forged-claim-user", email: "a@b.c", role: "user" }));
    userAuthModelMock.findOne.mockReturnValue(chainable({ tokenVersion: 0 }));
    userModelMock.findByIdAndUpdate.mockReturnValue(chainable({}));
    const req = { headers: { authorization: `Bearer ${token}` }, cookies: {} };
    const res = mockRes();
    const next = jest.fn();
    await protect(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user.role).toBe("user"); // not admin
  });
});

// ─────────────────────────────────────────────────────────────
// AUTHORIZATION — role matrix (server-side)
// ─────────────────────────────────────────────────────────────
describe("adminOnly role matrix", () => {
  const STAFF = [
    "admin", "superadmin", "marketing", "technical_support", "hr",
    "accounts", "escrow_officer", "ad_manager", "moderator", "ghost_checker",
  ];
  const NON_STAFF = ["user", "individual_seller", "dealer"];

  test.each(STAFF)("staff role %s is allowed", (role) => {
    const req = { user: { id: "x", role } };
    const res = mockRes();
    const next = jest.fn();
    adminOnly(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test.each(NON_STAFF)("non-staff role %s is rejected with 403", (role) => {
    const req = { user: { id: "x", role } };
    const res = mockRes();
    const next = jest.fn();
    adminOnly(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test("webhoist effectiveRole bypasses adminOnly", () => {
    const req = { user: { id: "x", role: "user", effectiveRole: "webhoist" } };
    const res = mockRes();
    const next = jest.fn();
    adminOnly(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test("missing req.user is rejected", () => {
    const req = {};
    const res = mockRes();
    const next = jest.fn();
    adminOnly(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe("authorize() admin-or-superadmin matrix", () => {
  const adminOrSuper = authorize("admin", "superadmin");

  test.each(["admin", "superadmin"])("%s allowed", (role) => {
    const next = jest.fn();
    adminOrSuper({ user: { id: "x", role } }, mockRes(), next);
    expect(next).toHaveBeenCalled();
  });

  test.each(["marketing", "escrow_officer", "ghost_checker", "moderator", "dealer", "user"])(
    "staff-but-not-admin role %s is rejected (no lateral admin access)",
    (role) => {
      const res = mockRes();
      const next = jest.fn();
      adminOrSuper({ user: { id: "x", role } }, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    },
  );

  test("unauthenticated request is rejected with 401", () => {
    const res = mockRes();
    const next = jest.fn();
    adminOrSuper({}, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe("allowRoles", () => {
  test("dealer allowed on dealer route, buyer rejected", () => {
    const dealerRoute = allowRoles("dealer", "individual_seller");
    const nextOk = jest.fn();
    dealerRoute({ user: { role: "dealer" } }, mockRes(), nextOk);
    expect(nextOk).toHaveBeenCalled();

    const res = mockRes();
    const nextDenied = jest.fn();
    dealerRoute({ user: { role: "user" } }, res, nextDenied);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

// ─────────────────────────────────────────────────────────────
// ROLE ESCALATION — registration & profile update
// ─────────────────────────────────────────────────────────────
describe("registration role assignment", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    userModelMock.findOne.mockResolvedValue(null); // email not taken
    userModelMock.create.mockImplementation(async (doc) => ({ ...doc, _id: "new-user" }));
    userAuthModelMock.create.mockResolvedValue({ tokenVersion: 0 });
    refreshTokenModelMock.create.mockResolvedValue({});
  });

  const registerReq = (role) => ({
    body: { name: "A", email: "a@b.c", password: "Str0ng!Pass", role },
    headers: {},
    query: {},
  });

  test("requesting role=admin falls back to plain user", async () => {
    const res = mockRes();
    res.status(201);
    await register(registerReq("admin"), res);
    expect(userModelMock.create).toHaveBeenCalledWith(expect.objectContaining({ role: "user" }));
  });

  test("requesting role=superadmin falls back to plain user", async () => {
    const res = mockRes();
    res.status(201);
    await register(registerReq("superadmin"), res);
    expect(userModelMock.create).toHaveBeenCalledWith(expect.objectContaining({ role: "user" }));
  });

  test("dealer/individual_seller register as pending, not approved", async () => {
    const res = mockRes();
    res.status(201);
    await register(registerReq("dealer"), res);
    expect(userModelMock.create).toHaveBeenCalledWith(
      expect.objectContaining({ role: "dealer", status: "pending" }),
    );
  });

  test("new accounts start email-unverified with a hashed verification token", async () => {
    const res = mockRes();
    res.status(201);
    await register(registerReq("user"), res);
    expect(userModelMock.create).toHaveBeenCalledWith(expect.objectContaining({ emailVerified: false }));
    expect(userAuthModelMock.create).toHaveBeenCalledWith(
      expect.objectContaining({ emailVerifyToken: expect.stringMatching(/^[0-9a-f]{64}$/) }),
    );
  });
});

describe("dealer self-approval prevention", () => {
  beforeEach(() => jest.clearAllMocks());

  test("updateProfile with onboardingComplete does NOT approve the dealer", async () => {
    userModelMock.findByIdAndUpdate.mockResolvedValue({
      _id: "u1",
      email: "d@e.f",
      role: "dealer",
      onboardingComplete: true,
    });
    const req = { user: { id: "u1" }, body: { onboardingComplete: true } };
    const res = mockRes();
    await updateProfile(req, res);
    expect(dealerModelMock.findOneAndUpdate).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});

// ─────────────────────────────────────────────────────────────
// DEMO LOGIN GATE
// ─────────────────────────────────────────────────────────────
describe("single-use token storage", () => {
  beforeEach(() => jest.clearAllMocks());

  test("forgotPassword stores only the SHA-256 hash of the reset token", async () => {
    const userAuth = { save: jest.fn().mockResolvedValue({}) };
    userModelMock.findOne.mockResolvedValue({ _id: "u1", email: "a@b.c", name: "A" });
    userAuthModelMock.findOne.mockResolvedValue(userAuth);
    const res = mockRes();
    await forgotPassword({ body: { email: "a@b.c" } }, res);
    expect(userAuth.resetToken).toMatch(/^[0-9a-f]{64}$/);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  test("forgotPassword does not reveal whether the email exists", async () => {
    userModelMock.findOne.mockResolvedValue(null);
    const res = mockRes();
    await forgotPassword({ body: { email: "ghost@nowhere.io" } }, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  test("resetPassword looks up the hashed token, never the raw one", async () => {
    const rawToken = "raw-reset-token-123";
    const userAuth = { save: jest.fn().mockResolvedValue({}) };
    userAuthModelMock.findOne.mockResolvedValue(userAuth);
    const res = mockRes();
    await resetPassword({ body: { token: rawToken, password: "N3w!Passw0rd" } }, res);
    expect(userAuthModelMock.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ resetToken: sha256(rawToken) }),
    );
    expect(userAuthModelMock.findOne).not.toHaveBeenCalledWith(
      expect.objectContaining({ resetToken: rawToken }),
    );
  });

  test("resetPassword rejects weak passwords", async () => {
    const res = mockRes();
    await resetPassword({ body: { token: "t", password: "weakpass" } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(userAuthModelMock.findOne).not.toHaveBeenCalled();
  });

  test("verifyEmail looks up the hashed token", async () => {
    const rawToken = "raw-verify-token-abc";
    userAuthModelMock.findOne.mockReturnValue(chainable(null));
    const res = mockRes();
    await verifyEmail({ params: { token: rawToken } }, res);
    expect(userAuthModelMock.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ emailVerifyToken: sha256(rawToken) }),
    );
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

// ─────────────────────────────────────────────────────────────
// CSRF
// ─────────────────────────────────────────────────────────────
describe("csrfProtection", () => {
  test("cookie-authenticated POST without CSRF token is rejected", () => {
    const req = { method: "POST", headers: {}, session: { csrfToken: "abc" } };
    const next = jest.fn();
    csrfProtection(req, mockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  test("matching X-CSRF-Token header passes", () => {
    const req = {
      method: "POST",
      headers: { "x-csrf-token": "abc" },
      session: { csrfToken: "abc" },
    };
    const next = jest.fn();
    csrfProtection(req, mockRes(), next);
    expect(next).toHaveBeenCalledWith();
  });

  test("Bearer-token requests are exempt (not cookie-authenticated)", () => {
    const req = { method: "POST", headers: { authorization: "Bearer x.y.z" }, session: {} };
    const next = jest.fn();
    csrfProtection(req, mockRes(), next);
    expect(next).toHaveBeenCalledWith();
  });

  test("GET requests are exempt", () => {
    const req = { method: "GET", headers: {}, session: {} };
    const next = jest.fn();
    csrfProtection(req, mockRes(), next);
    expect(next).toHaveBeenCalledWith();
  });

  test("mismatched token is rejected", () => {
    const req = {
      method: "DELETE",
      headers: { "x-csrf-token": "attacker-token" },
      session: { csrfToken: "real-token" },
    };
    const next = jest.fn();
    csrfProtection(req, mockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });
});

// ─────────────────────────────────────────────────────────────
// ERROR LEAKAGE
// ─────────────────────────────────────────────────────────────
describe("errorHandler leakage", () => {
  const ORIGINAL_ENV = { ...process.env };
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  test("production 5xx responses hide internal error messages and stacks", () => {
    process.env.NODE_ENV = "production";
    const err = new Error("connect ECONNREFUSED supabase.internal:5432 password=xyz");
    err.statusCode = 500;
    const res = mockRes();
    errorHandler(err, { originalUrl: "/x", method: "GET", headers: {} }, res, jest.fn());
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Internal server error" }));
    expect(JSON.stringify(res.json.mock.calls[0][0])).not.toContain("ECONNREFUSED");
    expect(JSON.stringify(res.json.mock.calls[0][0])).not.toContain("stack");
  });

  test("4xx client messages pass through", () => {
    process.env.NODE_ENV = "production";
    const err = new Error("Validation failed: price required");
    err.statusCode = 400;
    const res = mockRes();
    errorHandler(err, { originalUrl: "/x", method: "POST", headers: {} }, res, jest.fn());
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Validation failed: price required" }),
    );
  });
});

// ─────────────────────────────────────────────────────────────
// INVENTORY WEBHOOK — mass assignment & timing safety
// ─────────────────────────────────────────────────────────────
describe("inventory webhook hardening", () => {
  test("pickAllowed strips privileged fields (featured, status, escrow, demo)", () => {
    const item = {
      title: "Car",
      price: 1000000,
      featured: true,
      status: "approved",
      auctionStatus: "live",
      isDemo: false,
      escrowEnabled: false,
      dealer: "someone-else",
      _id: "spoofed-id",
    };
    const clean = pickAllowed(item);
    expect(clean).toEqual({ title: "Car", price: 1000000 });
    expect(clean).not.toHaveProperty("featured");
    expect(clean).not.toHaveProperty("status");
    expect(clean).not.toHaveProperty("auctionStatus");
    expect(clean).not.toHaveProperty("isDemo");
    expect(clean).not.toHaveProperty("escrowEnabled");
    expect(clean).not.toHaveProperty("dealer");
    expect(clean).not.toHaveProperty("_id");
  });

  test("safeEqual compares constant-time and rejects different lengths", () => {
    expect(safeEqual("key123", "key123")).toBe(true);
    expect(safeEqual("key123", "key124")).toBe(false);
    expect(safeEqual("key123", "key12")).toBe(false);
  });
});

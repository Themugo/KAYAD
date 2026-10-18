// ============================================================
// STAGE 5 (2026-10-19) — registration policy, seller email-verification gate,
// verification-token lifecycle, atomic dealer decisions, and bulk-publish gating.
// Real controllers/middleware/services; persistence is emulated (mocked local runtime).
// ============================================================
import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import crypto from "crypto";

process.env.JWT_SECRET = "j".repeat(48);
process.env.REFRESH_TOKEN_SECRET = "r".repeat(48);
process.env.REQUIRE_EMAIL_VERIFICATION = "false"; // prove the seller gate does NOT depend on provider config
process.env.WEBHOIST_EMAIL = "owner@example.test";
delete process.env.WEBHOIST_EMAILS;
delete process.env.BREVO_API_KEY;

const hash = (t) => crypto.createHash("sha256").update(t).digest("hex");
const rpcCalls = [];
const users = new Map(); const auths = new Map();
const thenable = (get) => { const q = { select: () => q, lean: async () => get(), then: (r, j) => Promise.resolve(get()).then(r, j) }; return q; };
const User = {
  findOne: jest.fn((f) => thenable(() => [...users.values()].find((u) => u.email === f?.email) ?? null)),
  findById: jest.fn((id) => thenable(() => users.get(id) ?? null)),
  findByIdAndUpdate: jest.fn(async () => null),
};
const UserAuth = {
  findOne: jest.fn(() => thenable(() => null)),
  // Atomic consume: filter on hashed token + unexpired, clear in the same step (mirrors the controller's contract).
  findOneAndUpdate: jest.fn(async (filter, update) => {
    const a = [...auths.values()].find((x) => x.emailVerifyToken && x.emailVerifyToken === filter.emailVerifyToken && x.emailVerifyExpire > filter.emailVerifyExpire.$gt);
    if (!a) return null;
    Object.assign(a, update);
    return a;
  }),
};
const rpc = jest.fn(async (fn, args) => {
  rpcCalls.push({ fn, args });
  return { data: { id: "u-new", name: args.p_name, email: args.p_email, role: args.p_role, status: args.p_role === "user" ? "approved" : "pending", email_verified: false }, error: null };
});
jest.unstable_mockModule("../../models/User.js", () => ({ default: User }));
jest.unstable_mockModule("../../models/UserAuth.js", () => ({ default: UserAuth }));
jest.unstable_mockModule("../../models/RefreshToken.js", () => ({ default: { createSession: jest.fn(async () => ({ sessionId: "s" })) } }));
jest.unstable_mockModule("../../models/Dealer.js", () => ({ default: {} }));
jest.unstable_mockModule("../../models/PlatformConfig.js", () => ({ default: {} }));
jest.unstable_mockModule("../../models/Referral.js", () => ({ default: { create: jest.fn(async () => ({})) } }));
jest.unstable_mockModule("../../services/notification.service.js", () => ({ sendNotification: jest.fn(async () => {}) }));
jest.unstable_mockModule("../../services/communicationGateway.service.js", () => ({ deliver: jest.fn(async () => ({ status: "sent" })) }));
jest.unstable_mockModule("../../services/communicationEvents.service.js", () => ({ emitCommunication: jest.fn(), COMMUNICATION_EVENTS: { EMAIL_VERIFICATION: "ev", REGISTRATION: "reg" } }));
jest.unstable_mockModule("../../middleware/accountLockout.js", () => ({ recordFailedAttempt: jest.fn(), recordSuccessfulAttempt: jest.fn() }));
jest.unstable_mockModule("../../infrastructure/logging/index.js", () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn(), logDebug: jest.fn() }));
jest.unstable_mockModule("../../utils/logger.js", () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn(), logDebug: jest.fn() }));
jest.unstable_mockModule("../../utils/supabase.js", () => ({ getSupabase: () => ({ rpc }) }));

const { register, verifyEmail } = await import("../../controllers/authController.js");
const { dealerOnly } = await import("../../middleware/auth.js");
const { __setOnboardingPolicyForTests } = await import("../../services/onboardingPolicy.service.js");

const mkRes = () => { const r = { code: 200, body: null }; r.status = (c) => { r.code = c; return r; }; r.json = (b) => { r.body = b; return r; }; r.cookie = () => r; r.clearCookie = () => r; r.set = () => r; return r; };
const reg = async (body) => { const res = mkRes(); await register({ body: { name: "N", email: "n@example.test", password: "Str0ng!Passw0rd", ...body }, query: {}, headers: {} }, res); return res; };
beforeEach(() => { rpcCalls.length = 0; users.clear(); auths.clear(); jest.clearAllMocks(); __setOnboardingPolicyForTests({}); });

describe("registration obeys the owner's policy BEFORE any side effect", () => {
  test("private seller: enabled ⇒ 201 and starts pending; disabled ⇒ 403 with no database call", async () => {
    expect((await reg({ role: "individual_seller" })).code).toBe(201);
    expect(rpcCalls.at(-1).args.p_role).toBe("individual_seller");
    rpcCalls.length = 0;
    __setOnboardingPolicyForTests({ privateSellerRegistration: "disabled" });
    const r = await reg({ role: "individual_seller" });
    expect([r.code, r.body.code]).toEqual([403, "SELLER_REGISTRATION_DISABLED"]);
    expect(rpcCalls).toHaveLength(0);
  });
  test.each(["approval_required", "self_onboarding"])("dealer mode %s ⇒ 201, stored pending/unverified, no elevated flags passed to the database", async (mode) => {
    __setOnboardingPolicyForTests({ dealerOnboardingMode: mode });
    const r = await reg({ role: "dealer", businessName: "Biz", location: "Nairobi", status: "approved", approved: true, emailVerified: true, isVerifiedDealer: true });
    expect(r.code).toBe(201);
    const args = rpcCalls.at(-1).args;
    expect(args.p_role).toBe("dealer");
    expect(Object.keys(args).sort()).toEqual(["p_business_name", "p_email", "p_email_verify_expire", "p_email_verify_token", "p_location", "p_name", "p_password_hash", "p_phone", "p_referred_by", "p_role"]);
    expect(r.body.user?.status ?? "pending").toBe("pending");
    expect(r.body.user?.emailVerified ?? false).toBe(false);
  });
  test("dealer mode closed ⇒ 403 DEALER_REGISTRATION_CLOSED and no database call", async () => {
    __setOnboardingPolicyForTests({ dealerOnboardingMode: "closed" });
    const r = await reg({ role: "dealer", businessName: "Biz", location: "Nairobi" });
    expect([r.code, r.body.code]).toEqual([403, "DEALER_REGISTRATION_CLOSED"]);
    expect(rpcCalls).toHaveLength(0);
  });
  test("policy unavailable/invalid ⇒ 503 for seller and dealer registration; never opens", async () => {
    for (const source of ["unavailable", "invalid"]) {
      __setOnboardingPolicyForTests({ privateSellerRegistration: "enabled", dealerOnboardingMode: "self_onboarding" }, source);
      for (const body of [{ role: "individual_seller" }, { role: "dealer", businessName: "B", location: "L" }]) {
        const r = await reg(body);
        expect([r.code, r.body.code]).toEqual([503, "ONBOARDING_POLICY_UNAVAILABLE"]);
      }
    }
    expect(rpcCalls).toHaveLength(0);
  });
  test("ordinary buyer registration is NOT governed by seller/dealer policy (even when the policy is unavailable)", async () => {
    __setOnboardingPolicyForTests({}, "unavailable");
    expect((await reg({})).code).toBe(201);
    expect(rpcCalls.at(-1).args.p_role).toBe("user");
  });
  test("the owner's settings change takes effect at runtime without a restart", async () => {
    __setOnboardingPolicyForTests({ dealerOnboardingMode: "closed" });
    expect((await reg({ role: "dealer", businessName: "B", location: "L" })).code).toBe(403);
    __setOnboardingPolicyForTests({ dealerOnboardingMode: "self_onboarding" });
    expect((await reg({ role: "dealer", businessName: "B", location: "L" })).code).toBe(201);
  });
});

describe("seller email verification is ALWAYS required (not provider-gated)", () => {
  const run = (user) => { const r = mkRes(); const next = jest.fn(); dealerOnly({ user }, r, next); return { r, next }; };
  test.each(["individual_seller", "dealer"])("%s with emailVerified=false/undefined/'true'(string) is refused with EMAIL_VERIFICATION_REQUIRED", (role) => {
    for (const emailVerified of [false, undefined, null, "true", 1]) {
      const { r, next } = run({ id: "u", role, effectiveRole: role, emailVerified });
      expect(next).not.toHaveBeenCalled();
      expect([r.code, r.body.code]).toEqual([403, "EMAIL_VERIFICATION_REQUIRED"]);
    }
  });
  test.each(["individual_seller", "dealer"])("%s with emailVerified=true passes", (role) => {
    expect(run({ id: "u", role, effectiveRole: role, emailVerified: true }).next).toHaveBeenCalled();
  });
  test("the platform owner is not blocked; verification grants no extra role (a verified buyer is still not a seller)", () => {
    expect(run({ id: "o", role: "superadmin", effectiveRole: "webhoist", emailVerified: false }).next).toHaveBeenCalled();
    const buyer = run({ id: "b", role: "user", effectiveRole: "user", emailVerified: true });
    expect(buyer.next).not.toHaveBeenCalled();
    expect(buyer.r.code).toBe(403);
  });
});

describe("verification token lifecycle (GET /verify-email/:token)", () => {
  const seed = (token, { expiresInMs = 3600_000, verified = false } = {}) => {
    users.set("u1", { id: "u1", _id: "u1", email: "n@example.test", role: "individual_seller", status: "pending", emailVerified: verified, save: jest.fn(async function () {}) });
    auths.set("u1", { user: "u1", emailVerifyToken: hash(token), emailVerifyExpire: new Date(Date.now() + expiresInMs) });
  };
  const verify = async (token) => { const r = mkRes(); await verifyEmail({ params: { token } }, r); return r; };

  test("valid token verifies the email and nothing else: role and account status are unchanged", async () => {
    seed("good-token");
    const r = await verify("good-token");
    expect(r.code).toBe(200);
    expect(users.get("u1").emailVerified).toBe(true);
    expect(users.get("u1").role).toBe("individual_seller");
    expect(users.get("u1").status).toBe("pending"); // verification ≠ approval
  });
  test("replay: the same token a second time is rejected (single use)", async () => {
    seed("t1");
    expect((await verify("t1")).code).toBe(200);
    expect((await verify("t1")).code).toBe(400);
  });
  test("concurrent use of one token: exactly one request succeeds", async () => {
    seed("race");
    const results = await Promise.all([verify("race"), verify("race"), verify("race")]);
    expect(results.filter((r) => r.code === 200)).toHaveLength(1);
    expect(results.filter((r) => r.code === 400)).toHaveLength(2);
  });
  test("expired token is rejected and does not verify", async () => {
    seed("old", { expiresInMs: -1000 });
    const r = await verify("old");
    expect(r.code).toBe(400);
    expect(users.get("u1").emailVerified).toBe(false);
  });
  test.each(["", "x", "../../etc/passwd", "a".repeat(5000), "' OR 1=1 --"])("malformed token %j is rejected with a generic message", async (t) => {
    seed("real");
    const r = await verify(t);
    expect(r.code).toBe(400);
    expect(JSON.stringify(r.body)).not.toMatch(/real|sql|stack/i);
    expect(users.get("u1").emailVerified).toBe(false);
  });
  test("the stored value is a SHA-256 hash, never the raw token", () => {
    seed("raw-secret");
    expect(auths.get("u1").emailVerifyToken).toBe(hash("raw-secret"));
    expect(auths.get("u1").emailVerifyToken).not.toContain("raw-secret");
  });
});

describe("wording: application received ≠ email verified ≠ approved", () => {
  test("dealer registration response says the application is received and NOT approved", async () => {
    __setOnboardingPolicyForTests({ dealerOnboardingMode: "approval_required" });
    const r = await reg({ role: "dealer", businessName: "B", location: "L" });
    expect(r.body.message).toMatch(/application received/i);
    expect(r.body.message).toMatch(/not approved until/i);
    expect(r.body.message).not.toMatch(/ready/i);
  });
  test("seller registration response mentions review before publication", async () => {
    const r = await reg({ role: "individual_seller" });
    expect(r.body.message).toMatch(/reviewed before they are published/i);
  });
  test("buyer wording is unchanged", async () => {
    expect((await reg({})).body.message).toBe("Account created successfully. Please verify your email before signing in.");
  });
  test("welcome email: dealer/seller copy never says 'ready' or 'approved'; buyer copy is unchanged; names are escaped", async () => {
    const mail = await import("../../services/email.service.js");
    for (const role of ["dealer", "individual_seller"]) {
      const m = mail.buildWelcomeEmail({ name: "Wanjiru", role });
      expect(`${m.text} ${m.html}`).not.toMatch(/account is ready/i);
    }
    expect(mail.buildWelcomeEmail({ name: "Wanjiru", role: "dealer" }).text).toMatch(/not approved|before your dealer account is approved/i);
    expect(mail.buildWelcomeEmail({ name: "Wanjiru" }).text).toMatch(/Your account is ready/);
    expect(mail.buildWelcomeEmail({ name: "<script>x</script>", role: "dealer" }).html).not.toContain("<script>x</script>");
  });
});

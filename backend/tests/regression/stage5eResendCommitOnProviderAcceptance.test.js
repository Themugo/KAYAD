// ============================================================
// STAGE 5E — resend-verification must not replace the stored token when the provider did NOT accept the replacement email,
// regardless of REQUIRE_EMAIL_VERIFICATION. Before this stage the "assert delivery succeeded" step ran only when verification was
// required (BREVO_API_KEY present or REQUIRE_EMAIL_VERIFICATION=true), so with the gate off a failed/undeliverable send still
// committed a new token that nobody received and invalidated the previous (possibly delivered) link — while answering the same generic
// 202. EVIDENCE TIER: M (mocked gateway; nothing is sent).
// ============================================================
import { jest, describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import crypto from "crypto";

process.env.JWT_SECRET = "j".repeat(48);
process.env.NODE_ENV = "test";
process.env.WEBHOIST_EMAIL = "owner@example.test";
process.env.FRONTEND_URL = "https://app.example.test";
process.env.REQUIRE_EMAIL_VERIFICATION = "true";
// Synthetic opaque fixture (no provider prefix, not a credential). Tests only need a non-empty, distinctive string.
const FIXTURE = "fixture-not-a-credential-0001";
process.env.BREVO_API_KEY = FIXTURE;
delete process.env.BREVO_FROM_EMAIL; delete process.env.EMAIL_FROM; delete process.env.BREVO_FROM_NAME;
delete process.env.VERIFICATION_RESEND_COOLDOWN_SECONDS;

const hash = (t) => crypto.createHash("sha256").update(t).digest("hex");
const users = new Map(); const auths = new Map();
const thenable = (get) => { const q = { select: () => q, lean: async () => get(), then: (r, j) => Promise.resolve(get()).then(r, j) }; return q; };
jest.unstable_mockModule("../../models/User.js", () => ({ default: { findOne: jest.fn((f) => thenable(() => [...users.values()].find((u) => u.email === f?.email) ?? null)), findById: jest.fn((id) => thenable(() => users.get(id) ?? null)) } }));
jest.unstable_mockModule("../../models/UserAuth.js", () => ({ default: { findOne: jest.fn((f) => thenable(() => auths.get(String(f?.user)) ?? null)), findOneAndUpdate: jest.fn(async () => null) } }));
jest.unstable_mockModule("../../models/RefreshToken.js", () => ({ default: {} }));
jest.unstable_mockModule("../../models/Dealer.js", () => ({ default: {} }));
jest.unstable_mockModule("../../models/PlatformConfig.js", () => ({ default: {} }));
jest.unstable_mockModule("../../models/Referral.js", () => ({ default: {} }));
jest.unstable_mockModule("../../services/notification.service.js", () => ({ sendNotification: jest.fn(async () => {}) }));
const deliver = jest.fn(async () => ({ status: "sent" }));
jest.unstable_mockModule("../../services/communicationGateway.service.js", () => ({ deliver }));
jest.unstable_mockModule("../../services/communicationEvents.service.js", () => ({ emitCommunication: jest.fn(), COMMUNICATION_EVENTS: { EMAIL_VERIFICATION: "ev", REGISTRATION: "reg" } }));
jest.unstable_mockModule("../../middleware/accountLockout.js", () => ({ recordFailedAttempt: jest.fn(), recordSuccessfulAttempt: jest.fn() }));
const logs = [];
const rec = (lvl) => jest.fn((...a) => logs.push([lvl, JSON.stringify(a, (k, v) => (v instanceof Error ? { message: v.message, code: v.code } : v))]));
jest.unstable_mockModule("../../infrastructure/logging/index.js", () => ({ logError: rec("error"), logWarn: rec("warn"), logInfo: rec("info"), logDebug: rec("debug") }));
jest.unstable_mockModule("../../utils/logger.js", () => ({ logError: rec("error"), logWarn: rec("warn"), logInfo: rec("info"), logDebug: rec("debug") }));
jest.unstable_mockModule("../../utils/supabase.js", () => ({ getSupabase: () => ({ rpc: jest.fn() }) }));

const { resendVerification } = await import("../../controllers/authController.js");
const { sendBrevoEmail, getBrevoConfig } = await import("../../services/emailProvider.service.js");

const mkRes = () => { const r = { code: 200, body: null }; r.status = (c) => { r.code = c; return r; }; r.json = (b) => { r.body = b; return r; }; return r; };
const settle = async () => { for (let i = 0; i < 6; i++) await new Promise((r) => setImmediate(r)); };
const resend = async (email) => { const res = mkRes(); await resendVerification({ body: { email }, headers: {}, ip: "127.0.0.1" }, res); await settle(); return res; };
const DAY = 24 * 60 * 60 * 1000;
const seed = ({ id = "u1", email = "buyer@example.test", verified = false, issuedAgoMs = 10 * 60 * 1000, withAuth = true } = {}) => {
  users.set(id, { _id: id, id, email, name: "Buyer", emailVerified: verified });
  if (withAuth) auths.set(id, { user: id, emailVerifyToken: hash("old-token"), emailVerifyExpire: new Date(Date.now() - issuedAgoMs + DAY), save: jest.fn(async function () { return this; }) });
};

beforeEach(() => { users.clear(); auths.clear(); logs.length = 0; deliver.mockReset(); deliver.mockResolvedValue({ status: "sent" }); delete process.env.VERIFICATION_RESEND_COOLDOWN_SECONDS; });


describe("5E — the replacement token is committed ONLY after provider acceptance, in every configuration", () => {
  const KEY = process.env.BREVO_API_KEY;
  const CASES = [["REQUIRE_EMAIL_VERIFICATION=true", "true"], ["REQUIRE_EMAIL_VERIFICATION=false", "false"], ["REQUIRE_EMAIL_VERIFICATION unset (key present)", undefined], ["no BREVO_API_KEY and REQUIRE_EMAIL_VERIFICATION unset (provider not configured)", "nokey"]];
  const setEnv = (v) => { process.env.BREVO_API_KEY = KEY; if (v === "nokey") { delete process.env.BREVO_API_KEY; delete process.env.REQUIRE_EMAIL_VERIFICATION; } else if (v === undefined) delete process.env.REQUIRE_EMAIL_VERIFICATION; else process.env.REQUIRE_EMAIL_VERIFICATION = v; };
  afterEach(() => { process.env.REQUIRE_EMAIL_VERIFICATION = "true"; process.env.BREVO_API_KEY = KEY; });
  test.each(CASES)("provider failure keeps the previous token — %s", async (_n, v) => {
    setEnv(v);
    seed({ issuedAgoMs: 10 * 60 * 1000 });
    const before = auths.get("u1").emailVerifyToken;
    deliver.mockResolvedValue({ status: "failed", lastError: "BREVO_NOT_CONFIGURED" });
    const res = await resend("buyer@example.test");
    expect(res.code).toBe(202); // still the generic answer (no oracle)
    expect(auths.get("u1").emailVerifyToken).toBe(before);
    expect(auths.get("u1").save).not.toHaveBeenCalled();
  });
  test.each(CASES)("a delivery that is only queued/skipped is not 'accepted' — %s", async (_n, v) => {
    setEnv(v);
    seed({ issuedAgoMs: 10 * 60 * 1000 });
    const before = auths.get("u1").emailVerifyToken;
    deliver.mockResolvedValue({ status: "queued" });
    await resend("buyer@example.test");
    expect(auths.get("u1").emailVerifyToken).toBe(before);
  });
  test.each(CASES)("provider acceptance still commits the replacement exactly once — %s", async (_n, v) => {
    setEnv(v);
    seed({ issuedAgoMs: 10 * 60 * 1000 });
    const before = auths.get("u1").emailVerifyToken;
    deliver.mockResolvedValue({ status: "sent" });
    await resend("buyer@example.test");
    expect(auths.get("u1").emailVerifyToken).not.toBe(before);
    expect(auths.get("u1").save).toHaveBeenCalledTimes(1);
  });
  test("a thrown gateway error keeps the previous token and the response is still the generic 202", async () => {
    seed({ issuedAgoMs: 10 * 60 * 1000 });
    const before = auths.get("u1").emailVerifyToken;
    deliver.mockRejectedValue(new Error("network down"));
    const res = await resend("buyer@example.test");
    expect(res.code).toBe(202);
    expect(auths.get("u1").emailVerifyToken).toBe(before);
  });
});

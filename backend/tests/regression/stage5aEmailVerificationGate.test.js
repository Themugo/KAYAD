// ============================================================
// STAGE 5A (2026-10-19) — GATE B: BREVO EMAIL VERIFICATION — everything verifiable WITHOUT sending a real email.
//
// EVIDENCE TIER: mocked local runtime (provider HTTP stubbed). This file does NOT certify live delivery — that gate is
// reported separately as BLOCKED unless credentials + an authorised mailbox exist. It certifies the parts of the contract
// that the live test would otherwise only exercise by accident:
//   • adapter wire contract (endpoint, auth header, timeout signal, sender), no secret in config/status/errors;
//   • verification URL construction from FRONTEND_URL;
//   • resend: uniform response (no account/verification oracle), per-account cooldown, replacement token only AFTER provider
//     acceptance, old token kept on provider failure;
//   • no raw token / api key in any log call.
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

describe("B1 — resend answers every case identically (no account or verification-state oracle)", () => {
  test("unknown address, verified address, no credential row, cooldown, and a real send are indistinguishable", async () => {
    seed({ id: "v", email: "verified@example.test", verified: true });
    seed({ id: "n", email: "nocred@example.test", withAuth: false });
    seed({ id: "c", email: "cool@example.test", issuedAgoMs: 5_000 });
    seed({ id: "s", email: "send@example.test", issuedAgoMs: 10 * 60 * 1000 });
    const out = [];
    for (const e of ["ghost@example.test", "verified@example.test", "nocred@example.test", "cool@example.test", "send@example.test"]) {
      const r = await resend(e); out.push([r.code, JSON.stringify(r.body)]);
    }
    expect(new Set(out.map((o) => o.join("|"))).size).toBe(1);
    expect(out[0][0]).toBe(202);
    expect(out[0][1]).not.toMatch(/sent to|not found|already verified|cooldown|wait/i);
  });
});

describe("B2 — per-account resend cooldown (default 60 s)", () => {
  test("a resend within the cooldown delivers nothing and leaves the stored token untouched", async () => {
    seed({ issuedAgoMs: 5_000 });
    const before = auths.get("u1").emailVerifyToken;
    await resend("buyer@example.test");
    expect(deliver).not.toHaveBeenCalled();
    expect(auths.get("u1").emailVerifyToken).toBe(before);
  });
  test("just after registration (token issued moments ago) a resend is suppressed too", async () => {
    seed({ issuedAgoMs: 0 });
    await resend("buyer@example.test");
    expect(deliver).not.toHaveBeenCalled();
  });
  test("after the cooldown a resend delivers exactly one email", async () => {
    seed({ issuedAgoMs: 90_000 });
    await resend("buyer@example.test");
    expect(deliver).toHaveBeenCalledTimes(1);
  });
  test("the cooldown is configurable and 0 disables it", async () => {
    process.env.VERIFICATION_RESEND_COOLDOWN_SECONDS = "0";
    seed({ issuedAgoMs: 1_000 });
    await resend("buyer@example.test");
    expect(deliver).toHaveBeenCalledTimes(1);
  });
});

describe("B3 — verification URL, token handling and replacement semantics", () => {
  test("the emailed link is FRONTEND_URL + /verify-email?token=<64 hex>; the stored value is its SHA-256, not the token", async () => {
    seed({ issuedAgoMs: 10 * 60 * 1000 });
    await resend("buyer@example.test");
    const payload = deliver.mock.calls[0][0];
    const m = /https:\/\/app\.example\.test\/verify-email\?token=([0-9a-f]{64})/.exec(payload.text + payload.html);
    expect(m).not.toBeNull();
    expect(payload.recipient).toBe("buyer@example.test");
    expect(payload.templateCode).toBe("account_verification_email");
    expect(auths.get("u1").emailVerifyToken).toBe(hash(m[1]));
    expect(auths.get("u1").emailVerifyToken).not.toBe(m[1]);
    const exp = new Date(auths.get("u1").emailVerifyExpire).getTime() - Date.now();
    expect(exp).toBeGreaterThan(DAY - 60_000); expect(exp).toBeLessThanOrEqual(DAY + 1000);
  });
  test("provider failure keeps the previous token valid (the only usable link is never stranded)", async () => {
    seed({ issuedAgoMs: 10 * 60 * 1000 });
    const before = auths.get("u1").emailVerifyToken;
    deliver.mockResolvedValue({ status: "failed", error: "BREVO_401" });
    await resend("buyer@example.test");
    expect(auths.get("u1").emailVerifyToken).toBe(before);
    expect(auths.get("u1").save).not.toHaveBeenCalled();
  });
  test("no log line contains the raw token, the api key or the verification URL", async () => {
    seed({ issuedAgoMs: 10 * 60 * 1000 });
    deliver.mockRejectedValue(new Error("provider down"));
    await resend("buyer@example.test");
    const link = /token=([0-9a-f]{64})/.exec(JSON.stringify(deliver.mock.calls[0][0]))?.[1];
    expect(link).toBeTruthy();
    const all = logs.map((l) => l[1]).join("\n");
    expect(all).not.toContain(link);
    expect(all).not.toContain(process.env.BREVO_API_KEY);
    expect(all).not.toMatch(/verify-email\?token=/);
  });
});

describe("B4 — Brevo adapter wire contract (HTTP stubbed; nothing is sent)", () => {
  let fetchSpy;
  beforeEach(() => { fetchSpy = jest.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true, status: 201, json: async () => ({ messageId: "<m@brevo>" }) }); });
  afterEach(() => fetchSpy.mockRestore());

  test("POST https://api.brevo.com/v3/smtp/email with api-key header, JSON body, default sender and a 30 s abort signal", async () => {
    const r = await sendBrevoEmail({ to: "buyer@example.test", subject: "Verify", html: "<p>x</p>" });
    expect(r).toMatchObject({ provider: "brevo", id: "<m@brevo>" });
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://api.brevo.com/v3/smtp/email");
    expect(init.method).toBe("POST");
    expect(init.headers["api-key"]).toBe(process.env.BREVO_API_KEY);
    expect(init.signal).toBeInstanceOf(AbortSignal);
    const body = JSON.parse(init.body);
    expect(body.sender).toEqual({ email: "noreply@kayad.space", name: "KAYAD" });
    expect(body.to).toEqual([{ email: "buyer@example.test" }]);
  });
  test("BREVO_FROM_EMAIL / BREVO_FROM_NAME override the sender", async () => {
    process.env.BREVO_FROM_EMAIL = "verify@kayad.example"; process.env.BREVO_FROM_NAME = "KAYAD Verify";
    try {
      await sendBrevoEmail({ to: "a@example.test", subject: "s", text: "t", from: undefined, fromName: undefined });
      expect(JSON.parse(fetchSpy.mock.calls[0][1].body).sender).toEqual({ email: "verify@kayad.example", name: "KAYAD Verify" });
    } finally { delete process.env.BREVO_FROM_EMAIL; delete process.env.BREVO_FROM_NAME; }
  });
  test("a 4xx/5xx from the provider becomes BREVO_<status>; the error never contains the api key", async () => {
    fetchSpy.mockResolvedValue({ ok: false, status: 401, json: async () => ({ message: "Key not found", code: "unauthorized" }) });
    let err; try { await sendBrevoEmail({ to: "a@example.test", subject: "s", text: "t" }); } catch (e) { err = e; }
    expect(err).toBeTruthy();
    expect(err.code).toBe("BREVO_401");
    expect(String(err.message) + JSON.stringify(logs)).not.toContain(process.env.BREVO_API_KEY);
  });
  test("an unconfigured provider fails BEFORE any network call", async () => {
    const k = process.env.BREVO_API_KEY; delete process.env.BREVO_API_KEY;
    try {
      await expect(sendBrevoEmail({ to: "a@example.test", subject: "s", text: "t" })).rejects.toThrow(/not configured/);
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally { process.env.BREVO_API_KEY = k; }
  });
  test("the status/config object exposes presence flags only, never the secret", () => {
    const cfg = getBrevoConfig();
    expect(cfg).toMatchObject({ provider: "brevo", configured: true, from: "noreply@kayad.space", fromName: "KAYAD", webhookConfigured: false });
    expect(JSON.stringify(cfg)).not.toContain(process.env.BREVO_API_KEY);
  });
});

// ============================================================
// STAGE 5E.1 — the canonical Brevo adapter with its REAL retry/circuit policy, and the unset-sender default.
// HTTP is stubbed (nothing is sent). BREVO_FROM_EMAIL is deliberately UNSET before the modules load.
// EVIDENCE TIER: M.
// ============================================================
import { jest, describe, test, expect, beforeEach, afterAll } from "@jest/globals";

process.env.NODE_ENV = "test";
const FIXTURE = "fixture-not-a-credential-0003";
process.env.BREVO_API_KEY = FIXTURE;
delete process.env.BREVO_FROM_EMAIL; delete process.env.EMAIL_FROM; delete process.env.BREVO_FROM_NAME;

const logs = [];
const rec = (lvl) => jest.fn((...a) => logs.push([lvl, JSON.stringify(a, (k, v) => (v instanceof Error ? { message: v.message, code: v.code } : v))]));
const realLogger = await import("../../utils/logger.js");
jest.unstable_mockModule("../../utils/logger.js", () => ({ ...realLogger, logError: rec("error"), logWarn: rec("warn"), logInfo: rec("info"), logDebug: rec("debug") }));

const { sendBrevoEmail, getBrevoConfig } = await import("../../services/emailProvider.service.js");
const { sendRawEmail } = await import("../../services/email.service.js");

const realFetch = global.fetch; let calls = [];
const stub = (impl) => { calls = []; global.fetch = jest.fn(async (url, init) => { calls.push({ url, init }); return impl(calls.length); }); };
afterAll(() => { global.fetch = realFetch; });
beforeEach(() => { logs.length = 0; process.env.BREVO_API_KEY = FIXTURE; });
const okRes = () => ({ ok: true, status: 201, json: async () => ({ messageId: "<m@brevo.test>" }) });
const bad = (status) => ({ ok: false, status, json: async () => ({ message: "no" }) });

describe("R1 — unset sender", () => {
  test("with the API key set and BREVO_FROM_EMAIL unset, the From address falls back to the built-in default (Brevo must have it validated)", async () => {
    stub(okRes); const r = await sendRawEmail({ to: "x@example.test", subject: "s", html: "<p>h</p>" });
    expect(r.success).toBe(true); expect(JSON.parse(calls[0].init.body).sender.email).toBe("noreply@kayad.space");
  });
  test("the configuration object reports presence flags only", () => {
    const c = getBrevoConfig(); expect(c.configured).toBe(true); expect(JSON.stringify(c)).not.toContain(FIXTURE);
  });
});

describe("R2 — real retry policy (back-off sleeps are real, ~1-4 s)", () => {
  test("a transient failure then success is accepted on the retry", async () => {
    stub((n) => (n === 1 ? bad(503) : okRes())); const r = await sendBrevoEmail({ to: "x@example.test", subject: "s", text: "t" });
    expect(r.provider).toBe("brevo"); expect(calls).toHaveLength(2);
  }, 30000);
  test("a permanent 401 (invalid key) is retried like any other failure, surfaces as BREVO_401 and never leaks the key", async () => {
    stub(() => bad(401)); let err;
    try { await sendBrevoEmail({ to: "x@example.test", subject: "s", text: "t" }); } catch (e) { err = e; }
    expect(err.code).toBe("BREVO_401"); expect(calls.length).toBeGreaterThan(1); // documented inefficiency: 4xx is not treated as non-retryable
    expect(String(err.message) + logs.map((l) => l[1]).join("\n")).not.toContain(FIXTURE);
  }, 30000);
  test("a missing key fails before any network call", async () => {
    delete process.env.BREVO_API_KEY; stub(okRes);
    await expect(sendBrevoEmail({ to: "x@example.test", subject: "s" })).rejects.toThrow(/not configured/i); expect(calls).toHaveLength(0);
  });
  test("missing recipient or subject fails before any network call", async () => {
    stub(okRes); await expect(sendBrevoEmail({ subject: "s" })).rejects.toThrow(/recipient/i); await expect(sendBrevoEmail({ to: "x@example.test" })).rejects.toThrow(/subject/i); expect(calls).toHaveLength(0);
  });
});

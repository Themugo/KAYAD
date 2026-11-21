// STAGE 5C — one-time codes never reach the delivery ledger; the circuit breaker is per service.
import { describe, test, expect, jest } from "@jest/globals";
jest.unstable_mockModule("../../utils/logger.js", () => ({ logInfo: jest.fn(), logWarn: jest.fn(), logError: jest.fn(), logDebug: jest.fn() }));
const { persistedDeliveryMetadata } = await import("../../services/communicationGateway.service.js");
const { withRetry, createServiceConfig } = await import("../../utils/retry.js");

describe("ledger metadata redaction", () => {
  const body = { subject: "Your KAYAD verification code", message: "Your KAYAD verification code is: 123456.", text: "code 123456", html: "<b>123456</b>" };
  test("category 'otp' never persists the rendered body, whatever the event name", () => {
    for (const eventType of ["account.phone_verification", "otp", "anything"]) {
      const m = persistedDeliveryMetadata({ eventType, category: "otp", metadata: { purpose: "x", message: "123456", otpChallengeId: "c1" }, ...body });
      expect(JSON.stringify(m)).not.toContain("123456");
      expect(m.sensitiveBodyOmitted).toBe(true);
    }
  });
  test("token-bearing account events stay redacted", () => {
    for (const eventType of ["account.email_verification", "account.password_reset", "owner.invitation"]) {
      expect(persistedDeliveryMetadata({ eventType, category: "transactional", metadata: {}, ...body, html: "https://x/verify?token=abc" }).sensitiveBodyOmitted).toBe(true);
    }
  });
  test("ordinary transactional notices keep their content for support (unchanged behaviour)", () => {
    const m = persistedDeliveryMetadata({ eventType: "auction.won", category: "transactional", metadata: {}, subject: "You won", message: "hi", text: "hi", html: "<p>hi</p>" });
    expect(m.message).toBe("hi");
  });
});

describe("withRetry circuit breaker isolation", () => {
  const cfg = (name) => ({ ...createServiceConfig(name, { circuitBreaker: true }), retries: 0, circuitThreshold: 2, circuitResetMs: 60000, baseDelayMs: 1, enableLogging: false, enableMetrics: false });
  test("two services that pass anonymous callbacks no longer share one circuit", async () => {
    const sms = cfg("svc-sms-test"), mail = cfg("svc-mail-test");
    for (let i = 0; i < 3; i++) await withRetry(async () => { throw new Error("sms down"); }, sms).catch(() => {});
    await expect(withRetry(async () => { throw new Error("x"); }, sms)).rejects.toThrow(/Circuit breaker open for svc-sms-test/);
    // the e-mail path is unaffected by the SMS outage
    await expect(withRetry(async () => "sent", mail)).resolves.toBe("sent");
  });
});

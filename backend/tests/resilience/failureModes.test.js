// ============================================================
// PHASE 11 — FAILURE MODE AND RECOVERY TESTS
// Verifies the app fails safely when external dependencies fail:
//   • M-Pesa API failure/timeout/500/malformed → fail CLOSED,
//     never a fabricated success shape
//   • Bid security: STK failure never creates a "success" deposit;
//     duplicate callbacks acknowledged idempotently
//   • Payment service: no phantom pending payment on STK failure
//   • Notification retry recovery job works against the real schema
//   • withRetry: timeouts, transient retries, fail-closed fallbacks
//
// NOTE on ordering: mpesaService captures env config at module load
// and shares a circuit breaker across calls, so the happy-path tests
// run first; failure tests accumulate circuit state intentionally
// (the circuit opening is itself part of what is being verified).
// ============================================================

import { describe, test, expect, beforeEach, afterEach, jest } from "@jest/globals";

// M-Pesa config must be in place BEFORE mpesaService is imported
// (it snapshots process.env at module load).
process.env.MPESA_ENV = "sandbox";
process.env.MPESA_CONSUMER_KEY = "ck";
process.env.MPESA_CONSUMER_SECRET = "cs";
process.env.MPESA_SHORTCODE = "174379";
process.env.MPESA_PASSKEY = "pk";
process.env.MPESA_CALLBACK_URL = "https://api.kayad.space/api/payments/callback";
process.env.KAYAD_MASTER_PAYBILL = "174379";

const ORIGINAL_ENV = { ...process.env };

// ── Shared db mock ────────────────────────────────────────────
const dbMock = {
  findById: jest.fn(),
  findOne: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  updateMany: jest.fn(),
  count: jest.fn(),
};
jest.unstable_mockModule("../../db/index.js", () => dbMock);

jest.unstable_mockModule("../../utils/logger.js", () => ({
  logInfo: jest.fn(),
  logWarn: jest.fn(),
  logError: jest.fn(),
  logDebug: jest.fn(),
}));
jest.unstable_mockModule("../../config/metrics.js", () => ({
  recordMetric: jest.fn(),
  setGauge: jest.fn(),
  incrementCounter: jest.fn(),
}));
jest.unstable_mockModule("../../config/alerting.js", () => ({
  triggerAlert: jest.fn(),
}));
const queueMock = { addNotificationJob: jest.fn().mockResolvedValue({ id: "job-1" }) };
jest.unstable_mockModule("../../queues/notificationQueue.js", () => queueMock);
jest.unstable_mockModule("../../services/notification.service.js", () => ({
  sendNotification: jest.fn().mockResolvedValue({}),
}));
jest.unstable_mockModule("../../services/receiptService.js", () => ({
  sendDigitalReceipt: jest.fn().mockResolvedValue({}),
}));
jest.unstable_mockModule("../../utils/io.js", () => ({ getIO: jest.fn(() => null) }));

// axios mock — controllable per-test (timeout, 500, malformed, reset)
const axiosMock = {
  get: jest.fn(),
  post: jest.fn(),
};
jest.unstable_mockModule("axios", () => ({ default: axiosMock }));

const { stkPush } = await import("../../services/mpesaService.js");
const { initiateBidSecurity, handleBidSecurityCallback } = await import("../../services/bidSecurityService.js");
const { initiatePayment } = await import("../../services/paymentService.js");
const notificationRetry = await import("../../services/notificationRetryService.js");
const { withRetry } = await import("../../utils/retry.js");

// ─────────────────────────────────────────────────────────────
// HAPPY PATH FIRST (circuit breaker state shared across tests)
// ─────────────────────────────────────────────────────────────
// Fully reset axios mocks between tests so resolved values never leak
// across tests (jest.clearAllMocks keeps implementations).
const resetAxios = () => {
  axiosMock.get.mockReset();
  axiosMock.post.mockReset();
};

describe("successful STK flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetAxios();
  });

  test("bid security with reachable M-Pesa → pending deposit with real checkout id", async () => {
    axiosMock.get.mockResolvedValue({ data: { access_token: "tok" } });
    axiosMock.post.mockResolvedValue({ data: { CheckoutRequestID: "ws_real_1", ResponseCode: "0" } });
    dbMock.findById.mockResolvedValue({ id: "auc-1", bidSecurityAmount: 5000, carId: "car-1", auctionStatus: "live" });
    dbMock.findOne.mockResolvedValue(null); // no platform config override
    dbMock.create.mockImplementation(async (_t, data) => ({ id: "tx-1", ...data }));

    const result = await initiateBidSecurity({ auctionId: "auc-1", userId: "u1", phone: "0712345678", amount: 5000 });
    expect(result.success).toBe(true);
    expect(result.mode).toBe("mpesa");
    expect(result.checkoutID).toBe("ws_real_1");
    expect(result.transaction.status).toBe("pending");
    expect(result.checkoutID.startsWith("fallback_")).toBe(false);
  }, 60000);
});

// ─────────────────────────────────────────────────────────────
// M-PESA API FAILURE MODES — never fake success
// ─────────────────────────────────────────────────────────────
describe("M-Pesa STK push failure modes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetAxios();
  });
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  test("API 500 on token fetch → throws, never returns a success-shaped object", async () => {
    axiosMock.get.mockRejectedValue(Object.assign(new Error("Request failed with status code 500"), { response: { status: 500 } }));
    let caught = null;
    try {
      await stkPush("0712345678", 1000);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeTruthy();
    expect(caught.CheckoutRequestID).toBeUndefined();
    expect(caught.ResponseCode).toBeUndefined();
  }, 60000);

  test("API timeout → throws honest failure (no fabricated CheckoutRequestID)", async () => {
    axiosMock.get.mockRejectedValue(Object.assign(new Error("timeout of 15000ms exceeded"), { code: "ECONNABORTED" }));
    await expect(stkPush("0712345678", 1000)).rejects.toThrow();
  }, 60000);

  test("malformed response (HTML error page) → throws honest failure", async () => {
    axiosMock.get.mockResolvedValue({ data: "<html>Bad Gateway</html>" });
    await expect(stkPush("0712345678", 1000)).rejects.toThrow();
  }, 60000);

  test("network interruption (ECONNRESET) → throws honest failure", async () => {
    axiosMock.get.mockRejectedValue(Object.assign(new Error("socket hang up"), { code: "ECONNRESET" }));
    await expect(stkPush("0712345678", 1000)).rejects.toThrow();
  }, 60000);

  test("HTTP 200 with Daraja error body (non-zero ResponseCode) → honest failure", async () => {
    axiosMock.get.mockResolvedValue({ data: { access_token: "tok" } });
    axiosMock.post.mockResolvedValue({ data: { ResponseCode: "1", errorMessage: "Rejected" } });
    await expect(stkPush("0712345678", 1000)).rejects.toThrow(/malformed|rejected/i);
  }, 60000);

  test("HTTP 200 STK response missing CheckoutRequestID → honest failure", async () => {
    axiosMock.get.mockResolvedValue({ data: { access_token: "tok" } });
    axiosMock.post.mockResolvedValue({ data: { ResponseCode: "0" } });
    await expect(stkPush("0712345678", 1000)).rejects.toThrow(/malformed/i);
  }, 60000);

  test("unconfigured M-Pesa (missing keys) → explicit NOT_CONFIGURED error", async () => {
    await expect(
      stkPush("0712345678", 1000, { consumerKey: undefined, consumerSecret: undefined }),
    ).rejects.toThrow(/not configured/i);
  }, 60000);
});

// ─────────────────────────────────────────────────────────────
// BID SECURITY — deposit must never be falsely marked paid
// ─────────────────────────────────────────────────────────────
describe("bid security failure modes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetAxios();
  });
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  test("STK failure in production → failure result, NO transaction created", async () => {
    process.env.NODE_ENV = "production";
    axiosMock.get.mockRejectedValue(new Error("Request failed with status code 500"));
    dbMock.findById.mockResolvedValue({ id: "auc-1", bidSecurityAmount: 5000, carId: "car-1", auctionStatus: "live" });
    dbMock.findOne.mockResolvedValue(null);

    const result = await initiateBidSecurity({ auctionId: "auc-1", userId: "u1", phone: "0712345678", amount: 5000 });
    expect(result.success).toBe(false);
    expect(dbMock.create).not.toHaveBeenCalled();
  }, 60000);

  test("STK failure in development → fails closed and creates no transaction", async () => {
    process.env.NODE_ENV = "development";
    axiosMock.get.mockRejectedValue(new Error("down"));
    dbMock.findById.mockResolvedValue({ id: "auc-1", bidSecurityAmount: 5000, carId: "car-1", auctionStatus: "live" });
    dbMock.findOne.mockResolvedValue(null);
    dbMock.create.mockImplementation(async (_t, data) => ({ id: "tx-1", ...data }));

    const result = await initiateBidSecurity({ auctionId: "auc-1", userId: "u1", phone: "0712345678", amount: 5000 });
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/unable to initiate deposit payment/i);
    expect(dbMock.create).not.toHaveBeenCalled();
  }, 60000);

  test("callback: failed resultCode marks transaction failed via update (no .save crash)", async () => {
    dbMock.findOne.mockResolvedValue({ id: "tx-1", status: "pending", amount: 5000, user: "u1" });
    dbMock.update.mockResolvedValue({});
    const result = await handleBidSecurityCallback({ checkoutRequestID: "ws_1", resultCode: 1032, mpesaReceipt: null });
    expect(result.success).toBe(false);
    expect(dbMock.update).toHaveBeenCalledWith("transactions", "tx-1", expect.objectContaining({ status: "failed" }));
  });

  test("callback: duplicate success callback is acknowledged idempotently (no re-processing)", async () => {
    dbMock.findOne.mockResolvedValue({ id: "tx-1", status: "success", amount: 5000, user: "u1" });
    const result = await handleBidSecurityCallback({ checkoutRequestID: "ws_1", resultCode: 0, mpesaReceipt: "QGH1" });
    expect(result.duplicate).toBe(true);
    expect(dbMock.update).not.toHaveBeenCalled();
  });

  test("callback: unknown checkout id → failure, no writes", async () => {
    dbMock.findOne.mockResolvedValue(null);
    const result = await handleBidSecurityCallback({ checkoutRequestID: "unknown", resultCode: 0, mpesaReceipt: "QGH1" });
    expect(result.success).toBe(false);
    expect(dbMock.update).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────
// PAYMENT SERVICE — STK failure must not create phantom payments
// ─────────────────────────────────────────────────────────────
describe("payment initiation failure modes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetAxios();
  });
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  test("M-Pesa down in production → throws, no payment record created", async () => {
    process.env.NODE_ENV = "production";
    axiosMock.get.mockRejectedValue(new Error("Request failed with status code 503"));
    dbMock.findOne.mockResolvedValue(null); // no existing pending payment / no config override

    await expect(
      initiatePayment({ userId: "u1", carId: "c1", phone: "0712345678", amount: 500000, type: "escrow" }),
    ).rejects.toThrow();
    expect(dbMock.create).not.toHaveBeenCalled();
  }, 60000);
});

// ─────────────────────────────────────────────────────────────
// RETRY UTILITY — fallback must propagate failures honestly
// ─────────────────────────────────────────────────────────────
describe("withRetry failure semantics", () => {
  test("a fallback that throws propagates the error (fail closed)", async () => {
    const fn = jest.fn().mockRejectedValue(new Error("downstream dead"));
    const fallback = jest.fn().mockRejectedValue(Object.assign(new Error("unavailable"), { code: "MPESA_UNAVAILABLE" }));
    await expect(
      withRetry(fn, { retries: 0, fallback, key: "test-fail-closed-" + Date.now(), enableMetrics: false, enableLogging: false }),
    ).rejects.toThrow("unavailable");
  });

  test("timeout produces a TIMEOUT error code", async () => {
    const slow = () => new Promise((r) => setTimeout(r, 5000));
    await expect(
      withRetry(slow, { retries: 0, timeoutMs: 50, key: "test-timeout-" + Date.now(), enableMetrics: false, enableLogging: false }),
    ).rejects.toMatchObject({ code: "TIMEOUT" });
  });

  test("retries a transient failure then succeeds", async () => {
    let calls = 0;
    const fn = jest.fn().mockImplementation(() => {
      calls++;
      if (calls < 3) return Promise.reject(new Error("flake"));
      return Promise.resolve("ok");
    });
    const result = await withRetry(fn, {
      retries: 3, baseDelayMs: 1, maxDelayMs: 2,
      key: "test-flake-" + Date.now(), enableMetrics: false, enableLogging: false,
    });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
  });
});

// ─────────────────────────────────────────────────────────────
// NOTIFICATION RETRY — recovery job against the real schema
// ─────────────────────────────────────────────────────────────
describe("notification retry recovery job", () => {
  beforeEach(() => jest.clearAllMocks());

  test("retries a failed audit: re-queues job and marks audit retry_queued", async () => {
    dbMock.findById
      .mockResolvedValueOnce({ id: "a1", status: "failed", channel: "email", notificationId: "n1" })
      .mockResolvedValueOnce({ id: "n1", userId: "u1", title: "T", message: "M", type: "escrow" });
    dbMock.update.mockResolvedValue({});

    const result = await notificationRetry.retryFailedNotification("a1");
    expect(result.success).toBe(true);
    expect(queueMock.addNotificationJob).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "u1", title: "T", metadata: expect.objectContaining({ isRetry: true }) }),
    );
    expect(dbMock.update).toHaveBeenCalledWith(
      "notification_audits",
      "a1",
      expect.objectContaining({ status: "retry_queued" }),
    );
  });

  test("refuses to retry an audit that is not failed", async () => {
    dbMock.findById.mockResolvedValue({ id: "a1", status: "sent", notificationId: "n1" });
    const result = await notificationRetry.retryFailedNotification("a1");
    expect(result.success).toBe(false);
    expect(queueMock.addNotificationJob).not.toHaveBeenCalled();
  });

  test("missing audit → graceful failure, no crash", async () => {
    dbMock.findById.mockResolvedValue(null);
    const result = await notificationRetry.retryFailedNotification("missing");
    expect(result.success).toBe(false);
    expect(queueMock.addNotificationJob).not.toHaveBeenCalled();
  });

  test("audit whose linked notification was deleted → graceful failure", async () => {
    dbMock.findById
      .mockResolvedValueOnce({ id: "a1", status: "failed", channel: "sms", notificationId: "gone" })
      .mockResolvedValueOnce(null);
    const result = await notificationRetry.retryFailedNotification("a1");
    expect(result.success).toBe(false);
    expect(queueMock.addNotificationJob).not.toHaveBeenCalled();
  });

  test("queue unavailable → error propagates (no false success)", async () => {
    dbMock.findById
      .mockResolvedValueOnce({ id: "a1", status: "failed", channel: "email", notificationId: "n1" })
      .mockResolvedValueOnce({ id: "n1", userId: "u1", title: "T", message: "M", type: "escrow" });
    dbMock.update.mockResolvedValue({});
    queueMock.addNotificationJob.mockRejectedValueOnce(new Error("Redis connection refused"));
    await expect(notificationRetry.retryFailedNotification("a1")).rejects.toThrow("Redis connection refused");
  });

  test("bulk retry isolates per-item failures (one bad item does not stop the batch)", async () => {
    dbMock.findAll.mockResolvedValue([
      { id: "a1", status: "failed", channel: "email" },
      { id: "a2", status: "failed", channel: "sms" },
    ]);
    dbMock.findById
      .mockResolvedValueOnce({ id: "a1", status: "failed", channel: "email", notificationId: "n1" })
      .mockResolvedValueOnce({ id: "n1", userId: "u1", title: "T", message: "M", type: "escrow" })
      .mockResolvedValueOnce({ id: "a2", status: "failed", channel: "sms", notificationId: "gone" })
      .mockResolvedValueOnce(null);
    dbMock.update.mockResolvedValue({});

    const result = await notificationRetry.bulkRetryFailedNotifications();
    expect(result.total).toBe(2);
    expect(result.successCount).toBe(1);
    expect(result.failureCount).toBe(1);
  });

  test("shouldRetry reflects audit status", async () => {
    dbMock.findById.mockResolvedValueOnce({ id: "a1", status: "failed" });
    expect(await notificationRetry.shouldRetry("a1")).toBe(true);
    dbMock.findById.mockResolvedValueOnce({ id: "a2", status: "sent" });
    expect(await notificationRetry.shouldRetry("a2")).toBe(false);
  });
});

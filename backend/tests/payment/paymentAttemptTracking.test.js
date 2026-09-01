// ============================================================
// PHASE 7 — PAYMENT ATTEMPT TRACKING
// Verifies that each real STK initiation records an enrichment row
// without allowing tracking failures to block the payment itself.
// ============================================================

import { describe, test, expect, beforeEach, jest } from "@jest/globals";

const dbMock = {
  findById: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
};

jest.unstable_mockModule("../../db/index.js", () => dbMock);
jest.unstable_mockModule("../../services/mpesaService.js", () => ({
  stkPush: jest.fn().mockResolvedValue({ CheckoutRequestID: "ws_CO_PHASE7", MerchantRequestID: "29115-123" }),
}));
jest.unstable_mockModule("../../services/receiptService.js", () => ({
  sendDigitalReceipt: jest.fn(),
}));
jest.unstable_mockModule("../../utils/io.js", () => ({ getIO: jest.fn(() => null) }));
jest.unstable_mockModule("../../utils/logger.js", () => ({
  logWarn: jest.fn(),
}));

const { initiatePayment } = await import("../../services/paymentService.js");

beforeEach(() => {
  jest.clearAllMocks();
  dbMock.findOne.mockImplementation(async (table) => {
    if (table === "payments") return null;
    if (table === "payment_providers") return { id: "provider-1" };
    return null;
  });
  dbMock.create.mockImplementation(async (table, data) => ({ id: `${table}-1`, ...data }));
});

describe("initiatePayment payment_attempt tracking", () => {
  test("creates a pending payment_attempt linked to the real payment and checkout request", async () => {
    const result = await initiatePayment({
      userId: "user-1",
      carId: "car-1",
      type: "escrow",
      amount: 500000,
      phone: "0712345678",
    });

    expect(result.success).toBe(true);
    expect(dbMock.create).toHaveBeenCalledWith(
      "payment_attempts",
      expect.objectContaining({
        paymentId: "payments-1",
        providerId: "provider-1",
        attemptNumber: 1,
        status: "pending",
        checkoutRequestId: "ws_CO_PHASE7",
      }),
    );
  });

  test("payment initiation remains successful when attempt tracking fails", async () => {
    dbMock.create.mockImplementation(async (table, data) => {
      if (table === "payment_attempts") throw new Error("tracking table unavailable");
      return { id: `${table}-1`, ...data };
    });

    const result = await initiatePayment({
      userId: "user-1",
      carId: "car-1",
      type: "escrow",
      amount: 500000,
      phone: "0712345678",
    });

    expect(result.success).toBe(true);
    expect(result.checkoutID).toBe("ws_CO_PHASE7");
  });
});

// ============================================================
// STAGE 2 API CONTRACT CONVERGENCE — notification-layer finding
//
// communicationGateway.service.js::recordDelivery created the row via
// create("communication_deliveries", {...}) and assigned it to `row`, but
// returned the undefined identifier `delivery` instead. Every call that
// actually inserted a new row (i.e. every delivery that wasn't an
// idempotency-key cache hit) threw a ReferenceError. deliver() only recovers
// from a Postgres unique-violation (code 23505); a ReferenceError has no
// .code, so it propagated out to every caller — all of which swallow it with
// .catch(() => {}) or .catch(e => console.warn(...)) — so no
// communication_deliveries row was ever durably recorded for a fresh
// delivery, and no email/SMS/WhatsApp was ever actually sent through this
// path, while callers observed no error at all.
// ============================================================

import { describe, test, expect, jest, beforeEach } from "@jest/globals";

const createMock = jest.fn();
const updateMock = jest.fn();
const findByIdMock = jest.fn();
const findOneMock = jest.fn();

jest.unstable_mockModule("../../db/index.js", () => ({
  create: createMock,
  update: updateMock,
  findById: findByIdMock,
  findOne: findOneMock,
}));
jest.unstable_mockModule("../../services/email.service.js", () => ({
  sendRawEmail: jest.fn().mockResolvedValue({ success: true, id: "email-1" }),
}));
jest.unstable_mockModule("../../utils/sms.js", () => ({
  sendSMS: jest.fn().mockResolvedValue({ id: "sms-1" }),
}));
jest.unstable_mockModule("../../services/whatsappProvider.service.js", () => ({
  sendTwilioWhatsApp: jest.fn().mockResolvedValue({ id: "wa-1" }),
}));
jest.unstable_mockModule("../../services/communicationRollout.service.js", () => ({
  isCommunicationEnabled: jest.fn().mockResolvedValue(true),
}));
jest.unstable_mockModule("../../utils/logger.js", () => ({
  logError: jest.fn(),
  logInfo: jest.fn(),
}));
jest.unstable_mockModule("../../utils/io.js", () => ({
  getIO: jest.fn().mockReturnValue(null),
}));
jest.unstable_mockModule("../../middleware/distributedLock.js", () => ({
  withLock: jest.fn(async (resource, fn) => fn()),
}));

const { recordDelivery, deliver } = await import("../../services/communicationGateway.service.js");

describe("recordDelivery — returns the created row, not an undefined identifier", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns the actual created row (regression: previously returned `undefined` via a ReferenceError on an unbound identifier)", async () => {
    const createdRow = { id: "delivery-1", channel: "email", status: "queued" };
    createMock.mockResolvedValue(createdRow);

    const result = await recordDelivery({
      userId: "user-1",
      channel: "email",
      recipient: "someone@example.com",
      provider: "brevo",
    });

    expect(result).toBe(createdRow);
    expect(result.id).toBe("delivery-1");
  });

  test("deliver() for a fresh (non-cached) delivery no longer throws a ReferenceError and actually sends", async () => {
    const createdRow = { id: "delivery-2", channel: "email", status: "queued", retryCount: 0 };
    createMock.mockResolvedValue(createdRow);
    findOneMock.mockResolvedValue(null); // no idempotency cache hit
    updateMock.mockImplementation(async (table, id, patch) => ({ id, ...createdRow, ...patch }));

    const result = await deliver({
      channel: "email",
      recipient: "someone@example.com",
      subject: "Hello",
      html: "<p>hi</p>",
      text: "hi",
      idempotencyKey: "registration.completed:user-1:email",
    });

    // Confirms recordDelivery's return value actually reached deliver()'s
    // delivery.id usage below it instead of throwing before ever getting here.
    expect(result.status).toBe("sent");
    expect(updateMock).toHaveBeenCalledWith(
      "communication_deliveries",
      "delivery-2",
      expect.objectContaining({ status: "sent" })
    );
  });

  test("a genuine idempotency-key cache hit still short-circuits without calling create at all", async () => {
    const cached = { id: "delivery-3", channel: "email", status: "sent" };
    findOneMock.mockResolvedValue(cached);

    const result = await deliver({
      channel: "email",
      recipient: "someone@example.com",
      subject: "Hello",
      idempotencyKey: "registration.completed:user-1:email",
    });

    expect(result).toBe(cached);
    expect(createMock).not.toHaveBeenCalled();
  });
});

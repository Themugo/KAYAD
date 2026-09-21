import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findById: vi.fn(),
  sendUserCommunication: vi.fn(),
  getIO: vi.fn(),
  logInfo: vi.fn(),
  logError: vi.fn(),
  logWarn: vi.fn(),
  sendToDeadLetterQueue: vi.fn(),
  getWorker: vi.fn(),
}));

vi.mock("../backend/config/queue.js", () => ({ getWorker: mocks.getWorker }));
vi.mock("../backend/db/index.js", () => ({ findById: mocks.findById }));
vi.mock("../backend/services/communicationGateway.service.js", () => ({ sendUserCommunication: mocks.sendUserCommunication }));
vi.mock("../backend/utils/io.js", () => ({ getIO: mocks.getIO }));
vi.mock("../backend/utils/logger.js", () => ({ logInfo: mocks.logInfo, logError: mocks.logError, logWarn: mocks.logWarn }));
vi.mock("../backend/infrastructure/queues/deadLetterQueue.js", () => ({ sendToDeadLetterQueue: mocks.sendToDeadLetterQueue }));

const { processNotification } = await import("../backend/workers/notificationWorker.js");

describe("notification worker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("uses canonical communication deliveries and emits push when requested", async () => {
    const emit = vi.fn();
    mocks.findById.mockResolvedValue({ id: "user-1", email: "user@example.com", phone: "+254700000000" });
    mocks.sendUserCommunication.mockResolvedValue([
      { id: "delivery-1", channel: "email", status: "sent" },
      { id: "delivery-2", channel: "sms", status: "failed" },
    ]);
    mocks.getIO.mockReturnValue({ to: vi.fn(() => ({ emit })) });

    const result = await processNotification({
      data: { userId: "user-1", title: "Test", message: "Hello", type: "system", channels: ["email", "sms", "push"] },
      attemptsMade: 0,
      opts: { attempts: 3 },
    });

    expect(mocks.sendUserCommunication).toHaveBeenCalledWith({
      userId: "user-1",
      channels: ["email", "sms"],
      eventType: "system",
      title: "Test",
      message: "Hello",
      metadata: {},
    });
    expect(emit).toHaveBeenCalledWith("notification", { title: "Test", message: "Hello", data: {} });
    expect(result).toEqual({
      deliveries: [
        { id: "delivery-1", channel: "email", status: "sent" },
        { id: "delivery-2", channel: "sms", status: "failed" },
      ],
      processingTime: expect.any(Number),
      channelResults: { email: true, sms: false, push: true },
    });
    expect(mocks.logInfo).toHaveBeenCalledWith("Notification processed successfully", expect.objectContaining({
      notificationIds: ["delivery-1", "delivery-2"],
      userId: "user-1",
    }));
  });

  it("does not create a fallback delivery when the user does not exist", async () => {
    mocks.findById.mockResolvedValue(null);

    const result = await processNotification({
      data: { userId: "missing-user", title: "Test", message: "Hello" },
      attemptsMade: 0,
      opts: { attempts: 3 },
    });

    expect(result).toBeNull();
    expect(mocks.sendUserCommunication).not.toHaveBeenCalled();
    expect(mocks.logWarn).toHaveBeenCalledWith("User not found for notification", { userId: "missing-user" });
  });

  it("returns false for push delivery when Socket.IO is unavailable", async () => {
    mocks.findById.mockResolvedValue({ id: "user-2" });
    mocks.sendUserCommunication.mockResolvedValue([]);
    mocks.getIO.mockReturnValue(null);

    const result = await processNotification({
      data: { userId: "user-2", title: "Test", message: "Hello", channels: ["push"] },
      attemptsMade: 0,
      opts: { attempts: 3 },
    });

    expect(result.channelResults.push).toBe(false);
  });
});

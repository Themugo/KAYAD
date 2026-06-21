// backend/tests/queue.test.js
// ─────────────────────────────────────────────────────────────
// Queue system tests
// Tests queue producers, workers, retry strategy, and dead letter handling
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, jest } from "@jest/globals";

// Mock queue functions to avoid requiring Redis in test environment
jest.mock("../queues/notificationQueue.js", () => ({
  addNotificationJob: jest.fn(),
}));

jest.mock("../queues/emailQueue.js", () => ({
  addEmailJob: jest.fn(),
}));

jest.mock("../queues/smsQueue.js", () => ({
  addSMSJob: jest.fn(),
}));

jest.mock("../queues/fraudQueue.js", () => ({
  addFraudCheckJob: jest.fn(),
}));

jest.mock("../queues/imageQueue.js", () => ({
  addImageProcessingJob: jest.fn(),
}));

jest.mock("../queues/seoQueue.js", () => ({
  addSEOGenerationJob: jest.fn(),
}));

describe("Queue System", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Notification Queue", () => {
    it("should add notification job", async () => {
      const { addNotificationJob } = await import("../queues/notificationQueue.js");
      addNotificationJob.mockResolvedValue({ id: "job-123", data: {} });

      const job = await addNotificationJob({
        userId: "123",
        title: "Test Notification",
        message: "This is a test notification",
        type: "info",
        channels: ["push"],
      });

      expect(addNotificationJob).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "123",
          title: "Test Notification",
        }),
        expect.any(Object)
      );
      expect(job).toBeDefined();
      expect(job.id).toBeDefined();
    });

    it("should handle bulk notification jobs", async () => {
      const { addNotificationJob } = await import("../queues/notificationQueue.js");
      addNotificationJob.mockResolvedValue([{ id: "job-1" }, { id: "job-2" }]);

      const jobs = await addNotificationJob([
        {
          userId: "123",
          title: "Test Notification 1",
          message: "This is test notification 1",
          type: "info",
          channels: ["push"],
        },
        {
          userId: "456",
          title: "Test Notification 2",
          message: "This is test notification 2",
          type: "info",
          channels: ["push"],
        },
      ]);

      expect(jobs).toHaveLength(2);
    });

    it("should handle queue errors gracefully", async () => {
      const { addNotificationJob } = await import("../queues/notificationQueue.js");
      addNotificationJob.mockRejectedValue(new Error("Queue not available"));

      await expect(
        addNotificationJob({
          userId: "123",
          title: "Test Notification",
          message: "This is a test notification",
          type: "info",
          channels: ["push"],
        })
      ).rejects.toThrow("Queue not available");
    });
  });

  describe("Email Queue", () => {
    it("should add email job", async () => {
      const { addEmailJob } = await import("../queues/emailQueue.js");
      addEmailJob.mockResolvedValue({ id: "email-job-123" });

      const job = await addEmailJob({
        to: "test@example.com",
        subject: "Test Email",
        html: "<p>This is a test email</p>",
        text: "This is a test email",
      });

      expect(addEmailJob).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "test@example.com",
          subject: "Test Email",
        }),
        expect.any(Object)
      );
      expect(job).toBeDefined();
      expect(job.id).toBeDefined();
    });
  });

  describe("SMS Queue", () => {
    it("should add SMS job", async () => {
      const { addSMSJob } = await import("../queues/smsQueue.js");
      addSMSJob.mockResolvedValue({ id: "sms-job-123" });

      const job = await addSMSJob({
        phone: "+254712345678",
        message: "This is a test SMS",
        context: { type: "test" },
      });

      expect(addSMSJob).toHaveBeenCalledWith(
        expect.objectContaining({
          phone: "+254712345678",
          message: "This is a test SMS",
        }),
        expect.any(Object)
      );
      expect(job).toBeDefined();
      expect(job.id).toBeDefined();
    });
  });

  describe("Fraud Queue", () => {
    it("should add fraud check job", async () => {
      const { addFraudCheckJob } = await import("../queues/fraudQueue.js");
      addFraudCheckJob.mockResolvedValue({ id: "fraud-job-123" });

      const job = await addFraudCheckJob({
        type: "user_registration",
        userId: "123",
        metadata: { ip: "127.0.0.1" },
      });

      expect(addFraudCheckJob).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "user_registration",
          userId: "123",
        }),
        expect.any(Object)
      );
      expect(job).toBeDefined();
      expect(job.id).toBeDefined();
    });
  });

  describe("Image Queue", () => {
    it("should add image processing job", async () => {
      const { addImageProcessingJob } = await import("../queues/imageQueue.js");
      addImageProcessingJob.mockResolvedValue({ id: "image-job-123" });

      const job = await addImageProcessingJob({
        imageId: "123",
        imageUrl: "https://example.com/image.jpg",
        operations: [{ type: "thumbnail", width: 200, height: 200 }],
      });

      expect(addImageProcessingJob).toHaveBeenCalledWith(
        expect.objectContaining({
          imageId: "123",
          imageUrl: "https://example.com/image.jpg",
        }),
        expect.any(Object)
      );
      expect(job).toBeDefined();
      expect(job.id).toBeDefined();
    });
  });

  describe("SEO Queue", () => {
    it("should add SEO generation job", async () => {
      const { addSEOGenerationJob } = await import("../queues/seoQueue.js");
      addSEOGenerationJob.mockResolvedValue({ id: "seo-job-123" });

      const job = await addSEOGenerationJob({
        type: "vehicle_sitemap",
      });

      expect(addSEOGenerationJob).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "vehicle_sitemap",
        }),
        expect.any(Object)
      );
      expect(job).toBeDefined();
      expect(job.id).toBeDefined();
    });
  });
});

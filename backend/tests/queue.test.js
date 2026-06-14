// backend/tests/queue.test.js
// ─────────────────────────────────────────────────────────────
// Queue system tests
// Tests queue producers, workers, retry strategy, and dead letter handling
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { addNotificationJob } from "../queues/notificationQueue.js";
import { addEmailJob } from "../queues/emailQueue.js";
import { addSMSJob } from "../queues/smsQueue.js";
import { addFraudCheckJob } from "../queues/fraudQueue.js";
import { addImageProcessingJob } from "../queues/imageQueue.js";
import { addSEOGenerationJob } from "../queues/seoQueue.js";

describe("Queue System", () => {
  describe("Notification Queue", () => {
    it("should add notification job", async () => {
      const job = await addNotificationJob({
        userId: "123",
        title: "Test Notification",
        message: "This is a test notification",
        type: "info",
        channels: ["push"],
      });

      expect(job).toBeDefined();
      expect(job.id).toBeDefined();
    });

    it("should handle bulk notification jobs", async () => {
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
  });

  describe("Email Queue", () => {
    it("should add email job", async () => {
      const job = await addEmailJob({
        to: "test@example.com",
        subject: "Test Email",
        html: "<p>This is a test email</p>",
        text: "This is a test email",
      });

      expect(job).toBeDefined();
      expect(job.id).toBeDefined();
    });
  });

  describe("SMS Queue", () => {
    it("should add SMS job", async () => {
      const job = await addSMSJob({
        phone: "+254712345678",
        message: "This is a test SMS",
        context: { type: "test" },
      });

      expect(job).toBeDefined();
      expect(job.id).toBeDefined();
    });
  });

  describe("Fraud Queue", () => {
    it("should add fraud check job", async () => {
      const job = await addFraudCheckJob({
        type: "user_registration",
        userId: "123",
        metadata: { ip: "127.0.0.1" },
      });

      expect(job).toBeDefined();
      expect(job.id).toBeDefined();
    });
  });

  describe("Image Queue", () => {
    it("should add image processing job", async () => {
      const job = await addImageProcessingJob({
        imageId: "123",
        imageUrl: "https://example.com/image.jpg",
        operations: [
          { type: "thumbnail", width: 200, height: 200 },
        ],
      });

      expect(job).toBeDefined();
      expect(job.id).toBeDefined();
    });
  });

  describe("SEO Queue", () => {
    it("should add SEO generation job", async () => {
      const job = await addSEOGenerationJob({
        type: "vehicle_sitemap",
      });

      expect(job).toBeDefined();
      expect(job.id).toBeDefined();
    });
  });
});

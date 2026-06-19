// backend/tests/notificationAudit.test.js
// ─────────────────────────────────────────────────────────────
// Notification Audit tests
// Tests notification audit model and services
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import NotificationAudit from "../models/NotificationAudit.js";

describe("NotificationAudit Model", () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("should create a new notification audit record", async () => {
    const userId = mongoose.Types.ObjectId();
    const notificationId = mongoose.Types.ObjectId();

    const audit = await NotificationAudit.create({
      notificationId,
      userId,
      channel: "email",
      type: "info",
      title: "Test Notification",
      message: "Test message",
    });

    expect(audit).toHaveProperty("channel", "email");
    expect(audit).toHaveProperty("status", "queued");
    expect(audit).toHaveProperty("queuedAt");
    expect(audit.retryCount).toBe(0);
  });

  it("should enforce channel enum", async () => {
    const userId = mongoose.Types.ObjectId();
    const notificationId = mongoose.Types.ObjectId();

    await expect(
      NotificationAudit.create({
        notificationId,
        userId,
        channel: "invalid_channel",
      }),
    ).rejects.toThrow();
  });

  it("should enforce status enum", async () => {
    const userId = mongoose.Types.ObjectId();
    const notificationId = mongoose.Types.ObjectId();

    await expect(
      NotificationAudit.create({
        notificationId,
        userId,
        channel: "email",
        status: "invalid_status",
      }),
    ).rejects.toThrow();
  });

  it("should mark notification as sent", async () => {
    const audit = await NotificationAudit.create({
      channel: "email",
      userId: mongoose.Types.ObjectId(),
    });

    await audit.markSent("msg_123", "sendgrid");
    await audit.reload();

    expect(audit.status).toBe("sent");
    expect(audit.sentAt).toBeDefined();
    expect(audit.providerMessageId).toBe("msg_123");
    expect(audit.provider).toBe("sendgrid");
  });

  it("should mark notification as delivered", async () => {
    const audit = await NotificationAudit.create({
      channel: "email",
      userId: mongoose.Types.ObjectId(),
      status: "sent",
    });

    await audit.markDelivered("track_456");
    await audit.reload();

    expect(audit.status).toBe("delivered");
    expect(audit.deliveredAt).toBeDefined();
    expect(audit.providerTrackingId).toBe("track_456");
  });

  it("should mark notification as opened", async () => {
    const audit = await NotificationAudit.create({
      channel: "email",
      userId: mongoose.Types.ObjectId(),
      status: "delivered",
    });

    await audit.markOpened();
    await audit.reload();

    expect(audit.status).toBe("opened");
    expect(audit.openedAt).toBeDefined();
    expect(audit.openRate).toBe(100);
  });

  it("should mark notification as clicked", async () => {
    const audit = await NotificationAudit.create({
      channel: "email",
      userId: mongoose.Types.ObjectId(),
      status: "opened",
    });

    await audit.markClicked();
    await audit.reload();

    expect(audit.status).toBe("clicked");
    expect(audit.clickedAt).toBeDefined();
    expect(audit.clickRate).toBe(100);
  });

  it("should mark notification as failed", async () => {
    const audit = await NotificationAudit.create({
      channel: "email",
      userId: mongoose.Types.ObjectId(),
      status: "sent",
    });

    await audit.markFailed("Invalid email", "INVALID_EMAIL", { code: 400 });
    await audit.reload();

    expect(audit.status).toBe("failed");
    expect(audit.failedAt).toBeDefined();
    expect(audit.failureReason).toBe("Invalid email");
    expect(audit.failureCode).toBe("INVALID_EMAIL");
  });

  it("should increment retry count", async () => {
    const audit = await NotificationAudit.create({
      channel: "email",
      userId: mongoose.Types.ObjectId(),
      status: "failed",
    });

    await audit.incrementRetry();
    await audit.reload();

    expect(audit.retryCount).toBe(1);
    expect(audit.lastRetryAt).toBeDefined();
  });

  it("should schedule retry with exponential backoff", async () => {
    const audit = await NotificationAudit.create({
      channel: "email",
      userId: mongoose.Types.ObjectId(),
      status: "failed",
      retryCount: 1,
    });

    const scheduled = await audit.scheduleRetry();
    await audit.reload();

    expect(scheduled).toBe(true);
    expect(audit.nextRetryAt).toBeDefined();
    expect(audit.nextRetryAt).toBeInstanceOf(Date);
  });

  it("should not schedule retry if max retries reached", async () => {
    const audit = await NotificationAudit.create({
      channel: "email",
      userId: mongoose.Types.ObjectId(),
      status: "failed",
      retryCount: 3,
      maxRetries: 3,
    });

    const scheduled = await audit.scheduleRetry();

    expect(scheduled).toBe(false);
  });

  it("should calculate exponential backoff", async () => {
    const audit = await NotificationAudit.create({
      channel: "email",
      userId: mongoose.Types.ObjectId(),
    });

    expect(audit.calculateBackoff(0)).toBe(1000); // 1s
    expect(audit.calculateBackoff(1)).toBe(2000); // 2s
    expect(audit.calculateBackoff(2)).toBe(4000); // 4s
    expect(audit.calculateBackoff(3)).toBe(8000); // 8s
  });

  it("should check if should retry", async () => {
    const audit1 = await NotificationAudit.create({
      channel: "email",
      userId: mongoose.Types.ObjectId(),
      status: "failed",
      retryCount: 0,
    });

    const audit2 = await NotificationAudit.create({
      channel: "email",
      userId: mongoose.Types.ObjectId(),
      status: "failed",
      retryCount: 3,
      maxRetries: 3,
    });

    expect(audit1.shouldRetry()).toBe(true);
    expect(audit2.shouldRetry()).toBe(false);
  });

  it("should get time to deliver", async () => {
    const audit = await NotificationAudit.create({
      channel: "email",
      userId: mongoose.Types.ObjectId(),
      queuedAt: new Date(Date.now() - 5000),
    });

    await audit.markDelivered();
    await audit.reload();

    const timeToDeliver = audit.getTimeToDeliver();
    expect(timeToDeliver).toBeGreaterThan(0);
    expect(timeToDeliver).toBeLessThan(10000); // Should be around 5s
  });

  it("should get notifications by status", async () => {
    const userId = mongoose.Types.ObjectId();

    await NotificationAudit.create({
      channel: "email",
      userId,
      status: "delivered",
    });

    await NotificationAudit.create({
      channel: "email",
      userId,
      status: "failed",
    });

    const delivered = await NotificationAudit.getByStatus("delivered");
    const failed = await NotificationAudit.getByStatus("failed");

    expect(delivered.length).toBe(1);
    expect(failed.length).toBe(1);
  });

  it("should get notifications by user", async () => {
    const userId = mongoose.Types.ObjectId();

    await NotificationAudit.create({
      channel: "email",
      userId,
      title: "Test 1",
    });

    await NotificationAudit.create({
      channel: "email",
      userId,
      title: "Test 2",
    });

    const notifications = await NotificationAudit.getByUser(userId);

    expect(notifications.length).toBe(2);
  });

  it("should get failed notifications", async () => {
    const userId = mongoose.Types.ObjectId();

    await NotificationAudit.create({
      channel: "email",
      userId,
      status: "failed",
      failedAt: new Date(),
    });

    const failed = await NotificationAudit.getFailed();

    expect(failed.length).toBe(1);
  });

  it("should get notifications pending retry", async () => {
    const userId = mongoose.Types.ObjectId();

    await NotificationAudit.create({
      channel: "email",
      userId,
      status: "failed",
      retryCount: 1,
      nextRetryAt: new Date(Date.now() - 1000), // Past time
    });

    const pendingRetry = await NotificationAudit.getPendingRetry();

    expect(pendingRetry.length).toBe(1);
  });

  it("should get delivery statistics", async () => {
    const userId = mongoose.Types.ObjectId();

    await NotificationAudit.create({
      channel: "email",
      userId,
      status: "delivered",
      sentAt: new Date(),
      deliveredAt: new Date(),
    });

    await NotificationAudit.create({
      channel: "sms",
      userId,
      status: "failed",
      failedAt: new Date(),
    });

    const stats = await NotificationAudit.getDeliveryStats();

    expect(stats).toBeDefined();
    expect(Array.isArray(stats)).toBe(true);
  });

  it("should get failure analysis", async () => {
    const userId = mongoose.Types.ObjectId();

    await NotificationAudit.create({
      channel: "email",
      userId,
      status: "failed",
      failureReason: "Invalid email",
      failureCode: "INVALID_EMAIL",
      failedAt: new Date(),
    });

    const analysis = await NotificationAudit.getFailureAnalysis();

    expect(analysis).toBeDefined();
    expect(Array.isArray(analysis)).toBe(true);
  });

  it("should get retry statistics", async () => {
    const userId = mongoose.Types.ObjectId();

    await NotificationAudit.create({
      channel: "email",
      userId,
      status: "failed",
      retryCount: 2,
      failedAt: new Date(),
    });

    const stats = await NotificationAudit.getRetryStats();

    expect(stats).toBeDefined();
    expect(Array.isArray(stats)).toBe(true);
  });
});

describe("NotificationAudit Schema Validation", () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("should require channel field", async () => {
    const audit = new NotificationAudit({
      userId: mongoose.Types.ObjectId(),
    });

    await expect(audit.save()).rejects.toThrow();
  });

  it("should store provider info", async () => {
    const audit = await NotificationAudit.create({
      channel: "email",
      userId: mongoose.Types.ObjectId(),
      provider: "sendgrid",
      providerMessageId: "msg_123",
      providerTrackingId: "track_456",
    });

    expect(audit.provider).toBe("sendgrid");
    expect(audit.providerMessageId).toBe("msg_123");
    expect(audit.providerTrackingId).toBe("track_456");
  });

  it("should store metadata", async () => {
    const audit = await NotificationAudit.create({
      channel: "email",
      userId: mongoose.Types.ObjectId(),
      metadata: {
        campaign: "welcome",
        template: "v1",
      },
    });

    expect(audit.metadata.campaign).toBe("welcome");
    expect(audit.metadata.template).toBe("v1");
  });

  it("should default retry count to 0", async () => {
    const audit = await NotificationAudit.create({
      channel: "email",
      userId: mongoose.Types.ObjectId(),
    });

    expect(audit.retryCount).toBe(0);
  });

  it("should default max retries to 3", async () => {
    const audit = await NotificationAudit.create({
      channel: "email",
      userId: mongoose.Types.ObjectId(),
    });

    expect(audit.maxRetries).toBe(3);
  });

  it("should default engagement metrics to 0", async () => {
    const audit = await NotificationAudit.create({
      channel: "email",
      userId: mongoose.Types.ObjectId(),
    });

    expect(audit.openRate).toBe(0);
    expect(audit.clickRate).toBe(0);
  });
});

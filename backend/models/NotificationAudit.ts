// backend/models/NotificationAudit.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Notification Audit model
// Tracks notification lifecycle and delivery status
// ─────────────────────────────────────────────────────────────

import mongoose from "mongoose";

const notificationAuditSchema = new mongoose.Schema(
  {
    // =============================
    // 🔗 LINKED NOTIFICATION
    // =============================
    notificationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Notification",
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    // =============================
    // 📢 NOTIFICATION DETAILS
    // =============================
    channel: {
      type: String,
      enum: ["email", "sms", "push", "whatsapp", "in_app"],
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["bid", "auction", "payment", "escrow", "chat", "system", "info", "referral", "price_alert"],
    },

    title: String,
    message: String,

    // =============================
    // 📊 DELIVERY TRACKING
    // =============================
    status: {
      type: String,
      enum: ["queued", "sent", "delivered", "opened", "clicked", "failed"],
      default: "queued",
      index: true,
    },

    queuedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    sentAt: Date,
    deliveredAt: Date,
    openedAt: Date,
    clickedAt: Date,
    failedAt: Date,

    // =============================
    // 🔁 RETRY TRACKING
    // =============================
    retryCount: {
      type: Number,
      default: 0,
    },

    maxRetries: {
      type: Number,
      default: 3,
    },

    lastRetryAt: Date,
    nextRetryAt: Date,

    // =============================
    // ❌ FAILURE ANALYSIS
    // =============================
    failureReason: String,
    failureCode: String,
    providerResponse: mongoose.Schema.Types.Mixed,

    // =============================
    // 📈 ENGAGEMENT METRICS
    // =============================
    openRate: {
      type: Number,
      default: 0,
    },

    clickRate: {
      type: Number,
      default: 0,
    },

    // =============================
    // 🏷️ PROVIDER INFO
    // =============================
    provider: String,
    providerMessageId: String,
    providerTrackingId: String,

    // =============================
    // 📋 METADATA
    // =============================
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true },
);

// =============================
// 🔥 INDEXES (PERFORMANCE)
// =============================
notificationAuditSchema.index({ notificationId: 1, channel: 1 });
notificationAuditSchema.index({ userId: 1, channel: 1 });
notificationAuditSchema.index({ status: 1, channel: 1 });
notificationAuditSchema.index({ queuedAt: -1 });
notificationAuditSchema.index({ sentAt: -1 });
notificationAuditSchema.index({ failedAt: -1 });
notificationAuditSchema.index({ nextRetryAt: 1 });

// =============================
// 🧠 INSTANCE METHODS
// =============================

// Mark notification as sent
notificationAuditSchema.methods.markSent = function (providerMessageId, provider) {
  this.status = "sent";
  this.sentAt = new Date();
  if (providerMessageId) this.providerMessageId = providerMessageId;
  if (provider) this.provider = provider;
  return this.save();
};

// Mark notification as delivered
notificationAuditSchema.methods.markDelivered = function (providerTrackingId) {
  this.status = "delivered";
  this.deliveredAt = new Date();
  if (providerTrackingId) this.providerTrackingId = providerTrackingId;
  return this.save();
};

// Mark notification as opened
notificationAuditSchema.methods.markOpened = function () {
  this.status = "opened";
  this.openedAt = new Date();
  this.calculateEngagement();
  return this.save();
};

// Mark notification as clicked
notificationAuditSchema.methods.markClicked = function () {
  this.status = "clicked";
  this.clickedAt = new Date();
  this.calculateEngagement();
  return this.save();
};

// Mark notification as failed
notificationAuditSchema.methods.markFailed = function (reason, code, providerResponse) {
  this.status = "failed";
  this.failedAt = new Date();
  this.failureReason = reason;
  this.failureCode = code;
  if (providerResponse) this.providerResponse = providerResponse;
  return this.save();
};

// Increment retry count
notificationAuditSchema.methods.incrementRetry = function () {
  this.retryCount += 1;
  this.lastRetryAt = new Date();
  return this.save();
};

// Schedule retry with exponential backoff
notificationAuditSchema.methods.scheduleRetry = function () {
  if (this.retryCount >= this.maxRetries) {
    return false; // Max retries reached
  }

  const backoffMs = this.calculateBackoff(this.retryCount);
  this.nextRetryAt = new Date(Date.now() + backoffMs);
  return this.save();
};

// Calculate exponential backoff
notificationAuditSchema.methods.calculateBackoff = function (retryCount) {
  // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 32s
  return Math.pow(2, retryCount) * 1000;
};

// Calculate engagement metrics
notificationAuditSchema.methods.calculateEngagement = function () {
  if (this.status === "opened" || this.status === "clicked") {
    this.openRate = 100;
  }
  if (this.status === "clicked") {
    this.clickRate = 100;
  }
  return this;
};

// Check if should retry
notificationAuditSchema.methods.shouldRetry = function () {
  return this.status === "failed" && this.retryCount < this.maxRetries;
};

// Get time to deliver
notificationAuditSchema.methods.getTimeToDeliver = function () {
  if (!this.deliveredAt || !this.queuedAt) return null;
  return this.deliveredAt - this.queuedAt;
};

// Get time to open
notificationAuditSchema.methods.getTimeToOpen = function () {
  if (!this.openedAt || !this.deliveredAt) return null;
  return this.openedAt - this.deliveredAt;
};

// =============================
// ⚡ STATIC METHODS
// =============================

// Track notification event
notificationAuditSchema.statics.trackNotification = async function (notificationData) {
  const audit = await this.create({
    notificationId: notificationData.notificationId,
    userId: notificationData.userId,
    channel: notificationData.channel,
    type: notificationData.type,
    title: notificationData.title,
    message: notificationData.message,
    metadata: notificationData.metadata || {},
  });

  return audit;
};

// Get notifications by status
notificationAuditSchema.statics.getByStatus = async function (status, channel = null, limit = 100) {
  const query = { status };
  if (channel) query.channel = channel;

  return this.find(query).sort({ queuedAt: -1 }).limit(limit).lean();
};

// Get notifications by user
notificationAuditSchema.statics.getByUser = async function (userId, channel = null, limit = 50) {
  const query = { userId };
  if (channel) query.channel = channel;

  return this.find(query).sort({ queuedAt: -1 }).limit(limit).lean();
};

// Get failed notifications
notificationAuditSchema.statics.getFailed = async function (channel = null, period = 24) {
  const startDate = new Date(Date.now() - period * 60 * 60 * 1000);
  const query = {
    status: "failed",
    failedAt: { $gte: startDate },
  };
  if (channel) query.channel = channel;

  return this.find(query).sort({ failedAt: -1 }).lean();
};

// Get notifications pending retry
notificationAuditSchema.statics.getPendingRetry = async function (channel = null) {
  const query = {
    status: "failed",
    retryCount: { $lt: 3 },
    nextRetryAt: { $lte: new Date() },
  };
  if (channel) query.channel = channel;

  return this.find(query).sort({ nextRetryAt: 1 }).lean();
};

// Get delivery statistics
notificationAuditSchema.statics.getDeliveryStats = async function (period = 24) {
  const startDate = new Date(Date.now() - period * 60 * 60 * 1000);

  const stats = await this.aggregate([
    {
      $match: {
        queuedAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: "$channel",
        total: { $sum: 1 },
        sent: {
          $sum: {
            $cond: [{ $ne: ["$sentAt", null] }, 1, 0],
          },
        },
        delivered: {
          $sum: {
            $cond: [{ $ne: ["$deliveredAt", null] }, 1, 0],
          },
        },
        opened: {
          $sum: {
            $cond: [{ $ne: ["$openedAt", null] }, 1, 0],
          },
        },
        clicked: {
          $sum: {
            $cond: [{ $ne: ["$clickedAt", null] }, 1, 0],
          },
        },
        failed: {
          $sum: {
            $cond: [{ $eq: ["$status", "failed"] }, 1, 0],
          },
        },
      },
    },
  ]);

  return stats.map((stat) => ({
    channel: stat._id,
    total: stat.total,
    sent: stat.sent,
    delivered: stat.delivered,
    opened: stat.opened,
    clicked: stat.clicked,
    failed: stat.failed,
    deliveryRate: stat.total > 0 ? (stat.delivered / stat.total) * 100 : 0,
    openRate: stat.delivered > 0 ? (stat.opened / stat.delivered) * 100 : 0,
    clickRate: stat.opened > 0 ? (stat.clicked / stat.opened) * 100 : 0,
    failureRate: stat.total > 0 ? (stat.failed / stat.total) * 100 : 0,
  }));
};

// Get failure analysis
notificationAuditSchema.statics.getFailureAnalysis = async function (period = 24) {
  const startDate = new Date(Date.now() - period * 60 * 60 * 1000);

  const analysis = await this.aggregate([
    {
      $match: {
        status: "failed",
        failedAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          channel: "$channel",
          failureReason: "$failureReason",
          failureCode: "$failureCode",
        },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { count: -1 },
    },
  ]);

  return analysis.map((item) => ({
    channel: item._id.channel,
    failureReason: item._id.failureReason,
    failureCode: item._id.failureCode,
    count: item.count,
  }));
};

// Get retry statistics
notificationAuditSchema.statics.getRetryStats = async function (period = 24) {
  const startDate = new Date(Date.now() - period * 60 * 60 * 1000);

  const stats = await this.aggregate([
    {
      $match: {
        failedAt: { $gte: startDate },
        retryCount: { $gt: 0 },
      },
    },
    {
      $group: {
        _id: "$channel",
        totalRetried: { $sum: 1 },
        successfulRetries: {
          $sum: {
            $cond: [{ $in: ["$status", ["delivered", "opened", "clicked"]] }, 1, 0],
          },
        },
        avgRetries: { $avg: "$retryCount" },
      },
    },
  ]);

  return stats.map((stat) => ({
    channel: stat._id,
    totalRetried: stat.totalRetried,
    successfulRetries: stat.successfulRetries,
    retrySuccessRate: stat.totalRetried > 0 ? (stat.successfulRetries / stat.totalRetried) * 100 : 0,
    avgRetries: stat.avgRetries,
  }));
};

// =============================
// 🧠 SAFE EXPORT
// =============================
const NotificationAudit =
  mongoose.models.NotificationAudit || mongoose.model("NotificationAudit", notificationAuditSchema);

export default NotificationAudit;

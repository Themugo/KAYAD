// backend/models/IdempotencyKey.js - Fintech Idempotency Model
// ─────────────────────────────────────────────────────────────
// Idempotency key model for preventing duplicate operations
// Ensures that the same operation cannot be executed twice
// ─────────────────────────────────────────────────────────────

import mongoose from "mongoose";

const idempotencyKeySchema = new mongoose.Schema(
  {
    // Unique identifier for the operation (e.g., "payment_123456")
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Operation type (e.g., "payment", "escrow_release", "bid")
    operationType: {
      type: String,
      required: true,
      enum: [
        "payment",
        "payment_callback",
        "escrow_release",
        "escrow_refund",
        "escrow_confirm_delivery",
        "bid",
        "bid_callback",
        "auction_end",
        "notification",
        "verification_submit",
        "verification_approve",
        "verification_reject",
        "verification_suspend",
        "verification_reinstate",
      ],
      index: true,
    },

    // User who initiated the operation
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    // Request parameters (for debugging and replay)
    requestParams: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Response data (cached for idempotent responses)
    responseData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    // Response status code
    responseStatus: {
      type: Number,
      default: null,
    },

    // Whether the operation was successful
    success: {
      type: Boolean,
      default: false,
    },

    // Error message if operation failed
    errorMessage: {
      type: String,
      default: null,
    },

    // Associated resource IDs (e.g., paymentId, escrowId)
    resourceIds: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Expiration time for the idempotency key
    expiresAt: {
      type: Date,
      default: Date.now,
      index: true,
      expires: 86400, // 24 hours TTL
    },
  },
  {
    timestamps: true,
  },
);

// Index for efficient lookup by key and operation type
idempotencyKeySchema.index({ key: 1, operationType: 1 });
idempotencyKeySchema.index({ user: 1, operationType: 1, createdAt: -1 });

// Static method to check if key exists
idempotencyKeySchema.statics.exists = async function (key) {
  const existing = await this.findOne({ key });
  return !!existing;
};

// Static method to get cached response
idempotencyKeySchema.statics.getCachedResponse = async function (key) {
  const existing = await this.findOne({ key });
  if (!existing) return null;

  // Check if expired
  if (existing.expiresAt < new Date()) {
    await this.deleteOne({ key });
    return null;
  }

  return {
    responseData: existing.responseData,
    responseStatus: existing.responseStatus,
    success: existing.success,
    errorMessage: existing.errorMessage,
    resourceIds: existing.resourceIds,
  };
};

// Static method to create or update idempotency key
idempotencyKeySchema.statics.record = async function (data) {
  const { key, operationType, user, requestParams, responseData, responseStatus, success, errorMessage, resourceIds } =
    data;

  return await this.findOneAndUpdate(
    { key },
    {
      key,
      operationType,
      user,
      requestParams,
      responseData,
      responseStatus,
      success,
      errorMessage,
      resourceIds,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    },
    { upsert: true, new: true },
  );
};

// Static method to clean expired keys
idempotencyKeySchema.statics.cleanExpired = async function () {
  const result = await this.deleteMany({ expiresAt: { $lt: new Date() } });
  return result.deletedCount;
};

const IdempotencyKey = mongoose.model("IdempotencyKey", idempotencyKeySchema);

export default IdempotencyKey;

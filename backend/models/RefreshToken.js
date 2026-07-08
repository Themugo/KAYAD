import mongoose from "mongoose";

const refreshTokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    tokenVersion: {
      type: Number,
      required: true,
    },
    deviceId: {
      type: String,
      default: "unknown",
    },
    userAgent: {
      type: String,
      default: "",
    },
    ipAddress: {
      type: String,
      default: "",
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    lastUsedAt: {
      type: Date,
      default: Date.now,
    },
    isRevoked: {
      type: Boolean,
      default: false,
      index: true,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    revokedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

// Index for cleanup of expired tokens
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Phase 1: Add unique constraint on user + deviceId
refreshTokenSchema.index({ user: 1, deviceId: 1 }, { unique: true });

// Static method to clean up expired and revoked tokens
refreshTokenSchema.statics.cleanupExpired = async function () {
  const now = new Date();
  return this.deleteMany({
    $or: [{ expiresAt: { $lt: now } }, { isRevoked: true }],
  });
};

// Static method to revoke all tokens for a user
refreshTokenSchema.statics.revokeAllForUser = async function (userId, revokedBy = null) {
  const now = new Date();
  return this.updateMany({ user: userId, isRevoked: false }, { isRevoked: true, revokedAt: now, revokedBy });
};

// Static method to revoke a specific token
refreshTokenSchema.statics.revokeToken = async function (token, revokedBy = null) {
  const now = new Date();
  return this.findOneAndUpdate({ token, isRevoked: false }, { isRevoked: true, revokedAt: now, revokedBy });
};

// Static method to get active sessions for a user
refreshTokenSchema.statics.getActiveSessions = async function (userId) {
  const now = new Date();
  return this.find({ user: userId, isRevoked: false, expiresAt: { $gt: now } })
    .sort({ lastUsedAt: -1 })
    .lean();
};

const RefreshToken = mongoose.models.RefreshToken || mongoose.model("RefreshToken", refreshTokenSchema);

export default RefreshToken;

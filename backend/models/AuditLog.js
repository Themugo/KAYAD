import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    // =============================
    // 👤 ACTOR
    // =============================
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    actorRole: {
      type: String,
      enum: [
        "admin",
        "dealer",
        "buyer",
        "inspector",
        "escrow_officer",
        "technical_support",
        "hr",
        "accounts",
        "ad_manager",
        "moderator",
        "ghost_checker",
      ],
    },
    actorName: String,
    actorEmail: String,

    // =============================
    // 🎯 ACTION
    // =============================
    action: {
      type: String,
      required: true,
      enum: [
        // User actions
        "user_created",
        "user_approved",
        "user_rejected",
        "user_suspended",
        "user_deleted",
        "admin_login",
        "admin_logout",
        "role_changed",

        // Vehicle actions
        "vehicle_created",
        "vehicle_edited",
        "vehicle_deleted",
        "vehicle_approved",
        "vehicle_rejected",
        "vehicle_status_changed",

        // Auction actions
        "auction_created",
        "auction_started",
        "auction_ended",
        "auction_extended",
        "auction_cancelled",
        "auction_bid_placed",
        "auction_bid_retracted",
        "auction_bid_won",

        // Escrow actions
        "escrow_created",
        "escrow_funded",
        "escrow_released",
        "escrow_refunded",
        "escrow_disputed",

        // Dealer verification actions
        "dealer_verification_submitted",
        "dealer_verification_approved",
        "dealer_verification_rejected",
        "dealer_verification_document_added",

        // Dispute actions
        "dispute_created",
        "dispute_resolved",
        "dispute_escalated",
        "dispute_closed",

        // Payment actions
        "payment_initiated",
        "payment_completed",
        "payment_failed",
        "payment_refunded",
        "payout_sent",
        "payout_failed",
        "payout_reversed",

        // Other critical actions
        "config_updated",
        "permission_changed",
      ],
      index: true,
    },

    // =============================
    // 🎯 TARGET
    // =============================
    target: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
    },
    targetModel: {
      type: String,
      enum: ["User", "Car", "Auction", "Escrow", "Payment", "Bid", "PlatformConfig", "Dispute", "SupportTicket", "DealerVerification", "FraudDetection", "Notification", "Review", "Organization", "Dealer", "Chat"],
    },
    targetName: String,

    // =============================
    // 📊 STATE CHANGES
    // =============================
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    changes: [
      {
        field: String,
        oldValue: mongoose.Schema.Types.Mixed,
        newValue: mongoose.Schema.Types.Mixed,
      },
    ],

    // =============================
    // 🌐 REQUEST INFO
    // =============================
    ipAddress: {
      type: String,
      index: true,
    },
    userAgent: String,
    requestId: String,
    sessionId: {
      type: String,
      index: true,
    },

    // =============================
    // 📝 DETAILS
    // =============================
    details: {
      type: Object,
      default: {},
    },
    severity: {
      type: String,
      enum: ["info", "warning", "critical"],
      default: "info",
    },

    // =============================
    // 📋 LEGACY FIELDS
    // =============================
    admin: String,
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

// Indexes for efficient queries
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ actor: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ target: 1, createdAt: -1 });
auditLogSchema.index({ ipAddress: 1, createdAt: -1 });
auditLogSchema.index({ severity: 1, createdAt: -1 });
auditLogSchema.index({ sessionId: 1, createdAt: -1 });

// =============================
// 🔒 IMMUTABILITY CONSTRAINTS
// =============================
// Prevent updates to audit log entries after creation
auditLogSchema.pre("save", function (next) {
  if (this.isNew) {
    // Allow creation
    return next();
  }
  // Prevent updates - audit logs must be immutable
  const err = new Error("Audit logs are immutable and cannot be modified after creation");
  err.name = "ImmutableError";
  return next(err);
});

// Prevent findOneAndUpdate and updateMany operations
auditLogSchema.pre("findOneAndUpdate", function (next) {
  const err = new Error("Audit logs are immutable and cannot be modified after creation");
  err.name = "ImmutableError";
  return next(err);
});

auditLogSchema.pre("updateMany", function (next) {
  const err = new Error("Audit logs are immutable and cannot be modified after creation");
  err.name = "ImmutableError";
  return next(err);
});

auditLogSchema.pre("updateOne", function (next) {
  const err = new Error("Audit logs are immutable and cannot be modified after creation");
  err.name = "ImmutableError";
  return next(err);
});

// Prevent delete operations (only allow soft delete if needed, but for now hard prevent)
auditLogSchema.pre("deleteOne", function (next) {
  const err = new Error("Audit logs cannot be deleted");
  err.name = "ImmutableError";
  return next(err);
});

auditLogSchema.pre("deleteMany", function (next) {
  const err = new Error("Audit logs cannot be deleted");
  err.name = "ImmutableError";
  return next(err);
});

const AuditLog = mongoose.models.AuditLog || mongoose.model("AuditLog", auditLogSchema);

export default AuditLog;

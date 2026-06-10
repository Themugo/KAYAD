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
      enum: ["admin", "dealer", "buyer", "inspector", "escrow_officer", "technical_support", "hr", "accounts", "ad_manager", "moderator", "ghost_checker"],
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
        "user_approved",
        "user_rejected",
        "user_suspended",
        "user_deleted",
        "admin_login",
        "admin_logout",
        
        // Vehicle actions
        "vehicle_approved",
        "vehicle_rejected",
        "vehicle_deleted",
        "vehicle_status_changed",
        
        // Auction actions
        "auction_created",
        "auction_started",
        "auction_ended",
        "auction_extended",
        "auction_cancelled",
        
        // Escrow actions
        "escrow_created",
        "escrow_funded",
        "escrow_released",
        "escrow_refunded",
        "escrow_disputed",
        
        // Payout actions
        "payout_sent",
        "payout_failed",
        "payout_reversed",
        
        // Other critical actions
        "config_updated",
        "permission_changed",
        "role_changed",
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
      enum: ["User", "Car", "Auction", "Escrow", "Payment", "Bid", "PlatformConfig"],
    },
    targetName: String,

    // =============================
    // 📊 STATE CHANGES
    // =============================
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    changes: [{
      field: String,
      oldValue: mongoose.Schema.Types.Mixed,
      newValue: mongoose.Schema.Types.Mixed,
    }],

    // =============================
    // 🌐 REQUEST INFO
    // =============================
    ipAddress: {
      type: String,
      index: true,
    },
    userAgent: String,
    requestId: String,

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

const AuditLog = mongoose.models.AuditLog || mongoose.model("AuditLog", auditLogSchema);

export default AuditLog;

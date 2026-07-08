// backend/models/LeadActivity.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// LeadActivity model for CRM system
// Tracks all activities on a lead for timeline view
// ─────────────────────────────────────────────────────────────

import mongoose from "mongoose";

const leadActivitySchema = new mongoose.Schema(
  {
    // =============================
    // 🔗 RELATIONSHIP
    // =============================
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      required: true,
    },

    // =============================
    // 📋 ACTIVITY TYPE
    // =============================
    type: {
      type: String,
      enum: [
        "lead_created",
        "stage_changed",
        "message_sent",
        "message_received",
        "bid_placed",
        "escrow_created",
        "escrow_released",
        "escrow_refunded",
        "note_added",
        "tag_added",
        "status_changed",
        "contacted",
      ],
      required: true,
      index: true,
    },

    // =============================
    // 👤 ACTOR
    // =============================
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    actorType: {
      type: String,
      enum: ["buyer", "dealer", "system", "admin"],
      required: true,
    },

    // =============================
    // 📝 DETAILS
    // =============================
    description: {
      type: String,
    },

    metadata: {
      type: Object,
      default: {},
    },

    // =============================
    // 🔗 REFERENCE
    // =============================
    referenceId: {
      type: mongoose.Schema.Types.ObjectId, // messageId, escrowId, etc.
    },

    referenceType: {
      type: String, // message, escrow, etc.
    },
  },
  { timestamps: true },
);

// =============================
// 🔥 INDEXES (PERFORMANCE)
// =============================
leadActivitySchema.index({ lead: 1, createdAt: -1 });
leadActivitySchema.index({ type: 1, createdAt: -1 });
leadActivitySchema.index({ actor: 1, createdAt: -1 });

// =============================
// ⚡ STATIC: CREATE ACTIVITY
// =============================
leadActivitySchema.statics.createActivity = async function (
  leadId,
  type,
  actorId,
  actorType,
  description,
  metadata = {},
) {
  return await this.create({
    lead: leadId,
    type,
    actor: actorId,
    actorType,
    description,
    metadata,
  });
};

// =============================
// ⚡ STATIC: GET LEAD TIMELINE
// =============================
leadActivitySchema.statics.getLeadTimeline = async function (leadId) {
  return await this.find({ lead: leadId }).populate("actor", "name email avatar").sort({ createdAt: -1 });
};

leadActivitySchema.add({
  deletedAt: { type: Date, default: null },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
});

leadActivitySchema.statics.softDelete = async function (ids, userId) {
  const idArray = Array.isArray(ids) ? ids : [ids];
  return this.updateMany(
    { _id: { $in: idArray }, deletedAt: null },
    { $set: { deletedAt: new Date(), deletedBy: userId } },
  );
};

leadActivitySchema.pre(/^find/, function (next) {
  if (this.getQuery().deletedAt === undefined) this.where({ deletedAt: null });
  next();
});

leadActivitySchema.pre("findOneAndUpdate", function (next) {
  if (this.getQuery().deletedAt === undefined) this.where({ deletedAt: null });
  next();
});

leadActivitySchema.pre("countDocuments", function (next) {
  if (this.getQuery().deletedAt === undefined) this.where({ deletedAt: null });
  next();
});
leadActivitySchema.pre("aggregate", function () {
  const hasDeletedAt = this.pipeline().some(stage => {
    const stageStr = JSON.stringify(stage);
    return stageStr.includes("deletedAt") || stageStr.includes("deleted_at");
  });
  if (!hasDeletedAt) {
    this.pipeline().unshift({ $match: { deletedAt: null } });
  }
});

// =============================
// 🧠 SAFE EXPORT
// =============================
const LeadActivity = mongoose.models.LeadActivity || mongoose.model("LeadActivity", leadActivitySchema);

export default LeadActivity;

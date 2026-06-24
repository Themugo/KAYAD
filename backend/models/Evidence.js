// backend/models/Evidence.js - Evidence model for dispute management
// ─────────────────────────────────────────────────────────────
// Supports: images, videos, documents, inspection reports,
// payment records, chat logs. Each evidence item is a separate
// document (scalable). Links back to a dispute or appeal.
// ─────────────────────────────────────────────────────────────

import mongoose from "mongoose";

const evidenceSchema = new mongoose.Schema(
  {
    dispute: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dispute",
      required: true,
      index: true,
    },
    appeal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dispute",
      default: null,
    },
    type: {
      type: String,
      enum: [
        "image",
        "video",
        "document",
        "inspection_report",
        "payment_record",
        "chat_log",
      ],
      required: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    publicId: {
      type: String,
      default: null,
    },
    thumbnailUrl: {
      type: String,
      default: null,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    uploadedByRole: {
      type: String,
      enum: ["buyer", "seller", "admin", "superadmin", "escrow_officer"],
      required: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    verified: {
      type: Boolean,
      default: false,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    verifiedAt: Date,
  },
  {
    timestamps: true,
  },
);

evidenceSchema.index({ dispute: 1, type: 1 });
evidenceSchema.index({ dispute: 1, createdAt: -1 });
evidenceSchema.index({ uploadedBy: 1 });

evidenceSchema.add({
  deletedAt: { type: Date, default: null },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
});

evidenceSchema.pre(/^find/, function (next) {
  if (this.getQuery().deletedAt === undefined) this.where({ deletedAt: null });
  next();
});

evidenceSchema.statics.softDelete = async function (ids, userId) {
  return this.updateMany(
    { _id: { $in: ids } },
    { $set: { deletedAt: new Date(), deletedBy: userId } },
  );
};

export default mongoose.models.Evidence || mongoose.model("Evidence", evidenceSchema);

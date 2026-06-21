// backend/models/Notification.js
import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ["bid", "auction", "payment", "escrow", "chat", "system", "info", "referral", "price_alert"],
      default: "info",
    },
    read: { type: Boolean, default: false, index: true },
    readAt: { type: Date },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

// =============================
// 🗑️ SOFT DELETE (Phase 2 Database Audit)
// =============================
notificationSchema.add({
  deletedAt: { type: Date, default: null },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
});

// Override delete to soft-delete
notificationSchema.statics.softDelete = async function (ids, userId) {
  const idArray = Array.isArray(ids) ? ids : [ids];
  return this.updateMany(
    { _id: { $in: idArray }, deletedAt: null },
    { $set: { deletedAt: new Date(), deletedBy: userId } },
  );
};

// Soft-delete filter — exclude deleted notifications by default
notificationSchema.pre(/^find/, function (next) {
  if (this.getQuery().deletedAt === undefined) {
    this.where({ deletedAt: null });
  }
  next();
});

notificationSchema.pre("findOneAndUpdate", function (next) {
  if (this.getQuery().deletedAt === undefined) {
    this.where({ deletedAt: null });
  }
  next();
});

notificationSchema.pre("countDocuments", function (next) {
  if (this.getQuery().deletedAt === undefined) {
    this.where({ deletedAt: null });
  }
  next();
});

notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, read: 1 });
// Phase 1: Add compound index for unread notifications
notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

const Notification = mongoose.models.Notification || mongoose.model("Notification", notificationSchema);

export default Notification;

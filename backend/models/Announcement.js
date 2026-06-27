import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      maxlength: 10000,
    },
    type: {
      type: String,
      enum: ["info", "warning", "maintenance", "update", "policy"],
      default: "info",
    },
    audience: {
      type: String,
      enum: ["all", "dealers", "buyers", "specific_users"],
      default: "all",
    },
    targetUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    status: {
      type: String,
      enum: ["draft", "sent", "scheduled"],
      default: "draft",
    },
    scheduledFor: {
      type: Date,
    },
    sentAt: {
      type: Date,
    },
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    stats: {
      totalRecipients: { type: Number, default: 0 },
      successCount: { type: Number, default: 0 },
      failCount: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
);

announcementSchema.index({ status: 1, createdAt: -1 });
announcementSchema.index({ type: 1, status: 1 });
announcementSchema.index({ audience: 1, status: 1 });

const Announcement = mongoose.models.Announcement || mongoose.model("Announcement", announcementSchema);

export default Announcement;

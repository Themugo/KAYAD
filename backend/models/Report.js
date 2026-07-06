import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      enum: ["listing", "user", "review", "message"],
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    category: {
      type: String,
      enum: [
        "fake_listing",
        "scam",
        "misleading_photos",
        "wrong_info",
        "duplicate",
        "inappropriate_content",
        "harassment",
        "spam",
        "other",
      ],
    },
    description: {
      type: String,
      maxlength: 2000,
    },
    status: {
      type: String,
      enum: ["pending", "under_review", "resolved", "dismissed"],
      default: "pending",
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reviewedAt: Date,
    resolution: String,
    actionTaken: {
      type: String,
      enum: ["none", "warning", "listing_removed", "user_banned", "content_hidden", "other"],
    },
  },
  { timestamps: true },
);

reportSchema.index({ targetType: 1, targetId: 1 });
reportSchema.index({ status: 1, createdAt: -1 });

const Report = mongoose.models.Report || mongoose.model("Report", reportSchema);

export default Report;

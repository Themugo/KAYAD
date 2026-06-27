import mongoose from "mongoose";

const ntsaVerificationSchema = new mongoose.Schema(
  {
    car: { type: mongoose.Schema.Types.ObjectId, ref: "Car", required: true, index: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    status: {
      type: String,
      enum: ["pending", "in_review", "passed", "failed"],
      default: "pending",
      index: true,
    },
    adminNotes: { type: String },
    documents: [
      {
        url: String,
        label: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    dutyStatus: {
      type: String,
      enum: ["duty_paid", "duty_unpaid", "awaiting_clearance", "unknown"],
      default: "unknown",
    },
    chassisVerified: { type: Boolean, default: false },
    logbookVerified: { type: Boolean, default: false },
    importVerified: { type: Boolean, default: false },
    reviewedAt: { type: Date },
  },
  { timestamps: true },
);

ntsaVerificationSchema.index({ status: 1, createdAt: -1 });

const NtsaVerificationRequest =
  mongoose.models.NtsaVerificationRequest || mongoose.model("NtsaVerificationRequest", ntsaVerificationSchema);

export default NtsaVerificationRequest;

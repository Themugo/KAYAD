import mongoose from "mongoose";

const adminAlertSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ["fraud", "payment_failure", "auction", "system", "escrow"],
      index: true,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    severity: {
      type: String,
      enum: ["info", "warning", "critical"],
      default: "info",
      index: true,
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

adminAlertSchema.index({ createdAt: -1 });
adminAlertSchema.index({ severity: 1, read: 1 });

const AdminAlert =
  mongoose.models.AdminAlert ||
  mongoose.model("AdminAlert", adminAlertSchema);

export default AdminAlert;

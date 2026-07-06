import mongoose from "mongoose";

const securityLogSchema = new mongoose.Schema(
  {
    action: { type: String, required: true, index: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    actorRole: String,
    target: { type: mongoose.Schema.Types.ObjectId, refPath: "targetModel", index: true },
    targetModel: { type: String, enum: ["Car", "User", "Bid", "Escrow", "EscrowVault", "Payment", "Notification", "Auction", "Dispute", "SupportTicket", "Chat", "Transaction"] },
    resourceId: String,
    details: { type: mongoose.Schema.Types.Mixed },
    ip: String,
    userAgent: String,
    metadata: { type: mongoose.Schema.Types.Mixed },
    severity: { type: String, enum: ["info", "warning", "critical"], default: "info" },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true },
);

securityLogSchema.pre("save", function (next) {
  if (!this.isNew) {
    return next(new Error("CRITICAL ACTION BLOCKED: Security logs are strictly append-only."));
  }
  next();
});

securityLogSchema.index({ timestamp: -1 });
securityLogSchema.index({ action: 1, timestamp: -1 });
securityLogSchema.index({ actor: 1, timestamp: -1 });

export default mongoose.model("SecurityLog", securityLogSchema);

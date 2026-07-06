import mongoose from "mongoose";

const idempotencyAuditLogSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, index: true },
    operationType: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ["attempted", "completed", "rejected_duplicate", "failed", "in_flight_race"],
      required: true,
      index: true,
    },
    checkoutRequestId: { type: String, index: true, sparse: true },
    mpesaReceipt: { type: String, index: true, sparse: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    resourceId: { type: mongoose.Schema.Types.ObjectId, index: true, sparse: true },
    requestBody: { type: mongoose.Schema.Types.Mixed },
    responseData: { type: mongoose.Schema.Types.Mixed },
    ip: { type: String },
    durationMs: { type: Number },
    errorMessage: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed },
    lockedBy: { type: String },
    lockedAt: { type: Date },
  },
  { timestamps: true },
);

idempotencyAuditLogSchema.index({ key: 1, createdAt: -1 });
idempotencyAuditLogSchema.index({ operationType: 1, createdAt: -1 });
idempotencyAuditLogSchema.index({ checkoutRequestId: 1, mpesaReceipt: 1 });
idempotencyAuditLogSchema.index({ lockedBy: 1, lockedAt: 1 }, { expireAfterSeconds: 86400 });

const IdempotencyAuditLog = mongoose.models.IdempotencyAuditLog || mongoose.model("IdempotencyAuditLog", idempotencyAuditLogSchema);
export default IdempotencyAuditLog;

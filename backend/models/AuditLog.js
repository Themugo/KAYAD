import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema({
  action:  { type: String, required: true },
  admin:   { type: String, default: "System" },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  details: { type: Object, default: {} },
}, { timestamps: true });

auditLogSchema.index({ createdAt: -1 });

const AuditLog =
  mongoose.models.AuditLog ||
  mongoose.model("AuditLog", auditLogSchema);

export default AuditLog;

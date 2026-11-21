import { createModel } from "./_base.js";
import { toAuditLogRow } from "../utils/auditLogRow.js";

// Every AuditLog.create() goes through the canonical audit_logs serializer
// (utils/auditLogRow.js) so callers cannot write columns that do not exist.
const AuditLog = createModel("AuditLog");
const baseCreate = AuditLog.create.bind(AuditLog);
AuditLog.create = (data) =>
  baseCreate(Array.isArray(data) ? data.map((d) => toAuditLogRow(d)) : toAuditLogRow(data));

export default AuditLog;

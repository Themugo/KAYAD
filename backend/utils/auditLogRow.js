// backend/utils/auditLogRow.js
// ─────────────────────────────────────────────────────────────────────────
// Canonical serializer for public.audit_logs (Stage 3A, 2026-10-18).
//
// The repository DDL defines exactly these audit_logs columns:
//   id, actor_id, action, entity_type, entity_id, details (jsonb),
//   ip_address, actor_role, actor_name, created_at
// (20260710043238_…gari_motors_full_schema.sql:435 + 20260710044700_…:101-102).
// The 2026-10-11 read-only production catalog diff did not list audit_logs among
// the tables whose columns differ, i.e. production has the same columns.
//
// Application writers historically sent keys that map to NO column (actor,
// target, target_model, admin, admin_id, user_id, metadata, old_value, …).
// PostgREST rejects unknown columns (PGRST204), so every awaited audit write
// failed — AFTER the governed domain write had already committed (governance,
// admin kill-switch, user activation…), and turned rbac 403s into 500s.
//
// This module is the single mapping between application audit fields and the
// real columns. Combined with the audit_logs aliases in utils/fieldMap.js
// (actor→actor_id, targetModel→entity_type, target→entity_id) it writes only
// existing columns, preserves every additional field inside `details`, and
// keeps readers' actor/target/targetModel filters working. No schema change.
// ─────────────────────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v) => typeof v === "string" && UUID_RE.test(v);
const present = (v) => v !== undefined && v !== null && v !== "";

// Application keys that are mapped onto a dedicated column (all others go to details).
const COLUMN_KEYS = new Set([
  "action", "actor", "actorId", "adminId", "userId", "actorRole", "actorName", "admin",
  "target", "targetModel", "entityType", "entityId", "ipAddress", "ip", "details", "createdAt",
]);

/**
 * Map an application audit record onto the canonical audit_logs columns.
 * Returns application-level keys (action, actor, actorRole, actorName, target,
 * targetModel, ipAddress, details, createdAt); the field map translates them.
 */
export function toAuditLogRow(input = {}) {
  const data = input && typeof input === "object" ? input : {};
  const extras = {};
  for (const [k, v] of Object.entries(data)) {
    if (!COLUMN_KEYS.has(k) && v !== undefined) extras[k] = v;
  }

  const actorCandidate = [data.actor, data.actorId, data.adminId, data.userId]
    .map((v) => (v && typeof v === "object" ? v.id ?? v._id : v))
    .find(present);
  const actorName = [data.actorName, typeof data.admin === "string" ? data.admin : null].find(present);
  const targetCandidate = [data.target, data.entityId].map((v) => (v && typeof v === "object" ? v.id ?? v._id : v)).find(present);
  const targetModel = [data.targetModel, data.entityType].find(present);

  // Non-UUID identifiers cannot go into the uuid columns; keep them, verbatim, in details.
  if (present(actorCandidate) && !isUuid(String(actorCandidate))) extras.actorRef = String(actorCandidate);
  if (present(targetCandidate) && !isUuid(String(targetCandidate))) extras.targetRef = String(targetCandidate);
  if (present(data.adminId) && data.adminId !== actorCandidate) extras.adminId = data.adminId;
  if (present(data.userId) && data.userId !== actorCandidate) extras.userId = data.userId;
  if (typeof data.admin === "string" && data.admin !== actorName) extras.admin = data.admin;

  let details;
  const hasExtras = Object.keys(extras).length > 0;
  if (data.details && typeof data.details === "object" && !Array.isArray(data.details)) {
    details = hasExtras ? { ...data.details, ...extras } : data.details;
  } else if (present(data.details)) {
    details = hasExtras ? { message: data.details, ...extras } : { message: data.details };
  } else {
    details = hasExtras ? extras : {};
  }

  const row = { action: data.action, details };
  if (present(actorCandidate) && isUuid(String(actorCandidate))) row.actor = String(actorCandidate);
  if (present(data.actorRole)) row.actorRole = data.actorRole;
  if (present(actorName)) row.actorName = String(actorName);
  if (present(targetModel)) row.targetModel = String(targetModel);
  if (present(targetCandidate) && isUuid(String(targetCandidate))) row.target = String(targetCandidate);
  const ip = [data.ipAddress, data.ip].find(present);
  if (present(ip)) row.ipAddress = String(ip);
  if (present(data.createdAt)) row.createdAt = data.createdAt instanceof Date ? data.createdAt.toISOString() : data.createdAt;
  return row;
}

export const AUDIT_LOG_COLUMNS = Object.freeze([
  "id", "actor_id", "action", "entity_type", "entity_id", "details", "ip_address", "actor_role", "actor_name", "created_at",
]);

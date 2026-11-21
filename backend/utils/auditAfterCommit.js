// backend/utils/auditAfterCommit.js
// ─────────────────────────────────────────────────────────────────────────
// Stage 4 (2026-10-18) — audit write for a domain mutation that has ALREADY
// committed (user delete, kill-switch, referral credit, listing moderation…).
//
// Problem: these routes awaited AuditLog.create() with no handling. The domain
// write is a separate PostgREST call (there is no shared database transaction),
// so when the audit insert failed the caller received a 500 for an operation
// that had in fact been applied. Operators retried committed mutations and saw
// a failure message for a success.
//
// Contract (matches the established fail-open behaviour of
// services/auditService.logAuditEvent and middleware/auditLog.logAuditAction):
//   - the audit write is still awaited and still attempted;
//   - a failure is NOT silent: it is logged at error level with the stable code
//     AUDIT_WRITE_FAILED_AFTER_COMMIT plus the action/actor/target identifiers
//     needed to reconstruct the missing record;
//   - the helper returns null on failure (the created row otherwise) and never
//     throws, so the already-applied operation reports its real outcome.
//
// NOT used for governanceController, whose code documents a strict contract
// (audit failure must not be reported as full success), nor for the dedicated
// audit-log endpoint whose only purpose is to create the audit row.
// A single database transaction (RPC) is the long-term fix; see the Stage 4
// report, decision D9.
// ─────────────────────────────────────────────────────────────────────────
import AuditLog from "../models/AuditLog.js";
import { logError } from "./logger.js";

export const AUDIT_WRITE_FAILED_AFTER_COMMIT = "AUDIT_WRITE_FAILED_AFTER_COMMIT";

// STAGE 4A (G5): security- and finance-relevant actions get ONE immediate retry (transient PostgREST/network
// failures are the common cause) and, if the record is still lost, a distinct `critical: true` marker in the
// error log so alerting can page on it. Everything else keeps the single attempt of Stage 4. The mutation has
// committed either way; this helper never claims otherwise and never reports atomicity.
export const CRITICAL_AUDIT_ACTION = /kill-switch|system recovered|maintenance (activated|updated|scope changed|recovered)|dealer verification|onboarding policy|dealer decision|listing decision|user (deleted|deactivated|reactivated)|referral|subdomain|bulk_car_delete|seller settings|staff governance/i;
export const isCriticalAuditAction = (entry) => CRITICAL_AUDIT_ACTION.test(String(entry?.action ?? ""));

export async function auditAfterCommit(entry) {
  const critical = isCriticalAuditAction(entry);
  try {
    try {
      return await AuditLog.create(entry);
    } catch (first) {
      if (!critical) throw first;
      return await AuditLog.create(entry); // single retry for critical actions only
    }
  } catch (err) {
    try {
      logError(AUDIT_WRITE_FAILED_AFTER_COMMIT, {
        code: AUDIT_WRITE_FAILED_AFTER_COMMIT,
        critical,
        attempts: critical ? 2 : 1,
        action: entry?.action ?? null,
        actor: entry?.actor ?? entry?.adminId ?? entry?.admin ?? null,
        target: entry?.target ?? null,
        targetModel: entry?.targetModel ?? null,
        error: err?.message || String(err),
      });
    } catch {
      /* logging must never turn a committed operation into a failure */
    }
    return null;
  }
}

export default auditAfterCommit;

// ============================================================
// STAGE 3A (2026-10-18) — database-contract regressions.
//
//   S3A-G1-01  audit_logs writers sent keys that map to NO column of the
//              repository DDL (actor, target, target_model, admin, admin_id,
//              user_id, metadata, old_value, …). PostgREST rejects unknown
//              columns (PGRST204), so awaited audit writes failed AFTER the
//              governed domain write had committed.
//   S3A-G1-02  rbac.requirePermission's access_denied audit failure turned the
//              expected 403 into a 500.
//   S3A-G2-01  report-queue "listing_removed" rejected sold listings (no guard).
//   S3A-G2-02  report-queue "user_banned" could suspend staff/owner accounts.
//
// The fake Supabase client below enforces the REAL audit_logs column set the way
// PostgREST does; it is driven through the REAL models/_base.js, db/index.js,
// utils/fieldMap.js, the AuditLog model and the real callers.
// ============================================================
import { describe, test, expect, beforeEach, jest } from "@jest/globals";

process.env.WEBHOIST_EMAIL = "owner@example.test";
delete process.env.WEBHOIST_EMAILS;

// Columns from 20260710043238_…gari_motors_full_schema.sql:435 + 20260710044700_…:101-102.
const AUDIT_COLUMNS = new Set(["id", "actor_id", "action", "entity_type", "entity_id", "details", "ip_address", "actor_role", "actor_name", "created_at"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const inserted = [];
const tableRows = {};
let failAudit = false;

const fakeClient = {
  from(table) {
    const state = { table, payload: null, filters: [] };
    const q = {
      insert(payload) { state.payload = payload; return q; },
      update(payload) { state.update = payload; return q; },
      select() { return q; },
      eq(c, v) { state.filters.push([c, v]); return q; },
      in() { return q; },
      limit() { return q; }, order() { return q; },
      maybeSingle() { return q.single(); },
      single() { return q.then((r) => ({ ...r, data: Array.isArray(r.data) ? r.data[0] ?? null : r.data })); },
      then(res, rej) {
        let out;
        if (state.payload) {
          const rows = Array.isArray(state.payload) ? state.payload : [state.payload];
          if (table === "audit_logs") {
            if (failAudit) out = { data: null, error: { code: "08006", message: "connection failure" } };
            for (const r of rows) {
              const bad = Object.keys(r).find((k) => !AUDIT_COLUMNS.has(k));
              if (bad && !out) out = { data: null, error: { code: "PGRST204", message: `Could not find the '${bad}' column of 'audit_logs' in the schema cache` } };
              for (const c of ["actor_id", "entity_id"]) if (r[c] != null && !UUID.test(r[c]) && !out) out = { data: null, error: { code: "22P02", message: `invalid input syntax for type uuid: "${r[c]}"` } };
            }
          }
          if (!out) { const created = rows.map((r) => ({ id: `row-${inserted.length + 1}`, ...r })); inserted.push(...created.map((r) => ({ table, ...r }))); out = { data: created, error: null }; }
        } else if (state.update) {
          out = { data: [{ id: "u", ...state.update }], error: null };
        } else {
          const id = state.filters.find(([c]) => c === "id")?.[1];
          const row = tableRows[table]?.[id] ?? null;
          out = { data: row ? [row] : [], error: null };
        }
        return Promise.resolve(out).then(res, rej);
      },
    };
    return q;
  },
};
jest.unstable_mockModule("../../utils/supabase.js", () => ({ getSupabase: () => fakeClient, isSupabaseConnected: () => true }));
jest.unstable_mockModule("../../utils/io.js", () => ({ getIO: () => null }));

const { default: AuditLog } = await import("../../models/AuditLog.js");
const { logAuditEvent } = await import("../../services/auditService.js");
const { mapRowIn } = await import("../../utils/fieldMap.js");
const governance = await import("../../controllers/governanceController.js");
const { requirePermission } = await import("../../middleware/rbac.js");
const { PERM } = await import("../../config/roles.js");

const U = "11111111-1111-4111-8111-111111111111";
const T = "22222222-2222-4222-8222-222222222222";
const mkRes = () => { const r = { code: 200 }; r.status = (c) => { r.code = c; return r; }; r.json = (b) => { r.body = b; return r; }; return r; };
const auditRows = () => inserted.filter((r) => r.table === "audit_logs");
beforeEach(() => { inserted.length = 0; failAudit = false; });

describe("S3A-G1-01 every audit writer shape persists into the real audit_logs columns", () => {
  // One representative payload per writer family (see evidence g1_audit_write_sites.tsv).
  const shapes = {
    governance: { action: "create:policies", actor: U, target: T, targetModel: "policies", details: { a: 1 }, createdAt: new Date().toISOString() },
    adminKillSwitch: { action: "Kill-switch activated: payments", admin: "Ops Admin", adminId: U },
    adminReferralCredit: { admin: undefined, action: "Credit Referral", target: "Referral abc123", details: "Credited KES 500 to referrer" },
    announcement: { action: "announcement_created", actor: U, actorRole: "admin", actorName: "A", target: T, targetModel: "Announcement", details: {} },
    bulkAdmin: { action: "bulk_update", actor: U, actorRole: "admin", actorName: "A", details: { count: 3 } },
    middlewareAuditLog: { action: "something", admin: "System", adminId: undefined, details: {} },
  };
  test.each(Object.entries(shapes))("%s → AuditLog.create succeeds and writes only real columns", async (_n, payload) => {
    await expect(AuditLog.create(payload)).resolves.toBeTruthy();
    const row = auditRows().at(-1);
    expect(Object.keys(row).filter((k) => k !== "table" && !AUDIT_COLUMNS.has(k))).toEqual([]);
    expect(row.action).toBe(payload.action);
  });
  test("identifiers land in their columns; non-UUID targets and extras are preserved in details", async () => {
    await AuditLog.create({ action: "x", adminId: U, admin: "Ops", target: "Referral 9", targetModel: "Referral", details: "note" });
    const row = auditRows().at(-1);
    expect(row).toMatchObject({ actor_id: U, actor_name: "Ops", entity_type: "Referral" });
    expect(row.entity_id).toBeUndefined();
    expect(row.details).toMatchObject({ message: "note", targetRef: "Referral 9" });
  });
  test("services/auditService.logAuditEvent (rich payload) persists via db/index.js", async () => {
    const out = await logAuditEvent({ action: "vehicle_edited", actor: U, actorRole: "dealer", actorName: "D", actorEmail: "d@example.test", target: T, targetModel: "Car", oldValue: { p: 1 }, newValue: { p: 2 }, ipAddress: "10.0.0.1", userAgent: "ua", requestId: "r1", severity: "info" });
    expect(out).not.toBeNull(); // logAuditEvent returns null when the insert failed
    const row = auditRows().at(-1);
    expect(row).toMatchObject({ actor_id: U, entity_id: T, entity_type: "Car", ip_address: "10.0.0.1" });
    expect(row.details).toMatchObject({ actorEmail: "d@example.test", oldValue: { p: 1 }, newValue: { p: 2 }, requestId: "r1" });
  });
  test("readers keep application names: actor_id/entity_type/entity_id map back to actor/targetModel/target", () => {
    const row = mapRowIn("audit_logs", { id: "a", actor_id: U, entity_type: "Car", entity_id: T, action: "x" });
    expect(row).toMatchObject({ actor: U, targetModel: "Car", target: T });
  });
  test("serializer output keys are all mapped to real columns", async () => {
    const { toAuditLogRow } = await import("../../utils/auditLogRow.js");
    const row = toAuditLogRow({ action: "x", actor: U, target: T, targetModel: "M", ipAddress: "1.2.3.4", createdAt: "2026-10-18T00:00:00Z", actorRole: "r", actorName: "n", metadata: { m: 1 } });
    expect(Object.keys(row).sort()).toEqual(["action", "actor", "actorName", "actorRole", "createdAt", "details", "ipAddress", "target", "targetModel"]);
  });
});

describe("S3A-G1-01 governance: a committed mutation is not reported as failed because of audit columns", () => {
  test("createPolicy returns 200 and writes the domain row and one audit row", async () => {
    const res = mkRes();
    await governance.createPolicy({ user: { id: U, role: "admin", effectiveRole: "admin" }, body: { title: "Retention" } }, res);
    expect(res.code).toBe(200);
    expect(inserted.filter((r) => r.table === "governance_policies")).toHaveLength(1);
    expect(auditRows()).toHaveLength(1);
  });
  test("strict contract kept: a genuine audit outage still surfaces (not silently swallowed)", async () => {
    failAudit = true;
    await expect(governance.createPolicy({ user: { id: U, role: "admin", effectiveRole: "admin" }, body: { title: "R2" } }, mkRes())).rejects.toBeTruthy();
  });
});

describe("S3A-G1-02 rbac: access_denied audit failure keeps the 403", () => {
  const run = async () => { const res = mkRes(); const next = jest.fn(); await requirePermission(PERM.MANAGE_FINANCE)({ user: { id: U, role: "marketing", grantedPermissions: [], revokedPermissions: [] }, originalUrl: "/api/ledger", method: "POST" }, res, next); return { res, next }; };
  test("audit write succeeds → 403 and one audit row with real columns", async () => {
    const { res, next } = await run();
    expect(res.code).toBe(403); expect(next).not.toHaveBeenCalled();
    expect(auditRows()).toHaveLength(1);
    expect(auditRows()[0]).toMatchObject({ action: "access_denied", actor_id: U });
  });
  test("audit outage → still 403, never 500", async () => {
    failAudit = true;
    const { res } = await run();
    expect(res.code).toBe(403);
  });
});

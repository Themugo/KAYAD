// Single access path to reconciliation findings (GAP-ESC-OPS, 2026-11-21).
// reconciliation_reports.issues is a JSONB array of objects ({ type, severity, resolved, escrowId, ... }).
// The previous code queried a non-existent `issueDetails` path. Everything now goes through the read-only
// database function kayad_reconciliation_issue_rows so "unresolved" has exactly one definition (see the migration).
import { getSupabase } from "./supabase.js";

const UNKNOWN = "unknown";

/** Mirror of the SQL rule, for in-memory data already loaded (e.g. one report): resolved only when exactly true. */
export const isIssueResolved = (issue) => issue != null && typeof issue === "object" && !Array.isArray(issue) && (issue.resolved === true || issue.resolved === "true");

/** Only plain objects are issues; anything else in the array is ignored, never counted. */
export const issuesOf = (report) => (Array.isArray(report?.issues) ? report.issues.filter((i) => i != null && typeof i === "object" && !Array.isArray(i)) : []);

export async function fetchIssueRows({ state = "unresolved", severity = null, type = null, escrowId = null, since = null, until = null, reportLimit = null } = {}) {
  const iso = (v) => (v == null ? null : v instanceof Date ? v.toISOString() : v);
  const { data, error } = await getSupabase().rpc("kayad_reconciliation_issue_rows", {
    p_state: state,
    p_severity: severity,
    p_type: type,
    p_escrow_id: escrowId == null ? null : String(escrowId),
    p_since: iso(since),
    p_until: iso(until),
    p_report_limit: reportLimit,
  });
  if (error) throw error;
  return (data || []).map((r) => ({
    reportUuid: r.report_uuid,
    reportId: r.report_id,
    reportType: r.report_type,
    reportStatus: r.report_status,
    reportCreatedAt: r.report_created_at,
    issueIndex: r.issue_index,
    issue: r.issue,
  }));
}

/** Group rows by report, most recent first (rows arrive ordered). */
export function groupRowsByReport(rows) {
  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.reportUuid)) {
      map.set(row.reportUuid, { id: row.reportUuid, reportId: row.reportId, reportType: row.reportType, status: row.reportStatus, createdAt: row.reportCreatedAt, issues: [] });
    }
    map.get(row.reportUuid).issues.push(row.issue);
  }
  return [...map.values()];
}

/** Count rows by a field of the issue (`severity`, `type`); a missing value is reported as "unknown", never dropped. */
export function tallyBy(rows, field) {
  const out = {};
  for (const row of rows) {
    const raw = row.issue?.[field];
    const key = raw == null || raw === "" ? UNKNOWN : String(raw);
    out[key] = (out[key] || 0) + 1;
  }
  return out;
}

/** Directional totals from report rows (columns) and the `financials` JSONB; non-numeric values count as 0. */
export function sumDirectional(reports) {
  const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const t = { totalMatched: 0, totalUnmatched: 0, totalMissing: 0, totalOverpaid: 0, totalUnderpaid: 0, overpaidAmount: 0, underpaidAmount: 0, missingAmount: 0 };
  for (const r of reports) {
    t.totalMatched += n(r.matched); t.totalUnmatched += n(r.unmatched); t.totalMissing += n(r.missing);
    t.totalOverpaid += n(r.overpaid); t.totalUnderpaid += n(r.underpaid);
    const f = r.financials && typeof r.financials === "object" ? r.financials : {};
    t.overpaidAmount += n(f.overpaidTotal); t.underpaidAmount += n(f.underpaidTotal); t.missingAmount += n(f.missingTotal);
  }
  return t;
}

// The operations dashboard is staff-only and platform-scoped; it declares what the operator may do.
import { describe, test, expect, jest } from "@jest/globals";

const chain = (rows = []) => { const o = { sort: () => o, limit: () => o, populate: () => o, lean: () => Promise.resolve(rows), then: (r, j) => Promise.resolve(rows).then(r, j) }; return o; };
const aggregate = jest.fn(async (pipeline) => (pipeline[0].$match.status === "funded" ? [{ total: 200 }] : [{ total: 900, count: 3 }]));
jest.unstable_mockModule("../../models/Escrow.js", () => ({ default: { find: () => chain(), countDocuments: async () => 2, aggregate } }));
for (const m of ["EscrowAnomaly", "ReconciliationReport", "Refund"]) jest.unstable_mockModule(`../../models/${m}.js`, () => ({ default: { find: () => chain(), countDocuments: async () => 0 } }));
jest.unstable_mockModule("../../models/EscrowAudit.js", () => ({ default: {} }));
jest.unstable_mockModule("../../services/escrowAuditService.js", () => ({ getAuditTrail: jest.fn(async () => []) }));
jest.unstable_mockModule("../../services/reconciliationCron.js", () => ({ triggerManualReconciliation: jest.fn() }));
jest.unstable_mockModule("../../services/escrowAnomalyDetectionService.js", () => ({ runAnomalyDetection: jest.fn() }));
jest.unstable_mockModule("../../utils/securityLogger.js", () => ({ logActionFromReq: jest.fn() }));
// Open reconciliation findings now come from the single DB function kayad_reconciliation_issue_rows (GAP-ESC-OPS).
const issueRows = [
  { report_uuid: "r1", report_id: "R1", report_type: "daily", report_status: "completed", report_created_at: "2026-11-20T00:00:00Z", issue_index: 0, issue: { type: "x", resolved: false } },
  { report_uuid: "r1", report_id: "R1", report_type: "daily", report_status: "completed", report_created_at: "2026-11-20T00:00:00Z", issue_index: 1, issue: { type: "y" } },
  { report_uuid: "r2", report_id: "R2", report_type: "daily", report_status: "completed", report_created_at: "2026-11-19T00:00:00Z", issue_index: 0, issue: { type: "z", resolved: false } },
];
const rpc = jest.fn(async () => ({ data: issueRows, error: null }));
jest.unstable_mockModule("../../utils/supabase.js", () => ({ getSupabase: () => ({ rpc }) }));
jest.unstable_mockModule("../../services/mpesaB2C.service.js", () => ({ disburseB2C: jest.fn() }));

const { getEscrowOperationsDashboard } = await import("../../controllers/escrowOperationsController.js");
const run = async (user) => { const res = { body: null, json(b) { this.body = b; return this; } }; await getEscrowOperationsDashboard({ query: {}, user }, res); return res.body.data; };

describe("getEscrowOperationsDashboard", () => {
  test("unreconciled count is the number of reports with an open issue, read through the DB function", async () => {
    const d = await run({ id: "u", role: "accounts" });
    expect(rpc).toHaveBeenCalledWith("kayad_reconciliation_issue_rows", expect.objectContaining({ p_state: "unresolved" }));
    expect(d.queues.reconciliation.count).toBe(2);
    expect(d.queues.reconciliation.items.map((i) => [i.id, i.issueCount])).toEqual([["r1", 2], ["r2", 1]]);
  });
  test("totals are explicitly platform-scoped and cover every held status", async () => {
    const d = await run({ id: "u", role: "accounts" });
    expect(d.totals).toEqual({ scope: "platform", currency: "KES", heldAmount: 900, heldCount: 3 });
    expect(d.queues.funded.amount).toBe(200);
    const heldCall = aggregate.mock.calls.find((c) => c[0][0].$match.status.$in);
    expect(heldCall[0][0].$match.status.$in.sort()).toEqual(["delivered", "disputed", "funded", "vehicle_confirmed"]);
  });
  test("operator.can reflects the role: accounts settles but cannot release; admin can release", async () => {
    expect((await run({ id: "u", role: "accounts" })).operator.can).toMatchObject({ view: true, settle: true, release: false, refund: false, close: false });
    expect((await run({ id: "u", role: "admin" })).operator.can).toMatchObject({ view: true, release: true, refund: true, close: true });
    expect((await run({ id: "u", role: "escrow_officer" })).operator.can).toMatchObject({ view: true, operate: true, release: false });
  });
});

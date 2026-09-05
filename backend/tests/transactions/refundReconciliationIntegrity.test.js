import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd(), "../");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

describe("Phase 14 refund/reconciliation integrity contract", () => {
  test("canonical refunds ledger is persisted by escrow refund transition", () => {
    const sql = read("supabase/migrations/20260905050000_phase14_refund_reconciliation_integrity.sql");
    expect(sql).toContain("INSERT INTO refunds (payment_id, escrow_id, amount, reason, status, initiated_by");
    expect(sql).toContain("'pending', p_actor_id");
    expect(sql).toContain("refunds_amount_positive");
  });

  test("duplicate live refund instructions are prevented", () => {
    const sql = read("supabase/migrations/20260905050000_phase14_refund_reconciliation_integrity.sql");
    expect(sql).toContain("idx_refunds_one_active_per_payment");
    expect(sql).toContain("status IN ('pending', 'processing')");
  });

  test("reconciliation reads the authoritative refunds table", () => {
    const service = read("backend/services/reconciliationService.js");
    expect(service).toContain('findAll("refunds"');
    expect(service).toContain('findById("payments", refund.payment)');
    expect(service).toContain("refund_exceeds_original");
  });
});

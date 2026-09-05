import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const checks = [];
const pass = (name, ok, detail = "") => checks.push({ name, ok, detail });

const migration = read("supabase/migrations/20260905050000_phase14_refund_reconciliation_integrity.sql");
const reconciliation = read("backend/services/reconciliationService.js");
const escrow = read("backend/services/escrow.service.js");
const controller = read("backend/controllers/escrowController.js");
const atomic = read("backend/utils/atomicTransactions.js");

pass("Phase 14 migration exists", migration.includes("Phase 14: refund + payment reconciliation integrity"));
pass("Refund amount is constrained positive", migration.includes("refunds_amount_positive") && migration.includes("CHECK (amount > 0)"));
pass("Only one live refund per payment", migration.includes("idx_refunds_one_active_per_payment") && migration.includes("status IN ('pending', 'processing')"));
pass("Escrow refund creates canonical refunds row", migration.includes("INSERT INTO refunds (payment_id, escrow_id, amount, reason, status, initiated_by"));
pass("Escrow refund is pending until provider settlement", migration.includes("'pending', p_actor_id"));
pass("Refund amount must equal payment amount", migration.includes("Refund/payment amount mismatch"));
pass("Completed duplicate refund is rejected", migration.includes("A completed refund already exists for payment"));
pass("Refund transition remains idempotent", migration.includes("v_escrow.lastActionKey = p_idempotency_key"));
pass("Reconciliation uses canonical refunds table", reconciliation.includes('findAll("refunds"'));
pass("Reconciliation checks original payment", reconciliation.includes('findById("payments", refund.payment)'));
pass("Reconciliation detects over-refunds", reconciliation.includes("refund_exceeds_original"));
pass("Refund endpoint is truthful", controller.includes("Escrow refund queued for processing"));
pass("Service forwards idempotency key", escrow.includes("idempotencyKey, reason"));
pass("Atomic RPC forwards idempotency key", atomic.includes("p_idempotency_key: idempotencyKey"));

let failed = 0;
for (const c of checks) {
  console.log(`${c.ok ? "PASS" : "FAIL"} ${c.name}${c.detail ? ` — ${c.detail}` : ""}`);
  if (!c.ok) failed++;
}
console.log(`\nPhase 14 validation: ${checks.length - failed}/${checks.length} PASS`);
if (failed) process.exit(1);

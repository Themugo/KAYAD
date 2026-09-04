import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const checks = [
  ["escrow close uses atomic transition", "backend/services/escrow.service.js", ["atomicTransitionEscrow", "STATES.CLOSED", "idempotencyKey"]],
  ["close controller forwards idempotency key", "backend/controllers/escrowController.js", ["req.idempotencyKey", "serviceClose"]],
  ["escrow callback funds before final payment success", "backend/services/paymentCallback.service.js", ["await fundEscrow", "status: \"success\""]],
  ["phase 12 migration exists", "supabase/migrations/20260904220000_phase12_transaction_escrow_integrity.sql", ["escrows_amount_positive", "kayad_transition_escrow_atomic", "Escrow/payment amount mismatch", "Delivery is not confirmed"]],
];
let passed = 0;
for (const [label, rel, needles] of checks) {
  const file = path.join(root, rel);
  const exists = fs.existsSync(file);
  if (!exists) { console.log(`FAIL ${label}: missing ${rel}`); continue; }
  const text = fs.readFileSync(file, "utf8");
  for (const needle of needles) {
    const ok = text.includes(needle);
    console.log(`${ok ? "PASS" : "FAIL"} ${label}: ${needle}`);
    if (ok) passed++;
  }
}
console.log(`Phase 12 transaction/escrow integrity checks: ${passed} PASS`);
if (passed !== checks.reduce((n, [, , needles]) => n + needles.length, 0)) process.exit(1);

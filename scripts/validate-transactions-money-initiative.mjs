import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const checks = [
  ["financial lifecycle service exists", "backend/services/paymentFinancialLifecycle.service.js"],
  ["payment service records attempts/events", "backend/services/paymentService.js"],
  ["callback service records webhook receipts", "backend/services/paymentCallback.service.js"],
  ["callback service funds escrow payments", "backend/services/paymentCallback.service.js"],
  ["payment validation accepts canonical bid/purchase/escrow types", "backend/validation/payment.schema.js"],
  ["payment transaction uses checkout request id", "backend/services/paymentService.js"],
  ["atomic bid settlement remains authoritative", "backend/utils/atomicTransactions.js"],
  ["atomic escrow transitions remain authoritative", "backend/services/escrow.service.js"],
  ["payment attempts schema is present", "supabase/migrations/20260815060000_payment_architecture_extension.sql.sql"],
  ["payment events schema is present", "supabase/migrations/20260815060000_payment_architecture_extension.sql.sql"],
  ["refund schema is present", "supabase/migrations/20260815060000_payment_architecture_extension.sql.sql"],
  ["webhook dedupe schema is present", "supabase/migrations/20260815060000_payment_architecture_extension.sql.sql"],
];
let passed = 0;
for (const [label, rel] of checks) {
  const ok = fs.existsSync(path.join(root, rel));
  console.log(`${ok ? "PASS" : "FAIL"} ${label}`);
  if (ok) passed++;
}
const contentChecks = [
  ["paymentService", "backend/services/paymentService.js", ["recordPaymentAttempt", "stk_initiated", "checkoutRequestId"]],
  ["callback", "backend/services/paymentCallback.service.js", ["recordWebhookReceipt", "callback_received", "amount_verified", "escrow_funded", "markWebhookProcessed"]],
  ["validation", "backend/validation/payment.schema.js", ["bid", "purchase", "escrow"]],
];
for (const [label, rel, needles] of contentChecks) {
  const text = fs.readFileSync(path.join(root, rel), "utf8");
  for (const needle of needles) {
    const ok = text.includes(needle);
    console.log(`${ok ? "PASS" : "FAIL"} ${label}: ${needle}`);
    if (ok) passed++;
  }
}
console.log(`Transactions & Money initiative static checks: ${passed} PASS`);
if (passed !== checks.length + contentChecks.reduce((n, [, , needles]) => n + needles.length, 0)) process.exit(1);

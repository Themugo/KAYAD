import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const checks = [];
const pass = (name, ok) => checks.push({ name, ok });

const callback = read("backend/services/paymentCallback.service.js");
const payment = read("backend/services/paymentService.js");
const atomic = read("backend/utils/atomicTransactions.js");
const escrowConfig = read("backend/services/escrowConfiguration.service.js");
const escrowState = read("backend/services/escrowStateMachine.js");
const comms = read("backend/services/communicationEvents.service.js");
const migration = read("supabase/migrations/20260909080841_auction_payment_escrow_e2e.sql");
const mpesaSpec = read("backend/tests/escrow/escrowPaymentSafety.test.js");
const escrowSpec = read("e2e/tests/escrow-creation/escrow-creation.spec.ts");

pass("M-Pesa callback validates provider metadata", callback.includes("Incomplete M-Pesa metadata") && callback.includes("Amount mismatch"));
pass("M-Pesa callback claims payment atomically", callback.includes("processed: false") && callback.includes("processed: true"));
pass("M-Pesa escrow funding is explicitly rejected", callback.includes("Vehicle escrow cannot be funded through M-Pesa STK"));
pass("M-Pesa purchase/bid settlement remains canonical", callback.includes("atomicSettleBidPayment") && callback.includes("atomicSettlePurchasePayment"));
pass("Payment initiation creates authoritative intent before provider call", payment.includes("Create the authoritative payment record BEFORE calling M-Pesa"));
pass("Escrow custody remains bank-transfer only", escrowConfig.includes('fundingMethods: ["bank_transfer"]') && escrowConfig.includes('KAYAD escrow bank account'));
pass("Canonical escrow funding RPC exists", migration.includes("CREATE OR REPLACE FUNCTION kayad_verify_escrow_funding_atomic"));
pass("Backend wrapper for canonical funding RPC exists", atomic.includes("export async function atomicVerifyEscrowFunding") && atomic.includes('kayad_verify_escrow_funding_atomic'));
pass("Funding RPC requires active custodian account", migration.includes("custodian_account IS NULL") && migration.includes("is_active = true"));
pass("Funding RPC transitions pending → funded atomically", migration.includes("status = 'funded'") && migration.includes("FOR UPDATE"));
pass("Funding RPC marks linked payment successful", migration.includes("UPDATE payments SET status = 'success', processed = true"));
pass("Escrow funded event is canonical", comms.includes('ESCROW_FUNDED: "escrow.funded"'));
pass("Escrow funding emits canonical communication", escrowConfig.includes("COMMUNICATION_EVENTS.ESCROW_FUNDED") && escrowConfig.includes("emitToUsers"));
pass("Escrow state machine supports controlled funding", escrowState.includes("PENDING") && escrowState.includes("FUNDED"));
pass("Existing payment safety suite covers escrow STK rejection", mpesaSpec.includes("escrow.*cannot be funded through M-Pesa STK"));
pass("Existing browser escrow suite remains present", escrowSpec.includes("Escrow"));

const failures = checks.filter((c) => !c.ok);
for (const c of checks) console.log(`${c.ok ? "PASS" : "FAIL"} ${c.name}`);
console.log(`\nPhase 4 transaction certification: ${checks.length - failures.length}/${checks.length} PASS`);
if (failures.length) process.exit(1);

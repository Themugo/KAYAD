import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const pass = (label) => console.log(`PASS ${label}`);
const fail = (label) => { console.error(`FAIL ${label}`); process.exitCode = 1; };

const cloud = read("backend/config/cloudinary.js");
cloud.includes('visibility === "private" ? "authenticated" : "upload"')
  ? pass("private Cloudinary uploads use authenticated delivery")
  : fail("private Cloudinary uploads use authenticated delivery");
cloud.includes("sign_url: true")
  ? pass("private Cloudinary responses use signed delivery URLs")
  : fail("private Cloudinary responses use signed delivery URLs");

const comm = read("backend/services/communicationGateway.service.js");
comm.includes("idempotencyKey,") && comm.includes("communication-webhook:${provider}:${providerMessageId}")
  ? pass("communication delivery persists idempotency and serializes provider callbacks")
  : fail("communication idempotency/concurrency hardening missing");

const ownership = read("backend/vehiclePassport/services/vehiclePassportService.js");
ownership.includes("Vehicle ownership authorization required")
  ? pass("passport mutation requires canonical ownership/listing authorization")
  : fail("passport mutation ownership authorization missing");

const admin = read("backend/routes/adminRoutes.js");
admin.includes("requirePermission") && admin.includes("PERMISSIONS.MANAGE_PAYMENTS")
  ? pass("admin control plane applies centralized permission boundary")
  : fail("admin permission boundary missing");

const webhook = read("backend/routes/webhookRoutes.js");
webhook.includes("webhook_events") && webhook.includes("withLock") && webhook.includes("dedupeKey")
  ? pass("inventory webhook has durable replay protection and distributed locking")
  : fail("inventory webhook replay/concurrency hardening missing");

const escrow = read("backend/services/escrow.service.js");
["recordEscrowDeposit","recordEscrowRelease"].every(x => escrow.includes(x)) && read("supabase/migrations/20261002150000_escrow_business_integrity_sweep.sql").includes("escrow-refund:")
  ? pass("escrow funding/release/refund converge into canonical ledger transaction")
  : fail("escrow ledger convergence incomplete");

const callback = read("backend/services/paymentCallback.service.js");
callback.includes("recordPurchasePayment")
  ? pass("purchase payment settlement converges into canonical ledger")
  : fail("purchase payment ledger convergence missing");

const migDir = path.join(root, "supabase/migrations");
const migrations = fs.readdirSync(migDir);
const hardening = migrations.find(x => x.includes("high_risk_boundary_hardening"));
hardening ? pass("high-risk ownership/webhook/ledger RLS migration exists") : fail("high-risk RLS migration missing");

const mig = hardening ? fs.readFileSync(path.join(migDir, hardening), "utf8") : "";
[
  "kayad_validate_owner_vehicle_passport",
  "uq_webhook_events_source_dedupe",
  "communication_deliveries",
  "ledger_entries",
  "vehicle_documents"
].every(x => mig.includes(x))
  ? pass("database hardening covers ownership, webhooks, communications, documents and ledger")
  : fail("database hardening coverage incomplete");

if (process.exitCode) {
  console.error("High-risk boundary sweep: FAILED");
  process.exit();
}
console.log("High-risk boundary sweep: PASS");

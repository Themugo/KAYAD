#!/usr/bin/env node
/**
 * Maintained source-level security / identity / payment / migration release gate.
 * This is not a substitute for live PostgreSQL, provider or browser UAT.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok: Boolean(ok), detail });
const has = (file, tokens) => {
  const source = read(file);
  return tokens.every((token) => source.includes(token));
};

check('M-Pesa CIDR parser uses strict proxy-addr parser and fails closed',
  has('backend/middleware/mpesaSecurity.js', ['proxyaddr.compile([range])', 'catch {', 'return false;', 'normalizeIp']));
check('M-Pesa extra IP entries are whitespace-normalized',
  read('backend/middleware/mpesaSecurity.js').includes('.split(",").map((value) => value.trim()).filter(Boolean)'));
check('M-Pesa callback route is IP-filtered and payload-validated',
  has('backend/routes/paymentRoutes.js', ['router.post("/callback", mpesaIpWhitelist, validateMpesaCallback, idempotencyCheck']));
check('Payment initiation is authenticated, rate-limited, CSRF-protected and idempotent',
  has('backend/routes/paymentRoutes.js', ['protect,\n  paymentLimiter,\n  csrfProtection,\n  idempotencyCheck,\n  validate(initiatePaymentSchema)']));
check('Payment status is owner/staff authorized',
  has('backend/controllers/paymentController.js', ['const isOwner = !!(payment.user && req.user && payment.user.toString() === req.user.id);', 'if (!isOwner && !isStaff)']));
check('Payment callback claim is atomic and retryable',
  has('backend/services/paymentCallback.service.js', ['{ checkoutRequestId: checkoutId, processed: false }', 'if (claimedPaymentId && !finalized)', 'processed: false']));
check('Provider amount mismatch is rejected and audited',
  has('backend/services/paymentCallback.service.js', ['Number(amount) !== Number(payment.amount)', 'amount_mismatch']));
check('Payment status machine disallows terminal-state reversals',
  has('backend/services/paymentStateMachine.js', ['pending: new Set([\'success\', \'failed\', \'cancelled\'])', 'success: new Set()', 'failed: new Set()', 'cancelled: new Set()']));
check('Financial attempt/event/webhook tables have RLS and client access revoked',
  has('supabase/migrations/20261002090000_financial_audit_routing_rls_hardening.sql', [
    'payment_attempts ENABLE ROW LEVEL SECURITY', 'payment_events ENABLE ROW LEVEL SECURITY',
    'webhook_events ENABLE ROW LEVEL SECURITY', 'REVOKE ALL ON TABLE public.payment_attempts FROM anon, authenticated',
    'REVOKE ALL ON TABLE public.payment_events FROM anon, authenticated',
    'REVOKE ALL ON TABLE public.webhook_events FROM anon, authenticated']));
check('Backend-only kayad RPC execution is revoked from client roles',
  has('supabase/migrations/20261011093000_revoke_client_execute_on_kayad_rpcs.sql', [
    'REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', 'GRANT EXECUTE ON FUNCTION %s TO service_role']));
check('Auth refresh rotation and session invalidation controls are present',
  has('scripts/validate-advanced-auth-sweep.mjs', ['refresh tokens are hashed before persistence', 'refresh rotation is atomic in PostgreSQL', 'refresh reuse revokes the family']));
check('Registration and recovery flows are covered by current auth contract',
  has('scripts/validate-explicit-auth-flows.mjs', ['standalone login route exists', 'standalone registration route exists', 'password reset action']));
check('Ownership API mutations use request schemas and UUID path validation',
  has('backend/routes/ownershipRoutes.js', [
    'validate(ownershipVehicleSchema)', 'validate(ownershipServiceRecordSchema)',
    'validate(ownershipExpenseSchema)', 'validate(ownershipDocumentSchema)',
    'validate(ownershipTripSchema)', 'validate(ownershipSaleSchema)',
    'validateParams(vehicleIdParamsSchema)', 'validate(vehiclePassportSchema)',
  ]));
check('Reminder completion cannot cross-link another vehicle service record',
  has('backend/ownership/services/ownershipService.js', [
    "id: serviceRecordId,", "owner_vehicle_id: reminder.owner_vehicle_id",
    'Service record not found for this vehicle',
  ]));
check('Workshop verification cannot be self-certified by client payload',
  read('backend/ownership/services/ownershipService.js').includes('workshop_verified: false'));
check('Migration preflight and hygiene scripts are present',
  fs.existsSync(path.join(root, 'scripts/validate-supabase-migrations.mjs')) &&
  fs.existsSync(path.join(root, 'scripts/validate-migration-hygiene.mjs')));

let failed = 0;
for (const item of checks) {
  console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.name}`);
  if (item.detail) console.log(`  ${item.detail}`);
  if (!item.ok) failed++;
}
console.log(`\nKAYAD security/identity/finance source gate: ${checks.length - failed}/${checks.length} ${failed ? 'FAILED' : 'PASS'}`);
console.log('LIMIT: source checks only; live PostgreSQL replay, authenticated API tests, provider UAT and browser/device tests remain separate release gates.');
if (failed) process.exitCode = 1;

#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const migration = path.join(root, 'supabase', 'migrations', '20260918100000_wave2_transaction_invariants.sql');
const controller = fs.readFileSync(path.join(root, 'backend', 'controllers', 'carController.js'), 'utf8');
const atomic = fs.readFileSync(path.join(root, 'backend', 'utils', 'atomicTransactions.js'), 'utf8');
const media = fs.readFileSync(path.join(root, 'backend', 'services', 'mediaRecovery.service.js'), 'utf8');
const sql = fs.existsSync(migration) ? fs.readFileSync(migration, 'utf8') : '';
const checks = [
  ['Wave 2 migration exists', sql.length > 0],
  ['listing entitlement reservation table', /CREATE TABLE IF NOT EXISTS public\.listing_entitlement_reservations/.test(sql)],
  ['atomic dealer listing RPC', /kayad_create_dealer_listing_atomic/.test(sql) && /pg_advisory_xact_lock\(hashtextextended\('dealer-listing:/.test(sql)],
  ['dealer listing controller uses atomic RPC', /atomicCreateDealerListing/.test(controller) && /Idempotency-Key/.test(controller)],
  ['media recovery job table', /CREATE TABLE IF NOT EXISTS public\.media_upload_jobs/.test(sql)],
  ['media retry/dead-letter RPCs', /kayad_register_media_upload_job_atomic/.test(sql) && /kayad_register_media_upload_failure_atomic/.test(sql) && /kayad_complete_media_upload_atomic/.test(sql)],
  ['media recovery service integrated', /registerMediaUploadJob/.test(media) && /registerMediaUploadFailure/.test(media) && /completeMediaUpload/.test(media)],
  ['auction payment posts canonical ledger event', /kayad_settle_bid_payment_atomic/.test(sql) && /auction-payment:/.test(sql) && /kayad_post_ledger_entry_atomic/.test(sql)],
  ['inspection payout requires report', /kayad_mark_inspection_settlement_paid_atomic/.test(sql) && /inspection_reports/.test(sql) && /missing % report/.test(sql)],
  ['dispute resolution posts financial consequences', /kayad_resolve_dispute_atomic/.test(sql) && /dispute-release-seller:/.test(sql) && /dispute-refund:/.test(sql)],
  ['structural escrow invariants', /escrows_allocation_wave2/.test(sql) && /escrows_amount_positive_wave2/.test(sql)],
  ['structural inspection settlement invariant', /inspection_settlement_amounts_wave2/.test(sql)],
  ['wave 2 invariant audit RPC', /kayad_validate_wave2_invariants/.test(sql)],
  ['atomic listing helper exposed in backend', /atomicCreateDealerListing/.test(atomic)],
];
let failed = 0;
for (const [name, ok] of checks) { if (ok) console.log(`PASS ${name}`); else { console.error(`FAIL ${name}`); failed++; } }
console.log(`\nKAYAD Wave 2 invariant gate: ${failed ? `FAIL (${failed})` : 'PASS'}`);
if (failed) process.exit(1);

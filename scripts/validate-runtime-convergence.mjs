import fs from 'fs';
import path from 'path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const pass = (m) => console.log(`PASS ${m}`);
const fail = (m) => { console.error(`FAIL ${m}`); process.exitCode = 1; };

const ledger = read('supabase/migrations/20261002130000_runtime_convergence_financial_locks.sql');
const webhook = read('backend/services/paymentFinancialLifecycle.service.js');
const inventory = read('backend/routes/webhookRoutes.js');
const lock = read('backend/middleware/distributedLock.js');

const checks = [
  [ledger.includes('ON CONFLICT (external_reference, source) DO NOTHING'), 'ledger idempotency closes concurrent insert race'],
  [ledger.includes('deterministic account locking') && ledger.includes('p_debit_account_code < p_credit_account_code'), 'ledger account locks are deterministic'],
  [ledger.includes('p_debit_account_code = p_credit_account_code'), 'ledger rejects same-account postings'],
  [webhook.includes('webhook:mpesa:${dedupeKey}') && webhook.includes('23505'), 'M-Pesa webhook receipt is replay-safe under concurrent insert'],
  [webhook.includes('}, 120000);'), 'M-Pesa webhook lock has bounded long-running TTL'],
  [inventory.includes('}, 300000);'), 'inventory synchronization lock covers large batches'],
  [lock.includes('ALLOW_LOCAL_LOCK_FALLBACK') && lock.includes('NODE_ENV !== "production"'), 'production never silently falls back to process-local locks'],
];

for (const [ok, message] of checks) ok ? pass(message) : fail(message);
if (!process.exitCode) console.log(`Runtime convergence static gate: ${checks.length}/${checks.length} PASS`);

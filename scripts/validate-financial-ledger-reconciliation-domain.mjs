import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const checks = [];
const ok = (name, condition, detail = '') => checks.push({ name, pass: Boolean(condition), detail });
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const migrationHasReportFields = (text) => ['reportId','financialIntegrityScore','successRate'].every((x) => text.includes(x));

const ledger = read('backend/services/ledgerService.js');
const recon = read('backend/services/reconciliationService.js');
const base = read('backend/models/_base.js');
const v1 = read('backend/routes/v1.js');
const migration = read('supabase/migrations/20260907233000_financial_ledger_reconciliation_domain.sql');

ok('canonical atomic ledger posting', ledger.includes('kayad_post_ledger_entry_atomic'));
ok('canonical atomic reversal', ledger.includes('kayad_reverse_ledger_entry_atomic'));
ok('ledger integrity verifier exists', ledger.includes('verifyLedgerIntegrity') || ledger.includes('verify')); 
ok('reconciliation service uses canonical persistence adapter', recon.includes('create("reconciliation_reports"') && recon.includes('createRecord'));
ok('report issue persistence is represented in service', recon.includes('addIssue') && recon.includes('reconciliation_reports'));
ok('report resolution endpoint is represented', recon.includes('resolveIssue'));
ok('reconciliation reports use canonical schema fields', migrationHasReportFields(recon));
ok('reconciliation persistence migration exists', migration.includes('CREATE TABLE IF NOT EXISTS public.reconciliation_reports'));
ok('reconciliation records persistence exists', migration.includes('CREATE TABLE IF NOT EXISTS public.reconciliation_records'));
ok('reconciliation RLS is enabled', migration.includes('ENABLE ROW LEVEL SECURITY'));
ok('anonymous/authenticated financial report access revoked', migration.includes('REVOKE ALL ON TABLE public.reconciliation_reports FROM anon, authenticated'));
ok('legacy transaction ledger route removed', !v1.includes('transactionLedgerRoutes') && !fs.existsSync(path.join(root,'backend/routes/transactionLedgerRoutes.js')));
ok('legacy TransactionLedger model removed', !fs.existsSync(path.join(root,'backend/models/TransactionLedger.js')) && !base.includes('TransactionLedger')); 

for (const c of checks) console.log(`${c.pass ? 'PASS' : 'FAIL'} ${c.name}${c.detail ? ` — ${c.detail}` : ''}`);
const failed = checks.filter((c) => !c.pass);
console.log(`\n${checks.length - failed.length}/${checks.length} PASS`);
if (failed.length) process.exit(1);

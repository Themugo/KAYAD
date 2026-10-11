import fs from 'node:fs';
import assert from 'node:assert/strict';

const migrationPath = 'supabase/migrations/20261011220000_ledger_signed_balance_rebuild.sql';
const dryRunPath = 'supabase/preflight/ledger_signed_balance_dry_run.sql';
const postingPath = 'supabase/migrations/20261002130000_runtime_convergence_financial_locks.sql';
const reversalPath = 'supabase/migrations/20260901210000_phase8_transaction_atomicity.sql';
const migration = fs.readFileSync(migrationPath, 'utf8');
const dryRun = fs.readFileSync(dryRunPath, 'utf8');
const posting = fs.readFileSync(postingPath, 'utf8');
const reversal = fs.readFileSync(reversalPath, 'utf8');

assert.match(migration, /COALESCE\(\(line->>'debit'\)::NUMERIC, 0\)[\s\S]*?-\s*COALESCE\(\(line->>'credit'\)::NUMERIC, 0\)/, 'rebuild must sum signed debit minus credit for every account');
assert.match(posting, /balance = balance \+ v_amount[\s\S]*?balance = balance - v_amount/, 'canonical repository posting uses debit-positive/credit-negative balances');
assert.match(reversal, /balance = balance - COALESCE\(\(v_line->>'debit'\)::NUMERIC, 0\)[\s\S]*?\+ COALESCE\(\(v_line->>'credit'\)::NUMERIC, 0\)/, 'reversal must exactly compensate signed posting');
assert.match(migration, /REVOKE ALL ON FUNCTION public\.kayad_rebuild_ledger_balances\(\) FROM PUBLIC, anon, authenticated/);
assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.kayad_rebuild_ledger_balances\(\) TO service_role/);
assert.doesNotMatch(migration, /SELECT\s+public?\.?kayad_rebuild_ledger_balances\s*\(/i, 'migration must not trigger a balance-changing rebuild automatically');
assert.match(dryRun, /READ-ONLY[\s\S]*stored_balance[\s\S]*signed_balance[\s\S]*normal_balance/i, 'dry-run must compare stored, signed and normal balances without writes');
assert.doesNotMatch(dryRun, /\b(UPDATE|INSERT|DELETE|TRUNCATE)\s+public?\.?ledger_/i, 'dry-run must not mutate ledger data');
console.log('Financial ledger sign-convergence source gate: 8/8 PASS');
console.log('Signed convention is consistent across posting, reversal and rebuild; dry-run is read-only; migration preserves service-role-only execution and does not auto-rebuild.');
console.log('LIMIT: no PostgreSQL execution or target-environment balance diff was run in this environment.');

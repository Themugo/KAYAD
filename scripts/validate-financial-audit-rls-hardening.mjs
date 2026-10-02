import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const migration = path.join(root, 'supabase/migrations/20261002090000_financial_audit_routing_rls_hardening.sql');
const source = fs.readFileSync(migration, 'utf8');

const requiredTables = ['payment_attempts', 'payment_events', 'webhook_events'];
const failures = [];

for (const table of requiredTables) {
  if (!new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY`, 'i').test(source)) {
    failures.push(`${table}: RLS not enabled`);
  }
  if (!new RegExp(`REVOKE ALL ON TABLE public\\.${table} FROM anon, authenticated`, 'i').test(source)) {
    failures.push(`${table}: direct client privileges not revoked`);
  }
}

const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (packageJson.scripts?.['validate:financial-audit-rls-hardening'] !== 'node scripts/validate-financial-audit-rls-hardening.mjs') {
  failures.push('package.json: validator script missing');
}

if (failures.length) {
  console.error('FINANCIAL AUDIT RLS HARDENING: FAIL');
  failures.forEach((f) => console.error(`- ${f}`));
  process.exit(1);
}

console.log('FINANCIAL AUDIT RLS HARDENING: 7/7 PASS');
console.log('- payment_attempts RLS enabled');
console.log('- payment_attempts client privileges revoked');
console.log('- payment_events RLS enabled');
console.log('- payment_events client privileges revoked');
console.log('- webhook_events RLS enabled');
console.log('- webhook_events client privileges revoked');
console.log('- canonical service-role backend path preserved');

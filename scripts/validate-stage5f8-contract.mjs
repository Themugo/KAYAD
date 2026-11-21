import fs from 'node:fs';
import path from 'node:path';
const migrationPath = 'supabase/migrations/20261020160000_private_seller_auction_custody_contract.sql';
const sql = fs.readFileSync(migrationPath, 'utf8');
// KAYAD_STAGE5F8_EXECUTION_REPORT.md was removed in 80cfca9 once Stage 5F.10 shipped the database-level enforcement migration below.
const enforcement = fs.readFileSync('supabase/migrations/20261020170000_private_seller_auction_gate_enforcement.sql', 'utf8');
const checks = [
  ['proposal persistence table', /CREATE TABLE IF NOT EXISTS private_seller_auction_proposals/i.test(sql)],
  ['versioned proposal and evidence', /proposal_version integer[\s\S]*evidence_version integer/i.test(sql)],
  ['failed and inconclusive verification states', /'failed'[\s\S]*'inconclusive'/i.test(sql)],
  ['custody states include received and incident hold', /'received'[\s\S]*'incident_hold'/i.test(sql)],
  ['appeal lifecycle', /appeal_status[\s\S]*'submitted'[\s\S]*'overturned'/i.test(sql)],
  ['separate audit events', /CREATE TABLE IF NOT EXISTS private_seller_auction_evidence_events/i.test(sql)],
  ['explicit garage/dealer custody capability', /provider_kind text NOT NULL CHECK\(provider_kind IN \('garage','dealer'\)\)/i.test(sql)],
  ['capability can be suspended/revoked', /'active','suspended','revoked'/i.test(sql)],
  ['RLS enabled on all new tables', (sql.match(/ENABLE ROW LEVEL SECURITY/g) || []).length === 3],
  ['migration explicitly local/not applied', /NOT applied to any hosted database/i.test(sql)],
  ['follow-up migration guards protected state inside the database', /kayad_psap_guard_writes/.test(enforcement) && /Direct writes to % are not permitted; use the transition functions/.test(enforcement)],
  ['follow-up migration makes the audit trail append-only', /kayad_psap_append_only/.test(enforcement)],
  ['follow-up migration is also local source only', /NOT applied to any hosted database/i.test(enforcement)],
];
let failures = 0;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) failures++; }
console.log(`RESULT ${checks.length - failures}/${checks.length}`);
if (failures) process.exitCode = 1;

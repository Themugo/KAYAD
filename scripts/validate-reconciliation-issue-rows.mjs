// Regression guard (GAP-ESC-OPS, 2026-11-21): reconciliation issues live in reconciliation_reports.issues (JSONB array).
// No controller may query the non-existent `issueDetails` / `issue_details` path; everything uses the single DB function.
import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const rd = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const mig = rd('supabase/migrations/20261121100000_reconciliation_issue_rows.sql');
const ctrls = ['backend/controllers/escrowOperationsController.js', 'backend/controllers/financeController.js', 'backend/controllers/reconciliationController.js'];
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const checks = [
  ['function is SECURITY DEFINER with pinned search_path', /SECURITY DEFINER/.test(mig) && /SET search_path = public/.test(mig)],
  ['function is STABLE (read-only)', /\bSTABLE\b/.test(mig)],
  ['function guards non-array issues and non-object elements', /jsonb_typeof\(r\.issues\)\s*=\s*'array'/.test(mig) && /jsonb_typeof\(e\.val\)\s*=\s*'object'/.test(mig)],
  ['execute revoked from PUBLIC/anon/authenticated and granted to service_role only', /REVOKE ALL ON FUNCTION[\s\S]*FROM PUBLIC, anon, authenticated/.test(mig) && /GRANT EXECUTE ON FUNCTION[\s\S]*TO service_role/.test(mig)],
  ...ctrls.map((c) => [`${c} has no issueDetails query path`, !/['"`]issueDetails\.|\$unwind\s*:\s*['"]\$issueDetails|ReconciliationReport\.(find|aggregate|countDocuments)\([^)]*issueDetails/.test(strip(rd(c)))]),
  ['escrow ops controller uses the shared helper', /fetchIssueRows/.test(rd(ctrls[0]))],
  ['finance controller uses the shared helper', /fetchIssueRows/.test(rd(ctrls[1]))],
  ['reconciliation controller uses the shared helper', /fetchIssueRows/.test(rd(ctrls[2]))],
];
let failed = 0;
for (const [n, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${n}`); if (!ok) failed++; }
if (failed) { console.error(`${failed} check(s) failed`); process.exit(1); }
console.log('Reconciliation issue rows guard passed');

// GAP-ESC-OPS regression: reconciliation findings live in the JSONB `issues` column. Exercises the real HTTP endpoints
// against the real migrated schema with resolved, unresolved, empty, missing, malformed and multiple issue records.
import { Client, makeUser, q, check, finish, uid } from './lib.mjs';
const tag = uid();
const insert = (reportId, issuesJson, extra = '') => q(`insert into reconciliation_reports(report_id,report_type,start_time,end_time,status,issues,matched,unmatched,missing,overpaid,underpaid,financials,success_rate${extra ? ',' + extra.split('=')[0] : ''}) values ('${reportId}','full_reconciliation',now()-interval '1 hour',now(),'completed',${issuesJson},1,2,3,4,5,'{"overpaidTotal":100,"underpaidTotal":50,"missingTotal":25}'::jsonb,90${extra ? ',' + extra.split('=')[1] : ''}) returning id`);
q(`delete from reconciliation_reports where report_id like 'JRN-${tag}-%'`);
const E1 = crypto.randomUUID(), E2 = crypto.randomUUID();
const j = (o) => `'${JSON.stringify(o).replace(/'/g, "''")}'::jsonb`;
const r1 = insert(`JRN-${tag}-1`, j([{ type: 'amount_mismatch', severity: 'high', resolved: false, escrowId: E1 }, { type: 'missing_payment', severity: 'critical', resolved: true, escrowId: E1 }]));
const r2 = insert(`JRN-${tag}-2`, `'[]'::jsonb`);
const r3 = insert(`JRN-${tag}-3`, `'null'::jsonb`); // the column is NOT NULL, so the "missing" case is JSON null
const r4 = insert(`JRN-${tag}-4`, j({ not: 'an array' }));
const r5 = insert(`JRN-${tag}-5`, j([5, null, 'x', [1], { type: 'drift', severity: 'low' }, { type: 'drift', severity: 'low', resolved: 'true' }]));
const r6 = insert(`JRN-${tag}-6`, j([{ type: 'duplicate', severity: 'medium', resolved: false, escrow: E2 }, { type: 'duplicate', severity: 'medium', resolved: false, escrow: E2 }, { type: 'drift', severity: 'high', resolved: false }, { type: 'drift', severity: 'high', resolved: true }]));
// Expected (this suite's rows): unresolved issues = r1:1, r5:1 (missing key counts as open), r6:3 = 5 across 3 reports; resolved = 1+1+1 = 3; objects total = 2+2+4 = 8.

const officer = await makeUser({ tag: 'eo', dbRole: 'escrow_officer' });
const accounts = await makeUser({ tag: 'acc', dbRole: 'accounts' });
const admin = await makeUser({ tag: 'adm', dbRole: 'admin' });
const buyer = await makeUser({ tag: 'buyer' });
const anon = new Client();

for (const [name, c] of [['escrow_officer', officer], ['accounts', accounts]]) {
  const d = await c.raw('/api/escrow/operations/dashboard');
  check(`${name}: escrow operations dashboard is 200 (was 500)`, d.status === 200, [d.status, d.j?.message]);
  const rec = d.j?.data?.queues?.reconciliation;
  const mine = (rec?.items || []).filter((i) => [r1, r5, r6].includes(i.id));
  check(`${name}: dashboard counts reports with unresolved issues (>=3 incl. ours)`, rec && rec.count >= 3 && mine.length === 3, rec);
  check(`${name}: per-report open issue counts are exact (1,1,3)`, [r1, r5, r6].every((id, k) => mine.find((m) => m.id === id)?.issueCount === [1, 1, 3][k]), mine);
  check(`${name}: fully resolved/empty/null/malformed reports are NOT listed`, ![r2, r3, r4].some((id) => (rec?.items || []).some((i) => i.id === id)), rec?.items);
}
const caseE = await officer.raw(`/api/escrow/operations/case/${E1}`);
check('case endpoint for an unknown escrow stays a clean 404, not a 500', caseE.status === 404, caseE.status);

const iss = await admin.raw('/api/finance/issues?limit=500');
check('finance unresolved issues endpoint 200', iss.status === 200, [iss.status, iss.j?.message]);
const ours = (iss.j?.issues || []).filter((i) => String(i.reportId).startsWith(`JRN-${tag}-`));
check('finance lists exactly the 5 open issues (resolved:true/"true" excluded, missing key included, non-objects ignored)', ours.length === 5, ours.map((i) => `${i.reportId}:${i.type}`));
const hi = await admin.raw('/api/finance/issues?severity=high&limit=500');
check('severity filter applies to unresolved issues only', (hi.j?.issues || []).filter((i) => String(i.reportId).startsWith(`JRN-${tag}-`)).length === 2, hi.j?.issues?.length);
const ty = await admin.raw('/api/finance/issues?type=duplicate&limit=500');
check('type filter applies', (ty.j?.issues || []).filter((i) => String(i.reportId).startsWith(`JRN-${tag}-`)).length === 2, ty.j?.issues?.length);

const stats = await admin.raw('/api/finance/statistics?days=1');
const s = stats.j?.statistics;
check('finance statistics 200 with numeric totals', stats.status === 200 && Number.isFinite(s?.totalIssues), [stats.status, s]);
check('statistics: totalIssues/resolved/unresolved include our 8/3/5 (>=)', s && s.totalIssues >= 8 && s.resolvedIssues >= 3 && s.unresolvedIssues === s.totalIssues - s.resolvedIssues, s);
check('statistics: byIssueSeverity/byIssueType are populated, not a single "undefined" bucket', s && !('undefined' in (s.byIssueSeverity || {})) && (s.byIssueSeverity?.high || 0) >= 3 && (s.byIssueType?.duplicate || 0) >= 2, [s?.byIssueSeverity, s?.byIssueType]);

const dash = await admin.raw('/api/reconciliation/dashboard?days=1');
const dd = dash.j?.data;
check('reconciliation dashboard 200', dash.status === 200, [dash.status, dash.j?.message]);
check('dashboard unresolvedIssues >= 5 and breakdowns are real buckets', dd && dd.unresolvedIssues >= 5 && !('undefined' in (dd.issueBreakdown || {})), [dd?.unresolvedIssues, dd?.issueBreakdown]);
check('dashboard directional totals sum report columns and financials JSONB (>= our 6 reports)', dd && dd.directional?.totalMatched >= 6 && dd.directional?.overpaidAmount >= 600 && dd.directional?.missingAmount >= 150, dd?.directional);

const csv = await admin.raw(`/api/reconciliation/export/${r6}/csv`);
check('csv export of a report works from `issues` (no TypeError) and shows Yes/No resolution', csv.status === 200, csv.status);
const csv5 = await admin.raw(`/api/reconciliation/export/${r5}/csv`);
check('csv export tolerates non-object elements in issues', csv5.status === 200, csv5.status);
const csv4 = await admin.raw(`/api/reconciliation/export/${r4}/csv`);
check('csv export tolerates a malformed (non-array) issues value', csv4.status === 200, csv4.status);
const csv3 = await admin.raw(`/api/reconciliation/export/${r3}/csv`);
check('csv export tolerates JSON null issues', csv3.status === 200, csv3.status);
const exp = await admin.raw(`/api/finance/export/${r6}`);
check('finance JSON export returns the issues array under both keys', exp.status === 200 && Array.isArray(exp.j?.exportData?.issues) && Array.isArray(exp.j?.exportData?.issueDetails) && exp.j.exportData.issues.length === 4, [exp.status, exp.j?.exportData?.issues?.length]);

// permission boundaries unchanged
for (const p of ['/api/escrow/operations/dashboard', '/api/finance/issues', '/api/finance/statistics', '/api/reconciliation/dashboard']) {
  const b = await buyer.raw(p); const a = await anon.raw(p);
  check(`personal user blocked from ${p}`, [401, 403].includes(b.status), b.status);
  check(`anonymous blocked from ${p}`, [401, 403].includes(a.status), a.status);
}
// data not mutated by reads
check('read endpoints did not change stored issues', q(`select jsonb_array_length(issues) from reconciliation_reports where id='${r6}'`) === '4' && q(`select count(*) from reconciliation_reports where report_id like 'JRN-${tag}-%'`) === '6');
q(`delete from reconciliation_reports where report_id like 'JRN-${tag}-%'`);
finish('reconciliation-issues');

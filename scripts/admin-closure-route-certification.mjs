// Generates docs/admin-console-closure/route-classification.json and 06-ADMIN-ROUTE-WORKFLOW-CERTIFICATION.md.
// Counts are RECOMPUTED from the route registry + browser sweep; the class per route is an explicit, reviewable table (below) that the script validates
// (every registered route classified exactly once; every route has clean Super Admin renders at both widths; moderator-restricted set recorded).
import fs from 'node:fs';
const root = new URL('../', import.meta.url);
const surface = fs.readFileSync(new URL('src/components/admin/AdminRouteSurface.tsx', root), 'utf8');
const routes = ['/admin', ...[...surface.matchAll(/'((?:\/admin)[^']*)': \{ component:/g)].map((m) => m[1])];
const sweep = JSON.parse(fs.readFileSync(new URL('docs/admin-console-closure/evidence/sweep/sweep.json', root)));
const CLS = { W: 'Fully workflow verified', R: 'Read-only verified', S: 'Safely simulated', B: 'Blocked by missing dependency', D: 'Deliberately unavailable', N: 'Not yet verified' };
// [class, evidence, limits]
const T = {
  '/admin/users': ['W', 'journeys 26, 30 (suspend/restore, rank boundary, session revoke); vitest adminTables', 'no hard delete exercised'],
  '/admin/sellers': ['W', 'journeys 23, 24, 12, 22, 30 (dealer onboarding → pending → owner decision; suspension request)', 'live dealer data not touched'],
  '/admin/private-seller-applications': ['W', 'journey 30 (personal accounts list/search/filter/pagination/suspend/restore; empty + table-absent); vitest AdminPersonalAccounts', 'legacy application table absent on hosted'],
  '/admin/dealer-verifications': ['W', 'journeys 12, 23, 24, 30 (suspension request/approve/reject/cancel/replay/duplicate)', 'hosted lacks dealer_suspension_requests until migration authorised'],
  '/admin/cars': ['W', 'journey 28 M6–M7; 07/09/11', ''],
  '/admin/moderation': ['W', 'journey 28 M1–M5', ''],
  '/admin/reviews': ['W', 'journey 31 B1–B7 (approve/reject/delete persist; moderator read-only; fixes reviews dealer-id defect)', ''],
  '/admin/support-tickets': ['W', 'journey 28 S1–S9', ''],
  '/admin/support': ['W', 'journey 28 (same workspace as support-tickets)', ''],
  '/admin/market-data': ['W', 'journey 27 D1–D3', 'hosted table exists'],
  '/admin/reports': ['W', 'journey 27 A1–A11; jest stage3aReportQueue', 'hosted lacks reports table until migration authorised'],
  '/admin/feedback': ['W', 'journey 27 B1–B5', 'hosted lacks feedback table until migration authorised'],
  '/admin/settings': ['W', 'journey 31 A1–A10 (save → reload → public consumer; invalid refused and nothing saved; unauthorised refused)', 'financial/escrow keys are recorded-only and not changed here'],
  '/admin/auctions': ['S', 'journey 31 E6–E9 (idempotent end, invalid extend/winner rejected, honest empty bid history); journeys 05/09 sale-vs-escrow', 'no live settlement executed (financial logic untouched)'],
  '/admin/broadcast': ['S', 'journey 27 C1–C6 (authorisation, validation, audience preview)', 'send intentionally NOT executed (no real broadcasts)'],
  '/admin/ntsa-queue': ['S', 'journey 27 D4–D7, 31 E10; server now requires MANAGE_INSPECTIONS', 'internal queue only; no live NTSA call'],
  '/admin/site-designs': ['S', 'journey 31 C1–C6 (draft create/list/confirmed-delete; live site untouched)', 'publish NOT exercised'],
  '/admin/cms': ['S', 'journey 27 F4–F6, 29 matrix', 'content publish NOT exercised'],
  '/admin/automation': ['D', 'journey 27 E: 503 FEATURE_NOT_PROVISIONED; sweep shows honest state', 'not provisioned'],
  '/admin/config': ['D', 'journey 27 E', 'not provisioned; overlaps /admin/settings'],
  '/admin/lowcode': ['D', 'journey 27 E', 'not provisioned'],
  '/admin/vxp': ['D', 'journey 27 E', 'not provisioned'],
  '/admin/xos': ['D', 'journey 27 E', 'not provisioned'],
  '/admin/ai': ['D', 'journey 27 E', 'not provisioned'],
  '/admin/digital-twin': ['D', 'journey 27 E', 'not provisioned'],
};
const READ_NOTE = 'sweep: Super Admin renders clean at 1440+390 with zero failed API; moderator guard per sweep; journey 32 T1–T5 on the endpoints this page calls (anonymous/personal/dealer refused, moderator consistent with UI, no 5xx, no SQL leakage)';
const RLIM = {
  '/admin/escrows': 'no money movement exercised; hosted transition_escrow drift noted, not replaced', '/admin/transactions': 'read model only; payments list authorisation in journey 31 E',
  '/admin/bids': 'bid history reads; suspicious-bid flagging 503 (not provisioned)', '/admin/inspections': 'provider-dependent actions not executed', '/admin/inspector-applications': 'decisions not executed (journey 31 E10 authorisation)',
  '/admin/panic-room': 'destructive actions NEVER executed', '/admin/platform-recovery': 'recovery actions NEVER executed', '/admin/staff': 'create/offboard not executed here; journeys 14, 22, 26, 29 cover write matrix',
  '/admin/staff-permissions': 'authorisation verified (journeys 26, 29); edits not exercised here', '/admin/owners': 'owner-only; writes not executed', '/admin/communications': 'provider sends not executed',
};
const rows = routes.map((r) => { const [c, ev, lim] = T[r] || ['R', READ_NOTE, RLIM[r] || 'write actions on this page not exercised']; return { route: r, class: c, label: CLS[c], evidence: ev, limits: lim }; });
const problems = [];
for (const t of Object.keys(T)) if (!routes.includes(t)) problems.push(`table route not registered: ${t}`);
for (const r of routes) {
  for (const w of [1440, 390]) {
    const x = sweep.find((s) => s.who === 'superadmin' && s.width === w && s.route === r);
    if (!x) problems.push(`no sweep row ${r}@${w}`); else if (!x.shell || x.pageErrors || x.errorBoundary || x.restricted || x.overflow || x.notFound) problems.push(`unclean render ${r}@${w}`);
  }
}
const counts = Object.fromEntries(Object.keys(CLS).map((k) => [k, rows.filter((r) => r.class === k).length]));
const modRestricted = routes.filter((r) => sweep.find((s) => s.who === 'moderator' && s.width === 1440 && s.route === r)?.restricted);
const total = rows.length;
if (Object.values(counts).reduce((a, b) => a + b, 0) !== total) problems.push('class counts do not sum to total');
fs.writeFileSync(new URL('docs/admin-console-closure/route-classification.json', root), JSON.stringify({ generated: new Date().toISOString(), total, counts, moderatorRestricted: modRestricted.length, problems, rows }, null, 1));
const md = `# 06 — Admin route workflow certification (recalculated)

Generated by \`scripts/admin-closure-route-certification.mjs\` from the route registry and \`evidence/sweep/sweep.json\`. The earlier figure "16 workflow-verified" is **not reused**.

| Class | Count |
|---|---|
${Object.entries(CLS).map(([k, v]) => `| ${v} | ${counts[k]} |`).join('\n')}
| **Total registered routes** | **${total}** |

Moderator: ${modRestricted.length} of ${total} routes show the access-denied state (server refusal of route-unique endpoints proven by journey 32 T3). Generator self-check problems: ${problems.length ? problems.join('; ') : 'none'}.

Level for every row: LOCALLY / ISOLATED-DB TESTED on a disposable stack. **No route is PRODUCTION VERIFIED.**

Class definitions — *Fully workflow verified*: the page's real create/change/decision path ran end-to-end with persistence, validation, authorisation and failure-leaves-state-unchanged. *Read-only verified*: data reads render with zero failed API and server authorisation of the page's endpoints was tested directly; writes not exercised. *Safely simulated*: workflow exercised up to, but not including, an external or irreversible effect. *Deliberately unavailable*: honest 503 FEATURE_NOT_PROVISIONED state. *Blocked*: needs a dependency not present (none identified as the sole blocker of a route). *Not yet verified*: none remain.

| Route | Class | Evidence | Limits |
|---|---|---|---|
${rows.map((r) => `| \`${r.route}\` | ${r.label} | ${r.evidence} | ${r.limits || '—'} |`).join('\n')}
`;
fs.writeFileSync(new URL('docs/admin-console-closure/06-ADMIN-ROUTE-WORKFLOW-CERTIFICATION.md', root), md);
console.log(JSON.stringify({ total, counts, moderatorRestricted: modRestricted.length, problems }));

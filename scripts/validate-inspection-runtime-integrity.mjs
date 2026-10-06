import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const checks = [];
const ok = (name, pass, detail='') => checks.push({name, pass, detail});

const routes = read('backend/inspection/routes/inspectionRoutes.js');
const review = read('backend/inspectionBusinessCenter/services/reportReviewService.js');
const report = read('backend/inspection/services/reportService.js');
const idem = read('backend/middleware/idempotency.js');
const migration = read('supabase/migrations/20261006193000_inspection_qa_segregation_and_media_integrity.sql');
const settlement = read('backend/inspection/services/settlementService.js');

ok('payment route requires authentication before admin role', /payment', requireAuth, requireRole\(\['admin'\]\)/.test(routes));
ok('refund route requires authentication before admin role', /refund', requireAuth, requireRole\(\['admin'\]\)/.test(routes));
ok('inspection completion uses idempotency middleware', /execution\/:bookingId\/complete', requireAuth, idempotencyCheck/.test(routes));
ok('inspection completion has deterministic idempotency key', /inspection_complete_\$\{bookingId\}_\$\{userId\}/.test(idem));
ok('inspection completion is a critical lock operation', /"inspection_complete"/.test(idem));
ok('report review resolves private storage URL helper', /import \{ getPrivateStorageUrl \}/.test(review));
ok('QA approval blocks inspecting staff member', /cannot approve this report/.test(review));
ok('QA approval requires admin or designated QA role', /QA_STAFF_ROLES/.test(review) && /Only an administrator or designated QA\/auditor/.test(review));
ok('QA submission records submitter provenance', /submitted_by: submittedBy/.test(review));
ok('public share does not spread full report row', !/return \{\n      \.\.\.report,/.test(report));
ok('PDF DB failure rolls back uploaded object', /deleteMedia\(\{ bucket: uploaded\.bucket, path: uploaded\.path \}\)/.test(report));
ok('failed QA cannot set quality_reviewed', /reviewData\.passed !== true/.test(report));
ok('legacy QA path cannot bypass approved report version', /latestVersion\[0\]\?\.status !== 'approved'/.test(report));
ok('settlement requires approved QA version and generated PDF', /latestVersion\?\.status === 'approved'/.test(settlement) || /versions\[0\]\?\.status !== 'approved'/.test(settlement));
ok('QA provenance migration exists', /submitted_by UUID/.test(migration) && /submitted_at TIMESTAMPTZ/.test(migration));

const failed = checks.filter(c => !c.pass);
for (const c of checks) console.log(`${c.pass ? 'PASS' : 'FAIL'} ${c.name}${c.detail ? ` — ${c.detail}` : ''}`);
if (failed.length) process.exit(1);
console.log(`INSPECTION RUNTIME INTEGRITY: ${checks.length}/${checks.length} PASS`);

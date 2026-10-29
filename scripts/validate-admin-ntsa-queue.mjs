import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const ui = read('src/pages/admin/AdminNtsaQueue.jsx');
const route = read('backend/routes/ntsaVerificationRoutes.js');
const schema = read('backend/validation/ntsa.schema.js');
const api = read('src/api/api.exports.ts');
const checks = [
  ['NTSA list uses query validation', route.includes('validateQuery(listNtsaVerificationQuerySchema)')],
  ['Queue body schema remains separate', route.includes('validate(queueNtsaVerificationSchema)')],
  ['List status enum matches persisted workflow states', schema.includes('["pending", "in_review", "passed", "failed"]')],
  ['Process status contract matches route statuses', schema.includes('["in_review", "passed", "failed"]')],
  ['Process payload includes canonical adminNotes field', schema.includes('adminNotes: z.string().trim().max(1000')],
  ['Document schema matches route label field', schema.includes('label: z.string().trim().min(1).max(160).optional()')],
  ['List response shape is checked before replacing queue', ui.includes('!Array.isArray(data.requests)')],
  ['Queue load errors are visible and retryable', ui.includes('Queue could not be refreshed') && ui.includes('onClick={() => load()}')],
  ['Successful empty state is distinct from request failure', ui.includes('An empty queue is only confirmed after a successful response.')],
  ['Stale list requests are ignored', ui.includes('requestSequence.current') && ui.includes('sequence !== requestSequence.current')],
  ['Queue action surfaces server errors', ui.includes('The car could not be queued')],
  ['Process action surfaces server errors', ui.includes('The decision could not be saved')],
  ['Review workflow exposes Start Review', ui.includes("openProcessModal(request, 'in_review')")],
  ['Approval requires all three explicit verification checks', ui.includes('!processModal.chassisVerified || !processModal.logbookVerified || !processModal.importVerified')],
  ['Approval requires explicit duty status', ui.includes("['duty_paid', 'duty_unpaid'].includes(processModal.dutyStatus)")],
  ['Backend enforces approval checklist', route.includes('chassisVerified !== true || logbookVerified !== true || importVerified !== true')],
  ['Backend enforces known duty status for approval', route.includes('["duty_paid", "duty_unpaid"].includes(effectiveDutyStatus)')],
  ['Backend prevents changes to completed requests', route.includes('This verification request has already been completed')],
  ['Backend requires rejection reason', route.includes('A reason is required when rejecting a verification request')],
  ['NTSA API facade remains canonical', api.includes("api.get('/ntsa-verification'") && api.includes("api.post(`/ntsa-verification/${id}/process`")],
  ['UI makes no claim of live NTSA integration', ui.includes('does not represent a live NTSA system lookup')],
  ['No fabricated queue records added', !/mockRequests|fakeRequests|sampleNtsa/i.test(ui)],
];
let failures = 0;
for (const [name, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${name}`);
  if (!passed) failures++;
}
console.log(`\n${checks.length - failures}/${checks.length} checks passed`);
if (failures) process.exitCode = 1;

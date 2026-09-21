import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const checks = [];
const expect = (ok, name) => checks.push([ok, name]);

const worker = read('backend/workers/notificationWorker.js');
const workerTest = read('tests/notificationWorker.test.js');
const financeMigration = 'supabase/migrations/20260921093540_harden_loan_application_contract_v14.sql';

expect(worker.includes('export const processNotification'), 'notification worker exposes testable canonical processor');
expect(!worker.includes('notification?.id') && !worker.includes('return { notification,'), 'notification worker has no undefined notification return path');
expect(worker.includes('notificationIds: results.map') && worker.includes('return { deliveries: results'), 'notification worker returns canonical communication deliveries');
expect(worker.includes('if (!io) return false') && worker.includes('return true'), 'push delivery reports an explicit success boolean');
expect(workerTest.includes('canonical communication deliveries') && workerTest.includes('Socket.IO is unavailable'), 'notification worker regression coverage exists');
expect(fs.existsSync(path.join(root, financeMigration)), 'V14 finance migration is versioned in source');
expect(read('backend/utils/fieldMap.js').includes('loan_applications: {'), 'finance field mapping uses the canonical data access layer');
expect(read('backend/controllers/loanApplicationController.js').includes('Vehicle price must be greater than zero'), 'finance API validates application amounts server-side');
expect(read('backend/controllers/loanApplicationController.js').includes('const transitions ='), 'finance API enforces lifecycle transitions server-side');
expect(read('src/services/loanApi.ts').includes('getAllLoanApplications') && read('src/services/loanApi.ts').includes('updateLoanApplicationStatus'), 'finance client exposes admin review transport');
expect(read('scripts/validate-finance-domain-end-to-end.mjs').includes('Finance domain gate'), 'finance domain validator is current');
expect(read('scripts/validate-dispute-canonical-lifecycle.mjs').includes('Active escrow dispute surface'), 'dispute validator targets the current canonical surface');
expect(!fs.existsSync(path.join(root, 'backend/models/Dispute.js')), 'obsolete Dispute model removed');
expect(!fs.existsSync(path.join(root, 'backend/models/Evidence.js')), 'obsolete Evidence model removed');
expect(!fs.existsSync(path.join(root, 'backend/services/resolution.service.js')), 'obsolete resolution service removed');
expect(fs.readdirSync(path.join(root, 'backend/workers')).filter((f) => /notification.*worker|worker.*notification/i.test(f)).length === 1, 'single canonical notification worker remains');

let failures = 0;
for (const [ok, name] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) failures += 1;
}
console.log(`\nV14 production activation validation: ${checks.length - failures}/${checks.length} PASS`);
if (failures) process.exit(1);

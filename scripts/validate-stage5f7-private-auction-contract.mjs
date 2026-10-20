import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const required = [
  ['contract freeze', 'KAYAD_STAGE5F7_PHASE_A_CONTRACT_FREEZE.md'],
  ['threat model', 'KAYAD_STAGE5F7_THREAT_MODEL.md'],
  ['API authorization matrix', 'KAYAD_STAGE5F7_API_AUTHORIZATION_MATRIX.md'],
];
const failures = [];
const pass = [];
for (const [label, relative] of required) {
  const full = path.join(root, relative);
  if (!fs.existsSync(full)) failures.push(`Missing ${label}: ${relative}`);
  else {
    const content = fs.readFileSync(full, 'utf8');
    if (content.trim().length < 1000) failures.push(`Incomplete ${label}: ${relative}`);
    else pass.push(`PASS ${label} exists and is substantive`);
  }
}
const contract = fs.readFileSync(path.join(root, 'KAYAD_STAGE5F7_PHASE_A_CONTRACT_FREEZE.md'), 'utf8');
const threat = fs.readFileSync(path.join(root, 'KAYAD_STAGE5F7_THREAT_MODEL.md'), 'utf8');
const matrix = fs.readFileSync(path.join(root, 'KAYAD_STAGE5F7_API_AUTHORIZATION_MATRIX.md'), 'utf8');
const requiredContractTerms = [
  'Physical vehicle custody is mandatory for every private-seller auction',
  'seller pays the disclosed inspection/custody charges',
  'Failed or inconclusive verification blocks auction',
  '`vehicle_custody` capability',
  'existing canonical bid endpoint',
  'Phase B — Backend source-of-truth and persistence integration',
];
for (const term of requiredContractTerms) {
  if (!contract.includes(term)) failures.push(`Contract decision missing: ${term}`);
  else pass.push(`PASS contract covers: ${term}`);
}
for (const term of ['Scheduler bypass', 'Bid bypass', 'Stale evidence', 'Private data leak', 'fail-closed']) {
  if (!threat.toLowerCase().includes(term.toLowerCase())) failures.push(`Threat model scenario missing: ${term}`);
  else pass.push(`PASS threat model covers: ${term}`);
}
for (const term of ['Place bid', 'Accept physical handover', 'Approve/reject proposal', 'Release vehicle']) {
  if (!matrix.includes(term)) failures.push(`Authorization matrix operation missing: ${term}`);
  else pass.push(`PASS authorization matrix covers: ${term}`);
}
const sourceFiles = [
  'backend/routes/auctionSetupRoutes.js',
  'backend/services/auctionSetup.service.js',
  'backend/services/auctionSetup.contract.js',
  'backend/controllers/bidController.js',
  'backend/inspection/services/providerGovernanceService.js',
];
for (const file of sourceFiles) {
  if (!fs.existsSync(path.join(root, file))) failures.push(`Expected source audit target missing: ${file}`);
  else pass.push(`PASS source audit target exists: ${file}`);
}
console.log(`Stage 5F.7 private-seller contract validator: ${pass.length} PASS, ${failures.length} FAIL`);
for (const line of pass) console.log(line);
for (const line of failures) console.error(`FAIL ${line}`);
if (failures.length) process.exit(1);

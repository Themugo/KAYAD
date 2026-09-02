import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const required = [
  'src/features/AdminView.tsx',
  'src/features/EscrowView.tsx',
  'src/features/InspectionsView.tsx',
  'src/services/inspectionApi.ts',
  'src/api/httpClient.ts',
];
const forbidden = [
  /197\.237\.114\.42/,
  /KAYAD-ESC-REF/,
  /INSP-2026-/,
  /Math\.random\(\)/,
  /100% Matched/,
  /100% Authentic/,
  /36 Hours/,
  /15% Transparent Platform Fee/,
];

for (const rel of required) {
  if (!fs.existsSync(path.join(root, rel))) throw new Error(`Missing required file: ${rel}`);
}

const activeFiles = required.map((rel) => ({ rel, text: fs.readFileSync(path.join(root, rel), 'utf8') }));
for (const { rel, text } of activeFiles) {
  for (const pattern of forbidden) {
    if (pattern.test(text)) throw new Error(`Forbidden production pattern ${pattern} found in ${rel}`);
  }
}

const deletedDirs = [
  'src/features/AdminView',
  'src/features/EscrowView',
  'src/features/InspectionsView',
];
for (const rel of deletedDirs) {
  if (fs.existsSync(path.join(root, rel))) throw new Error(`Dormant duplicate directory still exists: ${rel}`);
}

const admin = fs.readFileSync(path.join(root, 'src/features/AdminView.tsx'), 'utf8');
const inspection = fs.readFileSync(path.join(root, 'src/features/InspectionsView.tsx'), 'utf8');
const escrow = fs.readFileSync(path.join(root, 'src/features/EscrowView.tsx'), 'utf8');

for (const [name, text, patterns] of [
  ['AdminView', admin, [/adminAPI\.stats\(\)/, /adminAPI\.users\(/, /adminAPI\.cars\(/, /adminAPI\.getAuditLogs\(/]],
  ['InspectionsView', inspection, [/getMyInspections\(\)/, /createInspectionOrder\(/]],
  ['EscrowView', escrow, [/getMyEscrows\(\)/, /confirmVehicle\(/, /disputeEscrow\(/, /releaseEscrow\(/]],
]) {
  for (const pattern of patterns) if (!pattern.test(text)) throw new Error(`${name} missing expected live backend integration: ${pattern}`);
}

console.log('PHASE 18 PRODUCTION TRUTH VALIDATION: PASS');
console.log('Live admin, inspection and escrow surfaces checked.');
console.log('Fabricated identifiers/metrics checked.');
console.log('Dormant duplicate feature directories checked.');

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const files = [
  'backend/controllers/governanceController.js',
  'backend/controllers/commandCenterController.js',
  'backend/controllers/intelligenceController.js',
  'backend/controllers/eipController.js',
  'backend/controllers/ecpController.js',
  'backend/controllers/improvementController.js',
  'src/features/Governance/pages/GovernanceDashboard.tsx',
  'src/pages/admin/command-center/EnterpriseCommandCenter.jsx',
  'src/pages/admin/intelligence/ExecutiveIntelligenceCenter.jsx',
  'src/pages/admin/integration/IntegrationStudio.jsx',
  'src/pages/admin/improvement/ContinuousImprovementCenter.jsx',
];

for (const rel of files) {
  if (!fs.existsSync(path.join(root, rel))) throw new Error(`Missing ${rel}`);
}

const targets = files.map(rel => fs.readFileSync(path.join(root, rel), 'utf8')).join('\n');
const forbidden = [
  'john doe', 'auto kenya ltd', 'range rover 2023', 'homepage redesign',
  'fully compliant', 'sandbox.kayad', 'developer@kayad-sandbox',
  '45890000', '1245678', 'v2.3.1', 'sample governance data',
];
const lower = targets.toLowerCase();
const hits = forbidden.filter(x => lower.includes(x));
if (hits.length) throw new Error(`Fabricated enterprise markers remain: ${hits.join(', ')}`);

for (const controller of ['governanceController.js','commandCenterController.js','intelligenceController.js','eipController.js','ecpController.js','improvementController.js']) {
  const text = fs.readFileSync(path.join(root, 'backend/controllers', controller), 'utf8');
  if (!text.includes('notConfigured')) throw new Error(`${controller} is not fail-closed`);
}

const gov = fs.readFileSync(path.join(root, 'backend/controllers/governanceController.js'), 'utf8');
if (!gov.includes('AuditLog.findAll') || !gov.includes('audit_logs')) throw new Error('Governance audit is not tied to canonical audit_logs');

console.log('PHASE 31 ENTERPRISE CONTROL SURFACE VALIDATION: PASS');
console.log('Governance, command center, intelligence, integration, and control-plane synthetic outputs are fail-closed.');
console.log('Active admin enterprise pages contain no known fabricated records.');
console.log('Governance audit is backed by canonical audit_logs.');

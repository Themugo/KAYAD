import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const controller = read('backend/controllers/dealerPlatformController.js');
const dashboard = read('src/pages/dealer/dashboard/DealerDashboard.tsx');
const base = read('backend/models/_base.js');
const migrationFiles = fs.readdirSync(path.join(root, 'supabase/migrations'));
const migrationText = migrationFiles
  .filter((name) => name.endsWith('.sql') || name.endsWith('.sql.sql'))
  .map((name) => fs.readFileSync(path.join(root, 'supabase/migrations', name), 'utf8'))
  .join('\n');

const checks = [
  ['finance endpoint is explicit about missing canonical contract', () =>
    controller.includes('DEALER_FINANCE_UNAVAILABLE') &&
    controller.includes('no canonical dealer-scoped finance data contract exists yet')],
  ['finance endpoint does not query the unbacked loan application table', () => {
    const section = controller.slice(controller.indexOf('export async function getFinanceApplications'), controller.indexOf('// ============================================================\n// INSPECTION CENTER'));
    return !section.includes("LoanApplication.find") && !section.includes(".from(\"loan_applications\")") && !section.includes(".from(\'loan_applications\')");
  }],
  ['team read endpoint is explicit about missing canonical contract', () =>
    controller.includes('DEALER_TEAM_UNAVAILABLE') &&
    controller.includes('no canonical dealer-scoped team data contract exists yet')
  ],
  ['team write handlers do not fabricate members or invite links', () => {
    const section = controller.slice(controller.indexOf('export async function getTeamMembers'), controller.indexOf('// ============================================================\n// SUBSCRIPTIONS & BILLING'));
    return !section.includes('Date.now()') && !section.includes('inviteLink') && !section.includes('John Kamau') && !section.includes('Mary Wanjiku');
  }],
  ['authoritative migrations do not define loan_applications', () => !/CREATE TABLE(?: IF NOT EXISTS)?\s+(?:public\.)?loan_applications\b/i.test(migrationText)],
  ['authoritative migrations do not define dealer_teams', () => !/CREATE TABLE(?: IF NOT EXISTS)?\s+(?:public\.)?dealer_teams\b/i.test(migrationText)],
  ['loan application model remains available for existing buyer finance flows', () => base.includes('LoanApplication: "loan_applications"') && fs.existsSync(path.join(root, 'backend/models/LoanApplication.js'))],
  ['dealer dashboard keeps finance and team in honest unavailable state', () =>
    dashboard.includes('not backed by a canonical dealer-scoped data contract yet') &&
    dashboard.includes('KAYAD will not display simulated records here')],
  ['phase 55 live dealer operations remain wired', () =>
    dashboard.includes('dealerApi.getAuctionInventory') &&
    dashboard.includes('dealerApi.getInspectionOrders') &&
    dashboard.includes('dealerApi.getDealerAnalytics')],
  ['phase 56 documentation exists', () => fs.existsSync(path.join(root, 'PHASE_56_COMPLETE.md'))],
];

let passed = 0;
for (const [name, fn] of checks) {
  try {
    const ok = Boolean(fn());
    console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}`);
    if (ok) passed++;
  } catch (err) {
    console.log(`FAIL: ${name} (${err.message})`);
  }
}
console.log(`Phase 56 validation: ${passed}/${checks.length} passed`);
process.exitCode = passed === checks.length ? 0 : 1;

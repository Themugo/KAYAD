import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const checks = [
  ['canonical buyer financing surface', /FinanceMarketplace/.test(read('src/features/FinancePlatform/pages/FinanceMarketplace.tsx'))],
  ['legacy FinancingView is truthful compatibility surface', read('src/features/FinancingView.tsx').includes('const partnerBanks: PartnerBank[] = useMemo(() => [], []);') && read('src/features/FinancingView.tsx').includes('Document upload is not connected yet')],
  ['real loan transport', /\/api\/loans/.test(read('src/services/loanApi.ts'))],
  ['admin review transport', /export async function getAllLoanApplications/.test(read('src/services/loanApi.ts')) && /export async function updateLoanApplicationStatus/.test(read('src/services/loanApi.ts'))],
  ['server-side application validation', /Vehicle price must be greater than zero/.test(read('backend/controllers/loanApplicationController.js')) && /Invalid employment status/.test(read('backend/controllers/loanApplicationController.js'))],
  ['server-side lifecycle transitions', /Cannot move application from/.test(read('backend/controllers/loanApplicationController.js')) && /const transitions =/.test(read('backend/controllers/loanApplicationController.js'))],
  ['admin-only review route', /router\.get\("\/all".*adminOnly/s.test(read('backend/routes/loanApplicationRoutes.js'))],
  ['admin-only status route', /router\.put\("\/:id\/status".*adminOnly/s.test(read('backend/routes/loanApplicationRoutes.js'))],
];
let failed = 0;
for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`), failed += ok ? 0 : 1;
console.log(`\nFinance domain gate: ${checks.length - failed}/${checks.length} PASS`);
process.exitCode = failed ? 1 : 0;

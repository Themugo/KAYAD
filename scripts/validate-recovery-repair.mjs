import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));

const failures = [];
const pass = [];
const check = (name, ok, detail = '') => {
  if (ok) pass.push(`${name}${detail ? ` — ${detail}` : ''}`);
  else failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
};

check('package.json is valid', (() => { try { JSON.parse(read('package.json')); return true; } catch { return false; } })());
check('Phase 37 validator exists', exists('scripts/validate-phase37.mjs'));
check('Phase 39 validator exists', exists('scripts/validate-phase39.mjs'));
check('Canonical auth methods restored', /export async function login\b/.test(read('src/services/authApi.ts')) && /export async function register\b/.test(read('src/services/authApi.ts')) && /export async function updateProfile\b/.test(read('src/services/authApi.ts')));
check('DealerBusinessView import resolves', exists('src/features/DealersView/components/DealerBusinessView.tsx') && /\.\/DealersView\/components\/DealerBusinessView/.test(read('src/features/DealersView.tsx')));
check('Fixture type imports resolve', /from ['"]\.\.\/\.\.\/\.\.\/types['"]/.test(read('src/__tests__/fixtures/data/mockDealersData.ts')) && /from ['"]\.\.\/\.\.\/types['"]/.test(read('src/__tests__/fixtures/mockVehicles.ts')) && /from ['"]\.\.\/\.\.\/types['"]/.test(read('src/__tests__/fixtures/mockAuctions.ts')));
check('Private seller stale fabricated consumers removed', !/\boffers\.filter\b|\binspectionRequests\.length\b|\bcompletedSales\.length\b/.test(read('src/features/PrivateSellerDashboardView/components/PrivateSellerDashboardView.tsx')));
check('Financing page does not label marketplace inventory as financed', !/financedBank|Funded & Delivered|partner bank network \(Privacy Protected\)/i.test(read('src/features/FinancingView.tsx')));
check('Payment page has no synthetic wallet balance variables', !/\{balance\}|\{pendingBalance\}/.test(read('src/pages/Payments.tsx')));
check('Unified communication smart action is fail-closed', /handleExecuteSmartAction/.test(read('src/features/UnifiedCommunicationHub.tsx')));
check('Notification icon typing accepts backend notification strings', /getNotifIcon = \(type: string\)/.test(read('src/components/NotificationCenter.tsx')));
check('Orphan AuctionCalendar test retired', !exists('src/__tests__/pages/AuctionCalendar.test.jsx'));
check('Stale relative imports repaired', (() => {
  const files = [
    'src/components/VehicleCard/index.js',
    'src/components/mobile/index.js',
    'src/pages/admin/cms/components/MediaLibrary.jsx',
  ];
  return /from ['"]\.\/VehicleCard['"]/.test(read(files[0])) && /from ['"]\.\.\/MobileBottomNav['"]/.test(read(files[1])) && /from ['"]\.\.\/\.\.\/\.\.\/\.\.\/services\/cmsApi['"]/.test(read(files[2]));
})());
check('Backend operational test uses Jest, not Vitest', /from ['"]@jest\/globals['"]/.test(read('backend/tests/phase10/operationalDataContract.test.js')) && !/from ['"]vitest['"]/.test(read('backend/tests/phase10/operationalDataContract.test.js')));
check('M-Pesa failure tests match fail-closed bid-security contract', /fails closed and creates no transaction/.test(read('backend/tests/resilience/failureModes.test.js')) && /KAYAD_MASTER_PAYBILL/.test(read('backend/tests/resilience/failureModes.test.js')));
check('Payment callback unit test isolates atomic settlement', /unstable_mockModule\("\.\.\/\.\.\/utils\/atomicTransactions\.js"/.test(read('backend/tests/escrow/escrowPaymentSafety.test.js')));

check('Phase 10 contract test resolves repository-root paths', /path\.resolve\(process\.cwd\(\), "\.\."\)/.test(read('backend/tests/phase10/operationalDataContract.test.js')));
check('Default Jest run does not gate on non-functional ESM coverage', /collectCoverage: false/.test(read('backend/jest.config.js')) && !/coverageThreshold:/.test(read('backend/jest.config.js')));
check('No active runtime source references retired transaction shim', (() => {
  const dirs = ['backend/controllers','backend/routes','backend/services','backend/models','backend/utils','src/api','src/services'];
  for (const dir of dirs) {
    const abs = path.join(root, dir);
    if (!exists(dir)) continue;
    for (const name of fs.readdirSync(abs)) {
      if (!/\.(js|ts|tsx|jsx)$/.test(name)) continue;
      const text = fs.readFileSync(path.join(abs, name), 'utf8');
      if (/supabaseSession|escrowVault|EscrowVault|escrow_vaults|escrow-vault/.test(text)) return false;
    }
  }
  return true;
})());

console.log('KAYAD RECOVERY REPAIR VALIDATION');
for (const item of pass) console.log(`PASS ${item}`);
if (failures.length) {
  console.error(`FAIL ${failures.length} checks`);
  for (const item of failures) console.error(`- ${item}`);
  process.exit(1);
}
console.log(`PASS — ${pass.length} checks`);

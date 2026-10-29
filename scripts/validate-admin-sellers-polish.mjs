import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const componentPath = path.join(root, 'src/pages/admin/AdminSellers.jsx');
const source = fs.readFileSync(componentPath, 'utf8');
const checks = [
  ['seller management uses the existing admin API', source.includes('adminAPI.users(')],
  ['seller list is scoped to dealer accounts', source.includes("const roleParam = 'dealer'")],
  ['load errors are distinct from empty results', source.includes('Seller records unavailable') && source.includes('setError(')],
  ['failed requests expose a retry action', source.includes('onClick={fetchSellers}')],
  ['commission values are validated', source.includes('commission > 50')],
  ['discount values are validated', source.includes('discount > 100')],
  ['duplicate save submissions are blocked', source.includes('if (!seller || saving) return')],
  ['status changes prevent duplicate submissions', source.includes('if (updatingStatus) return')],
  ['successful status changes use existing approval/ban APIs', source.includes('adminAPI.approveDealer(id)') && source.includes('adminAPI.toggleBan(id)')],
  ['commercial terms use existing persistence API', source.includes('adminAPI.updateSellerSettings(id')],
  ['unset commercial terms are not fabricated', source.includes('commission: u.commission ?? null')],
  ['no parallel seller route or store is introduced', !source.includes('/api/new-seller-management') && !source.includes('new SellerStore')],
];
let failed = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`);
  if (!ok) failed++;
}
console.log(`\n${checks.length - failed}/${checks.length} checks passed`);
process.exitCode = failed ? 1 : 0;

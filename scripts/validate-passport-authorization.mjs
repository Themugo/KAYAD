import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const service = fs.readFileSync(path.join(root, 'backend/vehiclePassport/services/vehiclePassportService.js'), 'utf8');
const controller = fs.readFileSync(path.join(root, 'backend/controllers/ownershipController.js'), 'utf8');
const routes = fs.readFileSync(path.join(root, 'backend/routes/ownershipRoutes.js'), 'utf8');

const checks = [
  ['full passport receives authenticated access context', controller.includes('getFullPassport(req.params.passportId, { userId: req.user.id, role: req.user.role, effectiveRole: req.user.effectiveRole })')],
  ['full passport route requires protect middleware', /router\.get\('\/passports\/:passportId',\s*protect,\s*getPassport\)/.test(routes)],
  ['staff access uses canonical STAFF_ROLES', service.includes("STAFF_ROLES.includes(role)")],
  ['owner access is constrained by passport_id and owner_id', service.includes("passport_id: passportId") && service.includes("owner_id: userId")],
  ['inactive owner vehicle does not authorize access', service.includes("status: 'active'")],
  ['unauthorized passport does not reveal existence', service.includes("throw new AppError('Passport not found', 404)")],
  ['public passport endpoint remains separate', routes.includes("router.get('/passports/:passportId/public', getPublicPassport)")],
];

let failed = 0;
for (const [name, pass] of checks) {
  console.log(`${pass ? 'PASS' : 'FAIL'} | ${name}`);
  if (!pass) failed++;
}
console.log(`\nPassport authorization gate: ${checks.length - failed}/${checks.length} PASS`);
process.exitCode = failed ? 1 : 0;

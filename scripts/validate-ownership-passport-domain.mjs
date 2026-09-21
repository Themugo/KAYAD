import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));
const ownership = read('backend/ownership/services/ownershipService.js');
const passport = read('backend/vehiclePassport/services/vehiclePassportService.js');
const routes = read('backend/routes/ownershipRoutes.js');
const controller = read('backend/controllers/ownershipController.js');
const migration = read('supabase/migrations/20260907190300_ownership_passport_domain.sql');
const checks = [
  ['ownership service uses canonical db adapter', ownership.includes("from '../../db/index.js'")],
  ['ownership profile update uses user id scope', ownership.includes("findOne('owner_profiles', { user_id: userId })")],
  ['owner vehicle access is user scoped', ownership.includes('owner_id: userId')],
  ['expense totals are real database data', ownership.includes("db.find('ownership_expenses'")],
  ['sold vehicles cancel pending reminders', ownership.includes("status: 'cancelled'")],
  ['ownership API routes are protected', /router\.get\('\/dashboard', protect/.test(routes)],
  ['passport public route is canonical', controller.includes('getPublicPassport') && routes.includes("'/passports/:passportId/public'")],
  ['passport service uses canonical db adapter', passport.includes("from '../../db/index.js'")],
  ['passport search uses canonical db lookup', passport.includes("db.findOne('vehicle_passports'")],
  ['passport public controller uses passport service', controller.includes('vehiclePassportService.getPublicPassport')],
  ['server mounts ownership API', read('backend/server.js').includes('ownershipRoutes')],
  ['frontend uses real ownership API', exists('src/services/ownershipApi.ts') && read('src/features/OwnershipPlatform/pages/BuyerPlatform.tsx').includes('getOwnershipDashboard')],
  ['migration creates ownership vehicles', migration.includes('create table if not exists public.owner_vehicles')],
  ['migration creates vehicle passports', migration.includes('create table if not exists public.vehicle_passports')],
  ['migration enables RLS', migration.includes('enable row level security')],
  ['migration preserves passport audit trail', migration.includes('create table if not exists public.passport_audit_log')],
];
let failed = 0;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) failed++; }
console.log(`\nOwnership + passport domain gate: ${checks.length - failed}/${checks.length} PASS`);
process.exitCode = failed ? 1 : 0;

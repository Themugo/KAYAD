#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const pass = (label, ok) => {
  if (ok) console.log(`PASS ${label}`);
  else { console.error(`FAIL ${label}`); failures.push(label); }
};

const inspector = read('backend/controllers/inspectorApplicationController.js');
const dealer = read('backend/routes/dealerRoutes.js');
const migration = read('supabase/migrations/20261001223000_inspection_provider_identity_integrity.sql');
const openapi = read('backend/openapi.yaml');

pass('active inspector marketplace reads canonical inspection_providers',
  inspector.includes('.from("inspection_providers")') && inspector.includes('.eq("status", "active")') && inspector.includes('.eq("verification_status", "verified")'));
pass('active inspector marketplace does not read retired user inspector fields',
  !inspector.includes('User.find({ isInspector: true') && !inspector.includes('.select("name avatar bio inspectionSpecialty locationCity'));
pass('inspector approval commits provider before application approval',
  inspector.indexOf('providerWriteError') < inspector.indexOf('Object.assign(application, approvalPatch)'));
pass('inspector approval notification cannot turn committed approval into false failure',
  inspector.includes('void sendNotification({') && inspector.includes('Inspector approval notification failed'));
pass('inspector rejection notification cannot turn committed rejection into false failure',
  inspector.includes('Inspector rejection notification failed'));
pass('dealer onboarding compensates profile when verification submission fails',
  dealer.includes('Dealer onboarding compensation failed') && dealer.includes('previousDealer.onboardingComplete'));
pass('inspection provider identity is unique in the database',
  migration.includes('uq_inspection_providers_user_canonical') && migration.includes('ON public.inspection_providers(user_id)'));
pass('compatibility csrf route is documented', openapi.includes('/api/auth/csrf:'));
pass('dealer onboarding routes are documented', openapi.includes('/api/dealer/onboarding:'));

console.log(`\nDOMAIN LIFECYCLE INTEGRITY: ${failures.length ? `FAIL (${failures.length})` : 'PASS'}`);
if (failures.length) process.exit(1);

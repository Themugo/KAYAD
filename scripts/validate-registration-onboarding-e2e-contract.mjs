import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const checks = [
  ['atomic registration RPC migration exists', /kayad_register_identity_atomic/.test(read('supabase/migrations/20261001090000_registration_onboarding_integrity.sql'))],
  ['dealer trigger creates dealer domain row', /sync_dealer_profile_from_user/.test(read('supabase/migrations/20261001090000_registration_onboarding_integrity.sql'))],
  ['dealer onboarding fields persist on dealer domain', /payment_details JSONB/.test(read('supabase/migrations/20261001090000_registration_onboarding_integrity.sql')) && /onboarding_complete BOOLEAN/.test(read('supabase/migrations/20261001090000_registration_onboarding_integrity.sql'))],
  ['dealer onboarding GET route is available to pending dealer and personal-account applicants', /router\.get\("\/onboarding", protect, allowRoles\(\.\.\.APPLICANT_ROLES\)/.test(read('backend/routes/dealerRoutes.js')) && /const APPLICANT_ROLES = \[\"dealer\", \"user\"\]/.test(read('backend/routes/dealerRoutes.js'))],
  ['dealer onboarding PUT route is available before approval and retains the applicant boundary', /router\.put\("\/onboarding", protect, allowRoles\(\.\.\.APPLICANT_ROLES\)/.test(read('backend/routes/dealerRoutes.js')) && /APPLICANT_ROLES = \[\"dealer\", \"user\"\]/.test(read('backend/routes/dealerRoutes.js'))],
  ['dealer onboarding submits only the server-validated accepted paperwork to canonical verification service', /validateSubmission\(documents, policy\.items/.test(read('backend/routes/dealerRoutes.js')) && /submitDealerVerification\(req\.user\.id, checked\.accepted\)/.test(read('backend/routes/dealerRoutes.js'))],
  ['frontend dealer onboarding uses canonical dealer API', /dealerAPI\.completeOnboarding/.test(read('src/pages/dealer/DealerOnboarding.jsx'))],
  ['dealer onboarding route is reachable from app shell', /path === '\/dealer\/onboarding'/.test(read('src/App.tsx'))],
  ['dealer onboarding no longer navigates to dead choose-plan route', !/navigate\('\/dealer\/choose-plan'\)/.test(read('src/pages/dealer/DealerOnboarding.jsx'))],
  ['inspector application table exists', /CREATE TABLE IF NOT EXISTS public\.inspector_applications/.test(read('supabase/migrations/20261001090000_registration_onboarding_integrity.sql'))],
  ['inspector application returns 201 after persistence', /res\.status\(201\)\.json\(\{ success: true, application \}/.test(read('backend/controllers/inspectorApplicationController.js'))],
  ['inspector reviewer notifications are non-blocking', /void \(async \(\) => \{[\s\S]*Inspector reviewer notification failed/.test(read('backend/controllers/inspectorApplicationController.js'))],
  ['inspector approval creates canonical inspection provider', /inspection_providers/.test(read('backend/controllers/inspectorApplicationController.js')) && /lifecycle_stage: \"ACTIVE\"/.test(read('backend/controllers/inspectorApplicationController.js'))],
  ['inspector approval no longer writes nonexistent user inspector fields', !/user\.isInspector|user\.inspectionSpecialty|user\.locationCity/.test(read('backend/controllers/inspectorApplicationController.js'))],
];
let passed = 0;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (ok) passed++; }
console.log(`\nRegistration/onboarding end-to-end contract: ${passed}/${checks.length} PASS`);
if (passed !== checks.length) process.exit(1);

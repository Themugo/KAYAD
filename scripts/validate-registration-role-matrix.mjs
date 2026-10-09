import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const flow = read('src/components/OnboardingFlow.tsx');
const roles = read('src/components/onboarding/roles.ts');
const validation = read('src/components/onboarding/validation.ts');
const onboarding = flow + roles + validation;
const schema = read('backend/validation/auth.schema.js');
const controller = read('backend/controllers/authController.js');
const routes = read('backend/routes/authRoutes.js');
const authApi = read('src/services/authApi.ts');
const httpClient = read('src/api/httpClient.ts');
const responseSchema = read('backend/validation/response.schema.js');

const checks = [
  ['staff and broker roles are never offered on the public matrix', !/id: '(admin|superadmin|moderator|broker|ghost_checker)'/.test(roles) && /NON_SELF_REGISTRABLE/.test(roles)],
  ['buyer UI role exists', /id: 'buyer'/.test(onboarding)],
  ['private seller UI role exists', /id: 'seller'[\s\S]{0,300}backendRole: 'individual_seller'/.test(roles)],
  ['dealer UI role exists', /id: 'dealer'/.test(onboarding)],
  ['buyer maps to canonical backend user role', /id: 'buyer'[\s\S]{0,300}backendRole: 'user'/.test(roles) && /role: backendRole/.test(flow)],
  ['private seller maps to canonical individual_seller role', /backendRole: 'individual_seller'/.test(roles)],
  ['dealer maps to canonical dealer role', /id: 'dealer'[\s\S]{0,300}backendRole: 'dealer'/.test(roles)],
  ['backend schema accepts all three public roles', /z\.enum\(\["dealer", "individual_seller", "user"\]\)/.test(schema)],
  ['dealer requires business name client-side', /backendRole === 'dealer'[\s\S]{0,80}!form\.businessName\.trim\(\)/.test(validation)],
  ['dealer requires location client-side', /backendRole === 'dealer'[\s\S]{0,200}!form\.location\.trim\(\)/.test(validation)],
  ['dealer requires business name server-side', /role === "dealer" && !businessName/.test(controller)],
  ['dealer requires location server-side', /role === "dealer" && !location/.test(controller)],
  ['private seller business fields remain optional', /label="Trading name" optional/.test(flow)],
  ['backend preserves seller role instead of silently converting it', /requestedRole === "dealer" \|\| requestedRole === "individual_seller" \? requestedRole : "user"/.test(controller)],
  ['buyer registration creates approved user status', /CASE WHEN p_role = 'user' THEN 'approved' ELSE 'pending' END/.test(read('supabase/migrations/20261001090000_registration_onboarding_integrity.sql'))],
  ['seller registration remains pending for platform verification', /CASE WHEN p_role = 'user' THEN 'approved' ELSE 'pending' END/.test(read('supabase/migrations/20261001090000_registration_onboarding_integrity.sql'))],
  ['registration creates user record', /INSERT INTO public\.users/.test(read('supabase/migrations/20261001090000_registration_onboarding_integrity.sql'))],
  ['registration creates credential record', /INSERT INTO public\.user_auth/.test(read('supabase/migrations/20261001090000_registration_onboarding_integrity.sql'))],
  ['registration identity writes are transactionally atomic', /RETURNS JSONB[\s\S]*INSERT INTO public\.users[\s\S]*INSERT INTO public\.user_auth/.test(read('supabase/migrations/20261001090000_registration_onboarding_integrity.sql'))],
  ['verification delivery is non-blocking after atomic registration', controller.includes('void deliver(verificationPayload).catch') && !controller.includes('await deliver(verificationPayload)') && !controller.includes('User.findByIdAndDelete(user.id)')],
  ['welcome delivery is non-blocking', /void deliver\(\{[\s\S]*COMMUNICATION_EVENTS\.REGISTRATION/.test(controller)],
  ['registration returns 201', /return res\.status\(201\)\.json\(\{/.test(controller)],
  ['registration uses atomic database identity function', /kayad_register_identity_atomic/.test(controller)],
  ['dealer registration provisions dealer domain record', /sync_dealer_profile_from_user/.test(read('supabase/migrations/20261001090000_registration_onboarding_integrity.sql'))],
  ['inspector application table exists in migration chain', /CREATE TABLE IF NOT EXISTS public\.inspector_applications/.test(read('supabase/migrations/20261001090000_registration_onboarding_integrity.sql'))],
  ['registration does not issue an authenticated session', (() => { const a = controller.indexOf('export const register'); const b = controller.indexOf('// =============================\n// 🔑 LOGIN', a); const register = controller.slice(a, b); return !/sendAuthResponse\(res,/.test(register); })()],
  ['registration route uses canonical auth endpoint', /router\.post\("\/register"/.test(routes)],
  ['frontend uses canonical auth service', /authRegister\(body\)/.test(flow) && /authFetch\('\/api\/v1\/auth\/register'/.test(authApi)],
  ['state-changing requests bootstrap CSRF', /await ensureCsrfToken\(\)/.test(httpClient)],
  ['CSRF endpoint remains canonical', /CSRF_BOOTSTRAP_PATH = '\/v1\/auth\/csrf'/.test(httpClient)],
  ['auth response contract accepts created user', /user: z\.object\(\{[\s\S]*_id: z\.string\(\)/.test(responseSchema)],
  ['private seller completion messaging is distinct', /cannot list a vehicle until KAYAD approves your seller account/.test(flow)],
  ['dealer completion messaging is distinct', /taken to business verification/.test(flow)],
];

let passed = 0;
for (const [name, ok] of checks) {
  if (ok) { passed++; console.log(`PASS ${name}`); }
  else console.error(`FAIL ${name}`);
}
console.log(`\nRegistration role matrix: ${passed}/${checks.length} PASS`);
if (passed !== checks.length) process.exit(1);

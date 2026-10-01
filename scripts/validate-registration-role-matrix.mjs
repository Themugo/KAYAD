import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const onboarding = read('src/components/OnboardingFlow.tsx');
const schema = read('backend/validation/auth.schema.js');
const controller = read('backend/controllers/authController.js');
const routes = read('backend/routes/authRoutes.js');
const authApi = read('src/services/authApi.ts');
const httpClient = read('src/api/httpClient.ts');
const responseSchema = read('backend/validation/response.schema.js');

const checks = [
  ['buyer UI role exists', /id: 'buyer'/.test(onboarding)],
  ['private seller UI role exists', /id: 'individual_seller'/.test(onboarding)],
  ['dealer UI role exists', /id: 'dealer'/.test(onboarding)],
  ['buyer maps to canonical backend user role', /role: role === 'buyer' \? 'user' : role/.test(onboarding)],
  ['private seller maps to canonical individual_seller role', /role: role === 'buyer' \? 'user' : role/.test(onboarding) && /id: 'individual_seller'/.test(onboarding)],
  ['dealer maps to canonical dealer role', /role: role === 'buyer' \? 'user' : role/.test(onboarding) && /id: 'dealer'/.test(onboarding)],
  ['backend schema accepts all three public roles', /z\.enum\(\["dealer", "individual_seller", "user"\]\)/.test(schema)],
  ['dealer requires business name client-side', /role === 'dealer' && !form\.businessName\.trim\(\)/.test(onboarding)],
  ['dealer requires location client-side', /role === 'dealer' && !form\.location\.trim\(\)/.test(onboarding)],
  ['dealer requires business name server-side', /role === "dealer" && !businessName/.test(controller)],
  ['dealer requires location server-side', /role === "dealer" && !location/.test(controller)],
  ['private seller business fields remain optional', /role === 'dealer' \? 'Business name' : 'Trading name \(optional\)'/.test(onboarding)],
  ['backend preserves seller role instead of silently converting it', /requestedRole === "dealer" \|\| requestedRole === "individual_seller" \? requestedRole : "user"/.test(controller)],
  ['buyer registration creates approved user status', /const status = role === "user" \? "approved" : "pending"/.test(controller)],
  ['seller registration remains pending for platform verification', /const status = role === "user" \? "approved" : "pending"/.test(controller)],
  ['registration creates user record', /await User\.create\(\{/.test(controller)],
  ['registration creates credential record', /await UserAuth\.create\(\{/.test(controller)],
  ['registration rolls back user if credential creation fails', /await User\.deleteOne\(\{ _id: user\._id \}\)/.test(controller)],
  ['verification delivery is non-blocking', /void deliver\(verificationPayload\)\.catch/.test(controller)],
  ['welcome delivery is non-blocking', /void deliver\(\{[\s\S]*COMMUNICATION_EVENTS\.REGISTRATION/.test(controller)],
  ['registration returns 201', /return res\.status\(201\)\.json\(\{/.test(controller)],
  ['registration does not issue an authenticated session', (() => { const a = controller.indexOf('export const register'); const b = controller.indexOf('// =============================\n// 🔑 LOGIN', a); const register = controller.slice(a, b); return !/sendAuthResponse\(res,/.test(register); })()],
  ['registration route uses canonical auth endpoint', /router\.post\("\/register"/.test(routes)],
  ['frontend uses canonical auth service', /authRegister\(registration\)/.test(onboarding) && /authFetch\('\/api\/v1\/auth\/register'/.test(authApi)],
  ['state-changing requests bootstrap CSRF', /await ensureCsrfToken\(\)/.test(httpClient)],
  ['CSRF endpoint remains canonical', /CSRF_BOOTSTRAP_PATH = '\/v1\/auth\/csrf'/.test(httpClient)],
  ['auth response contract accepts created user', /user: z\.object\(\{[\s\S]*_id: z\.string\(\)/.test(responseSchema)],
  ['private seller completion messaging is distinct', /Private seller account created/.test(onboarding)],
  ['dealer completion messaging is distinct', /Your dealer account is created/.test(onboarding)],
];

let passed = 0;
for (const [name, ok] of checks) {
  if (ok) { passed++; console.log(`PASS ${name}`); }
  else console.error(`FAIL ${name}`);
}
console.log(`\nRegistration role matrix: ${passed}/${checks.length} PASS`);
if (passed !== checks.length) process.exit(1);

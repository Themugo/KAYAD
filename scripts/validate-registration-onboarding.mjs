import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const checks = [
  ['canonical registration schema contains dealer fields', /businessName: z\.string\(\)\.trim\(\)\.max\(200\)\.optional\(\)/.test(read('backend/validation/auth.schema.js')) && /location: z\.string\(\)\.trim\(\)\.max\(200\)\.optional\(\)/.test(read('backend/validation/auth.schema.js'))],
  ['onboarding maps buyer to backend user role', /role === 'buyer' \? 'user' : role/.test(read('src/components/OnboardingFlow.tsx'))],
  ['dealer onboarding enforces business name', /role === 'dealer' && !form\.businessName\.trim\(\)/.test(read('src/components/OnboardingFlow.tsx'))],
  ['dealer onboarding enforces location', /role === 'dealer' && !form\.location\.trim\(\)/.test(read('src/components/OnboardingFlow.tsx'))],
  ['backend enforces dealer business name', /role === "dealer" && !businessName/.test(read('backend/controllers/authController.js'))],
  ['backend enforces dealer location', /role === "dealer" && !location/.test(read('backend/controllers/authController.js'))],
  ['verification URL targets frontend verification page', /\/verify-email\?token=\$\{encodeURIComponent\(verifyToken\)\}/.test(read('backend/controllers/authController.js'))],
  ['frontend verification page exists', fs.existsSync(path.join(root, 'src/pages/VerifyEmailPage.tsx'))],
  ['verification page calls backend token endpoint', /verifyEmail\(token\)/.test(read('src/pages/VerifyEmailPage.tsx')) && /\/verify-email\/\$\{encodeURIComponent\(token\)\}/.test(read('src/services/authApi.ts'))],
  ['login handles email verification gate', /verificationRequired/.test(read('src/pages/LoginPage.jsx')) && /resendVerification/.test(read('src/pages/LoginPage.jsx'))],
  ['registration response issues httpOnly auth cookies', /sendAccessToken\(res, accessToken\)/.test(read('backend/controllers/authController.js')) && /sendRefreshToken\(res, newRefreshToken\)/.test(read('backend/controllers/authController.js'))],
  ['registration duplicate email returns conflict', /An account with that email already exists/.test(read('backend/controllers/authController.js')) && /409/.test(read('backend/controllers/authController.js'))],
];
let passed = 0;
for (const [name, ok] of checks) {
  if (ok) { passed++; console.log(`PASS ${name}`); }
  else console.error(`FAIL ${name}`);
}
console.log(`\nRegistration/onboarding source gate: ${passed}/${checks.length} PASS`);
if (passed !== checks.length) process.exit(1);

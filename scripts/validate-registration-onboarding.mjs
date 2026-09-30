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
  ['verification email is non-blocking', (() => {
    const source = read('backend/controllers/authController.js');
    const register = source.slice(source.indexOf('export const register'), source.indexOf('// =============================\n// 🔑 LOGIN'));
    return /void deliver\(\{[\s\S]*COMMUNICATION_EVENTS\.EMAIL_VERIFICATION/.test(register) && !/await deliver\(\{[\s\S]*COMMUNICATION_EVENTS\.EMAIL_VERIFICATION/.test(register);
  })()],
  ['welcome email is non-blocking', /void deliver\(\{[\s\S]*COMMUNICATION_EVENTS\.REGISTRATION/.test(read('backend/controllers/authController.js'))],

  ['canonical CSRF bootstrap route is versioned', /const CSRF_BOOTSTRAP_PATH = '\/api\/v1\/auth\/csrf'/.test(read('src/api/httpClient.ts')) && !read('src/api/httpClient.ts').includes("'/auth/csrf'" ) && !read('src/api/httpClient.ts').includes("'/v1/auth/csrf'" )],
  ['CSRF bootstrap token is retained for cross-subdomain requests', /setCSRFToken\(token\)/.test(read('src/api/httpClient.ts')) && /export function setCSRFToken/.test(read('src/utils/csrf.ts'))],
  ['registration duplicate email returns 409', /An account with that email already exists/.test(read('backend/controllers/authController.js')) && /return R\.error\(res, "An account with that email already exists", 409\)/.test(read('backend/controllers/authController.js'))],
  ['registration referral side effect is non-blocking', /void \(async \(\) => \{/.test(read('backend/controllers/authController.js')) && /Referral credit failed/.test(read('backend/controllers/authController.js'))],
  ['buyer onboarding uses canonical user role', /role === 'buyer' \? 'user' : role/.test(read('src/components/OnboardingFlow.tsx'))],
  ['private seller onboarding uses individual_seller role', /role === 'individual_seller'/.test(read('src/components/OnboardingFlow.tsx')) && /role: role === 'buyer' \? 'user' : role/.test(read('src/components/OnboardingFlow.tsx'))],
  ['dealer onboarding uses dealer role and required business fields', /role === 'dealer'/.test(read('src/components/OnboardingFlow.tsx')) && /businessName/.test(read('src/components/OnboardingFlow.tsx')) && /location/.test(read('src/components/OnboardingFlow.tsx'))],
  ['inspector onboarding uses dedicated application endpoint', /inspectorAPI\.apply/.test(read('src/components/OnboardingFlow.tsx')) && /api\.post\('\/inspector-applications\/apply'/.test(read('src/api/api.exports.ts'))],
  ['inspector application validates specialties before submit', /specialties\.length === 0/.test(read('src/components/OnboardingFlow.tsx'))],
  ['single canonical registration surface is used by auth modal', /<OnboardingFlow onClose=\{onClose\} \/>/.test(read('src/components/AuthModal.tsx'))],
  ['legacy auth modal re-exports canonical surface', /export \{ default, AuthModal \} from '\.\.\/AuthModal'/.test(read('src/components/auth/AuthModal.tsx'))],
  ['frontend registration uses canonical auth API service', /authRegister\(registration\)/.test(read('src/components/OnboardingFlow.tsx')) && /authFetch\('\/api\/v1\/auth\/register'/.test(read('src/services/authApi.ts'))],
  ['verification page uses canonical verification endpoint', /\/api\/v1\/auth\/verify-email\//.test(read('src/services/authApi.ts'))],
  ['resend verification route exists', /\/resend-verification/.test(read('backend/routes/authRoutes.js')) && /resendVerification/.test(read('src/services/authApi.ts'))],
  ['resend verification delivery is non-blocking', /void \(async \(\) => \{/.test(read('backend/controllers/authController.js')) && /status\(202\)\.json/.test(read('backend/controllers/authController.js')) && /Verification email failed/.test(read('backend/controllers/authController.js'))],
  ['protected API enforces email verification when configured', /Please verify your email before accessing this resource/.test(read('backend/middleware/auth.js'))],
  ['dealer approval remains server-controlled', /Dealer approval must ONLY come from the admin verification/.test(read('backend/controllers/authController.js'))],
];
let passed = 0;
for (const [name, ok] of checks) {
  if (ok) { passed++; console.log(`PASS ${name}`); }
  else console.error(`FAIL ${name}`);
}
console.log(`\nRegistration/onboarding source gate: ${passed}/${checks.length} PASS`);
if (passed !== checks.length) process.exit(1);

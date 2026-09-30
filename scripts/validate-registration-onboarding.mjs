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
  ['registration is account-creation only and does not issue a session', /Registration deliberately does not create an authenticated session/.test(read('backend/controllers/authController.js')) && /return res\.status\(201\)\.json\(\{/.test(read('backend/controllers/authController.js')) && !/register[\s\S]{0,12000}sendAuthResponse\(res\.status\(201\)/.test(read('backend/controllers/authController.js'))],
  ['registration duplicate email returns conflict', /An account with that email already exists/.test(read('backend/controllers/authController.js')) && /409/.test(read('backend/controllers/authController.js'))],
  ['verification email delivery is non-blocking during registration', (() => {
    const source = read('backend/controllers/authController.js');
    const register = source.slice(source.indexOf('export const register'), source.indexOf('// =============================\n// 🔑 LOGIN'));
    return /void deliver\(verificationPayload\)\.catch/.test(register) && !/const verificationDelivery = await deliver\(verificationPayload\)/.test(register);
  })()],
  ['welcome email is non-blocking', /void deliver\(\{[\s\S]*COMMUNICATION_EVENTS\.REGISTRATION/.test(read('backend/controllers/authController.js'))],
  ['password reset email is non-blocking', /const resetUrl = .*reset-password\?token=/.test(read('backend/controllers/authController.js')) && /void deliver\(\{[\s\S]*COMMUNICATION_EVENTS\.PASSWORD_RESET/.test(read('backend/controllers/authController.js'))],
  ['forgot-password page exists', fs.existsSync(path.join(root, 'src/pages/ForgotPasswordPage.tsx'))],
  ['reset-password page exists', fs.existsSync(path.join(root, 'src/pages/ResetPasswordPage.tsx'))],
  ['public auth routes are wired into the application shell', /path === '\/login'/.test(read('src/App.tsx')) && /path === '\/register'/.test(read('src/App.tsx')) && /path === '\/forgot-password'/.test(read('src/App.tsx')) && /path === '\/reset-password'/.test(read('src/App.tsx'))],
  ['force-password-change route is wired into the application shell', /path === '\/force-password-change'/.test(read('src/App.tsx')) && fs.existsSync(path.join(root, 'src/pages/ForcePasswordChange.jsx'))],
  ['inspector onboarding validates required application fields client-side', /if \(!form\.phone\.trim\(\)\)/.test(read('src/components/OnboardingFlow.tsx')) && /if \(!form\.idNumber\.trim\(\)\)/.test(read('src/components/OnboardingFlow.tsx')) && /if \(!form\.location\.trim\(\)\)/.test(read('src/components/OnboardingFlow.tsx'))],

  ['API transport keeps one canonical /api base across env forms', /const CSRF_BOOTSTRAP_PATH = '\/v1\/auth\/csrf'/.test(read('src/api/httpClient.ts')) && /const API_URL =/.test(read('src/api/httpClient.ts')) && read('src/api/httpRequest.ts').includes("path.slice(4)")],
  ['production /api env does not create an empty Axios base URL', /VITE_API_URL=\/api/.test(read('.env.production.example')) && /: '\/api';/.test(read('src/api/httpClient.ts'))],
  ['inspector application uses canonical shared API transport', /apply: \(body: any\) => api\.post\('\/inspector-applications\/apply'/.test(read('src/api/api.exports.ts')) && /baseURL: API_URL/.test(read('src/api/httpClient.ts'))],
  ['CSRF bootstrap token is retained for cross-subdomain requests', /setCSRFToken\(token\)/.test(read('src/api/httpClient.ts')) && /export function setCSRFToken/.test(read('src/utils/csrf.ts'))],
  ['session expiry retries once through refresh before clearing auth state', /_kayadRetried/.test(read('src/api/httpClient.ts')) && /refreshSession/.test(read('src/api/httpClient.ts')) && /post\('\/v1\/auth\/refresh'/.test(read('src/api/httpClient.ts')) && !/auth\\\/(login\|register\|refresh\|me\|profile)/.test(read('src/api/httpClient.ts'))],
  ['force-password-change state is returned safely from auth responses', /mustChangePassword/.test(read('backend/controllers/authController.js')) && /mustChangePassword\?: boolean/.test(read('src/services/authApi.ts'))],
  ['backend mounts the canonical versioned auth router', /app\.use\("\/api\/v1", v1Routes\)/.test(read('backend/server.js')) && /router\.use\("\/auth", authLimiter, authRoutes\)/.test(read('backend/routes/v1.js'))],
  ['backend exposes the CSRF route on the auth router', /router\.get\("\/csrf"/.test(read('backend/routes/authRoutes.js'))],
  ['production verifier probes the canonical CSRF endpoint', /auth\/csrf/.test(read('scripts/verify-production-deployment.mjs'))],
  ['registration duplicate email returns 409', /An account with that email already exists/.test(read('backend/controllers/authController.js')) && /return R\.error\(res, "An account with that email already exists", 409\)/.test(read('backend/controllers/authController.js'))],
  ['registration referral side effect is non-blocking', /void \(async \(\) => \{/.test(read('backend/controllers/authController.js')) && /Referral credit failed/.test(read('backend/controllers/authController.js'))],
  ['buyer onboarding uses canonical user role', /role === 'buyer' \? 'user' : role/.test(read('src/components/OnboardingFlow.tsx'))],
  ['private seller onboarding uses individual_seller role', /role === 'individual_seller'/.test(read('src/components/OnboardingFlow.tsx')) && /role: role === 'buyer' \? 'user' : role/.test(read('src/components/OnboardingFlow.tsx'))],
  ['dealer onboarding uses dealer role and required business fields', /role === 'dealer'/.test(read('src/components/OnboardingFlow.tsx')) && /businessName/.test(read('src/components/OnboardingFlow.tsx')) && /location/.test(read('src/components/OnboardingFlow.tsx'))],
  ['inspector onboarding uses dedicated application endpoint', /inspectorAPI\.apply/.test(read('src/components/OnboardingFlow.tsx')) && /api\.post\('\/inspector-applications\/apply'/.test(read('src/api/api.exports.ts'))],
  ['inspector application validates specialties before submit', /specialties\.length === 0/.test(read('src/components/OnboardingFlow.tsx'))],
  ['inspector backend validates the canonical application contract', /submitApplicationSchema/.test(read('backend/controllers/inspectorApplicationController.js')) && /validateBody\(submitApplicationSchema\)/.test(read('backend/routes/inspectorApplicationRoutes.js'))],
  ['inspector admin approve/reject payloads are validated', /validateBody\(approveApplicationSchema\)/.test(read('backend/routes/inspectorApplicationRoutes.js')) && /validateBody\(rejectApplicationSchema\)/.test(read('backend/routes/inspectorApplicationRoutes.js'))],
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

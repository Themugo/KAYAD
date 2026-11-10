
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));

const checks = [
  [
    'canonical registration schema contains dealer fields',
    /businessName: z\.string\(\)\.trim\(\)\.max\(200\)\.optional\(\)/.test(read('backend/validation/auth.schema.js')) &&
    /location: z\.string\(\)\.trim\(\)\.max\(200\)\.optional\(\)/.test(read('backend/validation/auth.schema.js')),
  ],
  [
    'onboarding maps buyer to backend user role',
    /id: 'buyer'[\s\S]{0,500}backendRole: 'user'/.test(read('src/components/onboarding/roles.ts')),
  ],
  [
    'dealer onboarding enforces business name',
    /backendRole === 'dealer'[\s\S]{0,80}!form\.businessName\.trim\(\)/.test(read('src/components/onboarding/validation.ts')),
  ],
  [
    'dealer onboarding enforces location',
    /backendRole === 'dealer'[\s\S]{0,200}!form\.location\.trim\(\)/.test(read('src/components/onboarding/validation.ts')),
  ],
  [
    'backend enforces dealer business name',
    /role === "dealer" && !businessName/.test(read('backend/controllers/authController.js')),
  ],
  [
    'backend enforces dealer location',
    /role === "dealer" && !location/.test(read('backend/controllers/authController.js')),
  ],
  [
    'verification URL targets frontend verification page',
    /\/verify-email\?token=\$\{encodeURIComponent\(verifyToken\)\}/.test(read('backend/controllers/authController.js')),
  ],
  [
    'frontend verification page exists',
    exists('src/pages/VerifyEmailPage.tsx'),
  ],
  [
    'verification page calls backend token endpoint',
    /verifyEmail\(token\)/.test(read('src/pages/VerifyEmailPage.tsx')) &&
    /\/verify-email\/\$\{encodeURIComponent\(token\)\}/.test(read('src/services/authApi.ts')),
  ],
  [
    'login handles email verification gate',
    /verificationRequired/.test(read('src/pages/LoginPage.jsx')) &&
    /resendVerification/.test(read('src/pages/LoginPage.jsx')),
  ],
  [
    'registration is account-creation only and does not issue a session',
    (() => {
      const source = read('backend/controllers/authController.js');
      const start = source.indexOf('export const register');
      const end = source.indexOf('// =============================\n// 🔑 LOGIN', start);
      if (start < 0 || end < 0) return false;
      const register = source.slice(start, end);
      return /return res\.status\(201\)\.json\(\{/.test(register) &&
        !/sendAuthResponse\(\s*res/.test(register);
    })(),
  ],
  [
    'registration duplicate email returns conflict',
    /An account with that email already exists/.test(read('backend/controllers/authController.js')) &&
    /409/.test(read('backend/controllers/authController.js')),
  ],
  [
    'verification delivery is non-blocking after atomic registration',
    (() => {
      const source = read('backend/controllers/authController.js');
      const start = source.indexOf('export const register');
      const end = source.indexOf('// =============================\n// 🔑 LOGIN', start);
      if (start < 0 || end < 0) return false;
      const register = source.slice(start, end);
      return /void deliver\(\s*verificationPayload\)\.catch/.test(register) &&
        !/await deliver\(\s*verificationPayload\)/.test(register) &&
        !/User\.findByIdAndDelete\(user\.id\)/.test(register);
    })(),
  ],
  [
    'welcome email is non-blocking',
    /void deliver\(\{[\s\S]*COMMUNICATION_EVENTS\.REGISTRATION/.test(read('backend/controllers/authController.js')),
  ],
  [
    'password reset email is non-blocking',
    /const resetUrl = .*reset-password\?token=/.test(read('backend/controllers/authController.js')) &&
    /void deliver\(\{[\s\S]*COMMUNICATION_EVENTS\.PASSWORD_RESET/.test(read('backend/controllers/authController.js')),
  ],
  [
    'forgot-password page exists',
    exists('src/pages/ForgotPasswordPage.tsx'),
  ],
  [
    'reset-password page exists',
    exists('src/pages/ResetPasswordPage.tsx'),
  ],
  [
    'public auth routes are wired into the application shell',
    /path === '\/login'/.test(read('src/App.tsx')) &&
    /path === '\/register'/.test(read('src/App.tsx')) &&
    /path === '\/forgot-password'/.test(read('src/App.tsx')) &&
    /path === '\/reset-password'/.test(read('src/App.tsx')),
  ],
  [
    'force-password-change route is wired into the application shell',
    /path === '\/force-password-change'/.test(read('src/App.tsx')) &&
    exists('src/pages/ForcePasswordChange.jsx'),
  ],
  [
    'inspector onboarding validates required application fields client-side',
    /isPlausiblePhone\(form\.phone\)/.test(read('src/components/onboarding/validation.ts')) &&
    /form\.idNumber\.trim\(\)\.length < 3/.test(read('src/components/onboarding/validation.ts')) &&
    /!form\.location\.trim\(\)/.test(read('src/components/onboarding/validation.ts')),
  ],
  [
    'API transport keeps one canonical /api base across env forms',
    /const CSRF_BOOTSTRAP_PATH = '\/v1\/auth\/csrf'/.test(read('src/api/httpClient.ts')) &&
    /const API_URL =/.test(read('src/api/httpClient.ts')) &&
    read('src/api/httpRequest.ts').includes('path.slice(4)'),
  ],
  [
    'production /api env does not create an empty Axios base URL',
    /VITE_API_URL=\/api/.test(read('.env.production.example')) &&
    /: '\/api';/.test(read('src/api/httpClient.ts')),
  ],
  [
    'inspector application uses canonical shared API transport',
    /apply: \(body: any\) => api\.post\('\/inspector-applications\/apply'/.test(read('src/api/api.exports.ts')) &&
    /baseURL: API_URL/.test(read('src/api/httpClient.ts')),
  ],
  [
    'CSRF bootstrap token is retained for cross-subdomain requests',
    /setCSRFToken\(token\)/.test(read('src/api/httpClient.ts')) &&
    /export function setCSRFToken/.test(read('src/utils/csrf.ts')),
  ],
  [
    'session expiry retries once through refresh before clearing auth state',
    /_kayadRetried/.test(read('src/api/httpClient.ts')) &&
    /refreshSession/.test(read('src/api/httpClient.ts')) &&
    /post\('\/v1\/auth\/refresh'/.test(read('src/api/httpClient.ts')) &&
    !/auth\\\/(login|register|refresh|me|profile)/.test(read('src/api/httpClient.ts')),
  ],
  [
    'force-password-change state is returned safely from auth responses',
    /mustChangePassword/.test(read('backend/controllers/authController.js')) &&
    /mustChangePassword\??: boolean/.test(read('src/services/authApi.ts')),
  ],
  [
    'backend mounts the canonical versioned auth router',
    /app\.use\("\/api\/v1", v1Routes\)/.test(read('backend/server.js')) &&
    /router\.use\("\/auth", authLimiter, authRoutes\)/.test(read('backend/routes/v1.js')),
  ],
  [
    'backend exposes the CSRF route on the auth router',
    /router\.get\("\/csrf"/.test(read('backend/routes/authRoutes.js')),
  ],
  [
    'production verifier probes the canonical CSRF endpoint',
    /auth\/csrf/.test(read('scripts/verify-production-deployment.mjs')),
  ],
  [
    'registration duplicate email returns 409',
    /An account with that email already exists/.test(read('backend/controllers/authController.js')) &&
    /return R\.error\(res, "An account with that email already exists", 409\)/.test(read('backend/controllers/authController.js')),
  ],
  [
    'registration referral side effect is non-blocking',
    /void \(async \(\) => \{/.test(read('backend/controllers/authController.js')) &&
    /Referral credit failed/.test(read('backend/controllers/authController.js')),
  ],
  [
    'buyer onboarding uses canonical user role',
    /id: 'buyer'[\s\S]{0,500}backendRole: 'user'/.test(read('src/components/onboarding/roles.ts')) &&
    /role: backendRole/.test(read('src/components/OnboardingFlow.tsx')),
  ],
  [
    'private selling is free and approval-free for every personal account by default',
    /case 'seller': return 'buyer'/.test(read('src/components/onboarding/roles.ts')) &&
    /privateSeller:/.test(read('backend/services/accountCapabilities.service.js')) &&
    /privateSellerApprovalMode: "disabled"/.test(read('backend/services/onboardingPolicy.service.js')) &&
    /privateSellerPackageMode: "free"/.test(read('backend/services/onboardingPolicy.service.js')) &&
    /canList: state\.status === "approved" && policy\.policy\.privateSellerPackageMode === "free"/.test(read('backend/services/privateSellerCapability.service.js')),
  ],
  [
    'dealer onboarding uses dealer role and required business fields',
    /backendRole: 'dealer'/.test(read('src/components/onboarding/roles.ts')) &&
    /businessName/.test(read('src/components/onboarding/validation.ts')) &&
    /location/.test(read('src/components/onboarding/validation.ts')),
  ],
  [
    'professional registration creates a personal account before provider application',
    /id: 'professional'[\s\S]*backendRole: 'user'[\s\S]*route: 'account_then_provider'/.test(read('src/components/onboarding/roles.ts')) &&
    /after you sign in, submit your inspector or mechanic credentials/i.test(read('src/components/OnboardingFlow.tsx')),
  ],
  [
    'inspector application validates specialties before submit',
    /specialties\.length === 0/.test(read('src/components/onboarding/validation.ts')),
  ],
  [
    'inspector backend validates the canonical application contract',
    /submitApplicationSchema/.test(read('backend/controllers/inspectorApplicationController.js')) &&
    /validateBody\(submitApplicationSchema\)/.test(read('backend/routes/inspectorApplicationRoutes.js')),
  ],
  [
    'inspector admin approve/reject payloads are validated',
    /validateBody\(approveApplicationSchema\)/.test(read('backend/routes/inspectorApplicationRoutes.js')) &&
    /validateBody\(rejectApplicationSchema\)/.test(read('backend/routes/inspectorApplicationRoutes.js')),
  ],
  [
    'registration remains a standalone canonical route',
    /if \(path === '\/register'\) return <OnboardingFlow/.test(read('src/App.tsx')),
  ],
  [
    'auth modal does not embed a second registration or sign-in flow',
    !/OnboardingFlow|setMode\(.*register|type="password"/.test(read('src/components/AuthModal.tsx')) &&
    /loginPathFor/.test(read('src/components/AuthModal.tsx')),
  ],
  [
    'legacy auth modal re-exports canonical surface',
    /export \{ default, AuthModal \} from '\.\.\/AuthModal'/.test(read('src/components/auth/AuthModal.tsx')),
  ],
  [
    'frontend registration uses canonical auth API service',
    /authRegister\(body\)/.test(read('src/components/OnboardingFlow.tsx')) &&
    /authFetch\('\/api\/v1\/auth\/register'/.test(read('src/services/authApi.ts')),
  ],
  [
    'verification page uses canonical verification endpoint',
    /\/api\/v1\/auth\/verify-email\//.test(read('src/services/authApi.ts')),
  ],
  [
    'resend verification route exists',
    /\/resend-verification/.test(read('backend/routes/authRoutes.js')) &&
    /resendVerification/.test(read('src/services/authApi.ts')),
  ],
  [
    'resend verification delivery is non-blocking',
    /void \(async \(\) => \{/.test(read('backend/controllers/authController.js')) &&
    /status\(202\)\.json/.test(read('backend/controllers/authController.js')) &&
    /Verification resend failed/.test(read('backend/controllers/authController.js')),
  ],
  [
    'protected API enforces email verification when configured',
    /Please verify your email before accessing this resource/.test(read('backend/middleware/auth.js')),
  ],
  [
    'dealer approval remains server-controlled',
    /Dealer approval must ONLY come from the admin verification/.test(read('backend/controllers/authController.js')),
  ],
];

let passed = 0;

for (const [name, ok] of checks) {
  if (ok) {
    passed++;
    console.log(`PASS ${name}`);
  } else {
    console.error(`FAIL ${name}`);
  }
}

console.log(`\nRegistration/onboarding source gate: ${passed}/${checks.length} PASS`);

if (passed !== checks.length) process.exit(1);

import fs from 'node:fs';

const checks = [
  ['shared premium auth shell exists', fs.existsSync('src/components/auth/PremiumAuthShell.jsx')],
  ['login uses shared premium shell', fs.readFileSync('src/pages/LoginPage.jsx', 'utf8').includes('<PremiumAuthShell')],
  ['registration uses shared premium shell', fs.readFileSync('src/components/OnboardingFlow.tsx', 'utf8').includes('<PremiumAuthShell')],
  ['login remains canonical /login route', fs.readFileSync('src/App.tsx', 'utf8').includes("path === '/login'" )],
  ['registration remains canonical /register route', fs.readFileSync('src/App.tsx', 'utf8').includes("path === '/register'" )],
  ['no advertising panel on auth screens (one task per screen)', !/kayad-auth-ad-panel|adTitle|adDescription/.test(fs.readFileSync('src/components/auth/PremiumAuthShell.jsx', 'utf8')) && !fs.readFileSync('src/index.css', 'utf8').includes('.kayad-auth-ad-panel')],
  ['forgot, reset and verify pages use the shared shell', ['ForgotPasswordPage.tsx', 'ResetPasswordPage.tsx', 'VerifyEmailPage.tsx'].every((f) => fs.readFileSync('src/pages/' + f, 'utf8').includes('<PremiumAuthShell'))],
  ['shell does not own form submission', !fs.readFileSync('src/components/auth/PremiumAuthShell.jsx', 'utf8').includes('onSubmit=')],
  ['responsive auth styling exists', fs.readFileSync('src/index.css', 'utf8').includes('@media (max-width: 900px)') && fs.readFileSync('src/index.css', 'utf8').includes('.kayad-auth-layout')],
  ['reduced motion support exists', fs.readFileSync('src/index.css', 'utf8').includes('prefers-reduced-motion')],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) failed += 1;
}
if (failed) process.exit(1);
console.log(`Premium auth surface validation: ${checks.length}/${checks.length} PASS`);

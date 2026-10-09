import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const checks = [];
const assert = (name, condition, detail) => checks.push({ name, pass: Boolean(condition), detail });

const app = read('src/App.tsx');
const navbar = read('src/components/Navbar.tsx');
const modal = read('src/components/AuthModal.tsx');
const onboarding = read('src/components/OnboardingFlow.tsx');
const login = read('src/pages/LoginPage.jsx');
const authApi = read('src/services/authApi.ts');
const authController = read('backend/controllers/authController.js');

assert('standalone login route exists', /if \(path === '\/login' \|\| path === '\/admin\/login'\) return <LoginPage/.test(app));
assert('standalone registration route exists', /if \(path === '\/register'\) return <OnboardingFlow/.test(app));
assert('navbar guest auth action navigates to canonical /login', /handleAuthNavigation\('\/login'\)/.test(navbar));
assert('navbar guest auth surface explicitly offers sign-in/sign-up entry', /Sign In \/ Sign Up/.test(navbar));
assert('navbar guest auth action does not directly open a legacy auth modal', !/onClick=\{onOpenAuth\}[\s\S]{0,300}Sign In \/ Sign Up/.test(navbar));
assert('app shell has no rendered authentication modal', !/<AuthModal[\s\S]*?isOpen=/.test(app));
assert('app shell routes all auth prompts to standalone login', (app.match(/onOpenAuth=\{handleOpenAuth\}/g) || []).length >= 8);
assert('app shell preserves the full current path (validated) as login return context', /navigate\(loginPathFor\(window\.location\)\)/.test(app));
assert('compatibility auth modal is only a redirect shim (no second sign-in form)', !/mode.*register|setMode\(/.test(modal) && !/<Input|type="password"|login\(/.test(modal) && /loginPathFor/.test(modal));
assert('auth modal forwards to the canonical /login route', /navigate\(loginPathFor\(location\)\)/.test(modal));
assert('login links to password recovery', /to="\/forgot-password"/.test(login));
assert('registration surface links to sign in, carrying the validated return path', /buildAuthPath\('login'/.test(onboarding));
assert('registration conflict has sign-in recovery action', /already has an account[\s\S]{0,900}>Sign in</.test(onboarding));
assert('registration conflict has password reset action', /already has an account[\s\S]{0,900}Reset password/.test(onboarding));
assert('login uses canonical post-auth routing', /getPostAuthPath/.test(login));
assert('login has registration CTA that carries next/intent', /buildAuthPath\('register', ctx\)/.test(login));
assert('auth API maps 409 to conflict', /error\.status === 409[\s\S]{0,80}'conflict'/.test(authApi));
assert('backend normalizes registration email', /email = normalizeEmail\(email\)/.test(authController));
assert('backend preserves duplicate-email 409', /An account with that email already exists.*409/.test(authController));

const failed = checks.filter((x) => !x.pass);
console.log(`Explicit auth-flow contract: ${checks.length - failed.length}/${checks.length} PASS`);
for (const check of checks) console.log(`${check.pass ? 'PASS' : 'FAIL'} ${check.name}${check.detail ? ` — ${check.detail}` : ''}`);
if (failed.length) process.exit(1);

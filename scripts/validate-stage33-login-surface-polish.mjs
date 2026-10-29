import fs from 'node:fs';
const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const login = read('src/pages/LoginPage.jsx');
const shell = read('src/components/auth/PremiumAuthShell.jsx');
const css = read('src/index.css');
const checks = [
 ['Login stays on canonical page and shared shell', /<PremiumAuthShell/.test(login) && /mode="signin"/.test(login)],
 ['Return-path handling and canonical post-auth routing remain intact', /readAuthContext\(location, \{ useStored: true \}\)/.test(login) && /getPostAuthPath/.test(login)],
 ['Email verification resend flow remains available', /resendVerification/.test(login) && /Resend verification email/.test(login)],
 ['MFA step remains in the same canonical form', /mfaRequired/.test(login) && /Authenticator code/.test(login)],
 ['Password recovery remains linked from sign-in', /to="\/forgot-password"/.test(login)],
 ['Registration CTA preserves auth intent', /buildAuthPath\('register', ctx\)/.test(login)],
 ['Submit button exposes busy state while preserving disabled behavior', /aria-busy=\{loading\}/.test(login) && /disabled=\{loading\}/.test(login)],
 ['Shared shell exposes page mode for scoped styling', /data-mode=\{mode\}/.test(shell)],
 ['Sign-in page uses focused single-column card layout', /data-mode="signin"[^}]*kayad-auth-layout|kayad-auth-page\[data-mode="signin"\] \.kayad-auth-layout/.test(css)],
 ['Forgot-password link is placed after the password control', /kayad-login-password-group/.test(login) && /kayad-login-forgot-row/.test(css)],
 ['Mobile sizing and safe-area padding are responsive', /@media \(max-width: 560px\)[\s\S]*kayad-auth-page\[data-mode="signin"\][\s\S]*safe-area-inset-bottom/.test(css)],
 ['Keyboard focus styles and reduced-motion support remain present', /kayad-auth-page \.kayad-auth-header-link:focus-visible/.test(css) && /prefers-reduced-motion/.test(css)],
 ['No new authentication form or route was introduced', !/action=|window\.location/.test(login) && !/path="\/sign-in"/.test(shell)],
];
let failed = 0;
for (const [label, pass] of checks) { console.log(`${pass ? 'PASS' : 'FAIL'} ${label}`); if (!pass) failed++; }
console.log(`\\nStage 33 Login UI contract: ${checks.length - failed}/${checks.length} ${failed ? 'FAILED' : 'PASS'}`);
if (failed) process.exitCode = 1;

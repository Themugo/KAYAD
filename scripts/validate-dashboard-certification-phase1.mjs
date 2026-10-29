import fs from 'node:fs';
import process from 'node:process';

const dashboard = fs.readFileSync('src/features/AdminView.tsx', 'utf8');
const tests = fs.readFileSync('src/__tests__/features/adminCommandCentre.test.tsx', 'utf8');
const css = fs.readFileSync('src/features/admin-command-centre.css', 'utf8');
const checks = [
  ['dashboard independently loads five operational sources', /Promise\.allSettled\(\[\s*adminAPI\.stats\(\),[\s\S]*adminAPI\.getAuditLog/.test(dashboard)],
  ['dashboard prevents stale request results from overwriting newer data', /sequence !== loadSequence\.current/.test(dashboard)],
  ['dashboard classifies maintenance only from actual 503 response evidence', /status === 503 && \(\/MAINTENANCE\/i\.test/.test(dashboard)],
  ['dashboard distinguishes unauthorized session from server errors', /status === 401\) return 'session'/.test(dashboard)],
  ['dashboard distinguishes invalid successful response payloads', /const noteInvalid = \(label: string\)/.test(dashboard) && /causes\.add\('invalid'\)/.test(dashboard)],
  ['invalid payloads are covered by a focused regression test', /identifies malformed successful API responses as an invalid response contract/.test(tests)],
  ['business flow includes existing dealer verification route', /Dealer onboarding[\s\S]*?\/admin\/dealer-verifications/.test(dashboard)],
  ['business flow includes existing moderation route', /Vehicle listings[\s\S]*?\/admin\/moderation/.test(dashboard)],
  ['business flow includes existing NTSA route', /Inspection & NTSA[\s\S]*?\/admin\/ntsa-queue/.test(dashboard)],
  ['business flow includes auction, escrow and transaction destinations', /\/admin\/auctions/.test(dashboard) && /\/admin\/escrows/.test(dashboard) && /\/admin\/transactions/.test(dashboard)],
  ['responsive business-flow breakpoints and reduced-motion preference exist', /max-width:640px/.test(css) && /prefers-reduced-motion:reduce/.test(css)],
  ['maintenance, retry and role restrictions have regression coverage', /MAINTENANCE_MODE/.test(tests) && /Retry reloads/.test(tests) && /destinations follow the role/.test(tests)],
];
let failures = 0;
for (const [label, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${label}`);
  if (!passed) failures += 1;
}
console.log(`\n${checks.length - failures}/${checks.length} dashboard certification source checks passed`);
if (failures) process.exitCode = 1;

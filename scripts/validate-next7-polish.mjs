import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const nav = fs.readFileSync(path.join(root, 'src/components/MobileBottomNav.tsx'), 'utf8');
const checks = [
  ['mobile search reads reduced-motion preference', /prefers-reduced-motion:\s*reduce/.test(nav)],
  ['mobile search uses instant scrolling when reduced motion is enabled', /behavior:\s*prefersReducedMotion\s*\?\s*['\"]auto['\"]\s*:\s*['\"]smooth['\"]/.test(nav)],
  ['mobile search still targets canonical marketplace results', /getElementById\(['\"]market-results['\"]\)/.test(nav)],
  ['mobile navigation retains explicit button types', /<button\s*\n\s*key=\{key\}\s*\n\s*type=\"button\"/.test(nav)],
];
let failed = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`);
  if (!ok) failed++;
}
console.log(`\nNEXT7 polish contract: ${checks.length - failed}/${checks.length} PASS`);
process.exitCode = failed ? 1 : 0;

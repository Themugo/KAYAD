import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const css = fs.readFileSync(path.join(root, 'src/index.css'), 'utf8');
const checks = [
  ['shared box sizing is explicit', /\*\s*,\s*\*::before\s*,\s*\*::after\s*\{\s*box-sizing:\s*border-box;/s.test(css)],
  ['document width is contained on narrow viewports', /html\s*\{[^}]*overflow-x:\s*clip;/s.test(css) && /body\s*\{[^}]*overflow-x:\s*clip;/s.test(css)],
  ['text autosizing remains stable on mobile', /-webkit-text-size-adjust:\s*100%/.test(css)],
  ['media elements cannot create horizontal overflow', /img,\s*\n\s*svg,\s*\n\s*video,\s*\n\s*canvas\s*\{[^}]*max-width:\s*100%;/s.test(css)],
  ['shared keyboard focus treatment exists', /:where\(a, button, input, select, textarea, \[tabindex\]\):focus-visible/.test(css)],
  ['duplicate homepage font declaration removed', !/font-weight:\s*800;\s*\n\s*font-weight:\s*800;/.test(css)],
];
let failed = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`);
  if (!ok) failed++;
}
console.log(`\nNEXT6 polish contract: ${checks.length - failed}/${checks.length} PASS`);
process.exitCode = failed ? 1 : 0;

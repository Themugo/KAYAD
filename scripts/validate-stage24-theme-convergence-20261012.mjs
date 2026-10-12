import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const checks = [
  ['canonical theme stylesheet exists', fs.existsSync(path.join(root, 'src/styles/kayad-theme-convergence.css'))],
  ['theme stylesheet imported by canonical index', read('src/index.css').includes('@import "./styles/kayad-theme-convergence.css";')],
  ['hero background uses canonical dark-teal token', read('src/styles/kayad-theme-convergence.css').includes('--kayad-theme-hero: var(--kayad-brand-dark, #12576D)')],
  ['hero accent uses canonical brand token', read('src/styles/kayad-theme-convergence.css').includes('--kayad-theme-hero-end: var(--kayad-brand, #176B87)')],
  ['surface and border tokens reuse established theme', read('src/styles/kayad-theme-convergence.css').includes('--kayad-theme-page: var(--kayad-brand-surface, #F6FAF9)') && read('src/styles/kayad-theme-convergence.css').includes('--kayad-theme-border: var(--kayad-brand-border, #D7E7E4)')],
  ['Support uses shared branded hero', read('src/features/SupportFAQ.tsx').includes('kayad-brand-hero px-5 py-6 sm:px-7 sm:py-7 text-white')],
  ['public inspections hero uses shared branded hero', read('src/features/InspectionsView.tsx').includes('kayad-brand-hero rounded-3xl text-white p-6 sm:p-10')],
  ['account inspections hero uses shared branded hero', read('src/features/InspectionsView.tsx').includes('kayad-brand-hero rounded-3xl text-white p-6 sm:p-8')],
  ['public surface scope preserved', read('src/styles/kayad-theme-convergence.css').includes('.kayad-public-shell')],
  ['keyboard focus treatment included', read('src/styles/kayad-theme-convergence.css').includes(':focus-visible')],
  ['reduced-motion preference included', read('src/styles/kayad-theme-convergence.css').includes('prefers-reduced-motion: reduce')],
  ['role and status color behavior not globally overridden', !read('src/styles/kayad-theme-convergence.css').includes('!important') || read('src/styles/kayad-theme-convergence.css').includes('prefers-reduced-motion')],
  ['homepage full-bleed layout not explicitly overridden', !read('src/styles/kayad-theme-convergence.css').includes('data-kayad-surface="marketplace"')],
  ['theme audit created before change', fs.existsSync(path.join(root, 'KAYAD_STAGE24_THEME_SWEEP_AUDIT_20261012.md'))],
];
let failed = 0;
for (const [name, pass] of checks) {
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`);
  if (!pass) failed++;
}
console.log(`\nStage 24 theme convergence: ${checks.length - failed}/${checks.length} PASS`);
if (failed) process.exitCode = 1;

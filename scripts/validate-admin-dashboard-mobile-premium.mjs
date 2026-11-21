import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const css = fs.readFileSync(path.join(root, 'src/features/admin-command-centre.css'), 'utf8');
const tsx = fs.readFileSync(path.join(root, 'src/features/AdminView.tsx'), 'utf8');
const dashboard = fs.readFileSync(path.join(root, 'src/features/AdminView.tsx'), 'utf8');
const checks = [
  ['mobile hero has compact responsive spacing', /@media\(max-width:520px\)[\s\S]*?\.kayad-command-hero\{[^}]*padding:17px/.test(css)],
  ['narrow 320px layouts switch quick actions to one column', /@media\(max-width:360px\)[\s\S]*?\.kayad-command-actions \.kayad-command-actions-grid\{grid-template-columns:minmax\(0,1fr\)\}/.test(css)],
  ['quick actions retain two-column layout where supported', /\.kayad-command-actions \.kayad-command-actions-grid\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/.test(css)],
  ['quick action controls retain keyboard focus styling', /\.kayad-command-actions \.kayad-command-actions-grid a:focus-visible/.test(css)],
  ['reduced-motion preference is respected', /@media\(prefers-reduced-motion:reduce\)[\s\S]*?\.kayad-command-actions/.test(css)],
  ['loading and unavailable data state remains represented', /kayad-command-data-state/.test(tsx) && /Some operational data unavailable or restricted/.test(tsx)],
  ['Refresh still invokes existing load behavior', /onClick=\{\(\) => void load\(\)\} disabled=\{loading\} aria-label="Refresh administration data"/.test(tsx)],
  ['Retry still invokes existing load behavior', /onClick=\{\(\) => void load\(\)\} disabled=\{loading\} aria-label="Retry loading unavailable data"/.test(tsx)],
  ['quick actions retain existing canonical destinations', ['/admin/staff','/admin/dealer-verifications','/admin/cars','/admin/reports'].every((route) => tsx.includes(`to="${route}"`))],
  ['responsive alert keeps error content and Retry accessible', /\[data-testid="admin-command-centre"\] \[role="alert"\] button/.test(css) && /aria-label="Retry loading unavailable data"/.test(tsx)],
  ['mobile dashboard styles remain scoped to the command centre', /\[data-testid="admin-command-centre"\]\{padding:10px 12px 28px/.test(css)],
  ['quick actions use consistent icon-and-label control structure', (dashboard.match(/className="kayad-command-action-link is-/g) || []).length === 4 && /kayad-command-action-icon/.test(dashboard)],
  ['KPI icons use distinct semantic color tones', ['blue','teal','violet','cyan','green','amber'].every((tone) => dashboard.includes(`tone: '${tone}'`)) && /tone-amber/.test(css)],
  ['admin search submits to the existing API loader', /onSubmit=\{\(event\) => \{ event\.preventDefault\(\); if \(module !== 'audit'\) void load\(queue\); \}\}/.test(dashboard)],
  ['search query is trimmed before server requests', /search: searchTerm\.trim\(\) \|\| undefined/.test(dashboard)],
  ['audit search filters only records already returned by the current API response', /const filteredAuditLogs = useMemo/.test(dashboard) && /Search covers the records returned by the current audit response/.test(dashboard)],
  ['operational errors use warning/error semantic surfaces and preserve retry when action errors coexist', /kayad-command-alert\.is-warning/.test(css) && /kayad-command-alert\.is-error/.test(css) && /actionError \? 'is-error' : 'is-warning'/.test(dashboard) && /{error && <Button size="sm" variant="outline"/.test(dashboard)],
];
let failed = 0;
for (const [label, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${label}`);
  if (!passed) failed++;
}
console.log(`\nMobile dashboard source-contract checks: ${checks.length - failed}/${checks.length} passed`);
if (failed) process.exitCode = 1;

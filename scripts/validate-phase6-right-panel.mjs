import fs from 'node:fs';
const view = fs.readFileSync('src/features/AdminView.tsx', 'utf8');
const css = fs.readFileSync('src/features/admin-command-centre.css', 'utf8');
const tests = fs.readFileSync('src/__tests__/features/adminCommandCentre.test.tsx', 'utf8');
const route = fs.readFileSync('src/components/admin/AdminRouteSurface.tsx', 'utf8');
const checks = [
  ['right-side panel remains inside canonical AdminView', view.includes('data-testid="admin-right-rail"') && route.includes("import('../../features/AdminView')")],
  ['account shortcut navigation remains named', view.includes('aria-label="Account shortcuts"')],
  ['operations dashboard destination unchanged', /to="\/admin"/.test(view)],
  ['account settings destination unchanged', view.includes('to="/admin/settings"')],
  ['audit log destination unchanged', view.includes('to="/admin/security-log"')],
  ['department destination unchanged', view.includes('to="/admin/staff"')],
  ['provider governance destination unchanged', view.includes('to="/admin/provider-governance"')],
  ['missing account name is not fabricated', view.includes('Account name unavailable') && !view.includes("sessionUser?.name || 'Administrator'")],
  ['missing role is not fabricated', view.includes('Role unavailable') && !view.includes("sessionUser?.role || 'Staff'")],
  ['provider status is explicitly not represented as live verified health', view.includes('Live connectivity is not verified in this summary')],
  ['right-rail responsive styles are scoped to the existing panel', css.includes('.kayad-command-rail-panel') && css.includes('@media(max-width:560px){.kayad-command-rail')],
  ['keyboard focus indicator is defined for panel links', css.includes('.kayad-command-rail a:focus-visible')],
  ['focused Phase 6 tests cover existing routes', tests.includes('Phase 6 right-side administration panel') && tests.includes("'/admin/provider-governance'")],
  ['focused Phase 6 tests cover absent identity fields', tests.includes('Account name unavailable') && tests.includes('Role unavailable')],
  ['existing staff destination used for department overview', view.includes('Staff &amp; Departments') && view.includes('to="/admin/staff"')],
];
let failed=0;
for (const [label, ok] of checks) { console.log(`${ok?'PASS':'FAIL'} ${label}`); if(!ok) failed++; }
console.log(`Phase 6 right-panel source contract: ${checks.length-failed}/${checks.length} checks passed.`);
if(failed) process.exitCode=1;

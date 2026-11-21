import fs from 'node:fs';
const page = fs.readFileSync(new URL('../src/pages/admin/AdminSecurityLog.jsx', import.meta.url), 'utf8');
const styles = fs.readFileSync(new URL('../src/styles/kayad-admin-shell.css', import.meta.url), 'utf8');
const account = fs.readFileSync(new URL('../src/components/admin/AdminAccountMenu.tsx', import.meta.url), 'utf8');
const checks = [
  ['security log has scoped page class', page.includes('admin-security-log')],
  ['header actions have responsive class', page.includes('admin-security-log__actions')],
  ['filter panel has responsive grid class', page.includes('admin-security-log__filter-grid')],
  ['search input remains connected to existing filter state', page.includes('value={filter}') && page.includes('setFilter(e.target.value)')],
  ['severity filter remains connected', page.includes('value={severityFilter}') && page.includes('setSeverityFilter(e.target.value)')],
  ['target model filter remains connected', page.includes('value={targetModelFilter}') && page.includes('setTargetModelFilter(e.target.value)')],
  ['search still invokes existing fetch', page.includes('setPage(1); fetchLogs();')],
  ['export JSON remains present', page.includes("handleExport('json')")],
  ['export CSV remains present', page.includes("handleExport('csv')")],
  ['mobile layout breakpoint exists', styles.includes('@media (max-width: 700px)')],
  ['narrow phone layout breakpoint exists', styles.includes('@media (max-width: 380px)')],
  ['filter controls receive usable minimum height', styles.includes('min-height: 44px')],
  ['empty state remains accessible and present', page.includes('admin-security-log__empty')],
  ['account menu is scroll constrained on mobile', styles.includes('max-height: min(62dvh, 400px)') && styles.includes('overscroll-behavior: contain')],
  ['mobile account menu is anchored to trigger rather than full-width fixed overlay', styles.includes('position: absolute;') && styles.includes('width: min(320px, calc(100vw - 24px))') && !styles.includes('position: fixed; top: 60px; right: 12px; left: 12px;')],
  ['security log page clips accidental horizontal overflow', styles.includes('overflow-x: clip')],
  ['empty state uses compact consistent spacing', page.includes("padding: 24, textAlign: 'center'")],
  ['security log search has accessible name', page.includes('aria-label="Search security logs by action"')],
  ['account menu retains existing destinations', account.includes('to="/profile"') && account.includes("to=\"/admin/settings\"")],
  ['account menu keeps real sign-out handler', account.includes('onClick={handleSignOut}') && account.includes('const result = await signOut()')],
];
let failures = 0;
for (const [label, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`); if (!ok) failures++; }
console.log(`RESULT ${checks.length - failures}/${checks.length} checks passed`);
if (failures) process.exitCode = 1;

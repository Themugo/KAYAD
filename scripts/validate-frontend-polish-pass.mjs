import fs from 'node:fs';
import assert from 'node:assert/strict';

const department = fs.readFileSync('src/features/AdminDepartmentCapabilities.tsx', 'utf8');
const css = fs.readFileSync('src/index.css', 'utf8');
const admin = fs.readFileSync('src/features/AdminView.tsx', 'utf8');
let passed = 0;
function check(name, condition) {
  assert.ok(condition, name);
  passed += 1;
  console.log(`PASS ${name}`);
}
check('department matrix retains its source-audited inventory', department.includes('DEPARTMENT_CAPABILITIES'));
check('capability search includes routes and evidence text', department.includes('capability.evidence') && department.includes('normalizedQuery'));
check('status filter uses the existing four-state taxonomy', department.includes("'IMPLEMENTED AND VERIFIED'") && department.includes("'IMPLEMENTED BUT UNVERIFIED'") && department.includes("'NOT IMPLEMENTED'"));
check('department filter derives from the existing inventory', department.includes('departmentFilter === \'ALL\''));
check('empty search results provide a clear-filter action', department.includes('No matching capabilities') && department.includes('Clear filters'));
check('canonical routes use client-side router links', department.includes('import { Link } from \'react-router-dom\'') && department.includes('<Link to={capability.href}'));
check('filter controls have labels and visible focus styles', department.includes('Search departments and capabilities') && department.includes('focus-visible:ring-2'));
check('result count is announced to assistive technology', department.includes('aria-live="polite"') && department.includes('Showing {visibleCapabilities}'));
check('department inventory does not fabricate operational metrics', department.includes('not a live operational dashboard'));
check('existing owner-only mounting is preserved', admin.includes("isOwner ? (['owners', 'departments'] as const)"));
check('command centre has strengthened keyboard focus styling', css.includes('[data-testid="admin-command-centre"] :where(button, a, input, select, textarea):focus-visible'));
check('command centre respects reduced-motion preferences', css.includes('@media (prefers-reduced-motion: reduce)') && css.includes('[data-testid="admin-command-centre"]'));
console.log(`Frontend polish source checks: ${passed}/12 PASS`);

// Route inventory invariants + generator for docs 02/03 (set WRITE_ROUTE_MATRIX=<file> to write the role-by-page matrix).
// Uses the REAL route table, sidebar source and permission mirror. No route is removed or added by this test.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { ADMIN_ROUTE_COMPONENTS } from '../../../components/admin/AdminRouteSurface';
import { ROLE_PERMISSIONS, PAGE_PERMISSIONS, SUPERADMIN_ONLY, getEffectivePermissions } from '../../../utils/permissions';

const sidebarSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/components/admin/AdminSidebar.tsx'), 'utf8');
const sidebarLinks = new Set([...sidebarSrc.matchAll(/'(\/admin[^']*)'/g)].map((m) => m[1]));
const routes = Object.keys(ADMIN_ROUTE_COMPONENTS);
const unlinked = routes.filter((r) => !sidebarLinks.has(r)).sort();
const STAFF_ROLES = ['admin', 'superadmin', 'marketing', 'technical_support', 'hr', 'accounts', 'escrow_officer', 'ad_manager', 'moderator', 'ghost_checker'];

const canOpen = (role: string, route: string) => {
  if (role === 'superadmin') return true;
  const def = ADMIN_ROUTE_COMPONENTS[route];
  if (def.superadminOnly || SUPERADMIN_ONLY.has(route)) return false;
  const need = PAGE_PERMISSIONS[route];
  if (!need) return true; // no page permission recorded: the shared guard and the backend decide (see doc 03)
  return getEffectivePermissions({ role }).includes(need);
};

describe('admin route inventory', () => {
  it('has a registered component for every route and no sidebar link without a route', () => {
    for (const r of routes) expect(ADMIN_ROUTE_COMPONENTS[r].component, r).toBeTruthy();
    for (const l of sidebarLinks) if (l !== '/admin') expect(routes.includes(l) || l === '/admin/dashboard', l).toBe(true);
  });
  it('superadmin-only pages are never unlocked for any other role', () => {
    for (const r of routes.filter((x) => ADMIN_ROUTE_COMPONENTS[x].superadminOnly || SUPERADMIN_ONLY.has(x))) {
      for (const role of STAFF_ROLES.filter((x) => x !== 'superadmin')) expect(canOpen(role, r), `${role} ${r}`).toBe(false);
    }
  });
  it('no route outside the sidebar is registered by accident: the unlinked set is the documented D-21 list', () => {
    expect(unlinked).toMatchSnapshot();
  });
  it('every staff role mentioned exists in the permission mirror', () => {
    for (const role of STAFF_ROLES) expect(role === 'superadmin' || ROLE_PERMISSIONS[role], role).toBeTruthy();
  });
  it('writes the role-by-page matrix on request', () => {
    const out = process.env.WRITE_ROUTE_MATRIX; if (!out) return;
    const head = `| Route | Component source | Sidebar | Gate | ${STAFF_ROLES.join(' | ')} |\n|---|---|---|---|${STAFF_ROLES.map(() => '---').join('|')}|\n`;
    const body = routes.sort().map((r) => {
      const gate = ADMIN_ROUTE_COMPONENTS[r].superadminOnly || SUPERADMIN_ONLY.has(r) ? 'superadmin' : (PAGE_PERMISSIONS[r] || 'shared guard + backend');
      return `| ${r} | ${ADMIN_ROUTE_COMPONENTS[r].component === undefined ? '?' : 'lazy page'} | ${sidebarLinks.has(r) ? 'yes' : 'NO (D-21)'} | ${gate} | ${STAFF_ROLES.map((x) => (canOpen(x, r) ? 'open' : 'denied')).join(' | ')} |`;
    }).join('\n');
    fs.writeFileSync(out, `${head}${body}\n\nRoutes: ${routes.length}; sidebar-linked: ${routes.length - unlinked.length}; unlinked: ${unlinked.length}\n`);
  });
});

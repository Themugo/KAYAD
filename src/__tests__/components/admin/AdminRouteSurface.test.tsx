import { describe, expect, it } from 'vitest';
import { ADMIN_ROUTE_COMPONENTS } from '../../../components/admin/AdminRouteSurface';
import { SUPERADMIN_ONLY } from '../../../utils/permissions';

const existingSidebarRoutes = [
  '/admin/users', '/admin/sellers', '/admin/cars', '/admin/moderation', '/admin/auctions',
  '/admin/bids', '/admin/escrows', '/admin/reviews', '/admin/referrals', '/admin/chats',
  '/admin/reports', '/admin/support-tickets', '/admin/feedback', '/admin/market-data',
  '/admin/transactions', '/admin/ntsa-queue', '/admin/inspections', '/admin/dealer-verifications',
  '/admin/inspector-applications', '/admin/security-log', '/admin/ads', '/admin/broadcast',
  '/admin/settings', '/admin/control-room', '/admin/staff', '/admin/staff-permissions',
  '/admin/panic-room', '/admin/webhoist', '/admin/cms', '/admin/automation', '/admin/config',
  '/admin/lowcode', '/admin/vxp', '/admin/xos', '/admin/ai', '/admin/digital-twin',
  '/admin/control-center', '/admin/integration', '/admin/governance', '/admin/intelligence',
  '/admin/command-center', '/admin/improvement', '/admin/platform-factory',
];

describe('canonical admin route registry', () => {
  it('registers every existing sidebar destination outside the command-centre root', () => {
    for (const route of existingSidebarRoutes) {
      expect(ADMIN_ROUTE_COMPONENTS[route], `missing admin route ${route}`).toBeTruthy();
    }
  });

  it('keeps owner/superadmin-only destinations protected', () => {
    for (const route of ['/admin/staff', '/admin/staff-permissions', '/admin/control-room', '/admin/panic-room', '/admin/webhoist']) {
      expect(ADMIN_ROUTE_COMPONENTS[route]?.superadminOnly || SUPERADMIN_ONLY.has(route)).toBe(true);
    }
    for (const route of ['/admin/lowcode', '/admin/vxp', '/admin/xos', '/admin/ai', '/admin/digital-twin', '/admin/control-center', '/admin/integration', '/admin/governance', '/admin/intelligence', '/admin/command-center', '/admin/improvement', '/admin/platform-factory']) {
      expect(ADMIN_ROUTE_COMPONENTS[route]?.superadminOnly, `${route} must remain privileged`).toBe(true);
    }
  });

  it('does not map the command-centre root to the legacy demonstration dashboard', () => {
    expect(ADMIN_ROUTE_COMPONENTS['/admin/dashboard']).toBeUndefined();
    expect(ADMIN_ROUTE_COMPONENTS['/admin']).toBeUndefined();
  });
});

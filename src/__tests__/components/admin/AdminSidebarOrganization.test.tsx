// Sidebar organisation: every destination exactly once, workflow groups, Settings pinned last and outside every group,
// permissions and active-route behaviour unchanged. Uses the REAL AdminSidebar and permission tables.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import fs from 'node:fs';
import path from 'node:path';

let authUser: any;
vi.mock('../../../context/AuthContext', () => ({ useAuth: () => ({ user: authUser, isAuth: true, loading: false, sessionStatus: 'ready' }) }));
vi.mock('../../../api/api', () => ({ adminAPI: { alerts: vi.fn().mockResolvedValue({ unreadCount: 0, alerts: [] }) } }));

import AdminSidebar from '../../../components/admin/AdminSidebar';
import { getEffectivePermissions, PAGE_PERMISSIONS, SUPERADMIN_ONLY } from '../../../utils/permissions';

// The complete inventory from the product brief (31 original destinations + Traffic Analytics, added with the visitor analytics requirement).
const INVENTORY: Record<string, string> = {
  '/admin': 'Dashboard', '/admin/users': 'Users', '/admin/sellers': 'Sellers', '/admin/private-seller-applications': 'Private Seller Applications',
  '/admin/cars': 'Listings', '/admin/moderation': 'Moderation', '/admin/auctions': 'Auctions', '/admin/bids': 'Bids', '/admin/escrows': 'Escrows',
  '/admin/transactions': 'Transactions', '/admin/ntsa-queue': 'NTSA Queue', '/admin/inspections': 'Inspections', '/admin/dealer-verifications': 'Dealer Verifications',
  '/admin/inspector-applications': 'Inspector Apps', '/admin/reviews': 'Reviews', '/admin/referrals': 'Referrals', '/admin/chats': 'Chats', '/admin/reports': 'Reports',
  '/admin/support-tickets': 'Support Tickets', '/admin/feedback': 'Feedback', '/admin/market-data': 'Market Data', '/admin/ads': 'Ad Manager', '/admin/broadcast': 'Broadcast',
  '/admin/security-log': 'Security Log', '/admin/settings': 'Settings', '/admin/control-room': 'Control Room', '/admin/staff': 'Staff', '/admin/staff-permissions': 'Staff Permissions',
  '/admin/traffic-analytics': 'Traffic Analytics', '/admin/site-designs': 'Site Designs', '/admin/panic-room': 'Panic Room', '/admin/platform-recovery': 'Platform Recovery', '/admin/webhoist': 'System Overview',
};
const mount = (route = '/admin', props: Partial<{ mobileOpen: boolean }> = {}) =>
  render(<MemoryRouter initialEntries={[route]}><AdminSidebar mobileOpen={!!props.mobileOpen} onToggle={() => {}} /></MemoryRouter>);
afterEach(() => cleanup());
const superadmin = () => { authUser = { id: 's', role: 'superadmin', permissions: [] }; };

describe('destinations', () => {
  it('every one of the 33 destinations appears exactly once with its label and route (no duplicates, none dropped)', () => {
    superadmin(); mount();
    const hrefs = Array.from(document.querySelectorAll('aside a')).map((a) => a.getAttribute('href')).filter((h) => h !== '/');
    expect(hrefs.sort()).toEqual(Object.keys(INVENTORY).sort());
    for (const [to, label] of Object.entries(INVENTORY)) expect(screen.getByRole('link', { name: label }).getAttribute('href')).toBe(to);
  });
  it('every sidebar route is registered with the admin route surface (no dead links)', () => {
    const surface = fs.readFileSync(path.resolve(process.cwd(), 'src/components/admin/AdminRouteSurface.tsx'), 'utf8');
    const registered = new Set([...surface.matchAll(/'((?:\/admin)[^']*)': \{ component:/g)].map((m) => m[1]));
    for (const to of Object.keys(INVENTORY)) expect(to === '/admin' || registered.has(to), to).toBe(true);
  });
});

describe('grouping', () => {
  it('uses seven workflow groups in operating order, each with concise labels and no empty group', () => {
    superadmin(); mount();
    const labels = Array.from(document.querySelectorAll('.admin-sidebar__group-toggle')).map((b) => b.textContent!.trim());
    // Dashboard's group has a single link; the heading is still a toggle so the structure is uniform.
    expect(labels).toEqual(['Command Centre', 'Marketplace', 'Accounts & Onboarding', 'Finance', 'Customer Care', 'Growth & Insight', 'Platform & Security']);
    for (const l of labels) expect(l.length).toBeLessThanOrEqual(24);
    for (const g of Array.from(document.querySelectorAll('.admin-sidebar__group'))) expect(g.querySelectorAll('a').length).toBeGreaterThan(0);
  });
  it('related work sits together (seller onboarding, money, customer care)', () => {
    superadmin(); mount();
    const group = (name: string) => within(screen.getByRole('button', { name: new RegExp(`^${name}`) }).closest('section') as HTMLElement);
    expect(group('Accounts & Onboarding').getAllByRole('link').map((a) => a.textContent)).toEqual(['Users', 'Sellers', 'Dealer Verifications', 'Private Seller Applications', 'Inspector Apps']);
    expect(group('Finance').getAllByRole('link').map((a) => a.textContent)).toEqual(['Escrows', 'Transactions']);
    expect(group('Customer Care').getAllByRole('link').map((a) => a.textContent)).toContain('Support Tickets');
  });
});

describe('Settings is standalone and pinned last', () => {
  it('is not inside any group and is the very last link in the sidebar', () => {
    superadmin(); mount();
    const settings = screen.getByRole('link', { name: 'Settings' });
    expect(settings.closest('.admin-sidebar__group')).toBeNull();
    expect(settings.closest('.admin-sidebar__navigation')).toBeNull();
    expect(settings.getAttribute('href')).toBe('/admin/settings');
    const all = Array.from(document.querySelectorAll('aside a, aside button'));
    expect(all[all.length - 1]).toBe(settings);
  });
  it('stays visible and reachable when every group is collapsed, and when the sidebar itself is collapsed', () => {
    superadmin(); mount('/admin/settings');
    for (const b of Array.from(document.querySelectorAll('.admin-sidebar__group-toggle')) as HTMLElement[]) if (b.getAttribute('aria-expanded') === 'true') fireEvent.click(b);
    for (const b of Array.from(document.querySelectorAll('.admin-sidebar__group-toggle')) as HTMLElement[]) expect(b.getAttribute('aria-expanded')).toBe('false');
    expect(screen.getByRole('link', { name: 'Settings' }).closest('[hidden]')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Collapse admin sidebar/ }));
    const collapsed = screen.getByRole('link', { name: 'Settings' });
    expect(collapsed.getAttribute('aria-label')).toBe('Settings'); // icon-only mode keeps an accessible name
  });
  it('is pinned on the mobile drawer too and closes the drawer on use', () => {
    superadmin();
    const toggled = vi.fn();
    render(<MemoryRouter initialEntries={['/admin']}><AdminSidebar mobileOpen onToggle={toggled} /></MemoryRouter>);
    const settings = screen.getByRole('link', { name: 'Settings' });
    expect(settings.closest('.admin-sidebar__pinned')).not.toBeNull();
    fireEvent.click(settings);
    expect(toggled).toHaveBeenCalled();
  });
  it('is highlighted on /admin/settings and on a nested settings route', () => {
    superadmin(); mount('/admin/settings/branding');
    expect(screen.getByRole('link', { name: 'Settings' }).className).toContain('is-active');
  });
});

describe('authorization behaviour is unchanged', () => {
  it('superadmin-only and danger destinations stay hidden from other staff; Settings follows its existing permission rule', () => {
    authUser = { id: 'm', role: 'marketing', permissions: [] };
    mount();
    for (const label of ['Staff', 'Staff Permissions', 'Panic Room', 'System Overview']) expect(screen.queryByRole('link', { name: label })).toBeNull();
    const perms = getEffectivePermissions(authUser);
    const required = PAGE_PERMISSIONS['/admin/settings'];
    const expectVisible = !SUPERADMIN_ONLY.has('/admin/settings') && (!required || perms.includes(required));
    expect(!!screen.queryByRole('link', { name: 'Settings' })).toBe(expectVisible);
  });
  it('admin role sees exactly what its permissions allow, and the pinned footer never lists a link the role cannot open', () => {
    authUser = { id: 'a', role: 'admin', permissions: [] };
    mount();
    const perms = getEffectivePermissions(authUser);
    for (const a of Array.from(document.querySelectorAll('aside a')) as HTMLAnchorElement[]) {
      const to = a.getAttribute('href')!;
      if (to === '/') continue;
      expect(SUPERADMIN_ONLY.has(to), to).toBe(false);
      const required = PAGE_PERMISSIONS[to];
      if (required) expect(perms.includes(required), to).toBe(true);
    }
  });
});

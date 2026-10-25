import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const api = vi.hoisted(() => ({
  stats: vi.fn(), users: vi.fn(), cars: vi.fn(), getAuditLog: vi.fn(), toggleBan: vi.fn(), approveDealer: vi.fn(), verifyDealer: vi.fn(), moderateCar: vi.fn(), verifyCar: vi.fn(),
}));
vi.mock('../../api/api.exports', () => ({ adminAPI: api }));
let authUser: any = { id: 'u1', role: 'admin', isOwner: false };
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: authUser }) }));
vi.mock('../../pages/admin/AdminCommunications', () => ({ default: () => <div>comms-panel</div> }));
vi.mock('../../features/AdminNavigationControl', () => ({ default: () => <div>nav-panel</div> }));
vi.mock('../../features/AdminProviderGovernance', () => ({ default: () => <div>providers-panel</div> }));
vi.mock('../../features/AdminSupportWorkspace', () => ({ default: () => <div>support-workspace-panel</div> }));
vi.mock('../../pages/admin/AdminSettingsOnboarding', () => ({ default: () => <div>onboarding-panel</div> }));
vi.mock('../../pages/admin/AdminOwnerManagement', () => ({ default: () => <div>owners-panel</div> }));

import AdminView from '../../features/AdminView';

const forbidden = () => Object.assign(new Error('forbidden'), { response: { status: 403 } });
const GOOD_STATS = { totalUsers: 120, verifiedDealers: 0, totalCars: 40, activeListings: 0, activeAuctions: 3, openEscrows: 2, pendingDealers: 4, pendingCars: 7, verificationQueue: 1, pendingReviews: 0, supportQueue: 9, pendingReports: 0, fraudAlerts: 0, activeAlerts: 5 };

beforeEach(() => {
  authUser = { id: 'u1', role: 'admin', isOwner: false };
  Object.values(api).forEach((f) => f.mockReset());
  api.stats.mockResolvedValue({ stats: GOOD_STATS });
  api.users.mockResolvedValue({ users: [{ id: 'd1', name: 'Dealer One', email: 'd1@x.test', role: 'dealer', status: 'pending' }] });
  api.cars.mockResolvedValue({ cars: [{ id: 'c1', title: 'Pending Car', status: 'pending', price: 1000 }] });
  api.getAuditLog.mockResolvedValue({ entries: [] });
});
afterEach(() => cleanup());
// AdminView renders inside the app's router in production (main.tsx); the department matrix uses <Link>.
const mount = () => render(<MemoryRouter><AdminView vehicles={[]} /></MemoryRouter>);
// KPI cards on the Super Admin dashboard are links whose <small> carries the label.
const kpi = (label: string) => screen.getByText(label, { selector: 'small' }).closest('a')!;
const openTools = () => fireEvent.click(screen.getByRole('button', { name: /specialist tools/i }));

describe('Command centre — truthful figures', () => {
  it('shows real values, including a genuine zero', async () => {
    mount();
    await waitFor(() => expect(screen.getByText('120')).toBeTruthy());
    expect(kpi('Total Users').textContent).toContain('120');
    expect(kpi('Verified Dealers').textContent).toContain('0');
    expect(kpi('Verified Dealers').textContent).not.toContain('Unavailable');
    expect(kpi('Live Auctions').textContent).toContain('3');
    expect(kpi('Open Escrows').textContent).toContain('2');
  });
  it('a metric the server could not read (null) is "Unavailable", never 0', async () => {
    api.stats.mockResolvedValue({ stats: { ...GOOD_STATS, openEscrows: null, totalCars: null }, unavailable: ['openEscrows', 'totalCars'] });
    mount();
    await waitFor(() => expect(screen.getByText('120')).toBeTruthy());
    expect(kpi('Open Escrows').textContent).toContain('Unavailable');
    expect(kpi('Vehicles').textContent).toContain('Unavailable');
    expect(kpi('Total Users').textContent).not.toContain('Unavailable');
  });
  it('a failed stats call says Unavailable for every figure (no fabricated zeros)', async () => {
    api.stats.mockRejectedValue(new Error('500'));
    mount();
    await waitFor(() => expect(screen.getAllByText('Unavailable').length).toBeGreaterThan(5));
    expect(screen.getByText(/Some operational data sources are unavailable: dashboard statistics/)).toBeTruthy();
  });
  it('malformed negative or fractional count values are unavailable rather than displayed as counts', async () => {
    api.stats.mockResolvedValue({ stats: { ...GOOD_STATS, totalUsers: -1, totalCars: 2.5 } });
    mount();
    await waitFor(() => expect(kpi('Total Users').textContent).toContain('Unavailable'));
    expect(kpi('Vehicles').textContent).toContain('Unavailable');
    expect(screen.queryByText('-1')).toBeNull();
    expect(screen.queryByText('2.5')).toBeNull();
  });
});

describe('Command centre — canonical destinations', () => {
  it('KPI cards link to their existing workspaces and the queue counts are the real API values', async () => {
    authUser = { id: 'u1', role: 'superadmin', isOwner: false };
    mount();
    await waitFor(() => expect(screen.getByText('120')).toBeTruthy());
    expect(kpi('Total Users').getAttribute('href')).toBe('/admin/users');
    expect(kpi('Active Staff').getAttribute('href')).toBe('/admin/staff');
    expect(kpi('Verified Dealers').getAttribute('href')).toBe('/admin/dealer-verifications');
    expect(kpi('Vehicles').getAttribute('href')).toBe('/admin/cars');
    expect(kpi('Live Auctions').getAttribute('href')).toBe('/admin/auctions');
    expect(kpi('Open Escrows').getAttribute('href')).toBe('/admin/escrows');
    const workbench = screen.getByTestId('approval-workbench');
    expect(screen.getByRole('link', { name: 'Open dealers approval workflow' }).textContent).toContain('4');
    expect(screen.getByRole('link', { name: 'Open vehicle listings approval workflow' }).textContent).toContain('7');
    expect(workbench.contains(screen.getByRole('link', { name: 'Open dealers approval workflow' }))).toBe(true);
  });
  it('the Active Staff card does not invent a staff count', async () => {
    authUser = { id: 'u1', role: 'superadmin', isOwner: false };
    mount();
    await waitFor(() => expect(screen.getByText('120')).toBeTruthy());
    expect(kpi('Active Staff').textContent).toContain('View staff');
  });
  it('support is reached through its canonical route, not a fabricated tile', async () => {
    mount();
    await waitFor(() => expect(screen.getByText('120')).toBeTruthy());
    expect(screen.getByRole('link', { name: 'Open support tickets queue' }).getAttribute('href')).toBe('/admin/support');
    expect(screen.queryByText('Fraud alerts')).toBeNull();
  });
});


describe('Command centre — responsive and accessible presentation', () => {
  it('provides a named administration navigation region and identifies the active module', async () => {
    mount();
    await waitFor(() => expect(screen.getByText('120')).toBeTruthy());
    openTools();
    expect(screen.getByRole('navigation', { name: 'Administration modules' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Dashboard module' }).getAttribute('aria-current')).toBe('page');
    fireEvent.click(screen.getByRole('button', { name: 'User review module' }));
    openTools();
    expect(screen.getByRole('button', { name: 'User review module' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('button', { name: 'Dashboard module' }).getAttribute('aria-current')).toBeNull();
  });

  it('announces the loaded state and allows a manual refresh', async () => {
    mount();
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Operational data loaded'));
    fireEvent.click(screen.getByRole('button', { name: 'Refresh administration data' }));
    await waitFor(() => expect(api.stats).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Operational data loaded'));
  });

  it('uses an alert role for partial data failures without hiding successful metrics', async () => {
    api.getAuditLog.mockRejectedValue(Object.assign(new Error('temporary failure'), { response: { status: 503 } }));
    mount();
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/audit log/));
    expect(screen.getByText('120')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain('Some operational data unavailable or restricted');
  });
});

describe('Command centre — role boundaries', () => {
  it('a 403 from a source is reported as an access boundary, not as an outage', async () => {
    api.getAuditLog.mockRejectedValue(forbidden());
    mount();
    await waitFor(() => expect(screen.getByText('120')).toBeTruthy());
    expect(screen.getByRole('note').textContent).toContain('audit log');
    expect(screen.getByRole('note').textContent).toContain('access boundary');
    expect(screen.queryByText(/data sources are unavailable/)).toBeNull();
  });
  it('a 500 on one source is still reported as unavailable while the others stay visible', async () => {
    api.getAuditLog.mockRejectedValue(Object.assign(new Error('x'), { response: { status: 500 } }));
    mount();
    await waitFor(() => expect(screen.getByText(/unavailable: audit log/)).toBeTruthy());
    expect(screen.getByText('120')).toBeTruthy();
  });
  it('Owners tab is shown to owners only (display marker; the server enforces)', async () => {
    mount();
    await waitFor(() => expect(screen.getByText('120')).toBeTruthy());
    openTools();
    expect(screen.queryByText('Owner management')).toBeNull();
    cleanup();
    authUser = { id: 'o1', role: 'superadmin', isOwner: true };
    mount();
    await waitFor(() => expect(screen.getByText('120')).toBeTruthy());
    openTools();
    expect(screen.getByText('Owner management')).toBeTruthy();
  });
  it('forged client markers do not reveal the Owners tab', async () => {
    authUser = { id: 'u2', role: 'superadmin', isOwner: 'true', effectiveRole: 'webhoist' };
    mount();
    await waitFor(() => expect(screen.getByText('120')).toBeTruthy());
    openTools();
    expect(screen.queryByText('Owner management')).toBeNull();
  });
});

describe('Command centre — canonical approval workbench', () => {
  it('links to each existing specialist workflow without inventing counts or parallel routes', async () => {
    mount();
    await waitFor(() => expect(screen.getByText('120')).toBeTruthy());
    const workbench = screen.getByTestId('approval-workbench');
    const routes = [
      ['dealers', '/admin/dealer-verifications'],
      ['sellers', '/admin/sellers'],
      ['inspectors', '/admin/inspector-applications'],
      ['vehicle listings', '/admin/moderation'],
      ['document verification', '/admin/ntsa-queue'],
      ['inspections', '/admin/inspections'],
    ];
    for (const [label, href] of routes) {
      const link = screen.getByRole('link', { name: `Open ${label} approval workflow` });
      expect(link.getAttribute('href')).toBe(href);
      expect(workbench.contains(link)).toBe(true);
    }
    expect(workbench.textContent).toContain('Each workflow retains its own domain rules');
  });
});


describe('Command centre — departmental capability convergence', () => {
  it('shows the capability matrix only to a confirmed owner and links to existing workflows', async () => {
    mount();
    await waitFor(() => expect(screen.getByText('120')).toBeTruthy());
    openTools();
    expect(screen.queryByRole('button', { name: 'Departments module' })).toBeNull();

    cleanup();
    authUser = { id: 'o1', role: 'superadmin', isOwner: true };
    mount();
    await waitFor(() => expect(screen.getByText('120')).toBeTruthy());
    openTools();
    fireEvent.click(screen.getByRole('button', { name: 'Departments module' }));
    expect(screen.getByTestId('department-capability-matrix')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Accounting & Finance' })).toBeTruthy();
    expect(screen.getAllByText('IMPLEMENTED BUT UNVERIFIED').length).toBeGreaterThan(0);
    expect(screen.getByText(/This inventory does not grant access/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Open existing Transaction oversight workflow' }).getAttribute('href')).toBe('/admin/transactions');
    expect(screen.getByRole('link', { name: 'Open existing Ledger and reconciliation workflow' }).getAttribute('href')).toBe('/admin/escrows');
    expect(screen.getByText(/No new records, database tables, financial totals/)).toBeTruthy();
  });

  it('does not reveal owner-only department inventory from a forged owner marker', async () => {
    authUser = { id: 'u2', role: 'admin', isOwner: 'true' };
    mount();
    await waitFor(() => expect(screen.getByText('120')).toBeTruthy());
    openTools();
    expect(screen.queryByRole('button', { name: 'Departments module' })).toBeNull();
  });
});


describe('Command centre — Phase 6 right-side administration panel', () => {
  it('preserves the established account, department and provider destinations', async () => {
    mount();
    await waitFor(() => expect(screen.getByTestId('admin-right-rail')).toBeTruthy());
    const rail = screen.getByTestId('admin-right-rail');
    const expected = [
      ['Operations Dashboard', '/admin'],
      ['Account Settings', '/admin/settings'],
      ['Audit & Logs', '/admin/security-log'],
      ['Staff & Departments', '/admin/staff'],
      ['Providers & Integrations', '/admin/provider-governance'],
    ];
    for (const [label, href] of expected) {
      const link = Array.from(rail.querySelectorAll('a')).find((candidate) => candidate.textContent?.includes(label));
      expect(link?.getAttribute('href')).toBe(href);
    }
    expect(screen.getByRole('navigation', { name: 'Account shortcuts' })).toBeTruthy();
  });

  it('does not fabricate account identity or claim provider connectivity when data is absent', async () => {
    authUser = { id: 'u1', role: '', name: '' };
    mount();
    await waitFor(() => expect(screen.getByTestId('admin-right-rail')).toBeTruthy());
    expect(screen.getByText('Account name unavailable')).toBeTruthy();
    expect(screen.getByText('Role unavailable')).toBeTruthy();
    expect(screen.getByText(/Live connectivity is not verified in this summary/)).toBeTruthy();
    expect(screen.queryByText('Provider healthy')).toBeNull();
  });
});

describe('Command centre — recent activity', () => {
  it('lists audit entries exactly as recorded, with the genuine actor and time', async () => {
    api.getAuditLog.mockResolvedValue({ entries: [{ id: 'a1', action: 'dealer.approve', module: 'users', actor: { email: 'hr@x.test' }, createdAt: '2026-10-24T09:15:00Z' }] });
    mount();
    const heading = await screen.findByRole('heading', { name: 'Recent Activity' });
    const panel = heading.closest('section')!;
    await waitFor(() => expect(panel.textContent).toContain('dealer approve'));
    expect(panel.textContent).toContain('hr@x.test');
    expect(panel.textContent).toContain('users');
    expect(panel.textContent).toMatch(/2026/);
  });
  it('does not invent an actor or time when the record has none', async () => {
    api.getAuditLog.mockResolvedValue({ entries: [{ id: 'a2', action: 'car.moderate' }] });
    mount();
    const panel = (await screen.findByRole('heading', { name: 'Recent Activity' })).closest('section')!;
    await waitFor(() => expect(panel.textContent).toContain('car moderate'));
    expect(panel.textContent).toContain('Actor not recorded');
    expect(panel.textContent).not.toMatch(/\d{4}/);
  });
  it('distinguishes empty, failed and restricted audit sources', async () => {
    mount();
    let panel = (await screen.findByRole('heading', { name: 'Recent Activity' })).closest('section')!;
    await waitFor(() => expect(panel.textContent).toContain('No audit activity was returned'));
    cleanup();
    api.getAuditLog.mockRejectedValue(new Error('500'));
    mount();
    panel = (await screen.findByRole('heading', { name: 'Recent Activity' })).closest('section')!;
    await waitFor(() => expect(panel.textContent).toContain('unavailable right now'));
    cleanup();
    api.getAuditLog.mockRejectedValue(forbidden());
    mount();
    panel = (await screen.findByRole('heading', { name: 'Recent Activity' })).closest('section')!;
    await waitFor(() => expect(panel.textContent).toContain('restricted for this role'));
  });
});

describe('Command centre — destinations follow the role', () => {
  it('a moderator is not offered links to pages the route guard would refuse', async () => {
    authUser = { id: 'u2', role: 'moderator', isOwner: false };
    mount();
    await waitFor(() => expect(screen.getByText('120')).toBeTruthy());
    const quick = screen.getByLabelText('Quick Actions');
    expect(quick.querySelector('a[href="/admin/staff"]')).toBeNull();
    expect(quick.querySelector('a[href="/admin/cars"]')).toBeNull();
    expect(quick.querySelector('a[href="/admin/dealer-verifications"]')).not.toBeNull();
    const staff = screen.getByText('Active Staff', { selector: 'small' }).closest('.kayad-command-kpi')!;
    expect(staff.tagName).toBe('DIV');
    expect(staff.textContent).toContain('Super Admin only');
    // the figure itself is still shown, only the link is withheld
    expect(screen.getByText('Total Users', { selector: 'small' }).closest('.kayad-command-kpi')!.textContent).toContain('120');
  });
  it('a super admin is offered every quick action', async () => {
    authUser = { id: 'u1', role: 'superadmin', isOwner: false };
    mount();
    await waitFor(() => expect(screen.getByText('120')).toBeTruthy());
    const quick = screen.getByLabelText('Quick Actions');
    for (const href of ['/admin/staff', '/admin/dealer-verifications', '/admin/cars', '/admin/reports']) expect(quick.querySelector(`a[href="${href}"]`)).not.toBeNull();
  });
});

describe('Command centre — hero identity', () => {
  it('uses the same role spelling as the header and falls back honestly', async () => {
    authUser = { id: 'u1', name: 'Wanjiru Kamau', role: 'superadmin', isOwner: false };
    mount();
    await waitFor(() => expect(screen.getByText('120')).toBeTruthy());
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Welcome back, Wanjiru Kamau');
    expect(document.querySelector('.kayad-command-identity small')!.textContent).toBe('Super Admin');
    expect(document.querySelector('.kayad-command-identity-mark')!.textContent).toBe('WK');
    cleanup();
    authUser = { id: 'u3', role: undefined, isOwner: false };
    mount();
    await waitFor(() => expect(screen.getByText('120')).toBeTruthy());
    expect(document.querySelector('.kayad-command-identity small')!.textContent).toBe('Authorized Administrator');
  });
});

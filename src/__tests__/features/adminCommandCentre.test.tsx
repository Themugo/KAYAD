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
const GOOD_STATS = { totalUsers: 120, totalCars: 40, activeListings: 0, activeAuctions: 3, openEscrows: 2, pendingDealers: 4, pendingCars: 7, verificationQueue: 1, pendingReviews: 0, supportQueue: 9, pendingReports: 0, fraudAlerts: 0, activeAlerts: 5 };

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
const tile = (label: string) => screen.getByText(label).closest('div')!.parentElement!;

describe('Command centre — truthful figures', () => {
  it('shows real values, including a genuine zero', async () => {
    mount();
    await waitFor(() => expect(screen.getByText('120')).toBeTruthy());
    expect(tile('Pending dealers').textContent).toContain('4');
    expect(tile('Pending reviews').textContent).toContain('0');
  });
  it('a metric the server could not read (null) is "Unavailable", never 0', async () => {
    api.stats.mockResolvedValue({ stats: { ...GOOD_STATS, supportQueue: null, pendingCars: null }, unavailable: ['supportQueue', 'pendingCars'] });
    mount();
    await waitFor(() => expect(screen.getByText('120')).toBeTruthy());
    expect(tile('Support queue').textContent).toContain('Unavailable');
    expect(tile('Pending vehicles').textContent).toContain('Unavailable');
    expect(tile('Pending dealers').textContent).not.toContain('Unavailable');
  });
  it('a failed stats call says Unavailable for every tile (no fabricated zeros)', async () => {
    api.stats.mockRejectedValue(new Error('500'));
    mount();
    await waitFor(() => expect(screen.getAllByText('Unavailable').length).toBeGreaterThan(5));
    expect(screen.getByText(/Some operational data sources are unavailable: dashboard statistics/)).toBeTruthy();
  });
  it('malformed negative or fractional count values are unavailable rather than displayed as counts', async () => {
    api.stats.mockResolvedValue({ stats: { ...GOOD_STATS, totalUsers: -1, totalCars: 2.5 } });
    mount();
    await waitFor(() => expect(screen.getByText('Unavailable')).toBeTruthy());
    expect(screen.queryByText('-1')).toBeNull();
    expect(screen.queryByText('2.5')).toBeNull();
  });
});

describe('Command centre — canonical queue destinations', () => {
  it('Pending dealers → Users tab, filtered to pending dealers, with a visible filter and a way back', async () => {
    mount();
    await waitFor(() => expect(screen.getByText('120')).toBeTruthy());
    fireEvent.click(screen.getByText('Pending dealers').closest('button')!);
    await waitFor(() => expect(screen.getByText('Dealer One')).toBeTruthy());
    expect(api.users).toHaveBeenLastCalledWith(expect.objectContaining({ role: 'dealer', pendingApproval: true }));
    expect(screen.getByTestId('queue-filter').textContent).toContain('pending dealers');
    fireEvent.click(screen.getByText('Show all'));
    await waitFor(() => expect(api.users).toHaveBeenLastCalledWith(expect.not.objectContaining({ pendingApproval: true })));
    expect(screen.queryByTestId('queue-filter')).toBeNull();
  });
  it('Pending vehicles → Cars tab, filtered to status=pending', async () => {
    mount();
    await waitFor(() => expect(screen.getByText('120')).toBeTruthy());
    fireEvent.click(screen.getByText('Pending vehicles').closest('button')!);
    await waitFor(() => expect(screen.getByText('Pending Car')).toBeTruthy());
    expect(api.cars).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'pending' }));
    expect(screen.getByTestId('queue-filter').textContent).toContain('pending vehicles');
  });
  it('Support queue → Support workspace', async () => {
    mount();
    await waitFor(() => expect(screen.getByText('120')).toBeTruthy());
    fireEvent.click(screen.getByText('Support queue').closest('button')!);
    await waitFor(() => expect(screen.getByText('support-workspace-panel')).toBeTruthy());
  });
  it('tiles without a canonical destination are not buttons', async () => {
    mount();
    await waitFor(() => expect(screen.getByText('120')).toBeTruthy());
    expect(screen.getByText('Fraud alerts').closest('button')).toBeNull();
  });
});


describe('Command centre — responsive and accessible presentation', () => {
  it('provides a named administration navigation region and identifies the active module', async () => {
    mount();
    await waitFor(() => expect(screen.getByText('120')).toBeTruthy());
    expect(screen.getByRole('navigation', { name: 'Administration modules' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Overview module' }).getAttribute('aria-current')).toBe('page');
    fireEvent.click(screen.getByRole('button', { name: 'Users module' }));
    expect(screen.getByRole('button', { name: 'Users module' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('button', { name: 'Overview module' }).getAttribute('aria-current')).toBeNull();
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
    expect(screen.getByRole('status').textContent).toContain('Some operational data is unavailable');
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
    expect(screen.queryByText('Owners')).toBeNull();
    cleanup();
    authUser = { id: 'o1', role: 'superadmin', isOwner: true };
    mount();
    await waitFor(() => expect(screen.getByText('Owners')).toBeTruthy());
  });
  it('forged client markers do not reveal the Owners tab', async () => {
    authUser = { id: 'u2', role: 'superadmin', isOwner: 'true', effectiveRole: 'webhoist' };
    mount();
    await waitFor(() => expect(screen.getByText('120')).toBeTruthy());
    expect(screen.queryByText('Owners')).toBeNull();
  });
});

describe('Command centre — canonical approval workbench', () => {
  it('links to each existing specialist workflow without inventing counts or parallel routes', async () => {
    mount();
    await waitFor(() => expect(screen.getByText('120')).toBeTruthy());
    const workbench = screen.getByTestId('approval-workbench');
    const routes = [
      ['Dealer verification', '/admin/dealer-verifications'],
      ['Seller accounts', '/admin/sellers'],
      ['Inspector applications', '/admin/inspector-applications'],
      ['Vehicle moderation', '/admin/moderation'],
      ['Vehicle and document verification', '/admin/ntsa-queue'],
      ['Inspection operations', '/admin/inspections'],
    ];
    for (const [label, href] of routes) {
      const link = screen.getByRole('link', { name: `Open ${label} workflow` });
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
    expect(screen.queryByRole('button', { name: 'Departments module' })).toBeNull();

    cleanup();
    authUser = { id: 'o1', role: 'superadmin', isOwner: true };
    mount();
    await waitFor(() => expect(screen.getByText('120')).toBeTruthy());
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

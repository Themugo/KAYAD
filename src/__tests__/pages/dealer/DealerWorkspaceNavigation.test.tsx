import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, within, fireEvent, act } from '@testing-library/react';

vi.mock('../../../services/dealerPlatformApi', () => ({
  getDealerDashboard: vi.fn().mockResolvedValue({ success: true, data: { overview: { totalListings: 4, totalViews: 1200, leads: { total: 6, new: 3 }, revenue: { total: 0 } } } }),
  getLeads: vi.fn().mockResolvedValue({ success: true, data: { items: [{ id: 'l1', buyer: { name: 'Wanjiru K', email: 'wk@example.test' }, vehicle: { title: 'Toyota Prado' }, stage: 'new', status: 'new' }] } }),
  getCustomers: vi.fn().mockResolvedValue({ success: true, data: { items: [{ id: 'u9', name: 'Wanjiru K', email: 'w@example.test' }] } }),
  getAuctionInventory: vi.fn().mockResolvedValue({ data: { items: [] } }),
  getInspectionOrders: vi.fn().mockResolvedValue({ data: { items: [] } }),
  getFinanceApplications: vi.fn().mockResolvedValue({ data: { items: [] } }),
  getTeamMembers: vi.fn().mockResolvedValue({ data: [] }),
  getReputation: vi.fn().mockResolvedValue({ data: {} }),
  getMarketingCampaigns: vi.fn().mockResolvedValue({ success: true, data: { items: [{ id: 'm1', name: 'Spring promo', status: 'draft' }] } }),
  getDealerAnalytics: vi.fn().mockResolvedValue({ data: {} }),
  updateLead: vi.fn(),
  createCampaign: vi.fn(),
}));
vi.mock('../../../services/vehicleApi', () => ({ getMyListings: vi.fn().mockResolvedValue([]) }));
vi.mock('../../../features/escrow/ParticipantEscrowDesk', () => ({ ParticipantEscrowDesk: () => <div>escrow desk</div> }));

import DealerDashboard from '../../../pages/dealer/dashboard/DealerDashboard';

const user = { id: 'd1', name: 'Amani Motors', role: 'dealer' };
const renderIt = () => render(<DealerDashboard user={user} onOpenAuth={vi.fn()} onNavigate={vi.fn()} />);
const nav = () => screen.findByRole('navigation', { name: 'Dealer workspace' });

describe('Dealer workspace navigation (Phase 14.2)', () => {
  beforeEach(() => { window.history.replaceState({}, '', '/?nav=dealer-dashboard'); });
  afterEach(() => { cleanup(); });

  it('groups the existing sections under Overview, Business, Operations and System Management', async () => {
    renderIt();
    const n = await nav();
    const groups = within(n).getAllByRole('group').map((g) => g.getAttribute('aria-labelledby'));
    expect(groups).toEqual(['dealer-nav-overview', 'dealer-nav-business', 'dealer-nav-operations', 'dealer-nav-system']);
    const names = (id: string) => within(within(n).getByRole('group', { name: id })).getAllByRole('button').map((b) => b.querySelector('span.font-medium')?.textContent);
    expect(names('Business')).toEqual(['Inventory', 'Leads', 'Pipeline', 'Customers', 'Finance', 'Analytics', 'Reputation']);
    expect(names('Operations')).toEqual(['Auctions', 'Inspections', 'Escrow', 'Marketing']);
    expect(names('System Management')).toEqual(['Team', 'Settings']);
  });

  it('keeps all 14 original sections reachable (none removed)', async () => {
    renderIt();
    const n = await nav();
    expect(within(n).getAllByRole('button')).toHaveLength(14);
  });

  it('marks exactly one item as the current page and shows the real new-lead badge', async () => {
    renderIt();
    const n = await nav();
    expect(n.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
    expect(await within(n).findByText('3 new')).toBeTruthy();
  });

  it('selecting a section updates header, breadcrumb, current page and URL', async () => {
    renderIt();
    const n = await nav();
    fireEvent.click(within(n).getByRole('button', { name: 'Team' }));
    expect(await screen.findByRole('heading', { level: 2, name: 'Team' })).toBeTruthy();
    expect(window.location.search).toContain('section=team');
    expect(window.location.search).toContain('nav=dealer-dashboard');
    const crumbs = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(crumbs).getByText('System Management')).toBeTruthy();
    expect(crumbs.querySelector('[aria-current="page"]')?.textContent).toBe('Team');
    expect(within(n).getByRole('button', { name: 'Team' }).getAttribute('aria-current')).toBe('page');
  });

  it('opens the section named in the URL on load (refresh / direct link) and ignores unknown sections', async () => {
    window.history.replaceState({}, '', '/?nav=dealer-dashboard&section=reputation');
    renderIt();
    expect(await screen.findByRole('heading', { level: 2, name: 'Reputation' })).toBeTruthy();
    cleanup();
    window.history.replaceState({}, '', '/?nav=dealer-dashboard&section=not-a-section');
    renderIt();
    expect(await screen.findByRole('heading', { level: 2, name: 'Dashboard' })).toBeTruthy();
  });

  it('browser Back and Forward move between sections', async () => {
    renderIt();
    const n = await nav();
    fireEvent.click(within(n).getByRole('button', { name: 'Inventory' }));
    fireEvent.click(within(n).getByRole('button', { name: 'Customers' }));
    expect(screen.getByRole('heading', { level: 2, name: 'Customers' })).toBeTruthy();
    act(() => { window.history.replaceState({}, '', '/?nav=dealer-dashboard&section=inventory'); window.dispatchEvent(new PopStateEvent('popstate')); });
    expect(await screen.findByRole('heading', { level: 2, name: 'Inventory' })).toBeTruthy();
    act(() => { window.history.replaceState({}, '', '/?nav=dealer-dashboard'); window.dispatchEvent(new PopStateEvent('popstate')); });
    expect(await screen.findByRole('heading', { level: 2, name: 'Dashboard' })).toBeTruthy();
  });

  it('leaving the escrow section drops escrowId from the URL', async () => {
    window.history.replaceState({}, '', '/?nav=dealer-dashboard&section=escrow&escrowId=abc');
    renderIt();
    const n = await nav();
    fireEvent.click(within(n).getByRole('button', { name: 'Team' }));
    expect(window.location.search).not.toContain('escrowId');
  });

  it('breadcrumb parent returns to the overview', async () => {
    renderIt();
    const n = await nav();
    fireEvent.click(within(n).getByRole('button', { name: 'Finance' }));
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Breadcrumb' })).getByRole('button', { name: /Dealer Hub/ }));
    expect(await screen.findByRole('heading', { level: 2, name: 'Dashboard' })).toBeTruthy();
    expect(window.location.search).not.toContain('section=');
  });

  it('Auctions links to the existing dealer auction routes', async () => {
    window.history.replaceState({}, '', '/?nav=dealer-dashboard&section=auctions');
    renderIt();
    const ops = await screen.findByRole('link', { name: /Auction operations/ });
    expect(ops.getAttribute('href')).toBe('/dealer/auction-operations');
    expect(screen.getByRole('link', { name: /Set up an auction/ }).getAttribute('href')).toBe('/dealer/auction-setup');
  });

  it('the notification control opens the real notifications route', async () => {
    const assign = vi.fn();
    const original = window.location;
    Object.defineProperty(window, 'location', { configurable: true, value: { ...original, assign, search: original.search, href: original.href, pathname: original.pathname, hash: '' } });
    try {
      renderIt();
      await nav();
      fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
      expect(assign).toHaveBeenCalledWith('/notifications');
    } finally {
      Object.defineProperty(window, 'location', { configurable: true, value: original });
    }
  });

  it('overview metrics come from the backend body { success, data } shape', async () => {
    renderIt();
    expect(await screen.findByText('4')).toBeTruthy();
    expect(screen.getByText('1,200')).toBeTruthy();
  });

  it('Leads, Customers and Marketing read { data: { items } } and render the records instead of a load error', async () => {
    renderIt();
    const n = await nav();
    fireEvent.click(within(n).getByRole('button', { name: /^Leads/ }));
    expect(await screen.findByText(/Wanjiru K/)).toBeTruthy();
    expect(screen.queryByText(/Could not load your leads/)).toBeNull();
    fireEvent.click(within(n).getByRole('button', { name: 'Customers' }));
    expect(await screen.findByText('w@example.test')).toBeTruthy();
    fireEvent.click(within(n).getByRole('button', { name: 'Marketing' }));
    expect(await screen.findByText('Spring promo')).toBeTruthy();
    expect(screen.queryByText(/Could not load your campaigns/)).toBeNull();
  });

  it('no legacy "Add Listing" control exists; Manage Inventory opens the inventory, which offers the real Add vehicle form (Phase 14.4)', async () => {
    const onNavigate = vi.fn();
    render(<DealerDashboard user={user} onOpenAuth={vi.fn()} onNavigate={onNavigate} />);
    await nav();
    expect(screen.queryByRole('button', { name: /Add Listing/i })).toBeNull();
    fireEvent.click(screen.getAllByRole('button', { name: 'Manage Inventory' })[0]);
    expect(await screen.findByRole('heading', { level: 2, name: 'Inventory' })).toBeTruthy();
    expect(screen.queryByText(/not available in this workspace yet/)).toBeNull();
    expect(screen.getByRole('button', { name: /Add vehicle/i })).toBeTruthy();
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('KPI cards with a real destination are buttons; cards without one stay plain; labels match the backend meaning', async () => {
    renderIt();
    await nav();
    expect(screen.getByText('Total Leads')).toBeTruthy();
    expect(screen.queryByText('Active Leads')).toBeNull();
    expect(screen.getByText('Revenue (released escrow, all time)')).toBeTruthy();
    expect(screen.queryByText(/This Month/)).toBeNull();
    expect(screen.queryByRole('button', { name: /Total Views/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Total Leads/ }));
    expect(await screen.findByRole('heading', { level: 2, name: 'Leads' })).toBeTruthy();
    fireEvent.click(within(await nav()).getByRole('button', { name: 'Overview' }));
    fireEvent.click(await screen.findByRole('button', { name: /Total Listings/ }));
    expect(await screen.findByRole('heading', { level: 2, name: 'Inventory' })).toBeTruthy();
  });

  it('shows a sign-in prompt, not the workspace, when signed out', async () => {
    render(<DealerDashboard user={null} onOpenAuth={vi.fn()} onNavigate={vi.fn()} />);
    expect(await screen.findByText('Sign in to manage your dealership.')).toBeTruthy();
    expect(screen.queryByRole('navigation', { name: 'Dealer workspace' })).toBeNull();
  });
});

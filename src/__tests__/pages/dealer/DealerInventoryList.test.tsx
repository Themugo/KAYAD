import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, within, fireEvent, waitFor } from '@testing-library/react';

vi.mock('../../../context/AuthContext', () => ({ useAuth: () => ({ signOut: vi.fn() }) }));
vi.mock('../../../services/dealerPlatformApi', () => ({
  getDealerDashboard: vi.fn().mockResolvedValue({ success: true, data: { overview: {} } }),
  getLeads: vi.fn().mockResolvedValue({ success: true, data: { items: [] } }),
  getCustomers: vi.fn().mockResolvedValue({ success: true, data: { items: [] } }),
  getAuctionInventory: vi.fn().mockResolvedValue({ data: { items: [] } }),
  getInspectionOrders: vi.fn().mockResolvedValue({ data: { items: [] } }),
  getFinanceApplications: vi.fn().mockResolvedValue({ data: { items: [] } }),
  getTeamMembers: vi.fn().mockResolvedValue({ data: [] }),
  getReputation: vi.fn().mockResolvedValue({ data: {} }),
  getMarketingCampaigns: vi.fn().mockResolvedValue({ success: true, data: { items: [] } }),
  getDealerAnalytics: vi.fn().mockResolvedValue({ data: {} }),
  updateLead: vi.fn(),
  createCampaign: vi.fn(),
}));
const cars = vi.hoisted(() => [
  { id: 'a', title: '2016 Landcruiser V8', brand: 'Toyota', model: 'Land Cruiser', year: 2016, price: 3500000, mileage: 165000, city: 'Nairobi', status: 'available', views: 3, createdAt: '2026-11-01T10:00:00Z', images: [{ url: 'https://x.test/1.jpg' }, { url: 'https://x.test/2.jpg' }] },
  { id: 'b', title: '2018 Mazda Demio', brand: 'Mazda', model: 'Demio', year: 2018, price: 900000, status: 'pending', views: 10, createdAt: '2026-11-02T10:00:00Z', images: [] },
]);
const markCarSold = vi.hoisted(() => vi.fn());
vi.mock('../../../services/vehicleApi', () => ({ getMyListings: vi.fn().mockResolvedValue(cars), deleteCar: vi.fn(), markCarSold }));
vi.mock('../../../features/escrow/ParticipantEscrowDesk', () => ({ ParticipantEscrowDesk: () => <div /> }));

import DealerDashboard from '../../../pages/dealer/dashboard/DealerDashboard';

const renderIt = () => render(<DealerDashboard user={{ id: 'd1', name: 'Amani', role: 'dealer' }} onOpenAuth={vi.fn()} onNavigate={vi.fn()} />);

describe('Dealer inventory list', () => {
  beforeEach(() => { window.history.replaceState({}, '', '/?nav=dealer-dashboard&section=inventory'); });
  afterEach(() => cleanup());

  it('numbers rows, shows thumbnail photo count and the seller-entered details only', async () => {
    renderIt();
    await screen.findByText('2016 Landcruiser V8');
    expect(screen.getAllByTestId('inventory-row-number').map((n) => n.textContent)).toEqual(['1', '2']);
    expect(screen.getByText('2 photos')).toBeTruthy();
    const details = screen.getAllByTestId('inventory-details').map((n) => n.textContent);
    expect(details.some((d) => d === '2016 · 165,000 km · Nairobi')).toBe(true);
    expect(details.some((d) => d === '2018')).toBe(true);
    expect(screen.getByTestId('inventory-count').textContent).toContain('Showing 2 of 2');
  });

  it('searches, filters by status and sorts, renumbering the visible rows', async () => {
    renderIt();
    await screen.findByText('2016 Landcruiser V8');
    fireEvent.change(screen.getByLabelText('Search your inventory'), { target: { value: 'demio' } });
    expect(screen.queryByText('2016 Landcruiser V8')).toBeNull();
    expect(screen.getAllByTestId('inventory-row-number').map((n) => n.textContent)).toEqual(['1']);
    fireEvent.change(screen.getByLabelText('Search your inventory'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Filter by status'), { target: { value: 'published' } });
    expect(screen.queryByText('2018 Mazda Demio')).toBeNull();
    fireEvent.change(screen.getByLabelText('Filter by status'), { target: { value: 'sold' } });
    expect(screen.getByTestId('inventory-no-match')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Filter by status'), { target: { value: 'all' } });
    fireEvent.change(screen.getByLabelText('Sort inventory'), { target: { value: 'price_desc' } });
    const first = screen.getAllByTestId('inventory-row-number')[0].closest('[data-testid="inventory-row"]') as HTMLElement;
    expect(within(first).getByText('2016 Landcruiser V8')).toBeTruthy();
  });

  it('Mark sold asks to confirm, then the sold vehicle leaves the numbered list and renumbers', async () => {
    markCarSold.mockResolvedValue({ success: true });
    renderIt();
    await screen.findByText('2016 Landcruiser V8');
    fireEvent.click(screen.getByRole('button', { name: /Mark 2016 Landcruiser V8 as sold/ }));
    const dialog = screen.getByRole('alertdialog', { name: /Confirm marking/ });
    fireEvent.change(within(dialog).getByLabelText('Buyer name'), { target: { value: 'Wanjiru' } });
    fireEvent.change(within(dialog).getByLabelText('Final sale price'), { target: { value: '3,400,000' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Yes, mark as sold' }));
    await waitFor(() => expect(markCarSold).toHaveBeenCalledWith('a', { buyerName: 'Wanjiru', salePrice: 3400000 }));
    await waitFor(() => expect(screen.queryByText('2016 Landcruiser V8', { selector: 'p.font-medium' })).toBeNull());
    expect(screen.getAllByTestId('inventory-row-number').map((n) => n.textContent)).toEqual(['1']);
    expect(screen.getByTestId('inventory-count').textContent).toContain('Showing 1 of 1 active');
    // collapsed Sold section holds it
    const sold = screen.getByTestId('sold-section');
    expect(within(sold).getByRole('button', { name: /Sold vehicles \(1\)/ }).getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(within(sold).getByRole('button', { name: /Sold vehicles/ }));
    expect(within(sold).getByText('2016 Landcruiser V8')).toBeTruthy();
  });

  it('a failed Mark sold is reported and nothing leaves the list', async () => {
    markCarSold.mockRejectedValue(new Error('This vehicle has a live auction.'));
    renderIt();
    await screen.findByText('2016 Landcruiser V8');
    fireEvent.click(screen.getByRole('button', { name: /Mark 2016 Landcruiser V8 as sold/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, mark as sold' }));
    expect((await screen.findByRole('alert')).textContent).toContain('live auction');
    expect(screen.getAllByTestId('inventory-row-number')).toHaveLength(2);
  });
});

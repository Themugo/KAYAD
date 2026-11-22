import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';


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
  { id: 'a1', title: '2019 CX-5', brand: 'Mazda', model: 'CX-5', year: 2019, price: 3000000, status: 'available', listingNumber: 8, views: 1, createdAt: '2026-10-02T10:00:00Z', images: [] },
  { id: 'h1', title: '2017 Fielder', brand: 'Toyota', model: 'Fielder', year: 2017, price: 1500000, status: 'hidden', listingNumber: 9, views: 1, createdAt: '2026-10-01T10:00:00Z', images: [] },
]);
const setVis = vi.hoisted(() => vi.fn());
vi.mock('../../../services/vehicleApi', () => ({ getMyListings: vi.fn().mockResolvedValue(cars), deleteCar: vi.fn(), markCarSold: vi.fn(), setCarVisibility: setVis }));
vi.mock('../../../features/escrow/ParticipantEscrowDesk', () => ({ ParticipantEscrowDesk: () => <div /> }));
import DealerDashboard from '../../../pages/dealer/dashboard/DealerDashboard';

describe('Dealer inventory: pause, republish and status labels', () => {
  beforeEach(() => { window.history.replaceState({}, '', '/?nav=dealer-dashboard&section=inventory'); setVis.mockReset(); });
  afterEach(() => cleanup());
  const open = async () => { render(<DealerDashboard user={{ id: 'd1', name: 'Amani', role: 'dealer' }} onOpenAuth={vi.fn()} onNavigate={vi.fn()} />); await screen.findByText('2019 CX-5'); };

  it('shows one status vocabulary and the right control per status', async () => {
    await open();
    const rows = screen.getAllByTestId('inventory-row');
    const active = rows.find((r) => within(r).queryByText('2019 CX-5'))!;
    const paused = rows.find((r) => within(r).queryByText('2017 Fielder'))!;
    expect(within(active).getByText('Active')).toBeTruthy();
    expect(within(active).getByTestId('listing-pause')).toBeTruthy();
    expect(within(active).queryByTestId('listing-publish')).toBeNull();
    expect(within(paused).getByText('Paused')).toBeTruthy();
    expect(within(paused).getByTestId('listing-publish').textContent).toMatch(/Republish/);
  });

  it('pausing updates the row and keeps its listing number', async () => {
    setVis.mockResolvedValue({ success: true, status: 'hidden' });
    await open();
    const row = screen.getAllByTestId('inventory-row').find((r) => within(r).queryByText('2019 CX-5'))!;
    fireEvent.click(within(row).getByTestId('listing-pause'));
    await within(row).findByText('Paused');
    expect(setVis).toHaveBeenCalledWith('a1', 'pause');
    expect(within(row).getByTestId('inventory-row-number').textContent).toBe('#8');
  });

  it('a refused republish leaves the row unchanged and shows the reason', async () => {
    setVis.mockResolvedValue({ success: false, message: 'Add the missing details before publishing: photos.' });
    await open();
    const row = screen.getAllByTestId('inventory-row').find((r) => within(r).queryByText('2017 Fielder'))!;
    fireEvent.click(within(row).getByTestId('listing-publish'));
    expect((await within(row).findByTestId('visibility-error')).textContent).toMatch(/photos/);
    expect(within(row).getByText('Paused')).toBeTruthy();
  });

  it('the summary tiles and the status filter use the same words as the rows, including Paused', async () => {
    await open();
    expect(within(screen.getByTestId('tile-paused')).getByText('1')).toBeTruthy();
    const options = within(screen.getByLabelText('Filter by status')).getAllByRole('option').map((o) => o.textContent);
    expect(options).toEqual(['All statuses', 'Active', 'Paused', 'Under review', 'Draft', 'Reserved', 'Sold']);
    expect(screen.queryByText('Published')).toBeNull();
    fireEvent.change(screen.getByLabelText('Filter by status'), { target: { value: 'hidden' } });
    const rows = screen.getAllByTestId('inventory-row');
    expect(rows).toHaveLength(1);
    expect(within(rows[0]).getByText('2017 Fielder')).toBeTruthy();
  });
});

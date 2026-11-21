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
  { id: 's1', title: '2015 Prado', brand: 'Toyota', model: 'Prado', year: 2015, price: 4000000, status: 'sold', sold: true, listingNumber: 7, views: 1, createdAt: '2026-10-01T10:00:00Z', images: [] },
  { id: 'a1', title: '2019 CX-5', brand: 'Mazda', model: 'CX-5', year: 2019, price: 3000000, status: 'available', listingNumber: 8, views: 1, createdAt: '2026-10-02T10:00:00Z', images: [] },
]);
vi.mock('../../../services/vehicleApi', () => ({ getMyListings: vi.fn().mockResolvedValue(cars), deleteCar: vi.fn(), markCarSold: vi.fn() }));
vi.mock('../../../features/escrow/ParticipantEscrowDesk', () => ({ ParticipantEscrowDesk: () => <div /> }));
import DealerDashboard from '../../../pages/dealer/dashboard/DealerDashboard';

describe('Dealer inventory: sold is read-only and numbers are permanent (DA-03, DA-07)', () => {
  beforeEach(() => { window.history.replaceState({}, '', '/?nav=dealer-dashboard&section=inventory'); });
  afterEach(() => cleanup());

  it('a sold listing offers no edit, remove or mark-sold action and keeps its number', async () => {
    render(<DealerDashboard user={{ id: 'd1', name: 'Amani', role: 'dealer' }} onOpenAuth={vi.fn()} onNavigate={vi.fn()} />);
    await screen.findByText('2019 CX-5');
    fireEvent.change(screen.getByLabelText('Filter by status'), { target: { value: 'sold' } });
    const row = screen.getAllByTestId('inventory-row')[0];
    expect(within(row).getByTestId('inventory-row-number').textContent).toBe('#7');
    expect(within(row).getByTestId('sold-read-only')).toBeTruthy();
    expect(within(row).queryByRole('button', { name: /Edit/ })).toBeNull();
    expect(within(row).queryByRole('button', { name: /Remove/ })).toBeNull();
    expect(within(row).queryByRole('button', { name: /as sold/ })).toBeNull();
  });

  it('the account status / sign out footer is part of the sidebar and the menu button is labelled', async () => {
    render(<DealerDashboard user={{ id: 'd1', name: 'Amani', role: 'dealer' }} onOpenAuth={vi.fn()} onNavigate={vi.fn()} />);
    await screen.findByText('2019 CX-5');
    const footer = screen.getByTestId('dealer-sidebar-footer');
    expect(within(footer).getByRole('button', { name: /Sign out/ })).toBeTruthy();
    const menu = screen.getByRole('button', { name: /Dealer menu/ });
    expect(menu.getAttribute('aria-controls')).toBe('dealer-workspace-sidebar');
    fireEvent.click(menu);
    expect(menu.getAttribute('aria-expanded')).toBe('true');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(menu.getAttribute('aria-expanded')).toBe('false');
  });
});

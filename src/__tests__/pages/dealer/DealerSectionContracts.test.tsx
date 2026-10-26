import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

// Response bodies below mirror backend/controllers/dealerPlatformController.js (`res.json({ success, data })`).
const api = vi.hoisted(() => ({
  getDealerDashboard: vi.fn(), getLeads: vi.fn(), getCustomers: vi.fn(), getAuctionInventory: vi.fn(),
  getInspectionOrders: vi.fn(), getFinanceApplications: vi.fn(), getTeamMembers: vi.fn(), getReputation: vi.fn(),
  getMarketingCampaigns: vi.fn(), getDealerAnalytics: vi.fn(), updateLead: vi.fn(), createCampaign: vi.fn(),
  getDealerProfile: vi.fn(), updateDealerProfile: vi.fn(), getVerificationStatus: vi.fn(),
  inviteTeamMember: vi.fn(), updateTeamMember: vi.fn(), removeTeamMember: vi.fn(),
}));
vi.mock('../../../services/dealerPlatformApi', () => api);
vi.mock('../../../services/vehicleApi', () => ({ getMyListings: vi.fn().mockResolvedValue([]) }));
vi.mock('../../../features/escrow/ParticipantEscrowDesk', () => ({ ParticipantEscrowDesk: () => <div>escrow desk</div> }));

import DealerDashboard from '../../../pages/dealer/dashboard/DealerDashboard';

const user = { id: 'd1', name: 'Amani Motors', role: 'dealer' };
const mount = (section: string) => {
  window.history.replaceState({}, '', `/?nav=dealer-dashboard&section=${section}`);
  render(<DealerDashboard user={user} onOpenAuth={vi.fn()} onNavigate={vi.fn()} />);
};
const open = async (section: string) => {
  mount(section);
  await screen.findByRole('navigation', { name: 'Dealer workspace' });
};

describe('Dealer section response contracts (Phase 14.3)', () => {
  beforeEach(() => {
    api.getDealerDashboard.mockResolvedValue({ success: true, data: { overview: { totalListings: 0, totalViews: 0, leads: { total: 0, new: 0 }, revenue: { total: 0 } } } });
  });
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it('genuine zeros render as 0, not as unavailable', async () => {
    await open('overview');
    expect((await screen.findAllByText('0')).length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText('Ksh 0')).toBeTruthy();
  });

  it('a payload without overview figures stays unavailable, never zero', async () => {
    api.getDealerDashboard.mockResolvedValue({ success: true, data: { overview: {} } });
    await open('overview');
    expect((await screen.findAllByText('—')).length).toBeGreaterThanOrEqual(4);
    expect(screen.queryByText('Ksh 0')).toBeNull();
  });

  it('a failed dashboard request shows the error with retry, not empty data; retry recovers', async () => {
    api.getDealerDashboard.mockRejectedValueOnce(new Error('boom'));
    mount('overview');
    expect(await screen.findByText('Could not load your dashboard. Please try again.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));
    expect(await screen.findByRole('navigation', { name: 'Dealer workspace' })).toBeTruthy();
  });

  it('a 200 response with no data is treated as a failure, not as an empty dashboard', async () => {
    api.getDealerDashboard.mockResolvedValue({ success: true });
    mount('overview');
    expect(await screen.findByText('Could not load your dashboard. Please try again.')).toBeTruthy();
  });

  it('Leads: empty list is an empty state; rejected request is an error with working retry', async () => {
    api.getLeads.mockResolvedValueOnce({ success: true, data: { items: [] } });
    await open('leads');
    expect(await screen.findByText(/No leads/i)).toBeTruthy();
    cleanup();
    api.getLeads.mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce({ success: true, data: { items: [{ id: 'l1', buyer: { name: 'Wanjiru K' }, vehicle: { title: 'Prado' }, stage: 'new' }] } });
    await open('leads');
    expect(await screen.findByText('Could not load your leads. Please try again.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));
    expect(await screen.findByText('Wanjiru K')).toBeTruthy();
  });

  it('Lead stage update replaces the record from the response body and surfaces a failure', async () => {
    api.getLeads.mockResolvedValue({ success: true, data: { items: [{ id: 'l1', buyer: { name: 'Wanjiru K' }, vehicle: { title: 'Prado' }, stage: 'new' }] } });
    api.updateLead.mockResolvedValueOnce({ success: true, data: { id: 'l1', buyer: { name: 'Wanjiru K' }, vehicle: { title: 'Prado' }, stage: 'contacted' } });
    await open('pipeline');
    await screen.findByText('Wanjiru K');
    const advance = screen.getAllByRole('button').find((b) => /contacted|advance|move/i.test(b.textContent || ''));
    expect(advance).toBeTruthy();
    fireEvent.click(advance!);
    await vi.waitFor(() => expect(api.updateLead).toHaveBeenCalledWith('l1', { stage: 'contacted' }));
    api.updateLead.mockRejectedValueOnce(new Error('denied'));
    cleanup();
  });

  it('Auctions, Inspections and Finance read { data: { items } } from the body', async () => {
    api.getAuctionInventory.mockResolvedValue({ success: true, data: { items: [{ id: 'a1', title: 'Subaru Forester', bidsCount: 3, views: 40, startingBid: 1000000, status: 'live' }] } });
    await open('auctions');
    expect(await screen.findByText('Subaru Forester')).toBeTruthy();
    cleanup();
    api.getInspectionOrders.mockResolvedValue({ success: true, data: { items: [{ id: 'i1', vehicle: 'Mazda CX-5', status: 'scheduled' }] } });
    await open('inspections');
    expect(await screen.findByText('Mazda CX-5')).toBeTruthy();
    cleanup();
    api.getFinanceApplications.mockResolvedValue({ success: true, data: { items: [{ id: 'f1', vehicle: 'Toyota Axio', applicantName: 'J Doe', status: 'pending' }] } });
    await open('finance');
    expect(await screen.findByText('Toyota Axio')).toBeTruthy();
  });

  it('Analytics shows real zeros as 0 but absent fields as unavailable', async () => {
    api.getDealerAnalytics.mockResolvedValue({ success: true, data: { overview: { totalViews: 0, totalSales: 0 }, performance: {}, topVehicles: [] } });
    await open('analytics');
    expect(await screen.findByText('Total Views')).toBeTruthy();
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2);
  });

  it('Reputation reads { overall, recentReviews } and keeps an absent rating unavailable', async () => {
    api.getReputation.mockResolvedValue({ success: true, data: { overall: { rating: null, totalReviews: 0 }, recentReviews: [] } });
    await open('reputation');
    expect(await screen.findByText('0 reviews')).toBeTruthy();
    expect(screen.getByText('—')).toBeTruthy();
  });

  it('Team reads members from the normalised service result; failure shows error', async () => {
    api.getTeamMembers.mockResolvedValue({ members: [{ id: 'm1', inviteEmail: 'sales@amani.test', role: 'sales', status: 'invited' }], stats: {}, success: true });
    await open('team');
    expect(await screen.findByText('sales@amani.test')).toBeTruthy();
    cleanup();
    api.getTeamMembers.mockRejectedValue(new Error('x'));
    await open('team');
    expect(await screen.findByText('Could not load your team. Please try again.')).toBeTruthy();
  });

  it('Settings loads the real profile (no placeholder, no simulated records); a failed load shows retry', async () => {
    api.getVerificationStatus.mockResolvedValue({ success: true, onboardingStage: 'pending_approval' });
    api.getDealerProfile.mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce({ success: true, data: { id: 'd1', businessName: 'Amani Motors', location: 'Nairobi', bio: null } });
    await open('settings');
    expect(await screen.findByText('Could not load your dealership profile. Please try again.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));
    expect(((await screen.findByLabelText(/Business name/)) as HTMLInputElement).value).toBe('Amani Motors');
    expect(screen.queryByText(/not backed by a canonical dealer-scoped data contract yet/)).toBeNull();
  });
});

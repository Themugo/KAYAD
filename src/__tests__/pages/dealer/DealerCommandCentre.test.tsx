import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, within, waitFor } from '@testing-library/react';

const api = vi.hoisted(() => ({
  getDealerDashboard: vi.fn(), getCommandCentre: vi.fn(), getLeads: vi.fn(), getCustomers: vi.fn(), getAuctionInventory: vi.fn(),
  getInspectionOrders: vi.fn(), getFinanceApplications: vi.fn(), getTeamMembers: vi.fn(), getReputation: vi.fn(),
  getMarketingCampaigns: vi.fn(), getDealerAnalytics: vi.fn(), updateLead: vi.fn(), createCampaign: vi.fn(),
  getDealerProfile: vi.fn(), updateDealerProfile: vi.fn(), getVerificationStatus: vi.fn(),
  inviteTeamMember: vi.fn(), updateTeamMember: vi.fn(), removeTeamMember: vi.fn(),
}));
vi.mock('../../../context/AuthContext', () => ({ useAuth: () => ({ signOut: vi.fn() }) }));
vi.mock('../../../services/dealerPlatformApi', () => api);
vi.mock('../../../services/vehicleApi', () => ({ getMyListings: vi.fn().mockResolvedValue([]) }));
vi.mock('../../../features/escrow/ParticipantEscrowDesk', () => ({ ParticipantEscrowDesk: () => <div>escrow desk</div> }));

import CommandCentrePanel, { type CommandCentreData } from '../../../pages/dealer/dashboard/CommandCentrePanel';
import DealerDashboard from '../../../pages/dealer/dashboard/DealerDashboard';

const fin = {
  releasedRevenue: { amount: 3_705_000, count: 4 }, grossSales: { amount: 4_300_000, count: 4 }, platformFees: { amount: 215_000 },
  escrowHeld: { amount: 4_180_000, gross: 4_400_000, count: 3 }, escrowDisputed: { amount: 665_000, count: 1 },
  pendingSettlement: { amount: 4_000_000, offerSettlements: { count: 1 }, auctionOutcomes: { count: 1 } },
  pendingPayout: { amount: 1_235_000, count: 2, notRequested: { count: 0 }, inProgress: { count: 1 }, failed: { count: 1 } },
  completedPayout: { amount: 950_000, count: 1 }, refunds: { amount: 900_000, count: 1, openCount: 1 }, outstandingReceivables: { amount: 5_415_000 }, transactionVolume: { count: 9, gross: 11_000_000 },
};
const owner: CommandCentreData = {
  access: { owner: true },
  listings: { total: 14, active: 8, pendingApproval: 2, draft: 1, hidden: 1, reserved: 0, sold: 2 },
  leads: { totalLeads: 9, newEnquiries: 3, unansweredLeads: 1, offersAwaitingDecision: 2 },
  financial: fin,
  auctions: { active: 1, upcoming: 1, completed: 3, validBids: 2, live: [{ id: 'a1', title: 'Prado live', auctionEnd: new Date(Date.now() + 5 * 3600_000).toISOString(), validBids: 2, highestValidBid: 900_000 }], upcomingList: [], outcomesRequiringAttention: 2 },
  team: { outstandingInvitations: 1, expiredInvitations: 1, activeMembers: 3, invitations: [], changes: [{ id: 'c1', message: 'Amina is active as manager', at: '2026-11-20T10:00:00Z' }], activity: [{ id: 'x1', message: 'Amina marked a vehicle sold', at: '2026-11-21T10:00:00Z' }] },
  attention: [
    { id: 'failed-payouts', label: 'Payouts that failed or were cancelled', count: 1, severity: 'critical', target: { section: 'banking' } },
    { id: 'new-enquiries', label: 'New enquiries', count: 3, severity: 'info', target: { section: 'leads' } },
  ],
};

describe('CommandCentrePanel', () => {
  afterEach(cleanup);
  it('shows a loading status, then nothing invented while data is absent', () => {
    const { rerender } = render(<CommandCentrePanel data={null} loading onOpen={vi.fn()} />);
    expect(screen.getByRole('status', { name: 'Loading command centre' })).toBeTruthy();
    rerender(<CommandCentrePanel data={null} loading={false} onOpen={vi.fn()} />);
    expect(screen.queryByTestId('command-centre')).toBeNull();
  });
  it('shows an honest, non-alarming unavailable state with retry', () => {
    const retry = vi.fn();
    render(<CommandCentrePanel data={null} loading={false} unavailable onOpen={vi.fn()} onRetry={retry} />);
    expect(screen.getByTestId('command-centre-unavailable').textContent).toMatch(/could not be loaded/);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' })); expect(retry).toHaveBeenCalled();
  });
  it('owner: real figures in every block', () => {
    render(<CommandCentrePanel data={owner} loading={false} onOpen={vi.fn()} />);
    expect(within(screen.getByTestId('tile-active')).getByText('8')).toBeTruthy();
    expect(within(screen.getByTestId('tile-offers')).getByText('2')).toBeTruthy();
    expect(within(screen.getByTestId('fin-revenue')).getByText('Ksh 3,705,000')).toBeTruthy();
    expect(within(screen.getByTestId('fin-escrow')).getByText('Ksh 4,180,000')).toBeTruthy();
    expect(within(screen.getByTestId('fin-pending-payout')).getByText('Ksh 1,235,000')).toBeTruthy();
    expect(within(screen.getByTestId('fin-completed-payout')).getByText('Ksh 950,000')).toBeTruthy();
    expect(screen.getByTestId('fin-pending-settlement').textContent).toMatch(/Not counted as revenue/);
    expect(screen.getByTestId('auction-live-list').textContent).toMatch(/Prado live.*2 valid bids.*highest Ksh 900,000/);
    expect(screen.getByTestId('team-feed').textContent).toMatch(/Amina marked a vehicle sold/);
  });
  it('held escrow is labelled as not yet revenue and is a separate figure from released revenue', () => {
    render(<CommandCentrePanel data={owner} loading={false} onOpen={vi.fn()} />);
    expect(screen.getByTestId('fin-escrow').textContent).toMatch(/not yet revenue/);
    expect(screen.getByTestId('fin-revenue').textContent).not.toMatch(/4,180,000/);
  });
  it('every actionable item leads to its destination section', () => {
    const open = vi.fn();
    render(<CommandCentrePanel data={owner} loading={false} onOpen={open} />);
    const go = (name: RegExp | string) => fireEvent.click(typeof name === 'string' ? screen.getByTestId(name) : screen.getByRole('button', { name }));
    go('attention-failed-payouts'); go('attention-new-enquiries'); go('tile-active'); go('tile-enquiries'); go('tile-auctions-active'); go('fin-escrow'); go('fin-pending-payout');
    fireEvent.click(screen.getByRole('button', { name: /Manage team/ })); fireEvent.click(screen.getByRole('button', { name: /Banking & payouts/ }));
    expect(open.mock.calls.map((c) => c[0])).toEqual(['banking', 'leads', 'inventory', 'leads', 'auctions', 'escrow', 'banking', 'team', 'banking']);
  });
  it('attention items are keyboard-operable buttons with a spoken count and destination', () => {
    render(<CommandCentrePanel data={owner} loading={false} onOpen={vi.fn()} />);
    const b = screen.getByTestId('attention-failed-payouts'); expect(b.tagName).toBe('BUTTON'); expect(b.textContent).toMatch(/1 item, Urgent\. Opens banking/);
  });
  it('empty queue says so instead of leaving a blank block', () => {
    render(<CommandCentrePanel data={{ ...owner, attention: [] }} loading={false} onOpen={vi.fn()} />);
    expect(screen.getByTestId('attention-empty')).toBeTruthy();
  });
  it('finance officer: released revenue only — no escrow, payout, fee or settlement figure rendered', () => {
    render(<CommandCentrePanel data={{ financial: { releasedRevenue: fin.releasedRevenue }, attention: [] }} loading={false} onOpen={vi.fn()} />);
    expect(screen.getByTestId('fin-revenue')).toBeTruthy();
    for (const id of ['fin-escrow', 'fin-pending-payout', 'fin-completed-payout', 'fin-refunds', 'fin-fees', 'fin-pending-settlement']) expect(screen.queryByTestId(id)).toBeNull();
    expect(screen.queryByText(/Banking & payouts/)).toBeNull();
  });
  it('sales agent: business counts only, no financial block, no team block', () => {
    render(<CommandCentrePanel data={{ listings: owner.listings, leads: owner.leads, auctions: owner.auctions, attention: [] }} loading={false} onOpen={vi.fn()} />);
    expect(screen.queryByText('Financial overview')).toBeNull(); expect(screen.queryByText('Team activity')).toBeNull();
    expect(screen.getByText('Business overview')).toBeTruthy();
  });
  it('a role with no sections is told why, with no figures', () => {
    render(<CommandCentrePanel data={{ attention: [] }} loading={false} onOpen={vi.fn()} />);
    expect(screen.getByText(/no dashboard sections/)).toBeTruthy();
  });
  it('genuine zeros are shown as 0, an auction-free dealer sees an honest empty state', () => {
    render(<CommandCentrePanel data={{ ...owner, auctions: { active: 0, upcoming: 0, completed: 0, validBids: 0, live: [], upcomingList: [], outcomesRequiringAttention: 0 } }} loading={false} onOpen={vi.fn()} />);
    expect(screen.getByTestId('auction-empty').textContent).toMatch(/No auctions are live/);
    expect(within(screen.getByTestId('tile-auctions-active')).getByText('0')).toBeTruthy();
  });
  it('warns when the server could not read the whole history', () => {
    render(<CommandCentrePanel data={{ ...owner, truncated: ['escrows'] }} loading={false} onOpen={vi.fn()} />);
    expect(screen.getByTestId('command-centre-truncated').textContent).toMatch(/escrows/);
  });
  it('hides figures whose source table is missing and says so, instead of showing zeros', () => {
    render(<CommandCentrePanel data={{ ...owner, unavailable: ['offers', 'settlements'] }} loading={false} onOpen={vi.fn()} />);
    expect(screen.getByTestId('command-centre-partial').textContent).toMatch(/offers/);
    expect(screen.queryByTestId('tile-offers')).toBeNull();
    expect(screen.queryByTestId('fin-pending-settlement')).toBeNull();
    expect(screen.getByTestId('tile-active')).toBeTruthy();
    expect(screen.getByTestId('fin-revenue')).toBeTruthy();
  });
  it('shows no partial-data note on a complete schema', () => {
    render(<CommandCentrePanel data={{ ...owner, unavailable: [] }} loading={false} onOpen={vi.fn()} />);
    expect(screen.queryByTestId('command-centre-partial')).toBeNull();
    expect(screen.getByTestId('tile-offers')).toBeTruthy();
  });

});

describe('DealerDashboard overview with the command centre', () => {
  const mount = () => { window.history.replaceState({}, '', '/?nav=dealer-dashboard'); render(<DealerDashboard user={{ id: 'd1', name: 'Amani Motors', role: 'dealer' }} onOpenAuth={vi.fn()} onNavigate={vi.fn()} />); };
  beforeEach(() => { api.getDealerDashboard.mockReset(); api.getCommandCentre.mockReset(); });
  afterEach(() => { cleanup(); });
  it('sales agent: the earnings-gated legacy dashboard is refused (403) but the overview works from the command centre — no error banner', async () => {
    api.getDealerDashboard.mockRejectedValue(Object.assign(new Error('Forbidden'), { status: 403 }));
    api.getCommandCentre.mockResolvedValue({ success: true, data: { listings: owner.listings, leads: owner.leads, pipeline: { new: 3, contacted: 2, negotiating: 1, inspectionBooked: 0, reserved: 0, sold: 1, lost: 0 }, attention: owner.attention!.slice(1) } });
    mount();
    expect(await screen.findByTestId('command-centre')).toBeTruthy();
    expect(screen.queryByText(/do not have permission to view this dealership dashboard/)).toBeNull();
    expect(screen.queryByText('Total Views')).toBeNull(); expect(screen.queryByText('Revenue (released escrow, all time)')).toBeNull();
    expect(screen.getByTestId('attention-new-enquiries')).toBeTruthy();
  });
  it('owner: both sources load; the authoritative released revenue is used and the legacy mini-queue is not duplicated', async () => {
    api.getDealerDashboard.mockResolvedValue({ success: true, data: { overview: { totalListings: 14, totalViews: 10, leads: { total: 9, new: 3 }, revenue: { total: 2_705_000 }, listingStatus: { available: 8, pending: 2, draft: 1 } } } });
    api.getCommandCentre.mockResolvedValue({ success: true, data: owner });
    mount();
    expect(await screen.findByTestId('command-centre')).toBeTruthy();
    expect(screen.getAllByText('Ksh 3,705,000').length).toBeGreaterThan(0);
    expect(screen.queryByText('Ksh 2,705,000')).toBeNull();
    expect(screen.queryByTestId('dealer-attention')).toBeNull();
  });
  it('command centre failure does not break the overview; it says so quietly', async () => {
    api.getDealerDashboard.mockResolvedValue({ success: true, data: { overview: { totalListings: 1, leads: { total: 0, new: 0 }, revenue: { total: 0 } } } });
    api.getCommandCentre.mockRejectedValue(Object.assign(new Error('boom'), { status: 500 }));
    mount();
    expect(await screen.findByTestId('command-centre-unavailable')).toBeTruthy();
    expect(screen.getByTestId('dealer-overview')).toBeTruthy();
    expect(screen.queryAllByRole('alert')).toHaveLength(0);
  });
  it('both sources failing keeps the existing error banner with retry', async () => {
    api.getDealerDashboard.mockRejectedValue(new Error('boom')); api.getCommandCentre.mockRejectedValue(new Error('boom'));
    mount();
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Try Again' })).toBeTruthy();
  });
  it('attention items navigate inside the workspace (no new destinations)', async () => {
    api.getDealerDashboard.mockResolvedValue({ success: true, data: { overview: {} } });
    api.getCommandCentre.mockResolvedValue({ success: true, data: owner });
    mount();
    fireEvent.click(await screen.findByTestId('attention-failed-payouts'));
    await waitFor(() => expect(window.location.search).toMatch(/section=banking/));
  });
});

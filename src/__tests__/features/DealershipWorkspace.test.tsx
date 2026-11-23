import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';

const api = vi.hoisted(() => ({
  getMyWorkspace: vi.fn(), getInventory: vi.fn(), getLeads: vi.fn(), getCustomers: vi.fn(), updateLead: vi.fn(), getCommandCentre: vi.fn(),
}));
vi.mock('../../services/dealerPlatformApi', () => api);

import DealershipWorkspace from '../../features/DealershipWorkspace/DealershipWorkspace';
import { resetMyDealershipCache } from '../../features/DealershipWorkspace/useMyDealership';

const user = { id: 'u1', role: 'user', name: 'Mary' };
const member = (permissions: string[]) => ({ membership: { dealershipName: 'Prime Motors Ltd', teamRole: 'sales_agent', permissions }, ambiguous: false });

beforeEach(() => { vi.clearAllMocks(); resetMyDealershipCache(); api.getCommandCentre.mockRejectedValue({ response: { status: 403 } }); });

describe('Dealership workspace entry screen', () => {
  it('shows the dealership name and only the sections the member is permitted', async () => {
    api.getMyWorkspace.mockResolvedValue(member(['canListCars']));
    api.getInventory.mockResolvedValue({ items: [{ id: 'c1', title: 'Toyota Prado', status: 'active', price: 4500000 }] });
    render(<DealershipWorkspace user={user} onNavigate={() => {}} />);
    expect(await screen.findByText('Prime Motors Ltd')).toBeTruthy();
    expect(await screen.findByText('Toyota Prado')).toBeTruthy();
    expect(screen.queryByRole('tab', { name: /Leads/ })).toBeNull();
    expect(screen.queryByText(/banking|settings/i, { selector: 'button' })).toBeNull();
  });

  it('lets a member with the leads permission move a lead stage', async () => {
    api.getMyWorkspace.mockResolvedValue(member(['canChatBuyers']));
    api.getLeads.mockResolvedValue({ data: { items: [{ id: 'l1', buyerName: 'Jo', stage: 'new' }] } });
    api.updateLead.mockResolvedValue({ success: true });
    render(<DealershipWorkspace user={user} onNavigate={() => {}} />);
    const select = await screen.findByLabelText('Lead stage');
    fireEvent.change(select, { target: { value: 'contacted' } });
    await waitFor(() => expect(api.updateLead).toHaveBeenCalledWith('l1', { stage: 'contacted' }));
  });

  it('explains a missing or removed membership and offers no workspace', async () => {
    api.getMyWorkspace.mockResolvedValue({ membership: null, ambiguous: false });
    render(<DealershipWorkspace user={user} onNavigate={() => {}} />);
    expect(await screen.findByText(/do not currently work for a dealership/i)).toBeTruthy();
    expect(api.getInventory).not.toHaveBeenCalled();
  });

  it('fails closed when the access check errors', async () => {
    api.getMyWorkspace.mockRejectedValue(new Error('x'));
    render(<DealershipWorkspace user={user} onNavigate={() => {}} />);
    expect(await screen.findByText(/do not currently work for a dealership/i)).toBeTruthy();
    expect(api.getLeads).not.toHaveBeenCalled();
  });

  it('says so when the dealership gave no permissions', async () => {
    api.getMyWorkspace.mockResolvedValue(member([]));
    render(<DealershipWorkspace user={user} onNavigate={() => {}} />);
    expect(await screen.findByText(/not given you any workspace permissions/i)).toBeTruthy();
  });

  it('does not ask the server at all for a dealer or staff account', async () => {
    render(<DealershipWorkspace user={{ id: 'd1', role: 'dealer' }} onNavigate={() => {}} />);
    expect(await screen.findByText(/do not currently work for a dealership/i)).toBeTruthy();
    expect(api.getMyWorkspace).not.toHaveBeenCalled();
  });

  describe('permission-aware overview', () => {
    const cc = (extra: any) => ({ data: { access: { owner: false }, attention: [], unavailable: [], ...extra } });
    it('shows an Overview tab with only the sections the server returned, and opens the right tab from an attention item', async () => {
      api.getMyWorkspace.mockResolvedValue(member(['canListCars', 'canChatBuyers']));
      api.getCommandCentre.mockResolvedValue(cc({ listings: { total: 5, active: 3, pendingApproval: 1, draft: 1, hidden: 0, reserved: 0, sold: 0 }, leads: { totalLeads: 4, newEnquiries: 2, unansweredLeads: 1, offersAwaitingDecision: 1 }, attention: [{ id: 'new-enquiries', label: 'new enquiries', count: 2, severity: 'warning', target: { section: 'leads' } }], myActivity: [] }));
      api.getLeads.mockResolvedValue({ data: { items: [] } });
      render(<DealershipWorkspace user={user} onNavigate={() => {}} />);
      expect(await screen.findByTestId('team-overview')).toBeTruthy();
      expect(screen.getByRole('tab', { name: /Overview/ }).getAttribute('aria-selected')).toBe('true');
      expect(screen.getByTestId('to-enquiries').textContent).toContain('2');
      expect(screen.queryByTestId('to-revenue')).toBeNull();
      expect(within(screen.getByTestId('team-overview')).queryByText(/escrow|payout|refund|platform fee|banking/i)).toBeNull();
      fireEvent.click(screen.getByTestId('team-attention-new-enquiries'));
      await waitFor(() => expect(screen.getByRole('tab', { name: /Leads/ }).getAttribute('aria-selected')).toBe('true'));
    });
    it('a finance officer (no workspace tabs today) gets the overview with released revenue only', async () => {
      api.getMyWorkspace.mockResolvedValue(member(['canViewEarnings', 'canApproveDeals']));
      api.getCommandCentre.mockResolvedValue(cc({ financial: { releasedRevenue: { amount: 1_172_838.65, count: 1 } } }));
      render(<DealershipWorkspace user={user} onNavigate={() => {}} />);
      expect(await screen.findByTestId('to-revenue')).toBeTruthy();
      expect(screen.queryByTestId('to-active')).toBeNull();
      expect(screen.queryByRole('tab', { name: /Inventory|Leads|Customers/ })).toBeNull();
      expect(within(screen.getByTestId('team-overview')).queryByText(/pending payout|escrow|fees|refund/i)).toBeNull();
    });
    it('an attention item whose destination is not in the team workspace is information only (no invented link)', async () => {
      api.getMyWorkspace.mockResolvedValue(member(['canListCars']));
      api.getInventory.mockResolvedValue({ items: [] });
      api.getCommandCentre.mockResolvedValue(cc({ listings: { total: 1, active: 1, pendingApproval: 0, draft: 0, hidden: 0, reserved: 0, sold: 0 }, attention: [{ id: 'auction-x', label: 'auctions need attention', count: 1, severity: 'warning', target: { section: 'auctions' } }] }));
      render(<DealershipWorkspace user={user} onNavigate={() => {}} />);
      const item = await screen.findByTestId('team-attention-auction-x');
      expect(item.tagName).toBe('DIV');
    });
    it('a viewer (API 403) keeps today\'s message and sees no overview', async () => {
      api.getMyWorkspace.mockResolvedValue(member([]));
      render(<DealershipWorkspace user={user} onNavigate={() => {}} />);
      expect(await screen.findByText(/has not given you any workspace permissions/)).toBeTruthy();
      expect(screen.queryByTestId('team-overview')).toBeNull();
    });
    it('hides open offers when the offers source is missing and says so', async () => {
      api.getMyWorkspace.mockResolvedValue(member(['canChatBuyers']));
      api.getCommandCentre.mockResolvedValue(cc({ leads: { totalLeads: 0, newEnquiries: 0, unansweredLeads: 0, offersAwaitingDecision: 0 }, unavailable: ['offers'] }));
      render(<DealershipWorkspace user={user} onNavigate={() => {}} />);
      expect(await screen.findByTestId('team-overview-partial')).toBeTruthy();
      expect(screen.queryByTestId('to-offers')).toBeNull();
    });
    it('shows only the member\'s own recent activity', async () => {
      api.getMyWorkspace.mockResolvedValue(member(['canListCars']));
      api.getInventory.mockResolvedValue({ items: [] });
      api.getCommandCentre.mockResolvedValue(cc({ listings: { total: 0, active: 0, pendingApproval: 0, draft: 0, hidden: 0, reserved: 0, sold: 0 }, myActivity: [{ id: 'e1', action: 'dealer_hide', at: '2026-11-20T10:00:00Z' }] }));
      render(<DealershipWorkspace user={user} onNavigate={() => {}} />);
      expect((await screen.findByTestId('team-my-activity')).textContent).toContain('Paused a listing');
    });
  });
});

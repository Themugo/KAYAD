import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

const api = vi.hoisted(() => ({
  getMyWorkspace: vi.fn(), getInventory: vi.fn(), getLeads: vi.fn(), getCustomers: vi.fn(), updateLead: vi.fn(),
}));
vi.mock('../../services/dealerPlatformApi', () => api);

import DealershipWorkspace from '../../features/DealershipWorkspace/DealershipWorkspace';
import { resetMyDealershipCache } from '../../features/DealershipWorkspace/useMyDealership';

const user = { id: 'u1', role: 'user', name: 'Mary' };
const member = (permissions: string[]) => ({ membership: { dealershipName: 'Prime Motors Ltd', teamRole: 'sales_agent', permissions }, ambiguous: false });

beforeEach(() => { vi.clearAllMocks(); resetMyDealershipCache(); });

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
});

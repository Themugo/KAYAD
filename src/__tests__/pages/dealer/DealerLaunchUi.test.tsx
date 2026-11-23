import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, within, fireEvent } from '@testing-library/react';

const api = vi.hoisted(() => ({
  getDealerDashboard: vi.fn().mockResolvedValue({ success: true, data: { overview: { totalListings: 1, totalViews: 8, leads: { total: 1, new: 1 }, revenue: { total: 0 } } } }),
  getLeads: vi.fn().mockResolvedValue({ success: true, data: { items: [{ id: 'l1', source: 'chat', buyer: { id: 'b1', name: 'Wanjiru K', email: 'wk@example.test' }, vehicle: { title: 'Toyota Prado' }, stage: 'new' }, { id: 'l2', source: 'manual', buyer: { id: 'b2', name: 'Otieno' }, vehicle: { title: 'Mazda' }, stage: 'new' }] } }),
  getLeadMessages: vi.fn().mockResolvedValue({ success: true, messages: [{ id: 'm1', text: 'Is it available?', sender: { id: 'b1', name: 'Wanjiru K' }, createdAt: '2026-11-23T08:00:00Z' }] }),
  sendLeadMessage: vi.fn().mockResolvedValue({ id: 'm2' }),
  getVehicleRequests: vi.fn().mockResolvedValue({ data: { items: [{ id: 'c1', subject: '[Vehicle request] Feature request: 360 camera', status: 'open', createdAt: '2026-11-23T08:00:00Z' }] } }),
  createVehicleRequest: vi.fn().mockResolvedValue({ data: { note: 'KAYARD KE will review this.' } }),
  getCustomers: vi.fn().mockResolvedValue({ success: true, data: { items: [] } }),
  getAuctionInventory: vi.fn().mockResolvedValue({ data: { items: [] } }),
  getInspectionOrders: vi.fn().mockResolvedValue({ data: { items: [] } }),
  getFinanceApplications: vi.fn().mockResolvedValue({ data: { items: [] } }),
  getTeamMembers: vi.fn().mockResolvedValue({ data: [] }), getEmploymentRecords: vi.fn().mockResolvedValue({ data: { events: [] } }), getTeamRoles: vi.fn().mockRejectedValue(new Error('x')),
  getReputation: vi.fn().mockResolvedValue({ data: {} }),
  getMarketingCampaigns: vi.fn().mockResolvedValue({ success: true, data: { items: [] } }),
  getDealerAnalytics: vi.fn().mockResolvedValue({ data: {} }),
  updateLead: vi.fn(), createCampaign: vi.fn(),
}));
vi.mock('../../../context/AuthContext', () => ({ useAuth: () => ({ signOut: vi.fn() }) }));
vi.mock('../../../services/dealerPlatformApi', () => api);
vi.mock('../../../services/vehicleApi', () => ({
  getMyListings: vi.fn().mockResolvedValue([
    { id: 'c-live', title: 'Live Prado', status: 'available', price: 1, images: [] },
    { id: 'c-pend', title: 'Pending Mazda', status: 'pending', price: 1, images: [] },
    { id: 'c-hid', title: 'Hidden Axio', status: 'hidden', price: 1, images: [] },
    { id: 'c-dr', title: 'Draft Note', status: 'draft', price: 1, images: [] },
  ]),
}));
vi.mock('../../../features/escrow/ParticipantEscrowDesk', () => ({ ParticipantEscrowDesk: () => <div>escrow desk</div> }));

import DealerDashboard from '../../../pages/dealer/dashboard/DealerDashboard';

const user = { id: 'd1', name: 'Eric Kamau', businessName: 'ABC Motors', role: 'dealer', status: 'approved', city: 'Nairobi' };
const renderIt = (u: any = user) => render(<DealerDashboard user={u} onOpenAuth={vi.fn()} onNavigate={vi.fn()} />);

describe('Dealer launch UI', () => {
  beforeEach(() => { window.history.replaceState({}, '', '/?nav=dealer-dashboard'); try { window.localStorage.removeItem('kayad.dealer.sidebar'); } catch { /* */ } api.sendLeadMessage.mockClear(); api.createVehicleRequest.mockClear(); });
  afterEach(() => cleanup());

  it('shows the Command Centre heading, verified chip and real business identity', async () => {
    renderIt();
    expect(await screen.findByRole('heading', { level: 2, name: 'Dealer Command Centre' })).toBeTruthy();
    expect(screen.getByTestId('dealer-verified-chip').textContent).toContain('Verified Dealer');
    expect(screen.getByTestId('dealer-identity').textContent).toContain('ABC Motors');
    expect(screen.getByText('Inventory, enquiries, sales and your team — all in one secure workspace.')).toBeTruthy();
  });

  it('does not show the Verified chip for a dealer who is still pending', async () => {
    renderIt({ ...user, status: 'pending' });
    await screen.findByRole('heading', { level: 2, name: 'Dealer Command Centre' });
    expect(screen.queryByTestId('dealer-verified-chip')).toBeNull();
  });

  it('collapses and expands the desktop sidebar, keeping every item reachable and labelled', async () => {
    renderIt();
    const nav = await screen.findByRole('navigation', { name: 'Dealer workspace' });
    const toggle = screen.getByTestId('dealer-sidebar-toggle');
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(within(nav).getAllByRole('button')).toHaveLength(15);
    expect(within(nav).getByRole('button', { name: 'Team & Employment' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeTruthy();
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
  });

  it('the top-bar search opens Inventory filtered by the typed text', async () => {
    renderIt();
    await screen.findByRole('heading', { level: 2, name: 'Dealer Command Centre' });
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search your vehicles' }), { target: { value: 'Prado' } });
    fireEvent.submit(screen.getByRole('search'));
    await waitFor(() => expect(window.location.search).toContain('section=inventory'));
    expect(await screen.findByText('Live Prado')).toBeTruthy();
    expect(screen.queryByText('Pending Mazda')).toBeNull();
  });

  it('every inventory status explains what it means for buyers', async () => {
    window.history.replaceState({}, '', '/?nav=dealer-dashboard&section=inventory');
    renderIt();
    await screen.findByText('Live Prado');
    const hints = screen.getAllByTestId('inventory-status-hint').map((h) => h.textContent);
    expect(hints).toEqual(expect.arrayContaining([
      'Visible to buyers.',
      expect.stringContaining('does not review listings one by one'),
      expect.stringContaining('Republish it when you are ready'),
      expect.stringContaining('Not published yet'),
    ]));
  });

  it('replies to a chat enquiry from Leads with an idempotency key, and offers no reply for non-chat leads', async () => {
    window.history.replaceState({}, '', '/?nav=dealer-dashboard&section=leads');
    renderIt();
    const replyButtons = await screen.findAllByRole('button', { name: /^Reply/ });
    expect(replyButtons).toHaveLength(1);
    expect(screen.getByText('No chat')).toBeTruthy();
    fireEvent.click(replyButtons[0]);
    expect(await screen.findByText('Is it available?')).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText('Write your reply to the buyer'), { target: { value: 'Yes, viewing tomorrow?' } });
    fireEvent.click(screen.getByRole('button', { name: /Send reply/ }));
    await waitFor(() => expect(api.sendLeadMessage).toHaveBeenCalledTimes(1));
    const [leadId, content, key] = api.sendLeadMessage.mock.calls[0];
    expect(leadId).toBe('l1'); expect(content).toBe('Yes, viewing tomorrow?'); expect(String(key).length).toBeGreaterThan(20);
  });

  it('a failed reply keeps the text and says it will not be sent twice', async () => {
    api.sendLeadMessage.mockRejectedValueOnce(new Error('net'));
    window.history.replaceState({}, '', '/?nav=dealer-dashboard&section=leads');
    renderIt();
    fireEvent.click((await screen.findAllByRole('button', { name: /^Reply/ }))[0]);
    const box = await screen.findByPlaceholderText('Write your reply to the buyer');
    fireEvent.change(box, { target: { value: 'Hello there' } });
    fireEvent.click(screen.getByRole('button', { name: /Send reply/ }));
    expect((await screen.findByRole('alert')).textContent).toContain('not be sent twice');
    expect((box as HTMLTextAreaElement).value).toBe('Hello there');
  });

  it('sends a vehicle-specific request and states that a request is not an approval', async () => {
    window.history.replaceState({}, '', '/?nav=dealer-dashboard&section=inventory');
    renderIt();
    await screen.findByText('Live Prado');
    const panel = screen.getByTestId('vehicle-requests') as HTMLDetailsElement;
    panel.open = true; fireEvent(panel, new Event('toggle'));
    const select = await within(panel).findByLabelText('Vehicle');
    fireEvent.change(select, { target: { value: 'c-live' } });
    fireEvent.change(within(panel).getByLabelText('Short title'), { target: { value: '360 camera' } });
    fireEvent.change(within(panel).getByLabelText('What do you need?'), { target: { value: 'Please add the 360 camera feature.' } });
    expect(within(panel).getByText(/A request is not an approval/)).toBeTruthy();
    fireEvent.click(within(panel).getByRole('button', { name: 'Send request' }));
    await waitFor(() => expect(api.createVehicleRequest).toHaveBeenCalledWith({ vehicleId: 'c-live', type: 'feature', title: '360 camera', details: 'Please add the 360 camera feature.' }));
    expect(await within(panel).findByText('Received')).toBeTruthy();
  });
});

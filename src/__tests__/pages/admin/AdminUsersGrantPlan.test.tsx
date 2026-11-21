import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const m = vi.hoisted(() => ({ users: vi.fn(), plans: vi.fn(), assign: vi.fn(), toast: vi.fn() }));
vi.mock('../../../api/api', async (orig) => {
  const real: any = await orig();
  return { ...real, adminAPI: { ...real.adminAPI, users: (...a: any[]) => m.users(...a), dealerOnboardingReadiness: () => Promise.resolve({ ready: true, checks: [] }),
    approveDealer: vi.fn(), toggleBan: vi.fn(), getSubscriptionPlans: () => m.plans(), assignPackage: (...a: any[]) => m.assign(...a) } };
});
vi.mock('../../../context/ToastContext', () => ({ useToast: () => ({ toast: m.toast }) }));
vi.mock('../../../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 's1', role: 'superadmin' } }) }));
import AdminUsers from '../../../pages/admin/AdminUsers';

const row = (o: any) => ({ id: o._id, ...o, approved: true, status: 'approved' });
const list = { success: true, users: [row({ _id: 'd1', name: 'Eric Kamau', email: 'e@x.co', role: 'dealer' }), row({ _id: 'b1', name: 'Buyer', email: 'b@x.co', role: 'user' }), { _id: 'p1', id: 'p1', name: 'Pending', email: 'p@x.co', role: 'dealer', status: 'pending', approved: false }], pagination: { total: 3, page: 1, pages: 1 }, summary: {} };
const plans = { plans: [{ id: 'starter', name: 'Starter', listingMax: 10, durationDays: 30 }, { id: 'pro', name: 'Pro', listingMax: 50, durationDays: 90 }] };
beforeEach(() => { vi.clearAllMocks(); m.users.mockResolvedValue(list); m.plans.mockResolvedValue(plans); m.assign.mockResolvedValue({ success: true }); });

const open = async (user: any) => {
  render(<MemoryRouter><AdminUsers /></MemoryRouter>);
  const r = (await screen.findByText('Eric Kamau')).closest('tr') as HTMLElement;
  await user.click(within(r).getByRole('button', { name: 'Plan' }));
  return screen.findByRole('dialog');
};

describe('Admin: grant a listing plan to an approved dealer', () => {
  it('only approved dealers get a Plan action', async () => {
    render(<MemoryRouter><AdminUsers /></MemoryRouter>);
    await screen.findByText('Eric Kamau');
    expect(screen.getAllByRole('button', { name: 'Plan' })).toHaveLength(1);
  });
  it('grants the chosen plan and duration through the admin package endpoint', async () => {
    const user = userEvent.setup();
    const d = await open(user);
    await user.selectOptions(await within(d).findByLabelText('Plan'), 'pro');
    expect(within(d).getByLabelText(/Duration/)).toHaveValue('90');
    await user.click(within(d).getByRole('button', { name: 'Grant plan' }));
    await waitFor(() => expect(m.assign).toHaveBeenCalledWith('d1', { dealerPackage: 'pro', durationDays: 90 }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(m.toast).toHaveBeenCalledWith(expect.stringMatching(/can now list/i), 'success');
  });
  it('shows a refusal inline, keeps the dialog open and never claims success', async () => {
    const user = userEvent.setup();
    m.assign.mockRejectedValue({ response: { status: 403, data: { message: 'Insufficient permissions' } } });
    const d = await open(user);
    await user.click(await within(d).findByRole('button', { name: 'Grant plan' }));
    expect(await within(d).findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(m.toast).not.toHaveBeenCalled();
  });
  it('can remove a plan, and rejects an invalid duration', async () => {
    const user = userEvent.setup();
    const d = await open(user);
    await user.clear(await within(d).findByLabelText(/Duration/));
    expect(within(d).getByRole('button', { name: 'Grant plan' })).toBeDisabled();
    await user.click(within(d).getByRole('button', { name: 'Remove plan' }));
    await waitFor(() => expect(m.assign).toHaveBeenCalledWith('d1', { dealerPackage: 'none' }));
  });
  it('reports a plan catalogue that cannot be loaded', async () => {
    const user = userEvent.setup();
    m.plans.mockRejectedValue(new Error('x'));
    const d = await open(user);
    expect(await within(d).findByRole('alert')).toHaveTextContent(/could not load the plan catalogue/i);
  });
});

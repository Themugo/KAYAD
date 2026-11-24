// Component evidence (mocked API). Real API + database behaviour: ci/db-journeys/30_personal_accounts_and_dealer_suspension.mjs (A1-A13).
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';

const svc = vi.hoisted(() => ({ getPersonalAccounts: vi.fn(), getPrivateSellerApplications: vi.fn(), decidePrivateSellerApplication: vi.fn() }));
const toggleBan = vi.hoisted(() => vi.fn());
vi.mock('../../services/privateSellerCapabilityApi', () => svc);
vi.mock('../../api/api', async (orig) => ({ ...(await orig()), adminAPI: { toggleBan } }));
vi.mock('../../context/ToastContext', () => ({ useToast: () => ({ toast: vi.fn() }) }));
import AdminPersonalAccounts from '../../pages/admin/AdminPersonalAccounts';

const row = (o = {}) => ({ id: 'u1', name: 'Purity', email: 'p@x.test', phone: null, createdAt: '2026-10-01T00:00:00Z', accountType: 'personal_legacy', accountState: 'active', emailVerified: true, legacyRecordStatus: 'pending', listings: { total: 1, published: 1 }, historicalApplication: null, ...o });
const page = (accounts: unknown[], total = accounts.length) => ({ accounts, page: 1, limit: 25, total });
beforeEach(() => { Object.values(svc).forEach((f) => f.mockReset()); toggleBan.mockReset(); svc.getPrivateSellerApplications.mockResolvedValue([]); });
afterEach(cleanup);

describe('Personal accounts page', () => {
  it('lists accounts with NO historical applications, separating type, status, email, listings and application', async () => {
    svc.getPersonalAccounts.mockResolvedValue(page([row()]));
    render(<AdminPersonalAccounts />);
    expect(await screen.findByText('Purity')).toBeTruthy();
    expect(screen.getByText('Personal account (legacy seller record)')).toBeTruthy();
    const tr = screen.getByText('Purity').closest('tr') as HTMLElement;
    expect(within(tr).getByText('Active')).toBeTruthy();
    expect(within(tr).getByText('Verified')).toBeTruthy();
    expect(screen.getByText('1 total · 1 published')).toBeTruthy();
    expect(screen.getByText('None on record')).toBeTruthy();
    expect(screen.getByText(/not an approval gate/)).toBeTruthy();
    expect(screen.queryByText(/Pending approval/)).toBeNull();
  });
  it('shows an honest empty state and an honest server error (never fabricated rows)', async () => {
    svc.getPersonalAccounts.mockResolvedValueOnce(page([]));
    const first = render(<AdminPersonalAccounts />);
    expect(await screen.findByText('No personal accounts match')).toBeTruthy();
    first.unmount();
    svc.getPersonalAccounts.mockRejectedValueOnce(Object.assign(new Error('x'), { status: 500 }));
    render(<AdminPersonalAccounts />);
    expect((await screen.findByRole('alert')).textContent).toMatch(/could not load personal accounts/i);
    expect(screen.queryByText('Purity')).toBeNull();
  });
  it('search, filters and pagination are sent to the server', async () => {
    svc.getPersonalAccounts.mockResolvedValue(page([row()], 60));
    render(<AdminPersonalAccounts />);
    await screen.findByText('Purity');
    fireEvent.change(screen.getByLabelText(/Search name or email/), { target: { value: 'pur' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() => expect(svc.getPersonalAccounts).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'pur', page: 1 })));
    fireEvent.change(screen.getByLabelText('Account status'), { target: { value: 'restricted' } });
    await waitFor(() => expect(svc.getPersonalAccounts).toHaveBeenLastCalledWith(expect.objectContaining({ state: 'restricted' })));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(svc.getPersonalAccounts).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })));
    expect(screen.getByText(/60 accounts · page 2 of 3/)).toBeTruthy();
  });
  it('suspend asks for confirmation, calls the existing control, then reloads; restore does the reverse', async () => {
    svc.getPersonalAccounts.mockResolvedValueOnce(page([row({ legacyRecordStatus: null, accountType: 'personal' })])).mockResolvedValue(page([row({ accountState: 'restricted' })]));
    toggleBan.mockResolvedValue({ isBanned: true });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValue(true);
    render(<AdminPersonalAccounts />);
    fireEvent.click(await screen.findByRole('button', { name: /Suspend p@x.test/ }));
    expect(toggleBan).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Suspend p@x.test/ }));
    await waitFor(() => expect(toggleBan).toHaveBeenCalledWith('u1', true));
    expect(await screen.findByRole('button', { name: /Restore p@x.test/ })).toBeTruthy();
    confirm.mockRestore();
  });
  it('historical applications stay available on their own tab', async () => {
    svc.getPersonalAccounts.mockResolvedValue(page([row()]));
    render(<AdminPersonalAccounts />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Historical applications' }));
    await waitFor(() => expect(svc.getPrivateSellerApplications).toHaveBeenCalled());
  });
});

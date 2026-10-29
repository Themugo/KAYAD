import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const api = vi.hoisted(() => ({ users: vi.fn(), toggleBan: vi.fn(), approveDealer: vi.fn(), cars: vi.fn(), deleteCar: vi.fn() }));
vi.mock('../../../api/api', async (orig) => ({ ...(await orig()), adminAPI: api }));
vi.mock('../../../context/ToastContext', () => ({ useToast: () => ({ toast: vi.fn() }) }));

import AdminUsers from '../../../pages/admin/AdminUsers';
import AdminCars from '../../../pages/admin/AdminCars';

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});
afterEach(() => cleanup());

describe('admin tables render every declared column and keep their actions reachable', () => {
  test('Users: eight cells per row, with Approve for pending dealers and Ban for everyone', async () => {
    api.users.mockResolvedValue({ users: [
      { _id: 'd1', name: 'Dealer One', email: 'd1@x.test', role: 'dealer', approved: false, createdAt: '2026-10-01T00:00:00Z' },
      { _id: 'u1', name: 'Buyer One', email: 'b1@x.test', role: 'user', approved: true, isBanned: true },
    ], total: 2 });
    api.toggleBan.mockResolvedValue({ isBanned: false });
    api.approveDealer.mockResolvedValue({});
    render(<AdminUsers />);
    const dealerRow = (await screen.findByText('Dealer One')).closest('tr');
    expect(dealerRow.querySelectorAll('td')).toHaveLength(8);
    expect(within(dealerRow).getByText('pending')).toBeTruthy();
    fireEvent.click(within(dealerRow).getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(api.approveDealer).toHaveBeenCalledWith('d1'));
    const buyerRow = screen.getByText('Buyer One').closest('tr');
    expect(within(buyerRow).getByText('banned')).toBeTruthy();
    fireEvent.click(within(buyerRow).getByRole('button', { name: 'Unban' }));
    await waitFor(() => expect(api.toggleBan).toHaveBeenCalledWith('u1', false)); // Phase 15: explicit target state, idempotent on the server
    await waitFor(() => expect(within(screen.getByText('Buyer One').closest('tr')).queryByText('banned')).toBeNull()); // UI adopts the server-confirmed state
  });

  test('Users: renders authoritative global summary and distinguishes unavailable counts from zero', async () => {
    api.users.mockResolvedValue({
      users: [{ _id: 'u2', name: 'Sample User', email: 'sample@x.test', role: 'user', status: 'approved' }],
      pagination: { total: 1, page: 1, limit: 20, pages: 1 },
      summary: { totalUsers: 83, admins: 3, dealers: 21, banned: 2, pendingApproval: 4 },
    });
    render(<AdminUsers />);
    expect(await screen.findByText('Sample User')).toBeTruthy();
    expect(screen.getByText('83')).toBeTruthy();
    expect(screen.getByText('21')).toBeTruthy();
    expect(screen.getByText('4')).toBeTruthy();
  });

  test('Users: failed request is not presented as an empty user list or zero counts and can be retried', async () => {
    api.users.mockRejectedValueOnce(new Error('Service unavailable'))
      .mockResolvedValueOnce({ users: [], pagination: { total: 0 }, summary: { totalUsers: 0, admins: 0, dealers: 0, banned: 0, pendingApproval: 0 } });
    render(<AdminUsers />);
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByText('Service unavailable')).toBeTruthy();
    expect(screen.queryByText('No user records returned')).toBeNull();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('No user records returned')).toBeTruthy();
  });

  test('Listings: seven cells per row, a missing price is Unavailable, Delete passes the listing', async () => {
    api.cars.mockResolvedValue({ cars: [{ _id: 'c1', title: '2019 Prado', status: 'live', year: 2019 }], total: 1 });
    api.deleteCar.mockResolvedValue({});
    render(<MemoryRouter><AdminCars /></MemoryRouter>);
    const row = (await screen.findByText('2019 Prado')).closest('tr');
    expect(row.querySelectorAll('td')).toHaveLength(7);
    expect(within(row).getByText('Unavailable')).toBeTruthy();
    fireEvent.click(within(row).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(api.deleteCar).toHaveBeenCalledWith('c1'));
  });
});

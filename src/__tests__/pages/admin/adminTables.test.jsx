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
    api.toggleBan.mockResolvedValue({});
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
    await waitFor(() => expect(api.toggleBan).toHaveBeenCalledWith('u1'));
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

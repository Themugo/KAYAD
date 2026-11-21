// Targeted regressions found while remediating the Super Admin data failures.
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';

const m = vi.hoisted(() => ({
  adminAPI: { users: vi.fn(), toggleBan: vi.fn(), approveDealer: vi.fn(), updateSellerSettings: vi.fn(), getEscrowConfig: vi.fn(), updateEscrowConfig: vi.fn(), addEscrowAccount: vi.fn(), deleteEscrowAccount: vi.fn() },
  toast: { toast: vi.fn() },
}));
vi.mock('../../../api/api', async (orig) => ({ ...(await orig()), adminAPI: m.adminAPI }));
vi.mock('../../../context/ToastContext', () => ({ useToast: () => m.toast }));
vi.mock('../../../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 's1', role: 'superadmin', name: 'Super' } }) }));

import AdminEscrowCustody from '../../../pages/admin/AdminEscrowCustody';
import AdminSellers from '../../../pages/admin/AdminSellers';

const MAINT = () => Object.assign(new Error('503'), { response: { status: 503, data: { code: 'SYSTEM_MAINTENANCE', maintenance: true } } });
beforeEach(() => vi.clearAllMocks());
afterEach(() => cleanup());

describe('Escrow custody configuration', () => {
  test('a failed load never presents default rules as the live configuration and offers no way to save them', async () => {
    m.adminAPI.getEscrowConfig.mockRejectedValue(MAINT());
    render(<AdminEscrowCustody />);
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/maintenance is active/i));
    expect(screen.queryByRole('button', { name: /Save Escrow Rules/i })).toBeNull();
    expect(screen.queryByText(/No active escrow custody account configured/i)).toBeNull();
    expect(screen.queryByLabelText(/Enable private-seller vehicle escrow/i)).toBeNull();
    expect(m.adminAPI.updateEscrowConfig).not.toHaveBeenCalled();
  });
  test('a malformed success payload is a failure, not an empty configuration', async () => {
    m.adminAPI.getEscrowConfig.mockResolvedValue({});
    render(<AdminEscrowCustody />);
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/unexpected format/i));
    expect(screen.queryByRole('button', { name: /Save Escrow Rules/i })).toBeNull();
  });
  test('after a good load, a failed refresh keeps the form but disables every write until it is refreshed', async () => {
    m.adminAPI.getEscrowConfig.mockResolvedValueOnce({ rules: { enabled: true, minimumAmount: 100 }, accounts: [{ id: 'a1', accountName: 'Kayad Custody', bankName: 'Bank', accountNumber: '123' }] });
    render(<AdminEscrowCustody />);
    expect(await screen.findByText('Kayad Custody')).toBeTruthy();
    m.adminAPI.getEscrowConfig.mockRejectedValue(MAINT());
    fireEvent.click(await screen.findByRole('button', { name: /Save Escrow Rules/i })); // saving triggers a reload after success
    m.adminAPI.updateEscrowConfig.mockResolvedValue({});
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/stale/i));
    expect(screen.getByRole('button', { name: /Save Escrow Rules/i }).disabled).toBe(true);
    expect(screen.getByRole('button', { name: /Add Custody Account/i }).disabled).toBe(true);
  });
});

describe('Seller Management', () => {
  const dealers = (n) => ({ users: Array.from({ length: n }, (_, i) => ({ _id: `d${i}`, name: `Dealer ${i}`, businessName: `Dealer ${i} Motors`, email: `d${i}@x.test`, status: 'pending' })), pagination: { total: 45 } });
  test('the Pending tab is answered by the server (status=pending), not by filtering one page client-side', async () => {
    m.adminAPI.users.mockResolvedValue(dealers(2));
    render(<AdminSellers />);
    await screen.findByText('Dealer 0 Motors');
    fireEvent.click(screen.getByRole('button', { name: 'Pending' }));
    await waitFor(() => expect(m.adminAPI.users).toHaveBeenLastCalledWith(expect.objectContaining({ role: 'dealer', status: 'pending', page: 1 })));
  });
  test('shows the server total (45), not the page length, and pages forward', async () => {
    m.adminAPI.users.mockResolvedValue(dealers(20));
    render(<AdminSellers />);
    await screen.findByText('Dealer 0 Motors');
    expect(screen.getAllByText('45').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: /Next/ }));
    await waitFor(() => expect(m.adminAPI.users).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })));
  });
  test('a malformed success payload is a failure, never an empty seller list', async () => {
    m.adminAPI.users.mockResolvedValue({ unexpected: true });
    render(<AdminSellers />);
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/unexpected format/i));
    expect(screen.queryByText(/No sellers found/i)).toBeNull();
  });
  test('sales/listing figures the API does not return are "Not reported", never KES 0', async () => {
    m.adminAPI.users.mockResolvedValue({ users: [{ _id: 'd1', name: 'Dealer One', businessName: 'Dealer One Motors', email: 'd@x.test', status: 'approved' }], pagination: { total: 1 } });
    render(<AdminSellers />);
    await screen.findByText('Dealer One Motors');
    expect(screen.getAllByText('Not reported').length).toBeGreaterThan(0);
    expect(document.body.textContent).not.toMatch(/KES\s*0\b/);
  });
  test('a failed page change does not show the previous page under the new page number', async () => {
    m.adminAPI.users.mockResolvedValueOnce(dealers(20));
    render(<AdminSellers />);
    await screen.findByText('Dealer 0 Motors');
    m.adminAPI.users.mockRejectedValue(MAINT());
    fireEvent.click(screen.getByRole('button', { name: /Next/ }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/maintenance is active/i));
    expect(screen.queryByText('Dealer 0 Motors')).toBeNull();
  });
});

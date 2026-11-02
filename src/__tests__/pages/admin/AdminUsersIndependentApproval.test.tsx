import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const A = '00000000-0000-4000-8000-000000000101';
const B = '00000000-0000-4000-8000-000000000102';
const m = vi.hoisted(() => ({ users: vi.fn(), approveDealer: vi.fn(), toggleBan: vi.fn(), toast: vi.fn() }));
vi.mock('../../../api/api', async (orig) => {
  const real: any = await orig();
  // Use the REAL list normaliser, so the page sees what the real client delivers.
  return { ...real, adminAPI: { ...real.adminAPI, users: (...a: any[]) => m.users(...a).then(real.withRowIds), approveDealer: (...a: any[]) => m.approveDealer(...a), toggleBan: (...a: any[]) => m.toggleBan(...a) } };
});
vi.mock('../../../context/ToastContext', () => ({ useToast: () => ({ toast: m.toast }) }));
vi.mock('../../../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 's1', role: 'superadmin', name: 'Super' } }) }));

import AdminUsers from '../../../pages/admin/AdminUsers';

// The REAL server shape: rows carry `id` only (what a lean database row has) - the page must still give every row its own identity.
const row = (id: string, name: string, extra: any = {}) => ({ id, name, email: `${name}@x.co`, role: 'dealer', status: 'pending', approved: false, businessName: `${name} Motors`, ...extra });
const listFor = (rows: any[]) => ({ success: true, users: rows, pagination: { total: rows.length, page: 1, pages: 1 }, summary: { pendingApproval: rows.filter((r) => r.status === 'pending').length } });

beforeEach(() => {
  m.users.mockReset(); m.approveDealer.mockReset(); m.toast.mockReset();
  vi.spyOn(window, 'prompt').mockReturnValue('Documents verified against registry');
});

const open = async () => {
  render(<MemoryRouter><AdminUsers /></MemoryRouter>);
  await screen.findByText('Alpha');
};
const rowOf = (name: string) => screen.getByText(name).closest('tr') as HTMLElement;

describe('Users approval queue: one account per action', () => {
  it('clicking Approve on the second row sends exactly that account id and changes only that row', async () => {
    m.users.mockResolvedValueOnce(listFor([row(A, 'Alpha'), row(B, 'Beta')]));
    m.approveDealer.mockResolvedValue({ success: true, changed: true });
    // after the action the server is re-read: A still pending, B approved
    m.users.mockResolvedValueOnce(listFor([row(A, 'Alpha'), row(B, 'Beta', { status: 'approved', approved: true })]));
    await open();
    expect(within(rowOf('Alpha')).getByRole('button', { name: 'Approve' })).toBeInTheDocument();
    await userEvent.click(within(rowOf('Beta')).getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(m.approveDealer).toHaveBeenCalledTimes(1));
    expect(m.approveDealer).toHaveBeenCalledWith(B, { reason: 'Documents verified against registry' });
    await waitFor(() => expect(within(rowOf('Beta')).queryByRole('button', { name: 'Approve' })).toBeNull());
    expect(within(rowOf('Alpha')).getByRole('button', { name: 'Approve' })).toBeInTheDocument(); // A is still pending
    expect(m.users).toHaveBeenCalledTimes(2); // list was reconciled from the server
  });
  it('approving the first row then the second approves each separately', async () => {
    m.users.mockResolvedValueOnce(listFor([row(A, 'Alpha'), row(B, 'Beta')]));
    m.approveDealer.mockResolvedValue({ success: true, changed: true });
    m.users.mockResolvedValueOnce(listFor([row(A, 'Alpha', { status: 'approved', approved: true }), row(B, 'Beta')]));
    m.users.mockResolvedValueOnce(listFor([row(A, 'Alpha', { status: 'approved', approved: true }), row(B, 'Beta', { status: 'approved', approved: true })]));
    await open();
    await userEvent.click(within(rowOf('Alpha')).getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(within(rowOf('Alpha')).queryByRole('button', { name: 'Approve' })).toBeNull());
    expect(within(rowOf('Beta')).getByRole('button', { name: 'Approve' })).toBeInTheDocument();
    await userEvent.click(within(rowOf('Beta')).getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(m.approveDealer).toHaveBeenCalledTimes(2));
    expect(m.approveDealer.mock.calls.map((c) => c[0])).toEqual([A, B]);
  });
  it('a failed approval shows an error and leaves BOTH accounts pending (no success toast)', async () => {
    m.users.mockResolvedValue(listFor([row(A, 'Alpha'), row(B, 'Beta')]));
    m.approveDealer.mockRejectedValue({ response: { status: 409, data: { code: 'DEALER_APPLICATION_INCOMPLETE', message: 'Required paperwork is missing: Government ID.' } } });
    await open();
    await userEvent.click(within(rowOf('Alpha')).getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(m.toast).toHaveBeenCalledWith(expect.stringContaining('Required paperwork'), 'error'));
    expect(m.toast).not.toHaveBeenCalledWith(expect.anything(), 'success');
    expect(within(rowOf('Alpha')).getByRole('button', { name: 'Approve' })).toBeInTheDocument();
    expect(within(rowOf('Beta')).getByRole('button', { name: 'Approve' })).toBeInTheDocument();
  });
  it('rows delivered with only `id` still get distinct identities (the old bug made every row share undefined)', async () => {
    m.users.mockResolvedValueOnce(listFor([row(A, 'Alpha'), row(B, 'Beta')]));
    m.approveDealer.mockResolvedValue({ success: true, changed: true });
    m.users.mockResolvedValueOnce(listFor([row(A, 'Alpha'), row(B, 'Beta')])); // reconcile read still says pending: UI must follow the server
    await open();
    await userEvent.click(within(rowOf('Alpha')).getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(m.approveDealer).toHaveBeenCalledWith(A, expect.anything()));
    expect(m.approveDealer).not.toHaveBeenCalledWith(undefined, expect.anything());
  });
  it('cancelling the reason prompt sends nothing', async () => {
    (window.prompt as any).mockReturnValue('');
    m.users.mockResolvedValue(listFor([row(A, 'Alpha'), row(B, 'Beta')]));
    await open();
    await userEvent.click(within(rowOf('Beta')).getByRole('button', { name: 'Approve' }));
    expect(m.approveDealer).not.toHaveBeenCalled();
  });
});

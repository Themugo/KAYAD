// Seller Management: dealer approval (scenarios 4, 5, 7, 11, 12). The server is the authority; the screen only asks for a reason,
// sends it, and shows exactly what came back. The list is re-read after the answer and is the only source of the row's new state.
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';

const m = vi.hoisted(() => ({
  adminAPI: { users: vi.fn(), toggleBan: vi.fn(), approveDealer: vi.fn(), updateSellerSettings: vi.fn() },
  toast: { toast: vi.fn() },
}));
vi.mock('../../../api/api', async (orig) => ({ ...(await orig()), adminAPI: m.adminAPI }));
vi.mock('../../../context/ToastContext', () => ({ useToast: () => m.toast }));
vi.mock('../../../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 's1', role: 'superadmin', name: 'Super' } }) }));

import AdminSellers from '../../../pages/admin/AdminSellers';

const row = (over = {}) => ({ _id: 'd1', role: 'dealer', name: 'Pending Person', businessName: 'Pending Motors', email: 'p@x.test', status: 'pending', approved: false, application: { blockers: [], warnings: [] }, ...over });
const list = (...users) => ({ users, pagination: { total: users.length } });
const REASON = 'Documents verified against registry';

beforeEach(() => vi.clearAllMocks());
afterEach(() => cleanup());

const openApprove = async (name = 'Pending Motors') => {
  await screen.findByText(name);
  fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
  return screen.findByRole('dialog', { name: /confirm dealer approval/i });
};

describe('pending dealer in Seller Management', () => {
  test('a pending dealer is listed with an Approve action (scenario 4)', async () => {
    m.adminAPI.users.mockResolvedValue(list(row()));
    render(<AdminSellers />);
    expect(await screen.findByText('Pending Motors')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Approve' }).disabled).toBe(false);
  });

  test('Approve does not fire on click: it asks for a reason first and sends nothing until one is given', async () => {
    m.adminAPI.users.mockResolvedValue(list(row()));
    render(<AdminSellers />);
    const dialog = await openApprove();
    expect(m.adminAPI.approveDealer).not.toHaveBeenCalled();
    expect(within(dialog).getByRole('button', { name: /confirm approval/i }).disabled).toBe(true);
    fireEvent.change(within(dialog).getByLabelText(/reason/i), { target: { value: 'short' } });
    expect(within(dialog).getByRole('button', { name: /confirm approval/i }).disabled).toBe(true);
  });

  test('approval sends the operator\'s reason, then the row changes only after the list is re-read from the server (scenarios 5, 7)', async () => {
    m.adminAPI.users.mockResolvedValueOnce(list(row())).mockResolvedValue(list(row({ status: 'approved', approved: true })));
    m.adminAPI.approveDealer.mockResolvedValue({ success: true, changed: true });
    render(<AdminSellers />);
    const dialog = await openApprove();
    fireEvent.change(within(dialog).getByLabelText(/reason/i), { target: { value: REASON } });
    fireEvent.click(within(dialog).getByRole('button', { name: /confirm approval/i }));
    await waitFor(() => expect(m.adminAPI.approveDealer).toHaveBeenCalledWith('d1', { reason: REASON }));
    await waitFor(() => expect(m.adminAPI.users).toHaveBeenCalledTimes(2)); // re-read, not assumed
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /confirm dealer approval/i })).toBeNull());
    expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Suspend' })).toBeTruthy();
  });

  test('a refusal shows the server\'s own message and code, keeps the row pending, and the dialog stays open (scenario 11)', async () => {
    m.adminAPI.users.mockResolvedValue(list(row()));
    m.adminAPI.approveDealer.mockRejectedValue({ response: { status: 403, data: { code: 'ADMIN_ACCOUNT_REQUIRED', message: 'Your login is not an active administrator account in the database.' } } });
    render(<AdminSellers />);
    const dialog = await openApprove();
    fireEvent.change(within(dialog).getByLabelText(/reason/i), { target: { value: REASON } });
    fireEvent.click(within(dialog).getByRole('button', { name: /confirm approval/i }));
    const alert = await within(dialog).findByRole('alert');
    expect(alert.textContent).toContain('Your login is not an active administrator account in the database.');
    expect(alert.textContent).toContain('ADMIN_ACCOUNT_REQUIRED');
    expect(m.toast.toast).not.toHaveBeenCalledWith(expect.stringMatching(/approved/i), 'success');
    await waitFor(() => expect(screen.getByText('pending')).toBeTruthy());
    expect(screen.getByRole('button', { name: 'Approve' })).toBeTruthy();
  });

  test('"already approved" is reported as such, not as a new approval (scenario 12)', async () => {
    m.adminAPI.users.mockResolvedValue(list(row()));
    m.adminAPI.approveDealer.mockResolvedValue({ success: true, changed: false, alreadyApproved: true });
    render(<AdminSellers />);
    const dialog = await openApprove();
    fireEvent.change(within(dialog).getByLabelText(/reason/i), { target: { value: REASON } });
    fireEvent.click(within(dialog).getByRole('button', { name: /confirm approval/i }));
    await waitFor(() => expect(m.toast.toast).toHaveBeenCalledWith(expect.stringMatching(/already approved/i), 'success'));
  });

  test('double-clicking Confirm sends one request', async () => {
    m.adminAPI.users.mockResolvedValue(list(row()));
    let release; m.adminAPI.approveDealer.mockReturnValue(new Promise((r) => { release = r; }));
    render(<AdminSellers />);
    const dialog = await openApprove();
    fireEvent.change(within(dialog).getByLabelText(/reason/i), { target: { value: REASON } });
    const confirm = within(dialog).getByRole('button', { name: /confirm approval/i });
    fireEvent.click(confirm); fireEvent.click(confirm);
    expect(m.adminAPI.approveDealer).toHaveBeenCalledTimes(1);
    release({ success: true, changed: true });
  });
});

describe('an application the server says is incomplete', () => {
  test('Approve is withheld and the missing items are shown', async () => {
    m.adminAPI.users.mockResolvedValue(list(row({ application: { blockers: [{ code: 'DEALER_VERIFICATION_NOT_SUBMITTED', message: 'The dealer has not submitted verification documents.' }], warnings: [] } })));
    render(<AdminSellers />);
    await screen.findByText('Pending Motors');
    expect(screen.getByRole('button', { name: 'Approve' }).disabled).toBe(true);
    expect(screen.getByRole('note').textContent).toMatch(/has not submitted verification documents/);
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    expect(screen.queryByRole('dialog', { name: /confirm dealer approval/i })).toBeNull();
    expect(m.adminAPI.approveDealer).not.toHaveBeenCalled();
  });
  test('when completeness could not be checked, the screen says so and still lets the server decide', async () => {
    m.adminAPI.users.mockResolvedValue(list(row({ application: null })));
    render(<AdminSellers />);
    await screen.findByText('Pending Motors');
    expect(screen.getByRole('note').textContent).toMatch(/could not be checked/i);
    expect(screen.getByRole('button', { name: 'Approve' }).disabled).toBe(false);
  });
});

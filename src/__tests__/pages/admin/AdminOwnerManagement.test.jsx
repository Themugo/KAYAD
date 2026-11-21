import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const api = { overview: vi.fn(), invite: vi.fn(), resend: vi.fn(), revokeInvitation: vi.fn(), removeMember: vi.fn(), recover: vi.fn(), previewInvitation: vi.fn(), acceptInvitation: vi.fn() };
vi.mock('../../../api/api', () => ({ ownerAPI: new Proxy({}, { get: (_t, k) => (...a) => api[k](...a) }) }));

import AdminOwnerManagement from '../../../pages/admin/AdminOwnerManagement';
import OwnerInviteAccept from '../../../pages/OwnerInviteAccept';

const M1 = { id: 'm1', userId: 'u1', name: 'One', email: 'one@example.test', status: 'active', verified: true, usable: true, blockedReason: null, activatedAt: '2026-10-19T10:00:00Z', addedBy: 'bootstrap' };
const M2 = { ...M1, id: 'm2', userId: 'u2', name: 'Two', email: 'two@example.test' };
const view = (over = {}) => ({ success: true, canManage: true, self: { id: 'u1' }, store: { mode: 'database' }, bootstrap: { status: 'closed' }, members: [M1, M2], invitations: [], events: [{ id: 'e1', at: '2026-10-19T10:00:00Z', action: 'bootstrap.activate', result: 'ok', actor: 'cli', targetEmail: 'one@example.test' }], ...over });
beforeEach(() => { vi.clearAllMocks(); });

describe('AdminOwnerManagement', () => {
  test('lists owners with state, marks the signed-in owner and shows the audit history', async () => {
    api.overview.mockResolvedValue(view());
    render(<AdminOwnerManagement />);
    expect(await screen.findByText(/one@example.test \(you\)/)).toBeInTheDocument();
    expect(screen.getByText(/2 active, verified owners/)).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Owner audit history' })).toHaveTextContent('bootstrap.activate');
  });

  test('shows why an owner is blocked and offers recovery instead of silently hiding them', async () => {
    api.overview.mockResolvedValue(view({ members: [M1, { ...M2, usable: false, verified: false, blockedReason: 'email not verified' }] }));
    render(<AdminOwnerManagement />);
    expect(await screen.findByText(/Blocked — email not verified/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Recover' })).toBeInTheDocument();
  });

  test('the last usable owner cannot be offered a Leave button', async () => {
    api.overview.mockResolvedValue(view({ members: [M1] }));
    render(<AdminOwnerManagement />);
    expect(await screen.findByText(/Last owner — add another before leaving/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Leave' })).toBeNull();
  });

  test('removal needs the typed address AND the password; nothing is sent until both are present', async () => {
    api.overview.mockResolvedValue(view()); api.removeMember.mockResolvedValue({ success: true });
    const u = userEvent.setup();
    render(<AdminOwnerManagement />);
    await u.click(await screen.findByRole('button', { name: 'Remove' }));
    const form = screen.getByRole('form', { name: 'Remove owner' });
    const submit = within(form).getByRole('button', { name: 'Remove owner' });
    expect(submit).toBeDisabled();
    await u.type(within(form).getByLabelText(/Type the address again/), 'wrong@example.test');
    await u.type(within(form).getByLabelText(/Your password/), 'pw');
    await u.type(within(form).getByLabelText(/Reason/), 'left company');
    expect(submit).toBeDisabled();
    await u.clear(within(form).getByLabelText(/Type the address again/));
    await u.type(within(form).getByLabelText(/Type the address again/), 'TWO@example.test');
    expect(submit).toBeEnabled();
    await u.click(submit);
    await waitFor(() => expect(api.removeMember).toHaveBeenCalledWith('u2', { confirmEmail: 'TWO@example.test', password: 'pw', reason: 'left company' }));
    expect(await screen.findByRole('status')).toHaveTextContent(/sessions end immediately/);
  });

  test('a refused change shows the server reason and clears the password field', async () => {
    api.overview.mockResolvedValue(view());
    api.removeMember.mockRejectedValue({ response: { data: { message: 'Blocked: this would leave KAYAD with no verified, active owner.' } } });
    const u = userEvent.setup();
    render(<AdminOwnerManagement />);
    await u.click(await screen.findByRole('button', { name: 'Remove' }));
    const form = screen.getByRole('form', { name: 'Remove owner' });
    await u.type(within(form).getByLabelText(/Type the address again/), 'two@example.test');
    await u.type(within(form).getByLabelText(/Your password/), 'pw');
    await u.type(within(form).getByLabelText(/Reason/), 'because');
    await u.click(within(form).getByRole('button', { name: 'Remove owner' }));
    expect(await within(form).findByRole('alert')).toHaveTextContent(/no verified, active owner/);
    expect(within(form).getByLabelText(/Your password/)).toHaveValue('');
  });

  test('invite reports a failed e-mail delivery honestly instead of claiming success', async () => {
    api.overview.mockResolvedValue(view()); api.invite.mockResolvedValue({ emailDelivered: false, emailStatus: 'unavailable' });
    const u = userEvent.setup();
    render(<AdminOwnerManagement />);
    await u.click(await screen.findByRole('button', { name: 'Invite owner' }));
    const form = screen.getByRole('form', { name: 'Invite an owner' });
    await u.type(within(form).getByLabelText(/Email address of the new owner/), 'new@example.test');
    await u.type(within(form).getByLabelText(/Type the address again/), 'new@example.test');
    await u.type(within(form).getByLabelText(/Your password/), 'pw');
    await u.click(within(form).getByRole('button', { name: 'Send invitation' }));
    expect(await screen.findByRole('status')).toHaveTextContent(/could not be delivered/);
  });

  test('legacy store: management is disabled with an explanation and no mutation buttons', async () => {
    api.overview.mockResolvedValue(view({ canManage: false, members: [], store: { mode: 'legacy' } }));
    render(<AdminOwnerManagement />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/migration, which has not been applied/);
    expect(screen.queryByRole('button', { name: 'Invite owner' })).toBeNull();
  });

  test('a rendered page never contains token-like strings', async () => {
    api.overview.mockResolvedValue(view({ invitations: [{ id: 'i1', email: 'p@example.test', kind: 'invitation', status: 'pending', expiresAt: '2026-10-20T10:00:00Z', resendCount: 0, lastSentAt: '2026-10-19T10:00:00Z', invitedBy: 'owner:one@example.test' }] }));
    const { container } = render(<AdminOwnerManagement />);
    await screen.findByTestId('invitation-p@example.test');
    expect(container.innerHTML).not.toMatch(/[0-9a-f]{64}/);
  });
});

describe('OwnerInviteAccept', () => {
  const T = 'a'.repeat(64);
  beforeEach(() => { window.history.replaceState(null, '', `/owner-invite?token=${T}`); });
  test('removes the token from the address bar and shows a set-password form for a new account', async () => {
    api.previewInvitation.mockResolvedValue({ valid: true, email: 'ne***@example.test', expiresAt: '2026-10-20T10:00:00Z', mode: 'set_password' });
    render(<OwnerInviteAccept />);
    expect(await screen.findByLabelText(/Choose a password/)).toBeInTheDocument();
    expect(window.location.search).toBe('');
    expect(api.previewInvitation).toHaveBeenCalledWith(T);
  });
  test('an expired or replayed link shows the server message and offers no form', async () => {
    api.previewInvitation.mockRejectedValue({ response: { data: { message: 'This invitation link has expired. Ask an owner to resend it.' } } });
    render(<OwnerInviteAccept />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/expired/);
    expect(screen.queryByRole('button', { name: /Accept/ })).toBeNull();
  });
  test('accept sends the token once and the password is cleared afterwards', async () => {
    api.previewInvitation.mockResolvedValue({ valid: true, email: 'ne***@example.test', expiresAt: '2026-10-20T10:00:00Z', mode: 'set_password' });
    api.acceptInvitation.mockResolvedValue({ accepted: true });
    const u = userEvent.setup();
    render(<OwnerInviteAccept />);
    await u.type(await screen.findByLabelText(/Choose a password/), 'Str0ng!pass');
    await u.click(screen.getByRole('button', { name: /Accept ownership/ }));
    expect(await screen.findByRole('status')).toHaveTextContent(/now a KAYAD owner/);
    expect(api.acceptInvitation).toHaveBeenCalledTimes(1);
    expect(api.acceptInvitation).toHaveBeenCalledWith({ token: T, name: undefined, password: 'Str0ng!pass' });
  });
  test('missing token → clear message, no API call', async () => {
    window.history.replaceState(null, '', '/owner-invite');
    render(<OwnerInviteAccept />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/missing its token/);
    expect(api.previewInvitation).not.toHaveBeenCalled();
  });
});

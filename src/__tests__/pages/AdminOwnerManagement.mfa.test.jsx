import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';

// PHASE 16: the owner-management screen shows the owner's own authenticator state, enrols with a password step-up, shows the
// secret and recovery codes once, and asks for a code on every owner-changing action once enrolled. The API layer is stubbed.
const api = vi.hoisted(() => ({
  overview: vi.fn(), mfaStatus: vi.fn(), mfaEnroll: vi.fn(), mfaActivate: vi.fn(), invite: vi.fn(),
}));
vi.mock('../../api/api', () => ({ ownerAPI: api }));
const { default: AdminOwnerManagement } = await import('../../pages/admin/AdminOwnerManagement');

const overview = { success: true, canManage: true, self: { id: 'o1' }, bootstrap: { status: 'closed' }, store: { mode: 'database' }, members: [{ id: 'm1', userId: 'o1', email: 'o1@example.test', status: 'active', usable: true }], invitations: [], events: [] };
describe('AdminOwnerManagement: two-factor panel', () => {
  beforeEach(() => { Object.values(api).forEach((f) => f.mockReset()); api.overview.mockResolvedValue(overview); });
  afterEach(() => cleanup());
  it('reports an uninstalled migration honestly and offers no enrolment', async () => {
    api.mfaStatus.mockResolvedValue({ mfa: { installed: false, enrolled: false, keyConfigured: true } });
    render(<AdminOwnerManagement />);
    await screen.findByText(/migration, which has not been applied/i);
    expect(screen.queryByRole('button', { name: /set up authenticator/i })).toBeNull();
  });
  it('refuses to offer enrolment when the server has no encryption key', async () => {
    api.mfaStatus.mockResolvedValue({ mfa: { installed: true, enrolled: false, keyConfigured: false } });
    render(<AdminOwnerManagement />);
    await screen.findByText(/encryption key is missing/i);
    expect(screen.queryByRole('button', { name: /set up authenticator/i })).toBeNull();
  });
  it('enrols: password -> secret shown -> code -> recovery codes shown once', async () => {
    api.mfaStatus.mockResolvedValue({ mfa: { installed: true, enrolled: false, keyConfigured: true, policy: 'enrolled_only', recoveryCodesRemaining: 0 } });
    api.mfaEnroll.mockResolvedValue({ secret: 'JBSWY3DPEHPK3PXP', otpauthUri: 'otpauth://totp/x' });
    api.mfaActivate.mockResolvedValue({ enrolled: true, recoveryCodes: ['AAAAA-BBBBB', 'CCCCC-DDDDD'] });
    render(<AdminOwnerManagement />);
    fireEvent.click(await screen.findByRole('button', { name: /set up authenticator/i }));
    fireEvent.change(screen.getByLabelText(/^your password$/i), { target: { value: 'pw-123456789' } });
    fireEvent.click(screen.getByRole('button', { name: /^continue$/i }));
    expect((await screen.findByTestId('mfa-secret')).textContent).toBe('JBSWY3DPEHPK3PXP');
    expect(api.mfaEnroll).toHaveBeenCalledWith({ password: 'pw-123456789' });
    fireEvent.change(screen.getByLabelText(/6-digit code/i), { target: { value: '123456' } });
    api.mfaStatus.mockResolvedValue({ mfa: { installed: true, enrolled: true, keyConfigured: true, recoveryCodesRemaining: 2 } });
    fireEvent.click(screen.getByRole('button', { name: /turn on/i }));
    const list = await screen.findByTestId('mfa-recovery-codes');
    expect(list.textContent).toContain('AAAAA-BBBBB');
    fireEvent.click(screen.getByRole('button', { name: /i have saved them/i }));
    await waitFor(() => expect(screen.queryByTestId('mfa-recovery-codes')).toBeNull());
    expect(document.body.textContent).not.toContain('JBSWY3DPEHPK3PXP');
  });
  it('once enrolled, an owner-changing dialog requires and sends the code', async () => {
    api.mfaStatus.mockResolvedValue({ mfa: { installed: true, enrolled: true, keyConfigured: true, recoveryCodesRemaining: 9 } });
    api.invite.mockResolvedValue({ emailDelivered: true });
    render(<AdminOwnerManagement />);
    fireEvent.click(await screen.findByRole('button', { name: /invite owner/i }));
    fireEvent.change(screen.getByLabelText(/email address of the new owner/i), { target: { value: 'new@example.test' } });
    fireEvent.change(screen.getByLabelText(/type the address/i, { selector: 'input' }), { target: { value: 'new@example.test' } });
    fireEvent.change(screen.getByLabelText(/your password/i), { target: { value: 'pw-123456789' } });
    const send = screen.getByRole('button', { name: /send invitation/i });
    expect(send).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/authenticator code/i), { target: { value: '654321' } });
    expect(send).toBeEnabled(); fireEvent.click(send);
    await waitFor(() => expect(api.invite).toHaveBeenCalled());
    expect(api.invite.mock.calls[0][0]).toMatchObject({ email: 'new@example.test', password: 'pw-123456789', mfaCode: '654321' });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const api = vi.hoisted(() => ({
  getTeamMemberDetail: vi.fn(), getTemporaryDuties: vi.fn().mockResolvedValue({ data: { grants: [], catalogue: ['canChatBuyers'], maxDays: 90, rolePermissions: [], temporaryPermissions: [], effectivePermissions: [] } }), createTemporaryDuty: vi.fn(), revokeTemporaryDuty: vi.fn(), applyEmploymentAction: vi.fn(), updateTeamMember: vi.fn(), setMemberBusinessEmail: vi.fn(), inviteTeamMember: vi.fn(),
  getMyStaffProfile: vi.fn(), updateMyStaffProfile: vi.fn(),
}));
vi.mock('../../../services/dealerPlatformApi', () => api);
import StaffDetail from '../../../pages/dealer/dashboard/team/StaffDetail';
import StaffProfile from '../../../features/DealershipWorkspace/StaffProfile';

const roles = [{ key: 'basic_staff', label: 'Basic Staff Access', permissions: {}, builtin: true }, { key: 'sales_agent', label: 'Sales agent', permissions: { canListCars: true }, builtin: true }];
const member = { id: 'm1', member: 'u1', status: 'active', employmentStatus: 'active', role: 'basic_staff', roleLabel: 'Basic Staff Access', accessLevel: 'Basic', staffNumber: 'ABC-STAFF-001', inviteEmail: 'jane@x.test', businessEmail: null, memberProfile: { name: 'Jane Doe' } };
const onChanged = vi.fn(); const onClose = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  api.getTeamMemberDetail.mockResolvedValue({ data: { identity: { loginEmail: 'jane@x.test' }, effectivePermissions: [{ key: 'canListCars', label: 'Add new vehicle listings', granted: false }], events: [] } });
});

describe('StaffDetail', () => {
  it('shows distinct staff number, login e-mail and business e-mail, with no granted permissions for Basic', async () => {
    render(<StaffDetail member={member} roles={roles} employmentAvailable onClose={onClose} onChanged={onChanged} />);
    expect(screen.getByTestId('detail-staff-number')).toHaveTextContent('ABC-STAFF-001');
    expect(screen.getByTestId('detail-business-email')).toHaveTextContent('None recorded');
    await waitFor(() => expect(screen.getByTestId('detail-login-email')).toHaveTextContent('jane@x.test'));
  });
  it('applies a role through the existing role endpoint', async () => {
    api.updateTeamMember.mockResolvedValue({ success: true });
    render(<StaffDetail member={member} roles={roles} employmentAvailable onClose={onClose} onChanged={onChanged} />);
    await userEvent.selectOptions(screen.getByLabelText('Operational role'), 'sales_agent');
    await userEvent.click(screen.getByRole('button', { name: 'Apply role' }));
    await waitFor(() => expect(api.updateTeamMember).toHaveBeenCalledWith('m1', { role: 'sales_agent' }));
  });
  it('ending employment requires a reason, then sends it', async () => {
    api.applyEmploymentAction.mockResolvedValue({ success: true });
    render(<StaffDetail member={member} roles={roles} employmentAvailable onClose={onClose} onChanged={onChanged} />);
    await userEvent.click(screen.getByRole('button', { name: 'End employment…' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirm end of employment' }));
    expect(await screen.findByText(/Give a short reason/)).toBeInTheDocument();
    expect(api.applyEmploymentAction).not.toHaveBeenCalled();
    await userEvent.type(screen.getByLabelText(/Reason/), 'Left the company');
    await userEvent.click(screen.getByRole('button', { name: 'Confirm end of employment' }));
    await waitFor(() => expect(api.applyEmploymentAction).toHaveBeenCalledWith('m1', { action: 'terminate', reason: 'Left the company' }));
  });
  it('re-hire sends a fresh invitation by e-mail only (no role)', async () => {
    api.inviteTeamMember.mockResolvedValue({ success: true });
    render(<StaffDetail member={{ ...member, status: 'removed', employmentStatus: 'terminated' }} roles={roles} employmentAvailable onClose={onClose} onChanged={onChanged} />);
    await userEvent.click(screen.getByRole('button', { name: 'Re-hire (new invitation)' }));
    await waitFor(() => expect(api.inviteTeamMember).toHaveBeenCalledWith({ email: 'jane@x.test' }));
  });
  it('shows a server refusal (protected owner) as an alert', async () => {
    api.applyEmploymentAction.mockRejectedValue({ response: { status: 403, data: { message: 'The owner is protected and cannot change.' } } });
    render(<StaffDetail member={member} roles={roles} employmentAvailable onClose={onClose} onChanged={onChanged} />);
    await userEvent.click(screen.getByRole('button', { name: 'Suspend access' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});

describe('StaffProfile (employee self-service)', () => {
  const profile = { dealershipName: 'ABC Motors', staffNumber: 'ABC-STAFF-001', roleKey: 'basic_staff', roleLabel: 'Basic Staff Access', accessLevel: 'Basic', employmentStatus: 'onboarding', employmentStartDate: null, loginEmail: 'jane@x.test', businessEmail: null, displayName: null, workPhone: null, profileCompleted: false, isBasicAccess: true, permissions: [] };
  it('shows identity, the Basic access note and the incomplete-profile prompt; saves only name and phone', async () => {
    api.getMyStaffProfile.mockResolvedValue({ data: profile, employmentAvailable: true });
    api.updateMyStaffProfile.mockResolvedValue({ success: true });
    render(<StaffProfile />);
    expect(await screen.findByTestId('staff-number')).toHaveTextContent('ABC-STAFF-001');
    expect(screen.getByTestId('basic-access-note')).toBeInTheDocument();
    expect(screen.getByTestId('profile-incomplete')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/Name to use/), 'Jane');
    await userEvent.click(screen.getByRole('button', { name: 'Save my details' }));
    await waitFor(() => expect(api.updateMyStaffProfile).toHaveBeenCalledWith({ displayName: 'Jane', workPhone: undefined }));
    expect(await screen.findByText('Your staff profile is saved.')).toBeInTheDocument();
  });
  it('shows a clear error when the profile cannot be loaded', async () => {
    api.getMyStaffProfile.mockRejectedValue(new Error('x'));
    render(<StaffProfile />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not be loaded/);
  });
});

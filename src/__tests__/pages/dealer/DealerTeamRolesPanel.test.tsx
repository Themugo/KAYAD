import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const api = vi.hoisted(() => ({ getTeamRoles: vi.fn(), inviteTeamMember: vi.fn(), updateTeamMember: vi.fn(), removeTeamMember: vi.fn(), resendTeamInvite: vi.fn(), createTeamRole: vi.fn(), updateTeamRole: vi.fn(), resetTeamRole: vi.fn(), deleteTeamRole: vi.fn(), getEmploymentRecords: vi.fn(), getCommandCentre: vi.fn() }));
vi.mock('../../../services/dealerPlatformApi', () => api);
import DealerTeamPanel from '../../../pages/dealer/dashboard/DealerTeamPanel';

const perms = [{ key: 'canListCars', label: 'Add new vehicle listings' }, { key: 'canChatBuyers', label: 'Chat with buyers and handle leads' }];
const rolesBody = (custom: any[] = [], available = true) => ({ success: true, data: { customRolesAvailable: available, permissions: perms, roles: [
  { key: 'sales_agent', label: 'Sales agent', builtin: true, permissions: { canListCars: true, canChatBuyers: true } },
  { key: 'viewer', label: 'Viewer', builtin: true, permissions: { canListCars: false, canChatBuyers: false } }, ...custom] } });
const team = [{ id: 'm1', inviteEmail: 'a@x.test', status: 'invited', role: 'viewer', permissions: {} }];
const onChanged = vi.fn();
beforeEach(() => { vi.clearAllMocks(); api.getTeamRoles.mockResolvedValue(rolesBody()); api.getEmploymentRecords.mockResolvedValue({ data: { events: [] } }); api.getCommandCentre.mockResolvedValue({ data: { team: null } }); });
const openInvitations = async () => userEvent.click(await screen.findByRole('tab', { name: /^Invitations/ }));

describe('Team: invitations and e-mail honesty', () => {
  it('invites at Basic Staff Access: no role selector, explanation shown, and the request never names a role', async () => {
    api.inviteTeamMember.mockResolvedValue({ success: true, data: { id: 'm8' }, email: { sent: true } });
    render(<DealerTeamPanel team={[]} onChanged={onChanged} />);
    await openInvitations();
    expect(screen.queryByLabelText('Role')).toBeNull();
    expect(screen.getByTestId('basic-default-note')).toHaveTextContent('Every new employee starts with Basic Staff Access. You can assign their operational role after they join.');
    expect(screen.getByTestId('basic-denies')).toHaveTextContent(/leads, customers, finance/);
    await userEvent.type(screen.getByLabelText('Email'), 'jane@x.test');
    await userEvent.type(screen.getByLabelText(/Employee name/), 'Jane');
    await userEvent.click(screen.getByRole('button', { name: 'Send invitation' }));
    await waitFor(() => expect(api.inviteTeamMember).toHaveBeenCalledWith({ email: 'jane@x.test', employeeName: 'Jane' }));
    expect(await screen.findByText('Invitation sent to jane@x.test.')).toBeInTheDocument();
  });
  it('shows unavailable data as a dash with an explanation, not as zero', async () => {
    render(<DealerTeamPanel team={[]} employmentAvailable={false} onChanged={onChanged} />);
    expect(await screen.findByTestId('employment-unavailable')).toBeInTheDocument();
    expect(screen.getByTestId('sum-onboarding')).toHaveTextContent('—');
    expect(screen.getByTestId('sum-changes')).toHaveTextContent('Not available yet');
  });
  it('lists staff with staff ID, filters by search and former status', async () => {
    const staff = [
      { id: 's1', member: 'u1', status: 'active', employmentStatus: 'active', role: 'viewer', roleLabel: 'Viewer', accessLevel: 'Basic', staffNumber: 'ABC-STAFF-001', inviteEmail: 'jane@x.test', memberProfile: { name: 'Jane Doe' } },
      { id: 's2', member: 'u2', status: 'removed', employmentStatus: 'terminated', role: 'viewer', roleLabel: 'Viewer', accessLevel: 'Basic', staffNumber: 'ABC-STAFF-002', inviteEmail: 'old@x.test', memberProfile: { name: 'Old Hand' } },
    ];
    render(<DealerTeamPanel team={staff} onChanged={onChanged} />);
    expect(await screen.findByTestId('member-row-s1')).toHaveTextContent('ABC-STAFF-001');
    expect(screen.queryByTestId('member-row-s2')).toBeNull();
    await userEvent.type(screen.getByLabelText('Search staff'), 'zzz');
    expect(screen.getByTestId('members-empty')).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText('Search staff'));
    await userEvent.selectOptions(screen.getByLabelText('Filter by status'), 'former');
    expect(await screen.findByTestId('member-row-s2')).toHaveTextContent('ABC-STAFF-002');
  });
  it('says plainly when the e-mail could not be sent, keeps the invitation, and does not claim it was sent', async () => {
    api.inviteTeamMember.mockResolvedValue({ success: true, data: { id: 'm9' }, email: { sent: false, reason: 'Email sending is not configured on the server.' } });
    render(<DealerTeamPanel team={[]} onChanged={onChanged} />);
    await openInvitations();
    await userEvent.type(await screen.findByLabelText('Email'), 'new@x.test');
    await userEvent.click(screen.getByRole('button', { name: 'Send invitation' }));
    expect(await screen.findByText('Invitation saved for new@x.test.')).toBeInTheDocument();
    expect(screen.getByText(/could not be sent.*not configured/i)).toBeInTheDocument();
    expect(screen.queryByText(/Invitation sent to/)).toBeNull();
    expect(onChanged).toHaveBeenCalled();
  });
  it('a pending invitation can be re-sent', async () => {
    api.resendTeamInvite.mockResolvedValue({ success: true, data: {}, email: { sent: true } });
    render(<DealerTeamPanel team={team} onChanged={onChanged} />);
    await openInvitations();
    await userEvent.click(await screen.findByRole('button', { name: 'Resend invitation' }));
    await waitFor(() => expect(api.resendTeamInvite).toHaveBeenCalledWith('m1'));
    expect(await screen.findByText('Invitation re-sent to a@x.test.')).toBeInTheDocument();
  });
});

describe('Team: roles tab', () => {
  it('lets the owner edit a built-in role and reset it to default; Basic Staff Access has no edit', async () => {
    api.getTeamRoles.mockResolvedValue({ success: true, data: { customRolesAvailable: true, permissions: perms, roles: [
      { key: 'basic_staff', label: 'Basic Staff Access', builtin: true, onboarding: true, locked: true, permissions: {} },
      { key: 'sales_agent', label: 'Sales agent', builtin: true, customised: true, permissions: { canListCars: true, canChatBuyers: false } }] } });
    api.updateTeamRole.mockResolvedValue({ success: true, updatedMembers: 2, keptCustom: 1, data: { key: 'sales_agent' } });
    api.resetTeamRole.mockResolvedValue({ success: true, updatedMembers: 0, data: { key: 'sales_agent' } });
    await open();
    expect(screen.queryByRole('button', { name: 'Edit role Basic Staff Access' })).toBeNull();
    await userEvent.click(await screen.findByRole('button', { name: 'Edit role Sales agent' }));
    await userEvent.click(screen.getByLabelText('Chat with buyers and handle leads'));
    await userEvent.click(screen.getByRole('button', { name: 'Save role' }));
    await waitFor(() => expect(api.updateTeamRole).toHaveBeenCalledWith('sales_agent', expect.objectContaining({ permissions: { canListCars: true, canChatBuyers: true } })));
    expect(await screen.findByText(/2 members now have the new permissions.*1 member with individually adjusted access kept/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reset role Sales agent to default' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirm reset' }));
    await waitFor(() => expect(api.resetTeamRole).toHaveBeenCalledWith('sales_agent'));
  });
  const open = async () => { render(<DealerTeamPanel team={[]} onChanged={onChanged} />); await userEvent.click(await screen.findByRole('tab', { name: 'Roles & Permissions' })); };
  it('lists built-in roles as editable and lets the owner create a custom role from permission checkboxes', async () => {
    api.createTeamRole.mockResolvedValue({ success: true, data: { key: 'custom_clerk' } });
    await open();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Create a custom role' })).toBeEnabled());
    expect(screen.getByRole('button', { name: 'Edit role Sales agent' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Create a custom role' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save role' }));
    expect(await screen.findByText(/name of at least 2 characters/i)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Role name'), 'Clerk');
    await userEvent.click(screen.getByLabelText('Chat with buyers and handle leads'));
    await userEvent.click(screen.getByRole('button', { name: 'Save role' }));
    await waitFor(() => expect(api.createTeamRole).toHaveBeenCalledWith({ label: 'Clerk', description: '', permissions: { canChatBuyers: true } }));
    expect(await screen.findByText(/Role “Clerk” created/)).toBeInTheDocument();
  });
  it('edits and deletes only custom roles; a server refusal (role in use) is shown', async () => {
    api.getTeamRoles.mockResolvedValue(rolesBody([{ key: 'custom_clerk', label: 'Clerk', permissions: { canListCars: true } }]));
    api.deleteTeamRole.mockRejectedValue({ response: { status: 409, data: { message: '1 team member has this role. Move them to another role first.' } } });
    await open();
    await userEvent.click(await screen.findByRole('button', { name: 'Delete role Clerk' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Move them to another role first');
    await userEvent.click(screen.getByRole('button', { name: 'Edit role Clerk' }));
    expect(screen.getByLabelText('Role name')).toHaveValue('Clerk');
  });
  it('explains when custom roles are not switched on yet and disables creation', async () => {
    api.getTeamRoles.mockResolvedValue(rolesBody([], false));
    await open();
    expect(await screen.findByText(/Custom roles are not switched on yet/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create a custom role' })).toBeDisabled();
  });
});

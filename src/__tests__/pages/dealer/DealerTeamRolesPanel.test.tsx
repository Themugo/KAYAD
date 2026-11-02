import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const api = vi.hoisted(() => ({ getTeamRoles: vi.fn(), inviteTeamMember: vi.fn(), updateTeamMember: vi.fn(), removeTeamMember: vi.fn(), resendTeamInvite: vi.fn(), createTeamRole: vi.fn(), updateTeamRole: vi.fn(), deleteTeamRole: vi.fn() }));
vi.mock('../../../services/dealerPlatformApi', () => api);
import DealerTeamPanel from '../../../pages/dealer/dashboard/DealerTeamPanel';

const perms = [{ key: 'canListCars', label: 'Add new vehicle listings' }, { key: 'canChatBuyers', label: 'Chat with buyers and handle leads' }];
const rolesBody = (custom: any[] = [], available = true) => ({ success: true, data: { customRolesAvailable: available, permissions: perms, roles: [
  { key: 'sales_agent', label: 'Sales agent', builtin: true, permissions: { canListCars: true, canChatBuyers: true } },
  { key: 'viewer', label: 'Viewer', builtin: true, permissions: { canListCars: false, canChatBuyers: false } }, ...custom] } });
const team = [{ id: 'm1', inviteEmail: 'a@x.test', status: 'invited', role: 'viewer', permissions: {} }];
const onChanged = vi.fn();
beforeEach(() => { vi.clearAllMocks(); api.getTeamRoles.mockResolvedValue(rolesBody()); });

describe('Team: invitations and e-mail honesty', () => {
  it('offers server roles (including custom) in the invite form and shows what the role can do', async () => {
    api.getTeamRoles.mockResolvedValue(rolesBody([{ key: 'custom_photo', label: 'Photographer', permissions: { canListCars: true } }]));
    render(<DealerTeamPanel team={[]} onChanged={onChanged} />);
    const sel = await screen.findByLabelText('Role');
    await waitFor(() => expect(within(sel).getByRole('option', { name: 'Photographer' })).toBeInTheDocument());
    await userEvent.selectOptions(sel, 'custom_photo');
    expect(screen.getByText('Add new vehicle listings')).toBeInTheDocument();
  });
  it('says plainly when the e-mail could not be sent, keeps the invitation, and does not claim it was sent', async () => {
    api.inviteTeamMember.mockResolvedValue({ success: true, data: { id: 'm9' }, email: { sent: false, reason: 'Email sending is not configured on the server.' } });
    render(<DealerTeamPanel team={[]} onChanged={onChanged} />);
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
    await userEvent.click(await screen.findByRole('button', { name: 'Resend invitation' }));
    await waitFor(() => expect(api.resendTeamInvite).toHaveBeenCalledWith('m1'));
    expect(await screen.findByText('Invitation re-sent to a@x.test.')).toBeInTheDocument();
  });
});

describe('Team: roles tab', () => {
  const open = async () => { render(<DealerTeamPanel team={[]} onChanged={onChanged} />); await userEvent.click(await screen.findByRole('tab', { name: 'Roles' })); };
  it('lists built-in roles as fixed and lets the owner create a custom role from permission checkboxes', async () => {
    api.createTeamRole.mockResolvedValue({ success: true, data: { key: 'custom_clerk' } });
    await open();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Create a role' })).toBeEnabled());
    expect(screen.queryByRole('button', { name: 'Edit role Sales agent' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Create a role' }));
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
    expect(screen.getByRole('button', { name: 'Create a role' })).toBeDisabled();
  });
});

import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

const { api } = vi.hoisted(() => { const fn = () => vi.fn(); return { api: {
  get: fn(), listBranches: fn(), createBranch: fn(), updateBranch: fn(), setBranchStatus: fn(), listMembers: fn(), invite: fn(), confirm: fn(), change: fn(), setMemberStatus: fn(),
  listBookings: fn(), routeBooking: fn(), assignBooking: fn(), transition: fn(), report: fn(), myMemberships: fn(), myWorklist: fn(), acceptInvitation: fn(), leave: fn(),
} }; });
vi.mock('../../../features/InspectionMarketplace/services/organizationApi', () => ({ organizationApi: api, default: api }));

import { OrganizationWorkspace } from '../../../features/InspectionMarketplace/organization/OrganizationWorkspace';
import { MyMembershipsPanel } from '../../../features/InspectionMarketplace/organization/MyMembershipsPanel';
import { can, invitableRoles, nextActions, orgWide } from '../../../features/InspectionMarketplace/organization/orgAccess';

const ORG = 'org-1';
const org = (role: string, extra: Record<string, unknown> = {}) => ({ id: ORG, name: 'Alpha Garage', status: 'active', verificationStatus: 'verified', lifecycleStage: 'ACTIVE', you: { role, branchId: role === 'branch_manager' ? 'b1' : null, staffId: 's-me', isOwner: role === 'owner' }, ...extra });
const B1 = { id: 'b1', name: 'Nairobi HQ', town: 'Nairobi', status: 'active', is_head_office: true };
const B2 = { id: 'b2', name: 'Mombasa Rd', town: 'Nairobi', status: 'active', is_head_office: false };
const booking = (o: Record<string, unknown> = {}) => ({ id: 'bk1', booking_reference: 'KAYAD-1', provider_id: ORG, branch_id: 'b1', status: 'confirmed', scheduled_date: '2026-10-10', scheduled_time: '09:00:00', assigned_staff_id: null, payment_status: 'fully_paid', vehicle_make: 'Toyota', vehicle_model: 'Prado', ...o });

beforeEach(() => {
  cleanup(); Object.values(api).forEach((m) => m.mockReset());
  api.listBranches.mockResolvedValue({ branches: [B1, B2] });
  api.listMembers.mockResolvedValue({ members: [] });
  api.listBookings.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 });
  api.myMemberships.mockResolvedValue({ memberships: [] }); api.myWorklist.mockResolvedValue({ items: [], memberships: 0 });
});

describe('role -> screens (UX mirror of the server capability map)', () => {
  it.each([
    ['owner', ['Bookings', 'Branches', 'Team', 'Report']], ['org_admin', ['Bookings', 'Branches', 'Team', 'Report']],
    ['operations_manager', ['Bookings', 'Branches', 'Team', 'Report']], ['branch_manager', ['Bookings', 'Branches', 'Team', 'Report']],
    ['finance', ['Branches', 'Report']], ['report_reviewer', ['Bookings', 'Branches']], ['inspector', ['My inspections', 'Branches']], ['technician', ['My inspections', 'Branches']],
  ])('%s sees exactly %j', async (role, labels) => {
    api.get.mockResolvedValue(org(role)); api.listBranches.mockResolvedValue({ branches: [B1] });
    render(<OrganizationWorkspace organizationId={ORG} />);
    await screen.findByRole('tablist');
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(labels);
  });
  it('the pure helpers agree with the server rules', () => {
    expect(can('finance', 'bookings')).toBe(false); expect(can('finance', 'report')).toBe(true); expect(can('inspector', 'bookingManage')).toBe(false);
    expect(orgWide('branch_manager')).toBe(false); expect(orgWide('operations_manager')).toBe(true);
    expect(invitableRoles('org_admin')).not.toContain('org_admin'); expect(invitableRoles('branch_manager')).toEqual(['inspector', 'technician']); expect(invitableRoles('finance')).toEqual([]);
    expect(nextActions('closed')).toEqual([]); expect(nextActions('inspection_started')).toEqual(['complete']);
  });
});

describe('workspace states are honest', () => {
  it('shows a loading state, then a clear access message (not a blank screen) when the server says no', async () => {
    api.get.mockRejectedValue({ response: { status: 404, data: { message: 'Organization not found' } } });
    render(<OrganizationWorkspace organizationId={ORG} />);
    expect(screen.getByRole('status').textContent).toMatch(/Opening your workspace/);
    expect((await screen.findByRole('alert')).textContent).toMatch(/do not have access to this organization/);
  });
  it('a server failure offers Retry and does not invent data', async () => {
    api.get.mockRejectedValueOnce({ response: { status: 500, data: { message: 'The organization service is temporarily unavailable' } } });
    render(<OrganizationWorkspace organizationId={ORG} />);
    const alert = await screen.findByRole('alert'); expect(alert.textContent).toMatch(/temporarily unavailable/);
    api.get.mockResolvedValue(org('owner')); fireEvent.click(within(alert).getByRole('button', { name: 'Retry' }));
    await screen.findByRole('tablist');
  });
  it('an inactive business is labelled and told it cannot take new jobs', async () => {
    api.get.mockResolvedValue(org('owner', { lifecycleStage: 'SUSPENDED' }));
    render(<OrganizationWorkspace organizationId={ORG} />);
    expect((await screen.findByText(/cannot take new jobs/)).textContent).toBeTruthy();
  });
  it('tabs are keyboard operable (arrow keys move focus and selection)', async () => {
    api.get.mockResolvedValue(org('owner'));
    render(<OrganizationWorkspace organizationId={ORG} />);
    const tabs = await screen.findAllByRole('tab'); tabs[0].focus();
    fireEvent.keyDown(tabs[0], { key: 'ArrowRight' });
    await waitFor(() => expect(screen.getAllByRole('tab')[1].getAttribute('aria-selected')).toBe('true'));
  });
});

describe('branches', () => {
  it('empty state invites the first branch; the first branch is created as head office', async () => {
    api.get.mockResolvedValue(org('owner')); api.listBranches.mockResolvedValue({ branches: [] }); api.createBranch.mockResolvedValue({});
    render(<OrganizationWorkspace organizationId={ORG} />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Branches' }));
    expect(await screen.findByText('No branches yet')).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/^name/i), { target: { value: 'Nairobi HQ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add branch' }));
    await waitFor(() => expect(api.createBranch).toHaveBeenCalledWith(ORG, expect.objectContaining({ name: 'Nairobi HQ', isHeadOffice: true })));
  });
  it('suspending needs a reason and surfaces the server refusal', async () => {
    api.get.mockResolvedValue(org('owner')); api.setBranchStatus.mockRejectedValue({ response: { data: { message: 'Branch has open bookings' } } });
    render(<OrganizationWorkspace organizationId={ORG} />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Branches' }));
    const card = (await screen.findByText('Mombasa Rd')).closest('li') as HTMLElement;
    fireEvent.click(within(card).getByRole('button', { name: 'Suspend' }));
    const submit = within(card).getByRole('button', { name: 'Suspend branch' }); expect((submit as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(within(card).getByLabelText(/Why is this branch being suspended/), { target: { value: 'refit' } });
    fireEvent.click(submit);
    await waitFor(() => expect(api.setBranchStatus).toHaveBeenCalledWith(ORG, 'b2', 'suspended', 'refit'));
    expect((await screen.findByText('Branch has open bookings'))).toBeTruthy();
  });
  it('the head office offers no suspend/close, and a non-admin gets no management controls', async () => {
    api.get.mockResolvedValue(org('owner'));
    const { unmount } = render(<OrganizationWorkspace organizationId={ORG} />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Branches' }));
    const hq = (await screen.findByText('Nairobi HQ')).closest('li') as HTMLElement;
    expect(within(hq).queryByRole('button', { name: 'Suspend' })).toBeNull(); expect(within(hq).queryByRole('button', { name: /Close permanently/ })).toBeNull();
    unmount(); api.get.mockResolvedValue(org('operations_manager'));
    render(<OrganizationWorkspace organizationId={ORG} />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Branches' }));
    await screen.findByText('Nairobi HQ');
    expect(screen.queryByRole('button', { name: 'Add branch' })).toBeNull(); expect(screen.queryByRole('button', { name: 'Edit details' })).toBeNull();
  });
});

describe('team', () => {
  const member = (o: Record<string, unknown>) => ({ id: 'm1', name: 'Jane Doe', title: 'junior_inspector', accessRole: 'inspector', branchId: 'b1', status: 'confirmed', isActive: true, isAvailable: true, ...o });
  it('invites with a proper role and title — never the invalid "mechanic"', async () => {
    api.get.mockResolvedValue(org('owner')); api.invite.mockResolvedValue({});
    render(<OrganizationWorkspace organizationId={ORG} />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Team' }));
    fireEvent.change(await screen.findByLabelText(/Email of their KAYAD account/), { target: { value: 'bob@x.co' } });
    fireEvent.change(screen.getByLabelText(/^Role/), { target: { value: 'branch_manager' } });
    const send = screen.getByRole('button', { name: 'Send invitation' }); expect((send as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(/^Branch/), { target: { value: 'b2' } });
    fireEvent.click(send);
    await waitFor(() => expect(api.invite).toHaveBeenCalledWith(ORG, { email: 'bob@x.co', accessRole: 'branch_manager', title: undefined, branchId: 'b2' }));
    expect(JSON.stringify(api.invite.mock.calls)).not.toMatch(/mechanic/);
  });
  it('an org admin cannot offer the org_admin role; a branch manager only inspector/technician in their own branch', async () => {
    api.get.mockResolvedValue(org('org_admin'));
    const { unmount } = render(<OrganizationWorkspace organizationId={ORG} />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Team' }));
    const sel = (await screen.findByLabelText(/^Role/)) as HTMLSelectElement;
    expect([...sel.options].map((o) => o.value)).not.toContain('org_admin');
    unmount(); api.get.mockResolvedValue(org('branch_manager'));
    render(<OrganizationWorkspace organizationId={ORG} />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Team' }));
    const sel2 = (await screen.findByLabelText(/^Role/)) as HTMLSelectElement;
    expect([...sel2.options].map((o) => o.value)).toEqual(['inspector', 'technician']);
    expect((screen.getByLabelText(/^Branch/) as HTMLSelectElement).disabled).toBe(true);
  });
  it('suspend needs a reason and tells the manager access is lost immediately; you cannot manage yourself', async () => {
    api.get.mockResolvedValue(org('owner')); api.setMemberStatus.mockResolvedValue({});
    api.listMembers.mockResolvedValue({ members: [member({}), member({ id: 's-me', name: 'Me', accessRole: 'org_admin', branchId: null })] });
    render(<OrganizationWorkspace organizationId={ORG} />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Team' }));
    const li = (await screen.findByText('Jane Doe')).closest('li') as HTMLElement;
    fireEvent.click(within(li).getByRole('button', { name: 'Suspend' }));
    fireEvent.change(within(li).getByLabelText('Reason for suspension'), { target: { value: 'audit' } });
    fireEvent.click(within(li).getByRole('button', { name: 'Suspend' }));
    await waitFor(() => expect(api.setMemberStatus).toHaveBeenCalledWith(ORG, 'm1', 'suspend', 'audit'));
    expect((await screen.findByText(/lose access immediately/))).toBeTruthy();
    const me = screen.getByText('Me').closest('li') as HTMLElement; expect(within(me).queryAllByRole('button')).toHaveLength(0);
  });
  it('a join request the person made shows Confirm; a pending invite shows "Cancel invitation" and its expiry', async () => {
    api.get.mockResolvedValue(org('owner')); api.confirm.mockResolvedValue({});
    api.listMembers.mockResolvedValue({ members: [member({ id: 'm2', status: 'pending', awaiting: 'business', name: 'Asker' }), member({ id: 'm3', status: 'pending', awaiting: 'member', name: 'Invitee', invitationExpiresAt: '2099-01-01T00:00:00Z' })] });
    render(<OrganizationWorkspace organizationId={ORG} />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Team' }));
    const a = (await screen.findByText('Asker')).closest('li') as HTMLElement;
    fireEvent.click(within(a).getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(api.confirm).toHaveBeenCalledWith(ORG, 'm2'));
    const i = screen.getByText('Invitee').closest('li') as HTMLElement;
    expect(within(i).queryByRole('button', { name: 'Confirm' })).toBeNull(); expect(within(i).getByRole('button', { name: 'Cancel invitation' })).toBeTruthy(); expect(i.textContent).toMatch(/expires/);
  });
});

describe('bookings: routing, assignment, execution', () => {
  const insp = { id: 'm1', name: 'Jane Doe', title: 'junior_inspector', accessRole: 'inspector', branchId: 'b1', status: 'confirmed', isActive: true, isAvailable: true };
  it('a manager can assign an eligible inspector of that branch, only when payment is confirmed', async () => {
    api.get.mockResolvedValue(org('operations_manager')); api.assignBooking.mockResolvedValue({});
    api.listMembers.mockResolvedValue({ members: [insp, { ...insp, id: 'm9', name: 'Other Branch', branchId: 'b2' }, { ...insp, id: 'm8', name: 'Suspended', status: 'suspended' }] });
    api.listBookings.mockResolvedValue({ items: [booking(), booking({ id: 'bk2', booking_reference: 'KAYAD-2', payment_status: 'pending' })], total: 2, page: 1, limit: 20 });
    render(<OrganizationWorkspace organizationId={ORG} />);
    const first = (await screen.findByText('KAYAD-1')).closest('li') as HTMLElement;
    const select = within(first).getByLabelText('Assign inspector') as HTMLSelectElement;
    expect([...select.options].map((o) => o.textContent)).toEqual(['Choose…', 'Jane Doe']);
    fireEvent.change(select, { target: { value: 'm1' } }); fireEvent.click(within(first).getByRole('button', { name: 'Assign' }));
    await waitFor(() => expect(api.assignBooking).toHaveBeenCalledWith(ORG, 'bk1', 'm1'));
    const second = screen.getByText('KAYAD-2').closest('li') as HTMLElement;
    expect(within(second).queryByLabelText('Assign inspector')).toBeNull(); expect(second.textContent).toMatch(/once the customer's payment is confirmed/);
  });
  it('routing is offered to org-wide roles only (not to a branch manager)', async () => {
    api.get.mockResolvedValue(org('operations_manager')); api.routeBooking.mockResolvedValue({});
    api.listBookings.mockResolvedValue({ items: [booking({ branch_id: null })], total: 1, page: 1, limit: 20 });
    const { unmount } = render(<OrganizationWorkspace organizationId={ORG} />);
    const li = (await screen.findByText('KAYAD-1')).closest('li') as HTMLElement;
    fireEvent.change(within(li).getByLabelText('Route to branch'), { target: { value: 'b2' } }); fireEvent.click(within(li).getByRole('button', { name: 'Route' }));
    await waitFor(() => expect(api.routeBooking).toHaveBeenCalledWith(ORG, 'bk1', 'b2'));
    unmount(); api.get.mockResolvedValue(org('branch_manager'));
    render(<OrganizationWorkspace organizationId={ORG} />);
    const li2 = (await screen.findByText('KAYAD-1')).closest('li') as HTMLElement;
    expect(within(li2).queryByLabelText('Route to branch')).toBeNull();
  });
  it('an inspector only sees execution actions on THEIR assigned job, matching the booking state', async () => {
    api.get.mockResolvedValue(org('inspector')); api.transition.mockResolvedValue({});
    api.listBookings.mockResolvedValue({ items: [booking({ status: 'inspector_assigned', assigned_staff_id: 's-me' }), booking({ id: 'bk3', booking_reference: 'KAYAD-3', status: 'inspector_assigned', assigned_staff_id: 'someone-else' })], total: 2, page: 1, limit: 20 });
    render(<OrganizationWorkspace organizationId={ORG} />);
    const mine = (await screen.findByText('KAYAD-1')).closest('li') as HTMLElement;
    expect(within(mine).queryByRole('button', { name: 'Cancel booking' })).toBeNull();
    fireEvent.click(within(mine).getByRole('button', { name: 'Start travelling' }));
    await waitFor(() => expect(api.transition).toHaveBeenCalledWith(ORG, 'bk1', 'travel'));
    expect(within(screen.getByText('KAYAD-3').closest('li') as HTMLElement).queryAllByRole('button')).toHaveLength(0);
  });
  it('a server refusal is shown to the person, and an empty list is explained', async () => {
    api.get.mockResolvedValue(org('operations_manager'));
    api.listBookings.mockResolvedValue({ items: [booking({ status: 'booked' })], total: 1, page: 1, limit: 20 }); api.transition.mockRejectedValue({ response: { data: { message: 'Cannot move from booked to travelling' } } });
    const { unmount } = render(<OrganizationWorkspace organizationId={ORG} />);
    const li = (await screen.findByText('KAYAD-1')).closest('li') as HTMLElement; fireEvent.click(within(li).getByRole('button', { name: 'Confirm' }));
    expect(await screen.findByText('Cannot move from booked to travelling')).toBeTruthy();
    unmount(); api.listBookings.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 });
    render(<OrganizationWorkspace organizationId={ORG} />);
    expect(await screen.findByText('No bookings match')).toBeTruthy();
  });
});

describe('consolidated report', () => {
  const REPORT = {
    period: { from: '2026-10-01', to: '2026-10-31' },
    bookings_by_branch_status: [{ branch_id: 'b1', status: 'closed', count: 2 }, { branch_id: null, status: 'confirmed', count: 1 }],
    inspections: { completed: 3, outstanding: 1, cancelled_or_no_show: 0 },
    report_quality: { reports: 2, with_amendment: 1, correction_rate: 0.5, avg_turnaround_hours: 4, turnaround_samples: 2 },
    earnings_by_branch: [{ branch_id: 'b1', currency: 'KES', transaction_type: 'inspection_payment', status: 'completed', count: 1, amount: 5000 }],
    unattributed_transactions: [{ currency: 'KES', transaction_type: 'payout', status: 'completed', count: 1, amount: 4000 }],
  };
  it('renders exactly the sections the server returned, names unrouted work honestly and never sums across sections', async () => {
    api.get.mockResolvedValue(org('owner')); api.report.mockResolvedValue(REPORT);
    render(<OrganizationWorkspace organizationId={ORG} />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Report' }));
    expect(await screen.findByText('Bookings by branch')).toBeTruthy();
    expect(screen.getByText('Not routed to a branch')).toBeTruthy();
    expect(screen.getByText('Money by branch')).toBeTruthy(); expect(screen.getByText('Not attributed to a branch')).toBeTruthy();
    expect(document.body.textContent).toMatch(/KES 5,000/); expect(document.body.textContent).toMatch(/KES 4,000/);
    expect(document.body.textContent).toMatch(/50%/); expect(document.body.textContent).toMatch(/4\.0 hours \(from 2\)/);
    expect(screen.queryByText('Inspector workload')).toBeNull();
  });
  it('a finance report without operational sections shows no operational tables; no samples ⇒ "not available yet", not 0 hours', async () => {
    api.get.mockResolvedValue(org('finance')); api.report.mockResolvedValue({ period: REPORT.period, earnings_by_branch: REPORT.earnings_by_branch, report_quality: { reports: 0, with_amendment: 0, correction_rate: null, avg_turnaround_hours: null, turnaround_samples: 0 } });
    render(<OrganizationWorkspace organizationId={ORG} />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Report' }));
    await screen.findByText('Money by branch');
    expect(screen.queryByText('Bookings by branch')).toBeNull(); expect(document.body.textContent).toMatch(/not available yet/);
  });
  it('rejects an inverted date range in the form and passes dates and branch to the server', async () => {
    api.get.mockResolvedValue(org('owner')); api.report.mockResolvedValue(REPORT);
    render(<OrganizationWorkspace organizationId={ORG} />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Report' })); await screen.findByText('Bookings by branch');
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-10-05' } }); fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-10-01' } });
    expect(screen.getByRole('alert').textContent).toMatch(/start date must not be after/); expect((screen.getByRole('button', { name: 'Update report' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-10-01' } }); fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-10-20' } }); fireEvent.change(screen.getByLabelText('Branch'), { target: { value: 'b2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update report' }));
    await waitFor(() => expect(api.report).toHaveBeenLastCalledWith(ORG, { from: '2026-10-01', to: '2026-10-20', branchId: 'b2' }));
  });
  it('a failed report is an error with Retry, not zeros', async () => {
    api.get.mockResolvedValue(org('owner')); api.report.mockRejectedValue({ response: { status: 500, data: { message: 'down' } } });
    render(<OrganizationWorkspace organizationId={ORG} />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Report' }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/could not load the report/);
  });
});

describe('my memberships and worklist', () => {
  it('accepts, declines and leaves through the organization API; expired invitations cannot be accepted', async () => {
    api.myMemberships.mockResolvedValue({ memberships: [
      { id: 'i1', organizationId: 'o1', organizationName: 'Acme', accessRole: 'inspector', title: 'junior_inspector', branchId: null, branchName: null, status: 'pending', isActive: false, invitationExpired: false },
      { id: 'i2', organizationId: 'o2', organizationName: 'Old', accessRole: 'inspector', title: 'junior_inspector', branchId: null, branchName: null, status: 'pending', isActive: false, invitationExpired: true },
      { id: 'c1', organizationId: 'o3', organizationName: 'Beta', accessRole: 'branch_manager', title: 'junior_inspector', branchId: 'b', branchName: 'East', status: 'confirmed', isActive: true, invitationExpired: false },
    ] });
    api.acceptInvitation.mockResolvedValue({}); api.leave.mockResolvedValue({});
    const open = vi.fn();
    render(<MyMembershipsPanel onOpenWorkspace={open} />);
    expect(await screen.findByText(/Acme · Inspector/)).toBeTruthy(); expect(screen.queryByText(/Old ·/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Accept' })); await waitFor(() => expect(api.acceptInvitation).toHaveBeenCalledWith('i1'));
    fireEvent.click(screen.getByRole('button', { name: 'Decline' })); await waitFor(() => expect(api.leave).toHaveBeenCalledWith('i1', 'declined the invitation'));
    fireEvent.click(screen.getByRole('button', { name: 'Leave' })); await waitFor(() => expect(api.leave).toHaveBeenCalledWith('c1', 'left the organization'));
    fireEvent.click(screen.getByRole('button', { name: 'Open workspace' })); expect(open).toHaveBeenCalledWith('o3');
  });
  it('the worklist acts on the right organization, and says why it is empty', async () => {
    api.myWorklist.mockResolvedValue({ items: [booking({ provider_id: 'org-9', status: 'inspection_started' })], memberships: 1 }); api.transition.mockResolvedValue({});
    const { unmount } = render(<MyMembershipsPanel />);
    fireEvent.click(await screen.findByRole('button', { name: 'Complete inspection' }));
    await waitFor(() => expect(api.transition).toHaveBeenCalledWith('org-9', 'bk1', 'complete'));
    unmount(); api.myWorklist.mockResolvedValue({ items: [], memberships: 0 });
    render(<MyMembershipsPanel />);
    expect(await screen.findByText(/once you are an active inspector or technician/)).toBeTruthy();
  });
});

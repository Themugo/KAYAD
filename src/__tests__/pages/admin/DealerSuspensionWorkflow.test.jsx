// Component evidence for the dealer suspension request/approval screens (mocked API). The authoritative proof is
// ci/db-journeys/30_personal_accounts_and_dealer_suspension.mjs (real HTTP + PostgreSQL): the frontend never decides authorisation.
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';

const api = vi.hoisted(() => ({
  list: vi.fn(), requestSuspension: vi.fn(), suspensionRequests: vi.fn(), decideSuspension: vi.fn(), cancelSuspension: vi.fn(), suspend: vi.fn(), reinstate: vi.fn(), approve: vi.fn(), reject: vi.fn(), getById: vi.fn(),
}));
let role = 'admin';
vi.mock('../../../api/api', async (orig) => ({ ...(await orig()), adminVerificationAPI: api }));
vi.mock('../../../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1', role, name: 'Staff' } }) }));
import AdminDealerVerifications from '../../../pages/admin/AdminDealerVerifications';

const approvedRow = { _id: 'v1', id: 'v1', verificationStatus: 'approved', status: 'approved', createdAt: '2026-10-20T10:00:00Z', user: { name: 'Dealer Owner', email: 'd@x.test' }, dealer: { businessName: 'Iota Motors' } };
const suspendedRow = { ...approvedRow, _id: 'v2', id: 'v2', verificationStatus: 'suspended', dealer: { businessName: 'Kappa Motors' } };
const page = (rows) => ({ verifications: rows, pagination: { page: 1, limit: 20, total: rows.length, pages: 1 }, summary: { pending: 0, approved: 1, rejected: 0, suspended: 1, total: rows.length } });
const pendingReq = { id: 'aaaaaaaa-1111-4111-8111-111111111111', verificationId: 'bbbbbbbb-2222-4222-8222-222222222222', reasonCategory: 'fraud_or_misrepresentation', reason: 'Repeated listing misrepresentation reported', status: 'pending', requestedBy: 'x', createdAt: '2026-10-21T10:00:00Z' };

beforeEach(() => { Object.values(api).forEach((f) => f.mockReset()); api.list.mockResolvedValue(page([approvedRow, suspendedRow])); api.suspensionRequests.mockResolvedValue({ data: [] }); });
afterEach(cleanup);

describe('Admin staff: request, never a direct suspension', () => {
  it('shows "Request suspension" (not "Suspend") and no Reinstate', async () => {
    role = 'admin'; render(<AdminDealerVerifications />);
    expect(await screen.findByRole('button', { name: 'Request suspension' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Suspend$/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Reinstate$/ })).toBeNull();
  });
  it('requires a detailed reason and the confirmation, then submits a request (and never calls suspend)', async () => {
    role = 'admin'; api.requestSuspension.mockResolvedValue({ success: true, data: { id: 'r1' } });
    render(<AdminDealerVerifications />);
    fireEvent.click(await screen.findByRole('button', { name: 'Request suspension' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit request' }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/specific suspension reason/i);
    fireEvent.change(screen.getByLabelText('Detailed reason for the suspension request'), { target: { value: 'too short' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit request' }));
    expect(screen.getByRole('alert').textContent).toMatch(/at least 10/);
    fireEvent.change(screen.getByLabelText('Detailed reason for the suspension request'), { target: { value: 'Repeated listing misrepresentation reported by buyers' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit request' }));
    expect(screen.getByRole('alert').textContent).toMatch(/does not suspend/i);
    expect(api.requestSuspension).not.toHaveBeenCalled();
    fireEvent.click(screen.getByLabelText(/I confirm this submits a suspension request/));
    fireEvent.click(screen.getByRole('button', { name: 'Submit request' }));
    await waitFor(() => expect(api.requestSuspension).toHaveBeenCalledWith('v1', expect.objectContaining({ reasonCategory: 'policy_violation', reason: 'Repeated listing misrepresentation reported by buyers' })));
    expect(api.suspend).not.toHaveBeenCalled();
  });
  it('shows the server refusal honestly and keeps the modal open (no fake success)', async () => {
    role = 'admin'; api.requestSuspension.mockRejectedValue({ response: { status: 409, data: { message: 'A suspension request for this dealer is already pending.' } } });
    render(<AdminDealerVerifications />);
    fireEvent.click(await screen.findByRole('button', { name: 'Request suspension' }));
    fireEvent.change(screen.getByLabelText('Detailed reason for the suspension request'), { target: { value: 'Repeated listing misrepresentation reported by buyers' } });
    fireEvent.click(screen.getByLabelText(/I confirm this submits/));
    fireEvent.click(screen.getByRole('button', { name: 'Submit request' }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/already pending/);
  });
  it('lists their own pending request with a Cancel control and no approve/reject controls', async () => {
    role = 'admin'; api.suspensionRequests.mockResolvedValue({ data: [pendingReq] });
    render(<AdminDealerVerifications />);
    expect(await screen.findByText(/Awaiting Super Admin decision/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cancel request' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Approve suspension' })).toBeNull();
  });
  it('says plainly when requests are not provisioned', async () => {
    role = 'admin'; api.suspensionRequests.mockRejectedValue({ response: { status: 503, data: {} } });
    render(<AdminDealerVerifications />);
    expect(await screen.findByText(/not provisioned in this environment/)).toBeTruthy();
  });
});

describe('Super Admin: decides requests', () => {
  it('sees direct Suspend and Reinstate, plus pending requests with approve/reject', async () => {
    role = 'superadmin'; api.suspensionRequests.mockResolvedValue({ data: [pendingReq] });
    render(<AdminDealerVerifications />);
    expect(await screen.findByRole('button', { name: 'Suspend' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reinstate' })).toBeTruthy();
    expect(await screen.findByRole('button', { name: 'Approve suspension' })).toBeTruthy();
  });
  it('rejecting needs a reason; approving asks for confirmation then calls the decision endpoint', async () => {
    role = 'superadmin'; api.suspensionRequests.mockResolvedValue({ data: [pendingReq] }); api.decideSuspension.mockResolvedValue({ success: true });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<AdminDealerVerifications />);
    fireEvent.click(await screen.findByRole('button', { name: 'Reject request' }));
    expect(api.decideSuspension).not.toHaveBeenCalled();
    expect((await screen.findByText(/Enter a reason to reject/))).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Approve suspension' }));
    await waitFor(() => expect(api.decideSuspension).toHaveBeenCalledWith(pendingReq.id, { decision: 'approve', reason: undefined }));
    expect(confirm).toHaveBeenCalled();
    confirm.mockRestore();
  });
});

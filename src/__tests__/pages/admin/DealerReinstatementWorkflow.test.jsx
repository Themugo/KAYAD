// OD-2 / OD-3 component evidence (mocked API). Authority is proved server-side by ci/db-journeys/33_governance_decisions.mjs.
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

const api = vi.hoisted(() => ({ list: vi.fn(), requestSuspension: vi.fn(), requestReinstatement: vi.fn(), suspensionRequests: vi.fn(), decideSuspension: vi.fn(), cancelSuspension: vi.fn(), suspend: vi.fn(), reinstate: vi.fn(), approve: vi.fn(), reject: vi.fn(), getById: vi.fn() }));
let role = 'admin';
vi.mock('../../../api/api', async (orig) => ({ ...(await orig()), adminVerificationAPI: api }));
vi.mock('../../../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1', role, name: 'Staff' } }) }));
import AdminDealerVerifications from '../../../pages/admin/AdminDealerVerifications';

const suspendedRow = { _id: 'v2', id: 'v2', verificationStatus: 'suspended', status: 'suspended', createdAt: '2026-10-20T10:00:00Z', user: { name: 'Dealer Owner', email: 'd@x.test' }, dealer: { businessName: 'Kappa Motors' } };
const page = (rows) => ({ verifications: rows, pagination: { page: 1, limit: 20, total: rows.length, pages: 1 }, summary: { pending: 0, approved: 0, rejected: 0, suspended: 1, total: rows.length } });
const reinReq = { id: 'cccccccc-1111-4111-8111-111111111111', verificationId: 'v2', requestType: 'reinstatement', relatedRequestId: 'dddddddd-1111-4111-8111-111111111111', reasonCategory: 'issue_resolved', reason: 'Documents re-verified and corrected', status: 'pending', requestedBy: 'x', createdAt: '2026-10-21T10:00:00Z' };

beforeEach(() => { Object.values(api).forEach((f) => f.mockReset()); api.list.mockResolvedValue(page([suspendedRow])); api.suspensionRequests.mockResolvedValue({ data: [] }); });
afterEach(cleanup);

describe('Admin: requests reinstatement, cannot reinstate', () => {
  it('offers "Request reinstatement" and no direct Reinstate for an ordinary Admin', async () => {
    role = 'admin'; render(<AdminDealerVerifications />);
    expect(await screen.findByRole('button', { name: 'Request reinstatement' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Reinstate$/ })).toBeNull();
  });
  it('validates, requires acknowledgement, then submits a reinstatement REQUEST (never reinstate)', async () => {
    role = 'admin'; api.requestReinstatement.mockResolvedValue({ success: true, data: { id: 'r9' } });
    render(<AdminDealerVerifications />);
    fireEvent.click(await screen.findByRole('button', { name: 'Request reinstatement' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit request' }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/reason/i);
    fireEvent.change(screen.getByLabelText('Detailed reason for the reinstatement request'), { target: { value: 'Documents re-verified and corrected' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit request' }));
    expect(screen.getByRole('alert').textContent).toMatch(/does not reinstate/i);
    expect(api.requestReinstatement).not.toHaveBeenCalled();
    fireEvent.click(screen.getByLabelText(/submits a reinstatement request for Super Admin approval/));
    fireEvent.click(screen.getByRole('button', { name: 'Submit request' }));
    await waitFor(() => expect(api.requestReinstatement).toHaveBeenCalledWith('v2', expect.objectContaining({ reasonCategory: 'issue_resolved' })));
    expect(api.reinstate).not.toHaveBeenCalled();
    expect(api.approve).not.toHaveBeenCalled();
  });
});

describe('Dialog accessibility (modal focus management)', () => {
  it('is a labelled modal dialog, moves focus in, closes on Escape and returns focus to the opener', async () => {
    role = 'admin'; render(<AdminDealerVerifications />);
    const opener = await screen.findByRole('button', { name: 'Request reinstatement' });
    opener.focus(); fireEvent.click(opener);
    const dlg = await screen.findByRole('dialog');
    expect(dlg.getAttribute('aria-modal')).toBe('true');
    expect(dlg.getAttribute('aria-labelledby')).toBeTruthy();
    await waitFor(() => expect(dlg.contains(document.activeElement)).toBe(true));
    fireEvent.keyDown(dlg, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(opener));
  });
});

describe('Super Admin: decides reinstatement', () => {
  it('shows a reinstatement request as "Approve reinstatement" and calls the decision endpoint', async () => {
    role = 'superadmin'; api.suspensionRequests.mockResolvedValue({ data: [reinReq] }); api.decideSuspension.mockResolvedValue({ success: true });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<AdminDealerVerifications />);
    fireEvent.click(await screen.findByRole('button', { name: 'Approve reinstatement' }));
    await waitFor(() => expect(api.decideSuspension).toHaveBeenCalledWith(reinReq.id, { decision: 'approve', reason: undefined }));
    confirm.mockRestore();
  });
});

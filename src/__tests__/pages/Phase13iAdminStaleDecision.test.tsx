// Phase 13I — a refused (stale/concurrent) administrator decision must reload the real state instead of leaving stale buttons.
// EVIDENCE TIER: component test with a mocked API client; the concurrent-decision behaviour itself is certified over real HTTP
// in runbooks/phase13i-20261026/http/phase13i_personal_account_matrix.mjs (section C).
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import AdminPrivateSellerApplications from '../../pages/admin/AdminPrivateSellerApplications';

const getPrivateSellerApplications = vi.fn();
const decidePrivateSellerApplication = vi.fn();
const toast = vi.fn();
vi.mock('../../services/privateSellerCapabilityApi', () => ({
  getPrivateSellerApplications: (...a: unknown[]) => getPrivateSellerApplications(...a),
  decidePrivateSellerApplication: (...a: unknown[]) => decidePrivateSellerApplication(...a),
}));
vi.mock('../../context/ToastContext', () => ({ useToast: () => ({ toast }) }));

const base = { userId: '11111111-1111-4111-8111-111111111111', contactPhone: '+254712345678', intendedUse: 'Own car', source: 'application', submittedAt: '2026-10-25T10:00:00.000Z', reviewedAt: null, reviewReason: null };

beforeEach(() => { getPrivateSellerApplications.mockReset(); decidePrivateSellerApplication.mockReset(); toast.mockReset(); });
afterEach(() => cleanup());

describe('stale administrator decision', () => {
  it('shows the server refusal AND reloads, so the row reflects the state another administrator set', async () => {
    getPrivateSellerApplications.mockResolvedValueOnce([{ ...base, status: 'pending' }]).mockResolvedValueOnce([{ ...base, status: 'approved' }]);
    decidePrivateSellerApplication.mockRejectedValue(new Error('Cannot approve an application that is approved.'));
    render(<AdminPrivateSellerApplications />);
    fireEvent.click(await screen.findByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Cannot approve an application that is approved.', 'error'));
    await waitFor(() => expect(getPrivateSellerApplications).toHaveBeenCalledTimes(2));
    // the stale Approve/Reject actions are gone; only actions valid for the real (approved) state remain
    expect(await screen.findByRole('button', { name: 'Suspend' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Reject' })).toBeNull();
  });
});

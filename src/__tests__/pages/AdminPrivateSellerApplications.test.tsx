// EVIDENCE TIER: component tests with a mocked API client (unit). The real API/database workflow is covered by
// runbooks/phase13f-20261025/http/phase13f_http_lifecycle_matrix.mjs (real backend + PostgreSQL).
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import AdminPrivateSellerApplications from '../../pages/admin/AdminPrivateSellerApplications';

const getPrivateSellerApplications = vi.fn();
const decidePrivateSellerApplication = vi.fn();
const toast = vi.fn();
vi.mock('../../services/privateSellerCapabilityApi', () => ({
  getPrivateSellerApplications: (...args: unknown[]) => getPrivateSellerApplications(...args),
  decidePrivateSellerApplication: (...args: unknown[]) => decidePrivateSellerApplication(...args),
}));
vi.mock('../../context/ToastContext', () => ({ useToast: () => ({ toast }) }));

const pending = {
  userId: '11111111-1111-4111-8111-111111111111', status: 'pending', contactPhone: '+254712345678',
  intendedUse: 'Sell my own vehicle', source: 'application', submittedAt: '2026-10-25T10:00:00.000Z', reviewedAt: null, reviewReason: null,
};
const approved = { ...pending, userId: '22222222-2222-4222-8222-222222222222', status: 'approved' };
const suspended = { ...pending, userId: '33333333-3333-4333-8333-333333333333', status: 'suspended', reviewReason: 'Policy review' };
const outcome = (after: string, visibility?: unknown) => ({ before: 'x', after, application: null, visibility });

beforeEach(() => { getPrivateSellerApplications.mockReset(); decidePrivateSellerApplication.mockReset(); toast.mockReset(); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('admin private-seller application review', () => {
  it('shows a loading state, then actual application records with approve/reject controls for pending applications', async () => {
    getPrivateSellerApplications.mockResolvedValue([pending]);
    render(<AdminPrivateSellerApplications />);
    expect(screen.getByRole('status').textContent).toMatch(/Loading application records/);
    expect(await screen.findByText(/Sell my own vehicle/)).toBeTruthy();
    expect(screen.getByText(`Personal account: ${pending.userId}`)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Approve' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reject' })).toBeTruthy();
    expect(getPrivateSellerApplications).toHaveBeenCalledWith('pending');
  });

  it('shows an honest empty state for an empty queue (no invented rows)', async () => {
    getPrivateSellerApplications.mockResolvedValue([]);
    render(<AdminPrivateSellerApplications />);
    expect(await screen.findByText('No applications in this view')).toBeTruthy();
    expect(screen.queryByRole('article')).toBeNull();
  });

  it('filters by status through the API and exposes the pressed state', async () => {
    getPrivateSellerApplications.mockResolvedValue([]);
    render(<AdminPrivateSellerApplications />);
    await screen.findByText('No applications in this view');
    const group = screen.getByRole('group', { name: 'Filter private-seller applications' });
    expect(within(group).getByRole('button', { name: 'Pending' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(within(group).getByRole('button', { name: 'Suspended' }));
    await waitFor(() => expect(getPrivateSellerApplications).toHaveBeenLastCalledWith('suspended'));
    expect(within(group).getByRole('button', { name: 'Suspended' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(within(group).getByRole('button', { name: 'All applications' }));
    await waitFor(() => expect(getPrivateSellerApplications).toHaveBeenLastCalledWith(undefined));
  });

  it('requires a reason before rejection and does not call the API without one', async () => {
    getPrivateSellerApplications.mockResolvedValue([pending]);
    render(<AdminPrivateSellerApplications />);
    fireEvent.click(await screen.findByRole('button', { name: 'Reject' }));
    expect(decidePrivateSellerApplication).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith('Enter a reason before taking this action.', 'error');
  });

  it('submits an authorized rejection with the reason, then refreshes from the server', async () => {
    getPrivateSellerApplications.mockResolvedValueOnce([pending]).mockResolvedValueOnce([]);
    decidePrivateSellerApplication.mockResolvedValue(outcome('rejected'));
    render(<AdminPrivateSellerApplications />);
    fireEvent.change(await screen.findByLabelText(/Decision reason/), { target: { value: 'Vehicle ownership documents required' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
    await waitFor(() => expect(decidePrivateSellerApplication).toHaveBeenCalledWith(pending.userId, 'reject', 'Vehicle ownership documents required'));
    expect(toast).toHaveBeenCalledWith('Private-seller application rejected.', 'success');
    await waitFor(() => expect(getPrivateSellerApplications).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('No applications in this view')).toBeTruthy();
  });

  it('approves without a reason and reflects the committed server list', async () => {
    getPrivateSellerApplications.mockResolvedValueOnce([pending]).mockResolvedValueOnce([]);
    decidePrivateSellerApplication.mockResolvedValue(outcome('approved'));
    render(<AdminPrivateSellerApplications />);
    fireEvent.click(await screen.findByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(decidePrivateSellerApplication).toHaveBeenCalledWith(pending.userId, 'approve', undefined));
    expect(toast).toHaveBeenCalledWith('Private-seller application approved.', 'success');
    await waitFor(() => expect(getPrivateSellerApplications).toHaveBeenCalledTimes(2));
  });

  it('asks for confirmation before suspension and sends nothing when the administrator cancels', async () => {
    getPrivateSellerApplications.mockResolvedValue([approved]);
    vi.stubGlobal('confirm', vi.fn(() => false));
    render(<AdminPrivateSellerApplications />);
    fireEvent.click(await screen.findByRole('button', { name: 'Suspend' }));
    expect(decidePrivateSellerApplication).not.toHaveBeenCalled();           // reason missing
    fireEvent.change(screen.getByLabelText(/Decision reason/), { target: { value: 'Policy review' } });
    fireEvent.click(screen.getByRole('button', { name: 'Suspend' }));
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('hide the seller’s currently published, approved listings'));
    expect(decidePrivateSellerApplication).not.toHaveBeenCalled();           // cancelled
  });

  it('suspends after confirmation and revokes with a reason', async () => {
    getPrivateSellerApplications.mockResolvedValue([approved]);
    decidePrivateSellerApplication.mockResolvedValue(outcome('suspended', { changed: true, cacheInvalidated: true, listingsHiddenByPolicy: 2 }));
    vi.stubGlobal('confirm', vi.fn(() => true));
    render(<AdminPrivateSellerApplications />);
    fireEvent.change(await screen.findByLabelText(/Decision reason/), { target: { value: 'Policy review' } });
    fireEvent.click(screen.getByRole('button', { name: 'Suspend' }));
    await waitFor(() => expect(decidePrivateSellerApplication).toHaveBeenCalledWith(approved.userId, 'suspend', 'Policy review'));
    fireEvent.change(await screen.findByLabelText(/Decision reason/), { target: { value: 'Fraud confirmed' } });
    fireEvent.click(screen.getByRole('button', { name: 'Revoke' }));
    await waitFor(() => expect(decidePrivateSellerApplication).toHaveBeenCalledWith(approved.userId, 'revoke', 'Fraud confirmed'));
    expect(toast).not.toHaveBeenCalledWith(expect.stringContaining('could not be refreshed'), 'error');
  });

  it('offers restore for suspended applications', async () => {
    getPrivateSellerApplications.mockResolvedValue([suspended]);
    decidePrivateSellerApplication.mockResolvedValue(outcome('approved', { changed: true, cacheInvalidated: true, listingsHiddenByPolicy: 0 }));
    render(<AdminPrivateSellerApplications />);
    fireEvent.click(await screen.findByRole('button', { name: 'Restore approval' }));
    await waitFor(() => expect(decidePrivateSellerApplication).toHaveBeenCalledWith(suspended.userId, 'approve', undefined));
  });

  it('tells the administrator when the decision was saved but public caches could not be refreshed', async () => {
    getPrivateSellerApplications.mockResolvedValue([approved]);
    decidePrivateSellerApplication.mockResolvedValue(outcome('suspended', { changed: true, cacheInvalidated: false, listingsHiddenByPolicy: 1 }));
    vi.stubGlobal('confirm', vi.fn(() => true));
    render(<AdminPrivateSellerApplications />);
    fireEvent.change(await screen.findByLabelText(/Decision reason/), { target: { value: 'Policy review' } });
    fireEvent.click(screen.getByRole('button', { name: 'Suspend' }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.stringContaining('public listing caches could not be refreshed'), 'error'));
  });

  it('shows the server error, does NOT claim success, and reloads the real state when a decision fails (Phase 13I: a refusal may mean the row is stale)', async () => {
    getPrivateSellerApplications.mockResolvedValue([pending]);
    decidePrivateSellerApplication.mockRejectedValue(new Error('Insufficient permissions'));
    render(<AdminPrivateSellerApplications />);
    fireEvent.click(await screen.findByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Insufficient permissions', 'error'));
    expect(toast).not.toHaveBeenCalledWith(expect.stringContaining('approved'), 'success');
    await waitFor(() => expect(getPrivateSellerApplications).toHaveBeenCalledTimes(2)); // reload after refusal, so stale actions cannot linger
    expect((await screen.findByRole('button', { name: 'Approve' }) as HTMLButtonElement).disabled).toBe(false); // can retry
  });

  it('shows an actionable error instead of an empty result, and Refresh retries successfully', async () => {
    getPrivateSellerApplications.mockRejectedValueOnce(new Error('Permission denied')).mockResolvedValueOnce([pending]);
    render(<AdminPrivateSellerApplications />);
    expect((await screen.findByRole('alert')).textContent).toMatch(/Permission denied/);
    expect(screen.queryByText('No applications in this view')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Refresh/ }));
    expect(await screen.findByText(/Sell my own vehicle/)).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('exposes accessible landmarks and labelled controls', async () => {
    getPrivateSellerApplications.mockResolvedValue([pending]);
    render(<AdminPrivateSellerApplications />);
    await screen.findByText(/Sell my own vehicle/);
    expect(screen.getByRole('main').getAttribute('aria-labelledby')).toBe('private-seller-review-title');
    expect(screen.getByRole('heading', { level: 1, name: 'Private-seller applications' })).toBeTruthy();
    const textarea = screen.getByLabelText(/Decision reason/) as HTMLTextAreaElement;
    expect(textarea.tagName).toBe('TEXTAREA');
    expect(textarea.maxLength).toBe(500);
    expect(screen.getByRole('article', { name: `Application ${pending.userId}` })).toBeTruthy();
  });
});

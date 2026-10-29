import { beforeEach, describe, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const h = vi.hoisted(() => ({
  referrals: vi.fn(),
  referralStats: vi.fn(),
  userReferrals: vi.fn(),
  creditReferral: vi.fn(),
  expireReferral: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('../../../api/api', () => ({
  adminAPI: {
    referrals: (...args) => h.referrals(...args),
    referralStats: (...args) => h.referralStats(...args),
    userReferrals: (...args) => h.userReferrals(...args),
    creditReferral: (...args) => h.creditReferral(...args),
    expireReferral: (...args) => h.expireReferral(...args),
  },
  formatKES: value => `KES ${value}`,
}));
vi.mock('../../../context/ToastContext', () => ({ useToast: () => ({ toast: h.toast }) }));

import AdminReferrals from '../../../pages/admin/AdminReferrals';

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  h.referrals.mockResolvedValue({ referrals: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } });
});

describe('Admin referrals reliability', () => {
  test('shows an API failure instead of claiming there are no referrals', async () => {
    h.referrals.mockRejectedValueOnce(new Error('scheduled maintenance'));
    render(<AdminReferrals />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/scheduled maintenance/i);
    expect(screen.queryByText('No referrals found')).toBeNull();
  });

  test('retry loads the list and only then shows a true empty state', async () => {
    h.referrals.mockRejectedValueOnce(new Error('temporary outage'));
    render(<AdminReferrals />);
    fireEvent.click(await screen.findByRole('button', { name: /retry loading/i }));
    expect(await screen.findByText('No referrals found')).toBeTruthy();
    await waitFor(() => expect(h.referrals).toHaveBeenCalledTimes(2));
  });

  test('validates unexpected list envelopes and surfaces a retryable error', async () => {
    h.referrals.mockResolvedValueOnce({ success: true });
    render(<AdminReferrals />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/unexpected referrals response/i);
    expect(screen.queryByText('No referrals found')).toBeNull();
  });

  test('loads the referral tree only after explicit user submission', async () => {
    h.userReferrals.mockResolvedValue({ user: { name: 'Test User', email: 'test@example.com', referralCount: 0, credits: 0, referralEarnings: 0 }, referred: [], referredBy: null });
    render(<AdminReferrals />);
    fireEvent.click(screen.getByRole('button', { name: /user tree/i }));
    expect(h.userReferrals).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(/user id for referral tree/i), { target: { value: 'user-123' } });
    fireEvent.click(screen.getByRole('button', { name: /load referral tree/i }));
    await waitFor(() => expect(h.userReferrals).toHaveBeenCalledWith('user-123'));
    expect(await screen.findByText('Test User')).toBeTruthy();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const m = vi.hoisted(() => ({ getSubscription: vi.fn() }));
vi.mock('../../../api/api', () => ({ dealerAPI: { getSubscription: m.getSubscription } }));
import DealerAccountStatus from '../../../pages/dealer/dashboard/DealerAccountStatus';
beforeEach(() => vi.clearAllMocks());

describe('Dealer Hub account status', () => {
  it('shows the active plan and listing usage', async () => {
    m.getSubscription.mockResolvedValue({ entitlement: { status: 'active', planName: 'Starter', listingMax: 10, listingsUsed: 3, expiresAt: '2026-12-01T00:00:00Z' } });
    render(<DealerAccountStatus approved />);
    expect(await screen.findByText(/Starter/)).toBeInTheDocument();
    expect(screen.getByText(/3 of 10/)).toBeInTheDocument();
    expect(screen.getByText(/Approved/)).toBeInTheDocument();
  });
  it('says plainly when there is no active plan', async () => {
    m.getSubscription.mockResolvedValue({ entitlement: { status: 'none', listingMax: 0, listingsUsed: 0 } });
    render(<DealerAccountStatus approved />);
    expect(await screen.findByText(/No active listing plan/)).toBeInTheDocument();
  });
  it('offers a retry when the plan cannot be loaded, and never invents a plan', async () => {
    m.getSubscription.mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce({ entitlement: { status: 'active', planName: 'Pro', listingMax: 50, listingsUsed: 0 } });
    render(<DealerAccountStatus approved={false} />);
    expect(await screen.findByText(/could not be loaded/i)).toBeInTheDocument();
    expect(screen.getByText(/Pending KAYAD review/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reload plan' }));
    expect(await screen.findByText(/Pro/)).toBeInTheDocument();
  });
});

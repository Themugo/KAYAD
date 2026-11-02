import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const m = vi.hoisted(() => ({ getSubscription: vi.fn(), getVerificationStatus: vi.fn() }));
vi.mock('../../../api/api', () => ({ dealerAPI: { getSubscription: m.getSubscription } }));
vi.mock('../../../services/dealerPlatformApi', () => ({ getVerificationStatus: m.getVerificationStatus }));
import DealerAccountStatus from '../../../pages/dealer/dashboard/DealerAccountStatus';
beforeEach(() => { vi.clearAllMocks(); m.getVerificationStatus.mockResolvedValue({ onboardingStage: 'approved' }); });

describe('Dealer Hub account status', () => {
  it('shows the active plan and listing usage', async () => {
    m.getSubscription.mockResolvedValue({ entitlement: { status: 'active', planName: 'Starter', listingMax: 10, listingsUsed: 3, expiresAt: '2026-12-01T00:00:00Z', subscriptionRequired: false } });
    render(<DealerAccountStatus />);
    expect(await screen.findByText(/Starter/)).toBeInTheDocument();
    expect(screen.getByText(/3 of 10/)).toBeInTheDocument();
    expect(await screen.findByText(/Approved/)).toBeInTheDocument();
  });
  it('shows Approved from the verification service, not from the login record', async () => {
    m.getSubscription.mockResolvedValue({ entitlement: { status: 'none', subscriptionRequired: false } });
    render(<DealerAccountStatus />);
    expect(await screen.findByText('Approved')).toBeInTheDocument();
    expect(screen.queryByText(/Pending KAYAD review/)).toBeNull();
  });
  it('shows Pending only while the application is genuinely pending', async () => {
    m.getVerificationStatus.mockResolvedValue({ onboardingStage: 'pending_approval' });
    m.getSubscription.mockResolvedValue({ entitlement: { status: 'none', subscriptionRequired: false } });
    render(<DealerAccountStatus />);
    expect(await screen.findByText(/Pending KAYAD review/)).toBeInTheDocument();
  });
  it('says listing is free when no plan is required', async () => {
    m.getSubscription.mockResolvedValue({ entitlement: { status: 'none', listingMax: 0, listingsUsed: 0, subscriptionRequired: false } });
    render(<DealerAccountStatus />);
    expect(await screen.findByText(/Listing is free/)).toBeInTheDocument();
    expect(screen.queryByText(/No active listing plan/)).toBeNull();
  });
  it('says plainly when a plan is required and missing', async () => {
    m.getSubscription.mockResolvedValue({ entitlement: { status: 'none', listingMax: 0, listingsUsed: 0, subscriptionRequired: true } });
    render(<DealerAccountStatus />);
    expect(await screen.findByText(/No active listing plan/)).toBeInTheDocument();
  });
  it('offers a retry when the plan cannot be loaded, and never invents a plan', async () => {
    m.getSubscription.mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce({ entitlement: { status: 'active', planName: 'Pro', listingMax: 50, listingsUsed: 0 } });
    render(<DealerAccountStatus />);
    expect(await screen.findByText(/could not be loaded/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reload plan' }));
    expect(await screen.findByText(/Pro/)).toBeInTheDocument();
  });
});

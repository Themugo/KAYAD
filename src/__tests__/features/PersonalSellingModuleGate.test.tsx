// Phase 13E — the seller workspace entry is driven by the real capability of the SAME personal account. Component tests, mocked APIs.
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PersonalSellingModule from '../../features/PrivateSellerPlatform/pages/PersonalSellingModule';

const getMySellerCapability = vi.fn();
vi.mock('../../services/privateSellerCapabilityApi', () => ({ getMySellerCapability: (...a: unknown[]) => getMySellerCapability(...a), applyForPrivateSelling: vi.fn() }));

const cap = (status: string) => ({ status, source: 'capability', application: status === 'none' ? null : { status, reviewReason: null, submittedAt: 'x', reviewedAt: null }, canApply: status === 'none' || status === 'rejected', canList: status === 'approved' });
const mount = (role: string, initialSection: 'listing-quality' | 'listing-wizard' | 'trust-center' | 'auction-verification' | 'help' = 'listing-quality') => render(<MemoryRouter><PersonalSellingModule user={{ id: 'u1', name: 'J', role } as never} initialSection={initialSection} isEmailVerified={true} listings={[]} listingsLoading={false} onRefreshListings={() => {}} onNavigate={() => {}} /></MemoryRouter>);

beforeEach(() => { getMySellerCapability.mockReset(); vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline'))); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('Personal selling module inside the unified account', () => {
  it('does not offer a separate seller application or seller account when free personal selling is open', async () => {
    getMySellerCapability.mockResolvedValue({ ...cap('approved'), source: 'policy_default', canApply: false, canList: true });
    mount('user');
    expect(await screen.findByLabelText('My vehicles and selling tools')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /apply to sell/i })).toBeNull();
  });
  it.each(['pending', 'rejected', 'suspended', 'revoked'])('%s capability does not hide existing My Vehicles history', async (st) => {
    getMySellerCapability.mockResolvedValue(cap(st));
    mount('user', 'listing-quality');
    expect(await screen.findByLabelText('My vehicles and selling tools')).toBeTruthy();
    expect(screen.queryByTestId('kayad-seller-access-state')).toBeNull();
  });

  it.each(['pending', 'rejected', 'suspended', 'revoked'])('%s capability still gates creating a new listing', async (st) => {
    getMySellerCapability.mockResolvedValue(cap(st));
    mount('user', 'listing-wizard');
    expect(await screen.findByTestId('kayad-seller-access-state')).toBeTruthy();
    expect(screen.queryByTestId('personal-account-listing-wizard')).toBeNull();
  });

  it('keeps Verification & Trust accessible when selling capability is restricted', async () => {
    getMySellerCapability.mockResolvedValue(cap('suspended'));
    mount('user', 'trust-center');
    expect(await screen.findByText('Your verification status')).toBeTruthy();
    expect(screen.queryByTestId('kayad-seller-access-state')).toBeNull();
  });

  it('keeps Help & Support accessible when selling capability is restricted', async () => {
    getMySellerCapability.mockResolvedValue(cap('suspended'));
    mount('user', 'help');
    expect(await screen.findByText(/Need help with your account/i)).toBeTruthy();
    expect(screen.queryByTestId('kayad-seller-access-state')).toBeNull();
  });
  it('free policy default admits personal accounts without seller application or package', async () => {
    getMySellerCapability.mockResolvedValue({ ...cap('approved'), source: 'policy_default', canApply: false, canList: true });
    mount('user');
    expect(await screen.findByLabelText('My vehicles and selling tools')).toBeTruthy();
    expect(screen.queryByTestId('kayad-seller-access-state')).toBeNull();
  });

  it('keeps existing My Vehicles history visible to the retired buyer role without enabling seller capability', async () => {
    mount('buyer', 'listing-quality');
    expect(await screen.findByLabelText('My vehicles and selling tools')).toBeTruthy();
    expect(getMySellerCapability).not.toHaveBeenCalled();
  });

  it('keeps Trust and Help reachable to the retired buyer role', async () => {
    mount('buyer', 'trust-center');
    expect(await screen.findByText('Your verification status')).toBeTruthy();
    expect(getMySellerCapability).not.toHaveBeenCalled();
  });

  it('does not promise private listing creation to the retired buyer role', async () => {
    mount('buyer', 'listing-wizard');
    expect(await screen.findByTestId('kayad-seller-access-state')).toBeTruthy();
    expect(getMySellerCapability).not.toHaveBeenCalled();
  });

  it('requires verified email before opening the create-listing wizard', async () => {
    getMySellerCapability.mockResolvedValue({ ...cap('approved'), source: 'policy_default', canApply: false, canList: true });
    render(<MemoryRouter><PersonalSellingModule user={{ id: 'u1', name: 'J', role: 'user' } as never} isEmailVerified={false} initialSection="listing-wizard" listings={[]} listingsLoading={false} onRefreshListings={() => {}} onNavigate={() => {}} /></MemoryRouter>);
    expect(await screen.findByText(/Verify your email to publish a vehicle/i)).toBeTruthy();
    expect(screen.queryByTestId('personal-account-listing-wizard')).toBeNull();
  });

  it('an approved personal account is admitted to the workspace', async () => {
    getMySellerCapability.mockResolvedValue(cap('approved'));
    mount('user');
    expect(await screen.findByLabelText('My vehicles and selling tools')).toBeTruthy();
    expect(screen.queryByTestId('kayad-seller-access-state')).toBeNull();
  });
  it('an existing individual_seller keeps the workspace while the status loads (no regression)', async () => {
    getMySellerCapability.mockReturnValue(new Promise(() => {}));
    mount('individual_seller');
    expect(await screen.findByLabelText('My vehicles and selling tools')).toBeTruthy();
    expect(screen.queryByTestId('kayad-seller-access-state')).toBeNull();
  });
  it('a suspended individual_seller can still inspect existing vehicle history', async () => {
    getMySellerCapability.mockResolvedValue(cap('suspended'));
    mount('individual_seller', 'listing-quality');
    expect(await screen.findByLabelText('My vehicles and selling tools')).toBeTruthy();
  });
  it('a pending individual_seller is blocked when approval is explicitly required', async () => {
    getMySellerCapability.mockResolvedValue({ ...cap('pending'), approvalRequired: true });
    mount('individual_seller', 'listing-wizard');
    await screen.findByTestId('kayad-seller-access-state');
    expect(screen.queryByText('My Listings')).toBeNull();
  });
  it('staff roles never see the personal application', async () => {
    mount('admin');
    expect(getMySellerCapability).not.toHaveBeenCalled();
    expect(screen.queryByTestId('kayad-seller-access-state')).toBeNull();
  });
});

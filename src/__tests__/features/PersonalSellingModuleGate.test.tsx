// Phase 13E — the seller workspace entry is driven by the real capability of the SAME personal account. Component tests, mocked APIs.
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PersonalSellingModule from '../../features/PrivateSellerPlatform/pages/PersonalSellingModule';

const getMySellerCapability = vi.fn();
vi.mock('../../services/privateSellerCapabilityApi', () => ({ getMySellerCapability: (...a: unknown[]) => getMySellerCapability(...a), applyForPrivateSelling: vi.fn() }));

const cap = (status: string) => ({ status, source: 'capability', application: status === 'none' ? null : { status, reviewReason: null, submittedAt: 'x', reviewedAt: null }, canApply: status === 'none' || status === 'rejected', canList: status === 'approved' });
const mount = (role: string) => render(<MemoryRouter><PersonalSellingModule user={{ id: 'u1', name: 'J', role } as never} isEmailVerified={true} listings={[]} listingsLoading={false} onRefreshListings={() => {}} onNavigate={() => {}} /></MemoryRouter>);

beforeEach(() => { getMySellerCapability.mockReset(); vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline'))); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('Personal selling module inside the unified account', () => {
  it('does not offer a separate seller application or seller account when free personal selling is open', async () => {
    getMySellerCapability.mockResolvedValue({ ...cap('approved'), source: 'policy_default', canApply: false, canList: true });
    mount('user');
    expect(await screen.findByText(/Manage my vehicles/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /apply to sell/i })).toBeNull();
  });
  it.each(['pending', 'rejected', 'suspended', 'revoked'])('a %s applicant is not admitted to the workspace', async (st) => {
    getMySellerCapability.mockResolvedValue(cap(st));
    mount('user');
    await screen.findByTestId('kayad-seller-access-state');
    expect(screen.queryByText('My Listings')).toBeNull();
  });
  it('free policy default admits personal accounts without seller application or package', async () => {
    getMySellerCapability.mockResolvedValue({ ...cap('approved'), source: 'policy_default', canApply: false, canList: true });
    mount('user');
    expect((await screen.findAllByText('Manage my vehicles')).length).toBeGreaterThan(0);
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
    expect((await screen.findAllByText('Manage my vehicles')).length).toBeGreaterThan(0);
  });
  it('an existing individual_seller keeps the workspace while the status loads (no regression)', async () => {
    getMySellerCapability.mockReturnValue(new Promise(() => {}));
    mount('individual_seller');
    expect((await screen.findAllByText('Manage my vehicles')).length).toBeGreaterThan(0);
  });
  it('a suspended individual_seller is moved out of the workspace', async () => {
    getMySellerCapability.mockResolvedValue(cap('suspended'));
    mount('individual_seller');
    await screen.findByTestId('kayad-seller-access-state');
    expect(screen.queryByText('My Listings')).toBeNull();
  });
  it('a pending individual_seller is blocked when approval is explicitly required', async () => {
    getMySellerCapability.mockResolvedValue({ ...cap('pending'), approvalRequired: true });
    mount('individual_seller');
    await screen.findByTestId('kayad-seller-access-state');
    expect(screen.queryByText('My Listings')).toBeNull();
  });
  it('staff roles never see the personal application', async () => {
    mount('admin');
    expect(getMySellerCapability).not.toHaveBeenCalled();
    expect(screen.queryByTestId('kayad-seller-access-state')).toBeNull();
  });
});

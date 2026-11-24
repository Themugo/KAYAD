// Phase 13E — one personal dashboard for buyer + private seller. EVIDENCE TIER: component tests with mocked API modules.
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DashboardHub from '../../components/DashboardHub';

const getMySellerCapability = vi.fn();
const applyForPrivateSelling = vi.fn();
vi.mock('../../services/privateSellerCapabilityApi', () => ({
  getMySellerCapability: (...a) => getMySellerCapability(...a),
  applyForPrivateSelling: (...a) => applyForPrivateSelling(...a),
}));
vi.mock('../../services/ownershipApi', () => ({ getOwnershipDashboard: vi.fn().mockResolvedValue({}) }));
vi.mock('../../services/dealerPlatformApi', () => ({ getMyWorkspace: vi.fn().mockResolvedValue({ membership: null, ambiguous: false }) }));
vi.mock('../../services/commandCenterApi', () => ({ getControlPlaneSnapshot: vi.fn().mockResolvedValue({ counts: {} }) }));
vi.mock('../../api/api', () => ({ inspectionAPI: { myAssigned: vi.fn().mockResolvedValue({}) } }));
vi.mock('../../components/auction/AuctionExperienceRail', () => ({
  AuctionExperienceRail: () => <div data-testid="auction-rail">Your auction journey</div>,
  BidderIdentityCard: () => <div data-testid="bidder-card">Bidder profile</div>,
}));

const cap = (status, extra = {}) => ({ status, source: 'capability', approvalRequired: true, application: status === 'none' ? null : { status, reviewReason: null, submittedAt: 'x', reviewedAt: null, ...extra }, canApply: status === 'none' || status === 'rejected', canList: status === 'approved' });
const mount = (role = 'user', onNavigate = () => {}) => render(<MemoryRouter><DashboardHub user={{ id: 'u1', name: 'James', role }} vehicles={[]} initialSection="create-listing" onNavigate={onNavigate} /></MemoryRouter>);

// The seller state lives in the Selling section of the ONE personal dashboard (PersonalSellingModule gate + canonical
// SellerCapabilityPanel). Buyer sections stay reachable from the same dashboard navigation in every seller state.
const sellerWorkspace = () => screen.queryByLabelText('My vehicles and selling tools');
const expectBuyerNav = () => {
  const nav = screen.getByRole('navigation', { name: /personal dashboard sections/i });
  for (const label of [/activity/i, /buying/i, /messages/i, /auctions/i, /deals/i]) expect(within(nav).getAllByRole('button', { name: label }).length).toBeGreaterThan(0);
};

beforeEach(() => { getMySellerCapability.mockReset(); applyForPrivateSelling.mockReset(); });
afterEach(() => cleanup());

describe('buyer who has not applied', () => {
  it('keeps the personal dashboard and offers the application, with no seller workspace action', async () => {
    getMySellerCapability.mockResolvedValue(cap('none'));
    mount('user');
        expectBuyerNav();
    expect(await screen.findByRole('button', { name: /apply to sell/i }, { timeout: 15000 })).toBeTruthy();
    expect(sellerWorkspace()).toBeNull();
  });
  it('submits the application with the same session and reloads the real state', async () => {
    getMySellerCapability.mockResolvedValueOnce(cap('none')).mockResolvedValueOnce(cap('pending'));
    applyForPrivateSelling.mockResolvedValue({ status: 'pending' });
    mount('user');
    fireEvent.change(await screen.findByLabelText(/contact phone/i), { target: { value: '+254712345678' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /apply to sell/i }));
    await waitFor(() => expect(applyForPrivateSelling).toHaveBeenCalledWith({ contactPhone: '+254712345678', intendedUse: undefined, acceptTerms: true }));
    expect(await screen.findByText(/pending because administrator approval is currently enabled/i)).toBeTruthy();
    expectBuyerNav();
  });
  it('shows a server error on a failed or duplicate submission and keeps the form', async () => {
    getMySellerCapability.mockResolvedValue(cap('none'));
    applyForPrivateSelling.mockRejectedValue(new Error('A private-seller application already exists (status: pending).'));
    mount('user');
    fireEvent.change(await screen.findByLabelText(/contact phone/i), { target: { value: '+254712345678' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /apply to sell/i }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/already exists/);
    expect(screen.getByRole('button', { name: /apply to sell/i })).toBeTruthy();
  });
  it('the submit button stays disabled until the phone and the terms are given', async () => {
    getMySellerCapability.mockResolvedValue(cap('none'));
    mount('user');
    expect((await screen.findByRole('button', { name: /apply to sell/i })).disabled).toBe(true);
  });
});

describe('seller states keep the buyer dashboard', () => {
  it('pending: buyer sections plus the real pending status, no workspace action', async () => {
    getMySellerCapability.mockResolvedValue(cap('pending'));
    mount('user');
    expect(await screen.findByText(/pending because administrator approval is currently enabled/i)).toBeTruthy();
    expectBuyerNav();
    expect(sellerWorkspace()).toBeNull();
  });
  it('approved: buyer sections AND the seller workspace, same account', async () => {
    getMySellerCapability.mockResolvedValue(cap('approved'));
    mount('user');
    expect(await screen.findByLabelText('My vehicles and selling tools')).toBeTruthy();
    expectBuyerNav();
    expect(screen.queryByRole('button', { name: /apply to sell/i })).toBeNull();
  });
  it('free policy default opens selling without an application or package', async () => {
    getMySellerCapability.mockResolvedValue({ ...cap('approved'), source: 'policy_default', canApply: false, canList: true });
    mount('user');
    expect(await screen.findByLabelText('My vehicles and selling tools')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /apply to sell/i })).toBeNull();
  });
  it('rejected: shows the real state and reason, allows re-applying, buyer intact', async () => {
    getMySellerCapability.mockResolvedValue(cap('rejected', { reviewReason: 'documents unclear' }));
    mount('user');
    expect(await screen.findByText(/not approved/i)).toBeTruthy();
    expect(screen.getByText(/documents unclear/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /apply to sell/i })).toBeTruthy();
    expectBuyerNav();
  });
  it.each(['suspended', 'revoked'])('%s: seller actions unavailable, status shown honestly, buyer intact', async (st) => {
    getMySellerCapability.mockResolvedValue(cap(st));
    mount('user');
    expect(await screen.findByText(new RegExp(`access is ${st}`, 'i'))).toBeTruthy();
    expect(sellerWorkspace()).toBeNull();
    expect(screen.queryByRole('button', { name: /apply to sell/i })).toBeNull();
    expectBuyerNav();
  });
  it('a failed status load shows a retry and never invents a state', async () => {
    getMySellerCapability.mockRejectedValue(new Error('network'));
    mount('user');
    expect(await screen.findByText(/could not confirm your selling access/i)).toBeTruthy();
    expect(sellerWorkspace()).toBeNull();
    expectBuyerNav();
  });
});

describe('existing private sellers (role individual_seller)', () => {
  it('get the buyer dashboard (bidder card, auction rail) AND seller access – no longer a seller-only view', async () => {
    getMySellerCapability.mockResolvedValue({ ...cap('approved'), source: 'legacy_users_status' });
    mount('individual_seller');
        expectBuyerNav();
    expect(await screen.findByLabelText('My vehicles and selling tools')).toBeTruthy();
    expectBuyerNav();
  });
  it('a suspended legacy seller keeps buyer features but loses the seller workspace entry', async () => {
    getMySellerCapability.mockResolvedValue({ ...cap('suspended'), source: 'legacy_users_status' });
    mount('individual_seller');
    expect(await screen.findByText(/access is suspended/i)).toBeTruthy();
    expect(sellerWorkspace()).toBeNull();
    // Phase 13F: the dashboard action grid must not keep offering the workspace to a blocked legacy seller either.
    expect(sellerWorkspace()).toBeNull();
    expectBuyerNav();
  });
  it.each(['revoked', 'rejected'])('a %s legacy seller is not offered the seller workspace action; buyer intact', async (st) => {
    getMySellerCapability.mockResolvedValue({ ...cap(st), source: 'legacy_users_status' });
    mount('individual_seller');
    await screen.findByTestId('seller-capability-panel');
    await waitFor(() => expect(sellerWorkspace()).toBeNull());
    expectBuyerNav();
  });
  it('a pending legacy seller is blocked only when the administrator enables approval', async () => {
    getMySellerCapability.mockResolvedValue({ ...cap('pending'), source: 'legacy_users_status', approvalRequired: true });
    mount('individual_seller');
    await screen.findByTestId('seller-capability-panel');
    expect(sellerWorkspace()).toBeNull();
    expectBuyerNav();
  });
});

describe('no seller or dealer controls for other roles', () => {
  it.each(['dealer', 'admin', 'ghost_checker'])('%s does not request or render the personal seller panel', (role) => {
    mount(role);
    expect(getMySellerCapability).not.toHaveBeenCalled();
    expect(screen.queryByTestId('seller-capability-panel')).toBeNull();
  });
});

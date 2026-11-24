// Phase 13I — state-to-behaviour contract for the ONE personal dashboard. EVIDENCE TIER: component tests with mocked API modules.
// The server and database remain authoritative; these tests prove the UI only presents what the server reports (never what the
// client claims) and that the buyer experience is identical in every seller state. Real API/DB behaviour: phase13i_personal_account_matrix.mjs.
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DashboardHub from '../../components/DashboardHub';

const getMySellerCapability = vi.fn();
vi.mock('../../services/privateSellerCapabilityApi', () => ({
  getMySellerCapability: (...a) => getMySellerCapability(...a),
  applyForPrivateSelling: vi.fn(),
}));
vi.mock('../../services/ownershipApi', () => ({ getOwnershipDashboard: vi.fn().mockResolvedValue({}) }));
vi.mock('../../services/dealerPlatformApi', () => ({ getDealerDashboard: vi.fn().mockResolvedValue({}), getMyWorkspace: vi.fn().mockResolvedValue({ membership: null, ambiguous: false }) }));
vi.mock('../../services/commandCenterApi', () => ({ getControlPlaneSnapshot: vi.fn().mockResolvedValue({ counts: {} }) }));
vi.mock('../../api/api', () => ({ inspectionAPI: { myAssigned: vi.fn().mockResolvedValue({}) } }));
vi.mock('../../components/auction/AuctionExperienceRail', () => ({
  AuctionExperienceRail: () => <div data-testid="auction-rail">Your auction journey</div>,
  BidderIdentityCard: () => <div data-testid="bidder-card">Bidder profile</div>,
}));

// Mirrors getMySellerCapability() in backend/services/privateSellerCapability.service.js: canApply is true ONLY for role `user` in none/rejected.
const serverState = (status, role = 'user', extra = {}) => ({
  status,
  source: role === 'individual_seller' ? 'legacy_users_status' : 'capability',
  application: status === 'none' ? null : { status, reviewReason: extra.reason ?? null, submittedAt: 'x', reviewedAt: null },
  canApply: role === 'user' && (status === 'none' || status === 'rejected'),
  canList: status === 'approved',
  approvalRequired: true,
});
const mount = (role = 'user', user = {}) => render(<MemoryRouter><DashboardHub user={{ id: 'u1', name: 'James', role, ...user }} vehicles={[]} initialSection="create-listing" onNavigate={() => {}} /></MemoryRouter>);
const expectBuyerIntact = () => expectBuyerNav();

// The seller state lives in the Selling section of the ONE personal dashboard (PersonalSellingModule gate + canonical
// SellerCapabilityPanel). Buyer sections stay reachable from the same dashboard navigation in every seller state.
const sellerWorkspace = () => screen.queryByLabelText('My vehicles and selling tools');
const expectBuyerNav = () => {
  const nav = screen.getByRole('navigation', { name: /personal dashboard sections/i });
  for (const label of [/buying/i, /messages/i, /auctions/i, /deals/i]) expect(within(nav).getAllByRole('button', { name: label }).length).toBeGreaterThan(0);
};

beforeEach(() => { getMySellerCapability.mockReset(); });
afterEach(() => cleanup());

describe('state-to-behaviour matrix: role user (personal account)', () => {
  const rows = [
    // status, application form?, workspace entry?, text
    ['none', true, false, /want to sell a vehicle/i],
    ['pending', false, false, /pending because administrator approval is currently enabled/i],
    ['rejected', true, false, /not approved/i],
    ['suspended', false, false, /access is suspended/i],
    ['revoked', false, false, /access is revoked/i],
  ];
  it.each(rows)('%s -> form=%s workspace=%s, buyer sections always intact', async (status, form, workspace, text) => {
    getMySellerCapability.mockResolvedValue(serverState(status));
    mount('user');
    expect(await screen.findByText(text, undefined, { timeout: 15000 })).toBeTruthy();
    expect(Boolean(screen.queryByRole('button', { name: /apply to sell/i }))).toBe(form);
    expect(Boolean(sellerWorkspace())).toBe(workspace);
        expectBuyerIntact();
  });
  it('approved -> workspace=true, no application form, buyer sections intact', async () => {
    getMySellerCapability.mockResolvedValue(serverState('approved'));
    mount('user');
    expect(await screen.findByLabelText('My vehicles and selling tools')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /apply to sell/i })).toBeNull();
    expectBuyerNav();
  });
  it('never exposes a dealer surface in any seller state', async () => {
    for (const status of ['none', 'pending', 'approved', 'rejected', 'suspended', 'revoked']) {
      cleanup(); getMySellerCapability.mockResolvedValue(serverState(status));
      mount('user');
      await screen.findByTestId('seller-capability-panel');
      expect(screen.queryByText(/dealer workspace|dealer dashboard|inventory management/i)).toBeNull();
    }
  });
  it('a rejection or revocation reason from the server is shown verbatim as text (not interpreted as markup)', async () => {
    getMySellerCapability.mockResolvedValue(serverState('rejected', 'user', { reason: '<img src=x onerror=alert(1)> documents unclear' }));
    const { container } = mount('user');
    expect(await screen.findByText(/documents unclear/)).toBeTruthy();
    expect(container.querySelector('img')).toBeNull();
  });
});

describe('the UI never treats client-side claims as authorization', () => {
  it('a user object that CLAIMS an approved seller state gets no workspace while the server says none', async () => {
    getMySellerCapability.mockResolvedValue(serverState('none'));
    mount('user', { sellerStatus: 'approved', privateSellerStatus: 'approved', canList: true, status: 'approved' });
    await screen.findByRole('button', { name: /apply to sell/i });
    expect(sellerWorkspace()).toBeNull();
    expect(sellerWorkspace()).toBeNull();
  });
  it('while the status is loading no seller affordance appears; after a failed load none is invented', async () => {
    let release;
    getMySellerCapability.mockReturnValue(new Promise((ok) => { release = ok; }));
    mount('user');
    expect(screen.getByText(/loading your seller status/i)).toBeTruthy();
    expect(sellerWorkspace()).toBeNull();
    expectBuyerIntact();
    release(serverState('pending'));
    expect(await screen.findByText(/pending because administrator approval/i)).toBeTruthy();
  });
  it('a failed status load keeps every buyer section and offers retry', async () => {
    getMySellerCapability.mockRejectedValue(new Error('network'));
    mount('user');
    expect(await screen.findByText(/personal buying account remains available/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /retry/i })).toBeTruthy();
    expectBuyerIntact();
  });
});

describe('legacy individual_seller compatibility', () => {
  it('REJECTED legacy seller (server: canApply=false) is NOT offered a form the server would refuse; sees the reason and the support route', async () => {
    getMySellerCapability.mockResolvedValue(serverState('rejected', 'individual_seller', { reason: 'ownership documents missing' }));
    mount('individual_seller');
    expect(await screen.findByText(/cannot reapply online/i)).toBeTruthy();
    expect(screen.getByText(/ownership documents missing/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /apply to sell/i })).toBeNull();
    expect(sellerWorkspace()).toBeNull();
    expectBuyerIntact();
  });
  it.each(['suspended', 'revoked'])('%s legacy seller: honest status, no form, no workspace, buyer intact', async (status) => {
    getMySellerCapability.mockResolvedValue(serverState(status, 'individual_seller'));
    mount('individual_seller');
    expect(await screen.findByText(new RegExp(`access is ${status}`, 'i'))).toBeTruthy();
    expect(screen.queryByRole('button', { name: /apply to sell/i })).toBeNull();
    expect(sellerWorkspace()).toBeNull();
    expectBuyerIntact();
  });
  it('approved legacy seller keeps the workspace and the buyer dashboard', async () => {
    getMySellerCapability.mockResolvedValue(serverState('approved', 'individual_seller'));
    mount('individual_seller');
    expect(await screen.findByLabelText('My vehicles and selling tools')).toBeTruthy();
    expectBuyerIntact();
  });
});

describe('dealer and staff dashboards are unchanged by the personal-account work', () => {
  it('a dealer never loads or shows the private-seller panel and keeps the dealer dashboard', async () => {
    mount('dealer');
    expect(screen.getByText('Dealer Dashboard')).toBeTruthy();
    expect(screen.queryByTestId('seller-capability-panel')).toBeNull();
    await waitFor(() => expect(getMySellerCapability).not.toHaveBeenCalled());
  });
  it('staff keep the platform operations dashboard without the seller panel', async () => {
    mount('admin');
    expect(screen.getByText('Platform Operations Dashboard')).toBeTruthy();
    expect(screen.queryByTestId('seller-capability-panel')).toBeNull();
    expect(getMySellerCapability).not.toHaveBeenCalled();
  });
});

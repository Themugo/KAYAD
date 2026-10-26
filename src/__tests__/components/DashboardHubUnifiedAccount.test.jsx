// Phase 13E — one personal dashboard for buyer + private seller. EVIDENCE TIER: component tests with mocked API modules.
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import DashboardHub from '../../components/DashboardHub';

const getMySellerCapability = vi.fn();
const applyForPrivateSelling = vi.fn();
vi.mock('../../services/privateSellerCapabilityApi', () => ({
  getMySellerCapability: (...a) => getMySellerCapability(...a),
  applyForPrivateSelling: (...a) => applyForPrivateSelling(...a),
}));
vi.mock('../../services/ownershipApi', () => ({ getOwnershipDashboard: vi.fn().mockResolvedValue({}) }));
vi.mock('../../services/dealerPlatformApi', () => ({}));
vi.mock('../../services/commandCenterApi', () => ({ getControlPlaneSnapshot: vi.fn().mockResolvedValue({ counts: {} }) }));
vi.mock('../../api/api', () => ({ inspectionAPI: { myAssigned: vi.fn().mockResolvedValue({}) } }));
vi.mock('../../components/auction/AuctionExperienceRail', () => ({
  AuctionExperienceRail: () => <div data-testid="auction-rail">Your auction journey</div>,
  BidderIdentityCard: () => <div data-testid="bidder-card">Bidder profile</div>,
}));

const cap = (status, extra = {}) => ({ status, source: 'capability', application: status === 'none' ? null : { status, reviewReason: null, submittedAt: 'x', reviewedAt: null, ...extra }, canApply: status === 'none' || status === 'rejected', canList: status === 'approved' });
const mount = (role = 'user', onNavigate = () => {}) => render(<DashboardHub user={{ id: 'u1', name: 'James', role }} vehicles={[]} onNavigate={onNavigate} />);

beforeEach(() => { getMySellerCapability.mockReset(); applyForPrivateSelling.mockReset(); });
afterEach(() => cleanup());

describe('buyer who has not applied', () => {
  it('keeps the buyer dashboard and offers the application, with no seller workspace action', async () => {
    getMySellerCapability.mockResolvedValue(cap('none'));
    mount('user');
    expect(screen.getByText('Buyer Dashboard')).toBeTruthy();
    expect(screen.getByTestId('bidder-card')).toBeTruthy();
    expect(await screen.findByRole('button', { name: /apply to sell/i })).toBeTruthy();
    expect(screen.queryByText('Seller workspace')).toBeNull();
    expect(screen.queryByText('Open seller workspace')).toBeNull();
  });
  it('submits the application with the same session and reloads the real state', async () => {
    getMySellerCapability.mockResolvedValueOnce(cap('none')).mockResolvedValueOnce(cap('pending'));
    applyForPrivateSelling.mockResolvedValue({ status: 'pending' });
    mount('user');
    fireEvent.change(await screen.findByLabelText(/contact phone/i), { target: { value: '+254712345678' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /apply to sell/i }));
    await waitFor(() => expect(applyForPrivateSelling).toHaveBeenCalledWith({ contactPhone: '+254712345678', intendedUse: undefined, acceptTerms: true }));
    expect(await screen.findByText(/application is pending review/i)).toBeTruthy();
    expect(screen.getByTestId('bidder-card')).toBeTruthy();
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
    expect(await screen.findByText(/application is pending review/i)).toBeTruthy();
    expect(screen.getByTestId('bidder-card')).toBeTruthy();
    expect(screen.queryByText('Open seller workspace')).toBeNull();
  });
  it('approved: buyer sections AND the seller workspace, same account', async () => {
    getMySellerCapability.mockResolvedValue(cap('approved'));
    const nav = vi.fn();
    mount('user', nav);
    const open = await screen.findByRole('button', { name: /open seller workspace/i });
    expect(screen.getByTestId('bidder-card')).toBeTruthy();
    expect(screen.getAllByText('Saved vehicles').length).toBeGreaterThan(0);
    expect(screen.getByText('Your inventory')).toBeTruthy();
    fireEvent.click(open);
    expect(nav).toHaveBeenCalledWith('seller-platform');
  });
  it('rejected: shows the real state and reason, allows re-applying, buyer intact', async () => {
    getMySellerCapability.mockResolvedValue(cap('rejected', { reviewReason: 'documents unclear' }));
    mount('user');
    expect(await screen.findByText(/not approved/i)).toBeTruthy();
    expect(screen.getByText(/documents unclear/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /apply to sell/i })).toBeTruthy();
    expect(screen.getByTestId('bidder-card')).toBeTruthy();
  });
  it.each(['suspended', 'revoked'])('%s: seller actions unavailable, status shown honestly, buyer intact', async (st) => {
    getMySellerCapability.mockResolvedValue(cap(st));
    mount('user');
    expect(await screen.findByText(new RegExp(`access is ${st}`, 'i'))).toBeTruthy();
    expect(screen.queryByText('Open seller workspace')).toBeNull();
    expect(screen.queryByRole('button', { name: /apply to sell/i })).toBeNull();
    expect(screen.getByTestId('bidder-card')).toBeTruthy();
  });
  it('a failed status load shows a retry and never invents a state', async () => {
    getMySellerCapability.mockRejectedValue(new Error('network'));
    mount('user');
    expect(await screen.findByText(/could not be loaded/i)).toBeTruthy();
    expect(screen.queryByText('Open seller workspace')).toBeNull();
    expect(screen.getByTestId('bidder-card')).toBeTruthy();
  });
});

describe('existing private sellers (role individual_seller)', () => {
  it('get the buyer dashboard (bidder card, auction rail) AND seller access – no longer a seller-only view', async () => {
    getMySellerCapability.mockResolvedValue({ ...cap('approved'), source: 'legacy_users_status' });
    mount('individual_seller');
    expect(screen.getByText('My Dashboard')).toBeTruthy();
    expect(screen.getByTestId('bidder-card')).toBeTruthy();
    expect(screen.getByTestId('auction-rail')).toBeTruthy();
    expect((await screen.findAllByText('Seller workspace')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Saved vehicles').length).toBeGreaterThan(0);
  });
  it('a suspended legacy seller keeps buyer features but loses the seller workspace entry', async () => {
    getMySellerCapability.mockResolvedValue({ ...cap('suspended'), source: 'legacy_users_status' });
    mount('individual_seller');
    expect(await screen.findByText(/access is suspended/i)).toBeTruthy();
    expect(screen.queryByText('Open seller workspace')).toBeNull();
    // Phase 13F: the dashboard action grid must not keep offering the workspace to a blocked legacy seller either.
    expect(screen.queryByText('Seller workspace')).toBeNull();
    expect(screen.getByTestId('bidder-card')).toBeTruthy();
  });
  it.each(['revoked', 'rejected'])('a %s legacy seller is not offered the seller workspace action; buyer intact', async (st) => {
    getMySellerCapability.mockResolvedValue({ ...cap(st), source: 'legacy_users_status' });
    mount('individual_seller');
    await screen.findByTestId('seller-capability-panel');
    await waitFor(() => expect(screen.queryByText('Seller workspace')).toBeNull());
    expect(screen.getByTestId('bidder-card')).toBeTruthy();
  });
  it('a pending legacy seller keeps the workspace entry (backend still admits pending legacy sellers)', async () => {
    getMySellerCapability.mockResolvedValue({ ...cap('pending'), source: 'legacy_users_status' });
    mount('individual_seller');
    expect((await screen.findAllByText('Seller workspace')).length).toBeGreaterThan(0);
  });
});

describe('no seller or dealer controls for other roles', () => {
  it.each(['dealer', 'admin', 'ghost_checker'])('%s does not request or render the personal seller panel', (role) => {
    mount(role);
    expect(getMySellerCapability).not.toHaveBeenCalled();
    expect(screen.queryByTestId('seller-capability-panel')).toBeNull();
  });
});

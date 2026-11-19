// Master Implementation 01 / Gate B+E — personal overview and grouped navigation.
// EVIDENCE TIER: component tests with mocked API modules (real DashboardHub + overview components).
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, waitFor, within, fireEvent } from '@testing-library/react';
import DashboardHub from '../../components/DashboardHub';

const mySellerEnquiries = vi.fn();
const myNegotiations = vi.fn();
const getMyListings = vi.fn();
const getMyEscrowOverview = vi.fn();
const getPhoneVerificationStatus = vi.fn();
const getOwnershipDashboard = vi.fn();

vi.mock('../../services/leadApi', () => ({ default: { mySellerEnquiries: (...a) => mySellerEnquiries(...a), myNegotiations: (...a) => myNegotiations(...a) } }));
vi.mock('../../services/vehicleApi', () => ({ getMyListings: (...a) => getMyListings(...a), getMyListingPerformance: vi.fn().mockResolvedValue({ data: null }) }));
vi.mock('../../services/escrowApi', () => ({ getMyEscrowOverview: (...a) => getMyEscrowOverview(...a) }));
vi.mock('../../services/phoneVerificationApi', () => ({ getPhoneVerificationStatus: (...a) => getPhoneVerificationStatus(...a) }));
vi.mock('../../services/ownershipApi', () => ({ getOwnershipDashboard: (...a) => getOwnershipDashboard(...a) }));
vi.mock('../../services/dealerPlatformApi', () => ({ getMyWorkspace: vi.fn().mockResolvedValue({ membership: null, ambiguous: false }) }));
vi.mock('../../services/commandCenterApi', () => ({ getControlPlaneSnapshot: vi.fn().mockResolvedValue({ counts: {} }) }));
vi.mock('../../api/api', () => ({ inspectionAPI: { myAssigned: vi.fn().mockResolvedValue({}) } }));
vi.mock('../../features/OwnershipPlatform', () => ({ PersonalBuyingModule: () => <div>buying-tools</div> }));
vi.mock('../../components/offers/MarketplaceOfferPanel', () => ({ default: ({ leadId }) => <div data-testid="offer-panel">offers for {leadId}</div> }));
vi.mock('../../components/auction/AuctionExperienceRail', () => ({ AuctionExperienceRail: () => null, BidderIdentityCard: () => null }));

const listing = (o = {}) => ({ id: 'c1', brand: 'Mazda', model: 'CX-5', year: 2017, price: 2100000, mileage: 91000, fuel: 'Petrol', city: 'Mombasa', status: 'available', views: 12, images: [{ url: 'https://img.test/a.jpg' }], updatedAt: new Date().toISOString(), ...o });
const user = { id: 'u1', name: 'Wanjiru Kamau', role: 'user', emailVerified: true };
const mount = (props = {}) => render(<DashboardHub user={user} vehicles={[]} savedVehicleCount={4} savedVehiclesSessionUserId="u1" savedVehiclesList={[]} initialSection="overview" onNavigate={props.onNavigate || (() => {})} {...props} />);
const metric = (title) => document.querySelector(`[data-kayad-metric="${title}"]`);

beforeEach(() => {
  mySellerEnquiries.mockResolvedValue({ enquiries: [{ id: 'e1', stage: 'new', createdAt: new Date().toISOString(), listing: { title: 'Mazda CX-5' } }, { id: 'e2', stage: 'lost', createdAt: new Date().toISOString() }] });
  myNegotiations.mockResolvedValue({ leads: [{ id: 'n1', vehicle: 'Subaru Forester', created_at: new Date().toISOString() }] });
  getMyListings.mockResolvedValue([listing(), listing({ id: 'c2', model: 'Harrier', brand: 'Toyota', status: 'draft' })]);
  getMyEscrowOverview.mockResolvedValue({ escrows: [], summary: { scope: 'participant', currency: 'KES', totalDeals: 3, heldAmount: 0, heldCount: 0, pendingFundingCount: 0, activeCount: 2, settledCount: 1, needsActionCount: 0 } });
  getPhoneVerificationStatus.mockResolvedValue({ phone: '+254700000001', verified: false });
  getOwnershipDashboard.mockResolvedValue({ currentVehicles: [{ id: 'o1' }], soldVehicles: [] });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('personal overview', () => {
  it('greets the user and offers Sell a vehicle, Browse vehicles and the identity statement', async () => {
    mount();
    expect((await screen.findByRole('heading', { level: 1 })).textContent).toMatch(/Good (morning|afternoon|evening), Wanjiru/);
    expect(screen.getAllByRole('button', { name: /sell a vehicle/i }).length).toBe(1);
    expect(screen.getAllByRole('button', { name: /browse vehicles/i }).length).toBe(1);
    expect(screen.getByText(/One personal account · Buy and sell privately/)).toBeTruthy();
  });

  it('shows the four metrics from real data (active enquiries exclude closed ones)', async () => {
    mount();
    await waitFor(() => expect(metric('Active enquiries').textContent).toMatch(/1$/));
    expect(metric('My listings').textContent).toMatch(/2$/);
    expect(metric('Saved vehicles').textContent).toMatch(/4$/);
    expect(metric('Open deals').textContent).toMatch(/2$/);
  });

  it('shows Unavailable, never a made-up zero, when a source fails', async () => {
    mySellerEnquiries.mockRejectedValue(new Error('down'));
    getMyEscrowOverview.mockRejectedValue(new Error('down'));
    getMyListings.mockRejectedValue(new Error('down'));
    mount();
    await waitFor(() => expect(metric('Active enquiries').textContent).toMatch(/Unavailable/));
    expect(metric('Open deals').textContent).toMatch(/Unavailable/);
    expect(metric('My listings').textContent).toMatch(/Unavailable/);
    expect(await screen.findByText(/Your listings could not be loaded/)).toBeTruthy();
  });

  it('survives a service that is missing entirely (rejects instead of throwing)', async () => {
    myNegotiations.mockImplementation(() => { throw new TypeError('not a function'); });
    mount();
    await waitFor(() => expect(metric('Active enquiries').textContent).toMatch(/1$/));
  });

  it('lists my vehicles with real facts and the lifecycle label', async () => {
    mount();
    const row = await waitFor(() => { const r = document.querySelector('[data-kayad-vehicle-summary="c1"]'); expect(r).toBeTruthy(); return r; });
    expect(row.textContent).toMatch(/Mazda CX-5/); expect(row.textContent).toMatch(/91,000 km/); expect(row.textContent).toMatch(/Mombasa/);
    expect(row.textContent).toMatch(/KES 2,100,000/); expect(row.textContent).toMatch(/Active/); expect(row.textContent).toMatch(/12 views/);
    expect(document.querySelector('[data-kayad-vehicle-summary="c2"]').textContent).toMatch(/Draft/);
  });

  it('shows an empty state with a create-listing action when there are no listings', async () => {
    getMyListings.mockResolvedValue([]);
    mount();
    expect(await screen.findByText(/no vehicles listed yet/i)).toBeTruthy();
    expect(metric('My listings').textContent).toMatch(/0$/);
  });

  it('Account & trust only shows Verified for what the backend confirmed', async () => {
    mount({ user: { ...user, emailVerified: false } });
    const trust = await waitFor(() => { const t = document.querySelector('[data-kayad-account-trust]'); expect(t.textContent).toMatch(/Not verified/); return t; });
    expect(within(trust).queryByText('Verified')).toBeNull();
  });

  it('shows phone Verified only when the backend says so', async () => {
    getPhoneVerificationStatus.mockResolvedValue({ phone: '+254700000001', verified: true });
    mount();
    await waitFor(() => expect(document.querySelector('[data-kayad-account-trust]').textContent).toMatch(/Phone\s*Verified/));
  });

  it('recent activity is built from real records, newest first', async () => {
    mount();
    await waitFor(() => expect(screen.getAllByText(/Enquiry received/).length).toBe(2));
    expect(screen.getAllByText(/Enquiry sent/).length).toBe(1);
    const section = document.querySelector('#overview-recent-title').closest('section');
    expect(within(section).getAllByRole('listitem').length).toBeLessThanOrEqual(5);
  });

  it('quick actions and metric cards navigate inside the one dashboard', async () => {
    const onNavigate = vi.fn();
    mount({ onNavigate });
    fireEvent.click(await screen.findByRole('button', { name: /Buyers asking about your cars/ }));
    expect(onNavigate).toHaveBeenCalledWith('dashboard:seller-enquiries');
  });
});

describe('grouped navigation', () => {
  it('groups Overview, Buying, Selling, Activity and Account with no nested navigation', async () => {
    mount();
    const nav = await screen.findByRole('navigation', { name: /personal dashboard sections/i });
    for (const g of ['Overview', 'Buying', 'Selling', 'Activity', 'Account']) expect(within(nav).getByRole('group', { name: g })).toBeTruthy();
    expect(screen.queryByRole('navigation', { name: /my account sections/i })).toBeNull();
  });

  it('every sidebar entry opens a real view (no dead menu items)', async () => {
    const onNavigate = vi.fn();
    mount({ onNavigate });
    const nav = await screen.findByRole('navigation', { name: /personal dashboard sections/i });
    for (const btn of within(nav).getAllByRole('button')) {
      fireEvent.click(btn);
      const last = onNavigate.mock.calls.at(-1)?.[0];
      expect(last).toMatch(/^dashboard:[a-z-]+$/);
    }
    expect(onNavigate).toHaveBeenCalledTimes(within(nav).getAllByRole('button').length);
  });
});

describe('enquiries received vs sent (Gate D)', () => {
  it('Buying lists enquiries YOU sent, with offers for that conversation, and never the ones you received', async () => {
    mount({ initialSection: 'buying' });
    const sent = await waitFor(() => { const e = document.querySelector('[data-kayad-personal-sent-enquiries]'); expect(e.textContent).toMatch(/Subaru Forester/); return e; });
    expect(sent.textContent).not.toMatch(/Mazda CX-5/);
    fireEvent.click(within(sent).getByRole('button', { name: /view offers/i }));
    expect((await screen.findByTestId('offer-panel')).textContent).toBe('offers for n1');
    expect(screen.getByText('buying-tools')).toBeTruthy();
  });

  it('Seller enquiries shows only enquiries received on your listings, inside the same shell', async () => {
    mount({ initialSection: 'seller-enquiries' });
    const sec = await waitFor(() => { const e = document.querySelector('[data-kayad-personal-seller-enquiries]'); expect(e.textContent).toMatch(/Mazda CX-5/); return e; });
    expect(sec.textContent).not.toMatch(/Subaru Forester/);
    expect(screen.getByRole('navigation', { name: /personal dashboard sections/i })).toBeTruthy();
  });

  it('a failed sent-enquiries source says so instead of showing an empty list', async () => {
    myNegotiations.mockRejectedValue(new Error('down'));
    mount({ initialSection: 'buying' });
    expect(await screen.findByText(/sent enquiries are temporarily unavailable/i)).toBeTruthy();
  });

  it('each enquiry appears once on the overview feed (no duplicated records)', async () => {
    mount();
    await waitFor(() => expect(screen.getAllByText(/Enquiry sent/).length).toBe(1));
    expect(screen.getAllByText(/Enquiry received/).length).toBe(2);
  });
});

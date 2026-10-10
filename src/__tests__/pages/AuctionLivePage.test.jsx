import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import AuctionLivePage from '../../pages/AuctionLivePage';
import { auctionRegistrationAPI } from '../../api/api';

vi.mock('../../hooks/usePageMeta', () => ({ default: () => {} }));
// AuctionLivePage reads auction/bid state through the canonical services
// (services/auctionService, services/bidApi), not the legacy carsAPI/bidsAPI
// surface. These mocks previously targeted the wrong module entirely, so the
// component's real network calls always rejected in jsdom and "Auction not
// found" rendered regardless of what was being tested.
vi.mock('../../api/api', () => ({
  auctionRegistrationAPI: {
    room: vi.fn().mockResolvedValue({ room: null }),
    get: vi.fn().mockResolvedValue({ registration: null, setup: null }),
    register: vi.fn().mockResolvedValue({ registration: { status: 'active' } }),
    initiateCommitment: vi.fn().mockResolvedValue({ registration: { status: 'pending' } }),
  },
  formatKES: vi.fn(v => `KES ${(v / 1000).toFixed(0)}K`),
}));
vi.mock('../../services/auctionService', () => ({
  fetchAuction: vi.fn().mockResolvedValue({
    auction: {
      id: 'mock1',
      carId: 'mock1',
      status: 'active',
      startingBid: 2000000,
      highestBid: 0,
      bidIncrement: 1000,
      bidCount: 0,
      startTime: null,
      endTime: null,
      car: { _id: 'mock1', title: 'Test Car', brand: 'Toyota', model: 'Hilux', year: 2021, fuel: 'Diesel', transmission: 'Manual', price: 2000000, images: [], auctionEnd: null, dealer: { _id: 'd1', name: 'Test Dealer' } },
    },
    bids: [],
  }),
  fetchAuctionBids: vi.fn().mockResolvedValue({ bids: [] }),
  fetchAuctionOutcome: vi.fn().mockResolvedValue({ outcome: null }),
  initiateAuctionWinnerPayment: vi.fn().mockResolvedValue({}),
}));
vi.mock('../../services/bidApi', () => ({
  placeBid: vi.fn().mockResolvedValue({}),
  BidApiError: class BidApiError extends Error {},
}));
// STAGE 4 ACCOUNT/SESSION/IDENTITY CONVERGENCE: isAuth and the toast spy are
// made mutable/hoisted (rather than fixed inline return values, as every
// other mock in this file still is) specifically so the new
// "registration-fetch error surfacing" tests below can render with
// isAuth: true and assert on a shared toast() spy, without disturbing any
// of this file's existing isAuth:false tests, which continue to get
// exactly their original fixed behavior by default.
const authState = vi.hoisted(() => ({ isAuth: false }));
const toastSpy = vi.hoisted(() => vi.fn());
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: null, isAuth: authState.isAuth }),
}));
vi.mock('../../context/SocketContext', () => ({
  useSocket: () => ({ joinAuction: vi.fn(), leaveChannel: vi.fn(), connected: false }),
}));
vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({ toast: toastSpy }),
}));
vi.mock('../../components/CountdownDisplay', () => ({ CountdownDisplay: () => null }));
vi.mock('../../components/MarketValuationMatrix', () => ({ default: () => null }));
vi.mock('../../components/features/car/GalleryModal', () => ({ default: () => null }));
vi.mock('../../pages/auction/components/AuctionEffects', () => ({
  AVATAR_COLORS: [],
  hashColor: () => '#000',
  getAvatarInitials: () => 'XX',
  ConfettiOverlay: () => null,
  ViewersCounter: () => null,
  OutbidBell: () => null,
  PriceParticles: () => null,
}));

const renderAuctionPage = () => render(
  <HelmetProvider>
    <MemoryRouter initialEntries={['/auction/mock1']}>
      <AuctionLivePage />
    </MemoryRouter>
  </HelmetProvider>,
);

describe('AuctionLivePage', () => {
  afterEach(() => { cleanup(); });

  it('renders auction page with mock car', async () => {
    renderAuctionPage();
    // The premium layout shows the vehicle title in several places (hero, gallery, rail).
    expect((await screen.findAllByText('Test Car')).length).toBeGreaterThan(0);
  });

  it('shows connection status', async () => {
    renderAuctionPage();
    // DomainPremiumStats renders the live value verbatim (no ellipsis) for the
    // "Connection" stat; see AuctionLivePage.jsx's connected ? 'Live' : 'Reconnecting'.
    // The premium layout renders this stat strip in more than one place
    // (desktop + mobile), same as the "Test Car" title assertion above.
    expect((await screen.findAllByText('Reconnecting')).length).toBeGreaterThan(0);
  });

  it('shows starting price label', async () => {
    renderAuctionPage();
    expect(await screen.findByText('Starting Price')).toBeInTheDocument();
  });
});

// STAGE 4 ACCOUNT/SESSION/IDENTITY CONVERGENCE REGRESSION TESTS: the
// registration-status fetch previously discarded any error from
// auctionRegistrationAPI.get() silently, treating a 403 "Account
// suspended"/"Account deactivated" rejection identically to "not yet
// registered" - the signed-in-but-banned user saw a normal "Register to
// bid" CTA with no indication why. This proves the specific backend
// message is now surfaced via toast for a 403, and that an ordinary
// "no registration yet" rejection (no response/any other status) still
// does NOT spam a toast.
describe('AuctionLivePage registration-status error surfacing', () => {
  afterEach(() => { cleanup(); authState.isAuth = false; toastSpy.mockClear(); auctionRegistrationAPI.get.mockReset(); });

  it('surfaces the backend message via toast when the registration-status fetch is rejected with 403', async () => {
    authState.isAuth = true;
    auctionRegistrationAPI.get.mockRejectedValueOnce({
      response: { status: 403, data: { message: 'Account suspended' } },
    });

    renderAuctionPage();

    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith('Account suspended', 'error');
    });
  });

  it('does not toast for an ordinary "not yet registered" rejection with no response', async () => {
    authState.isAuth = true;
    auctionRegistrationAPI.get.mockRejectedValueOnce(new Error('network error'));

    renderAuctionPage();
    await screen.findAllByText('Test Car');

    expect(toastSpy).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import AuctionLivePage from '../../pages/AuctionLivePage';

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
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: null, isAuth: false }),
}));
vi.mock('../../context/SocketContext', () => ({
  useSocket: () => ({ joinAuction: vi.fn(), leaveChannel: vi.fn(), connected: false }),
}));
vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));
vi.mock('../../components/CountdownDisplay', () => ({ CountdownDisplay: () => null }));
vi.mock('../../components/BackButton', () => ({ default: () => null }));
vi.mock('../../components/WinnerModal', () => ({ default: () => null }));
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

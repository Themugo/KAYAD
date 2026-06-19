import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AuctionLivePage from '../../pages/AuctionLivePage';

vi.mock('../../hooks/usePageMeta', () => ({ default: () => {} }));
vi.mock('../../api/api', () => ({
  carsAPI: { get: vi.fn().mockResolvedValue({ car: { _id: 'mock1', title: 'Test Car', brand: 'Toyota', model: 'Hilux', year: 2021, fuel: 'Diesel', transmission: 'Manual', price: 2000000, images: [], auctionEnd: null, dealer: { _id: 'd1', name: 'Test Dealer' } } }) },
  bidsAPI: { getForCar: vi.fn().mockResolvedValue({ bids: [] }) },
  smsBiddingAPI: { my: vi.fn().mockResolvedValue({}) },
  formatKES: vi.fn(v => `KES ${(v / 1000).toFixed(0)}K`),
}));
vi.mock('../../data/mockCars', () => ({
  getMockCar: vi.fn().mockReturnValue({
    _id: 'mock1', title: 'Test Car', brand: 'Toyota', model: 'Hilux',
    year: 2021, fuel: 'Diesel', transmission: 'Manual',
    price: 2000000, images: [], auctionEnd: null,
    dealer: { _id: 'd1', name: 'Test Dealer' },
  }),
}));
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: null, isAuth: false }),
}));
vi.mock('../../context/SocketContext', () => ({
  useSocket: () => ({ joinAuction: vi.fn(), on: vi.fn(() => vi.fn()), connected: false }),
}));
vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));
vi.mock('../../components/CountdownDisplay', () => ({ CountdownDisplay: () => null }));
vi.mock('../../components/BackButton', () => ({ default: () => null }));
vi.mock('../../components/WinnerModal', () => ({ default: () => null }));
vi.mock('../../components/MarketValuationMatrix', () => ({ default: () => null }));
vi.mock('../../components/GalleryModal', () => ({ default: () => null }));
vi.mock('../../pages/auction/components/AuctionEffects', () => ({
  AVATAR_COLORS: [],
  hashColor: () => '#000',
  getAvatarInitials: () => 'XX',
  ConfettiOverlay: () => null,
  ViewersCounter: () => null,
  OutbidBell: () => null,
  PriceParticles: () => null,
}));

describe('AuctionLivePage', () => {
  afterEach(() => { cleanup(); });

  it('renders auction page with mock car', async () => {
    render(<MemoryRouter initialEntries={['/auction/mock1']}><AuctionLivePage /></MemoryRouter>);
    expect(await screen.findByText('Test Car')).toBeInTheDocument();
  });

  it('shows connection status', async () => {
    render(<MemoryRouter initialEntries={['/auction/mock1']}><AuctionLivePage /></MemoryRouter>);
    expect(await screen.findByText('Reconnecting...')).toBeInTheDocument();
  });

  it('shows starting price label', async () => {
    render(<MemoryRouter initialEntries={['/auction/mock1']}><AuctionLivePage /></MemoryRouter>);
    expect(await screen.findByText('Starting Price')).toBeInTheDocument();
  });

  it('shows joining prompt for anonymous users', async () => {
    render(<MemoryRouter initialEntries={['/auction/mock1']}><AuctionLivePage /></MemoryRouter>);
    expect(await screen.findByText('Join the Live Show')).toBeInTheDocument();
  });
});

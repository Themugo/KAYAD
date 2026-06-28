import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CarDetailPage from '../../pages/CarDetailPage';

vi.mock('../../hooks/usePageMeta', () => ({ default: () => {} }));
vi.mock('../../api/api', () => ({
  carsAPI: {
    get: vi.fn().mockRejectedValue({}),
    trackClick: vi.fn(),
    promote: vi.fn(),
  },
  reviewsAPI: {
    forDealer: vi.fn().mockResolvedValue({ reviews: [] }),
    create: vi.fn(),
  },
  chatAPI: { start: vi.fn() },
  ntsaAPI: { status: vi.fn().mockRejectedValue({}) },
  favoritesAPI: { list: vi.fn().mockResolvedValue({}), toggle: vi.fn(), setPriceAlert: vi.fn() },
  bidsAPI: { getForCar: vi.fn().mockResolvedValue({ bids: [] }), place: vi.fn() },
  formatKES: vi.fn(v => `KES ${(v / 1000).toFixed(0)}K`),
}));
vi.mock('../../data/demoData', () => ({
  getDemoCar: vi.fn().mockReturnValue({
    _id: 'car-1', title: 'Test Luxury Car', brand: 'BMW', model: 'X5',
    year: 2023, fuel: 'Petrol', transmission: 'Automatic',
    price: 8500000, images: [], dealer: { _id: 'd1', name: 'Test Dealer' },
  }),
}));
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { _id: 'u1' }, isAuth: true, isAdmin: false }),
}));
vi.mock('../../context/CompareContext', () => ({
  useCompare: () => ({ isComparing: () => false, toggleCar: vi.fn(), compareCount: 0 }),
}));
vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));
vi.mock('../../components/BackButton', () => ({ default: () => null }));
vi.mock('../../components/PaymentModal', () => ({ default: () => null }));
vi.mock('../../components/InspectionButton', () => ({ default: () => null }));
vi.mock('../../components/TcoCalculator', () => ({ default: () => null }));
vi.mock('../../components/MarketValuationMatrix', () => ({ default: () => null }));
vi.mock('../../components/MarketPulse', () => ({ default: () => null }));
vi.mock('../../components/PriceHistoryChart', () => ({ default: () => null }));
vi.mock('../../components/GalleryModal', () => ({ default: () => null }));
vi.mock('../../components/SeoStructuredData', () => ({
  VehicleStructuredData: () => null,
  BreadcrumbStructuredData: () => null,
}));
vi.mock('../../components/SEOHead', () => ({ default: () => null }));
vi.mock('../car/components/DetailSkeleton', () => ({ default: () => null }));
vi.mock('../car/components/AuctionAnnouncement', () => ({ default: () => null }));
vi.mock('../car/components/InlineBidding', () => ({ default: () => null }));
vi.mock('../car/components/NtsaStatusCard', () => ({ default: () => null }));
vi.mock('../car/components/CarDetailWidgets', () => ({
  GalleryImage: () => null,
  SpecItem: () => null,
  CompareToggle: () => null,
  firstImage: () => '',
}));
vi.mock('../car/components/CarDetailReviews', () => ({ default: () => null }));

describe('CarDetailPage', () => {
  afterEach(() => { cleanup(); });

  it('renders car title from mock', async () => {
    render(<MemoryRouter initialEntries={['/cars/mock1']}><CarDetailPage /></MemoryRouter>);
    const titles = await screen.findAllByText('Test Luxury Car');
    expect(titles.length).toBeGreaterThanOrEqual(1);
  });

  it('renders section heading', async () => {
    render(<MemoryRouter initialEntries={['/cars/mock1']}><CarDetailPage /></MemoryRouter>);
    expect(await screen.findByText('Full Specifications')).toBeInTheDocument();
  });

  it('rendes seller section', async () => {
    render(<MemoryRouter initialEntries={['/cars/mock1']}><CarDetailPage /></MemoryRouter>);
    expect(await screen.findByText('About The Seller')).toBeInTheDocument();
  });
});

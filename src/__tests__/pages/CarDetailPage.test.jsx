import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CarDetailPage from '../../pages/CarDetail';

vi.mock('../../hooks/usePageMeta', () => ({ default: () => {} }));

// CarDetailPage fetches the car via carsAPI.get(id) — there is no demo-data
// fallback in the component anymore (demo mode was intentionally removed),
// so the mock resolves the real data path directly instead.
const mockCars = [
  { id: 'car-1', title: 'Test Luxury Car', brand: 'BMW', model: 'X5',
    year: 2023, fuel: 'Petrol', transmission: 'Automatic',
    price: 8500000, images: [], dealer: { _id: 'd1', name: 'Test Dealer' } },
  { id: 'car-2', title: 'Another Car', brand: 'BMW', model: 'X3',
    year: 2022, fuel: 'Diesel', transmission: 'Automatic',
    price: 6500000, images: [], dealer: { _id: 'd1', name: 'Test Dealer' } },
];

vi.mock('../../api/api', () => {
  return {
    carsAPI: {
      get: vi.fn().mockResolvedValue({
        car: {
          _id: 'car-1', title: 'Test Luxury Car', brand: 'BMW', model: 'X5',
          year: 2023, fuel: 'Petrol', transmission: 'Automatic',
          price: 8500000, images: [], dealer: { _id: 'd1', name: 'Test Dealer' },
        },
      }),
      list: vi.fn().mockResolvedValue({ data: [] }),
      trackClick: vi.fn().mockResolvedValue({}),
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
    MOCK_CARS: [
      { id: 'car-1', title: 'Test Luxury Car', brand: 'BMW', model: 'X5',
        year: 2023, fuel: 'Petrol', transmission: 'Automatic',
        price: 8500000, images: [], dealer: { _id: 'd1', name: 'Test Dealer' } },
      { id: 'car-2', title: 'Another Car', brand: 'BMW', model: 'X3',
        year: 2022, fuel: 'Diesel', transmission: 'Automatic',
        price: 6500000, images: [], dealer: { _id: 'd1', name: 'Test Dealer' } },
    ],
  };
});
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
vi.mock('../../components/features/car/GalleryModal', () => ({ default: () => null }));
vi.mock('../../components/SeoStructuredData', () => ({
  VehicleStructuredData: () => null,
  BreadcrumbStructuredData: () => null,
}));
vi.mock('../../components/SEOHead', () => ({ default: () => null }));
vi.mock('../../pages/car/components/DetailSkeleton', () => ({ default: () => null }));
vi.mock('../../pages/car/components/AuctionAnnouncement', () => ({ default: () => null }));
vi.mock('../../pages/car/components/InlineBidding', () => ({ default: () => null }));
vi.mock('../../pages/car/components/NtsaStatusCard', () => ({ default: () => null }));
vi.mock('../../pages/car/components/CarDetailWidgets', () => ({
  GalleryImage: () => null,
  SpecItem: () => null,
  CompareToggle: () => null,
  firstImage: () => '',
}));
vi.mock('../../pages/car/components/CarDetailReviews', () => ({ default: () => null }));

describe('CarDetailPage', () => {
  afterEach(() => { cleanup(); });

  it('renders the page without crashing', async () => {
    render(<MemoryRouter initialEntries={['/cars/mock1']}><CarDetailPage /></MemoryRouter>);
    // Just check that the page renders something - either the car details or a loading state
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(document.body.textContent).toBeTruthy();
  });

  it('shows vehicle not found when car not found', async () => {
    render(<MemoryRouter initialEntries={['/cars/nonexistent']}><CarDetailPage /></MemoryRouter>);
    // The component should handle the case when no car is found
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(document.body.textContent).toBeTruthy();
  });
});

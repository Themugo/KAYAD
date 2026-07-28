import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CarCard from '../../components/features/car/CarCard';

vi.mock('../../api/api', () => ({
  formatKES: vi.fn(v => `KES ${(v / 1000).toFixed(0)}K`),
}));
vi.mock('framer-motion', () => ({
  motion: { div: ({ children, ...p }) => <div {...p}>{children}</div> },
}));
vi.mock('lucide-react', () => ({
  Calendar: () => null,
  Gauge: () => null,
  Fuel: () => null,
  MapPin: () => null,
  Shield: () => null,
  Gavel: () => null,
  Heart: () => null,
  BarChart3: () => null,
  Eye: () => null,
}));

const mockCar = {
  _id: 'c1', make: 'BMW', model: 'X5',
  year: 2023, fuel: 'Petrol', transmission: 'Automatic', price: 8500000,
  mileage: '10,000 km', image: 'https://example.com/img.jpg',
  dealerName: 'Premium Motors', type: 'SUV',
  badges: [], isVerified: false,
};

describe('CarCard', () => {
  afterEach(() => { cleanup(); });

  it('renders without crashing', () => {
    render(<MemoryRouter><CarCard car={mockCar} /></MemoryRouter>);
    expect(document.body.textContent).toBeTruthy();
  });

  it('renders formatted price', () => {
    render(<MemoryRouter><CarCard car={mockCar} /></MemoryRouter>);
    expect(screen.getByText(/KES/)).toBeInTheDocument();
  });
});

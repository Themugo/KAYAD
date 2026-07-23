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

const mockCar = {
  _id: 'c1', title: 'Luxury SUV', brand: 'BMW', model: 'X5',
  year: 2023, fuel: 'Petrol', transmission: 'Automatic', price: 8500000,
  mileage: 10000, images: [{ url: 'https://example.com/img.jpg' }],
  dealer: { name: 'Premium Motors' },
};

describe('CarCard', () => {
  afterEach(() => { cleanup(); });

  it('renders car title', () => {
    render(<MemoryRouter><CarCard car={mockCar} /></MemoryRouter>);
    expect(screen.getByText('Luxury SUV')).toBeInTheDocument();
  });

  it('renders dealer name', () => {
    render(<MemoryRouter><CarCard car={mockCar} /></MemoryRouter>);
    expect(screen.getByText('Premium Motors')).toBeInTheDocument();
  });

  it('renders formatted price', () => {
    render(<MemoryRouter><CarCard car={mockCar} /></MemoryRouter>);
    expect(screen.getByText(/KES/)).toBeInTheDocument();
  });
});

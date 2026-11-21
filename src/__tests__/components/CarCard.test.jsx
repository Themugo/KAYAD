import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CarCard from '../../components/features/car/CarCard';
import { DesignThemeProvider } from '../../theme/DesignThemeProvider';

vi.mock('../../api/api', () => ({
  formatKES: vi.fn(v => `KES ${(v / 1000).toFixed(0)}K`),
}));
vi.mock('framer-motion', () => ({
  motion: { div: ({ children, ...p }) => <div {...p}>{children}</div> },
}));

const mockCar = {
  id: 1, make: 'BMW', model: 'X5',
  year: 2023, fuel: 'Petrol', transmission: 'Automatic', price: 8500000,
  mileage: '10,000 km', city: 'Nairobi', type: 'SUV',
  image: 'https://example.com/img.jpg',
};

describe('CarCard', () => {
  afterEach(() => { cleanup(); });

  it('renders make and model', () => {
    render(<DesignThemeProvider><MemoryRouter><CarCard car={mockCar} /></MemoryRouter></DesignThemeProvider>);
    expect(screen.getAllByText('BMW').length).toBeGreaterThan(0);
    expect(screen.getAllByText('X5').length).toBeGreaterThan(0);
  });

  it('renders formatted price', () => {
    render(<DesignThemeProvider><MemoryRouter><CarCard car={mockCar} /></MemoryRouter></DesignThemeProvider>);
    expect(screen.getAllByText(/KES/).length).toBeGreaterThan(0);
  });
});

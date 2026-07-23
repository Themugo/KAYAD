import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CarGridItem from '../../components/features/car/CartyGrid';

const mockCar = {
  _id: 'c1', title: 'Test Car', brand: 'Toyota', model: 'Hilux',
  year: 2021, fuel: 'Diesel', transmission: 'Manual', price: 2500000,
  mileage: 50000, bodyType: 'Pickup', condition: 'Used',
  images: ['https://example.com/img.jpg'],
  location: { city: 'Nairobi' },
  dealer: { name: 'Test Dealer' },
  createdAt: new Date().toISOString(),
};

describe('CartyGrid', () => {
  afterEach(() => { cleanup(); });

  it('returns null for no car', () => {
    const { container } = render(<MemoryRouter><CarGridItem car={null} /></MemoryRouter>);
    expect(container.innerHTML).toBe('');
  });

  it('renders car title', () => {
    render(<MemoryRouter><CarGridItem car={mockCar} /></MemoryRouter>);
    expect(screen.getByText('Test Car')).toBeInTheDocument();
  });

  it('renders location', () => {
    render(<MemoryRouter><CarGridItem car={mockCar} /></MemoryRouter>);
    expect(screen.getByText('Nairobi')).toBeInTheDocument();
  });

  it('renders mileage', () => {
    render(<MemoryRouter><CarGridItem car={mockCar} /></MemoryRouter>);
    expect(screen.getByText(/50k/)).toBeInTheDocument();
  });

  it('renders price tag', () => {
    render(<MemoryRouter><CarGridItem car={mockCar} /></MemoryRouter>);
    expect(screen.getByText(/Price/i)).toBeInTheDocument();
  });
});

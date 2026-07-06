import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CartyGrid from '../../components/CartyGrid';

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ isAuth: false }),
}));
vi.mock('../../context/CompareContext', () => ({
  useCompare: () => ({ isComparing: () => false, toggleCar: vi.fn(), compareCount: 0 }),
}));
vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));
vi.mock('../../components/LazyImage', () => ({ default: ({ alt }) => <img alt={alt} /> }));
vi.mock('framer-motion', () => ({
  motion: { div: ({ children, ...p }) => <div {...p}>{children}</div> },
}));

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
    const { container } = render(<MemoryRouter><CartyGrid car={null} /></MemoryRouter>);
    expect(container.innerHTML).toBe('');
  });

  it('renders car title', () => {
    render(<MemoryRouter><CartyGrid car={mockCar} /></MemoryRouter>);
    expect(screen.getByText('Test Car')).toBeInTheDocument();
  });

  it('renders location', () => {
    render(<MemoryRouter><CartyGrid car={mockCar} /></MemoryRouter>);
    expect(screen.getByText('Nairobi')).toBeInTheDocument();
  });

  it('renders mileage', () => {
    render(<MemoryRouter><CartyGrid car={mockCar} /></MemoryRouter>);
    expect(screen.getByText(/50k/)).toBeInTheDocument();
  });

  it('renders price tag', () => {
    render(<MemoryRouter><CartyGrid car={mockCar} /></MemoryRouter>);
    expect(screen.getByText(/Price/)).toBeInTheDocument();
  });
});

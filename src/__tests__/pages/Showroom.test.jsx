import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Showroom from '../../pages/Showroom';

vi.mock('../../hooks/usePageMeta', () => ({ default: () => {} }));
vi.mock('../../hooks/useMediaQuery', () => ({ default: () => false }));
vi.mock('../../hooks/useIntersectionObserver', () => ({ default: () => [null, {}] }));
vi.mock('../../hooks/useDebouncedValue', () => ({ default: v => v }));
vi.mock('../../api/api', () => ({
  carsAPI: { list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0, pages: 1 } }) },
  savedSearchAPI: { list: vi.fn().mockResolvedValue({ searches: [] }) },
}));
vi.mock('../../context/SocketContext', () => ({
  useSocket: () => ({ joinShowroom: vi.fn(), on: vi.fn(() => vi.fn()), leaveShowroom: vi.fn() }),
}));
vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));
vi.mock('../../components/SearchBar', () => ({ default: () => null }));
vi.mock('../../components/SearchSidebar', () => ({ default: () => null }));
vi.mock('../../components/CartyGrid', () => ({ default: () => null }));
vi.mock('../../components/SeoStructuredData', () => ({
  ItemListStructuredData: () => null,
  BreadcrumbStructuredData: () => null,
}));
vi.mock('../showroom/components/ShowroomEmptyState', () => ({ default: () => null }));

describe('Showroom', () => {
  afterEach(() => { cleanup(); });

  it('renders page heading', () => {
    render(<MemoryRouter><Showroom /></MemoryRouter>);
    expect(screen.getByText("Kenya's Premium Automotive Gallery")).toBeInTheDocument();
  });

  it('renders The Gallery title', () => {
    render(<MemoryRouter><Showroom /></MemoryRouter>);
    expect(screen.getByText('The Gallery')).toBeInTheDocument();
  });

  it('renders category pills', () => {
    render(<MemoryRouter><Showroom /></MemoryRouter>);
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Buy Now')).toBeInTheDocument();
    expect(screen.getByText('Sold')).toBeInTheDocument();
  });

  it('renders sort dropdown', () => {
    render(<MemoryRouter><Showroom /></MemoryRouter>);
    expect(screen.getByText('Curated')).toBeInTheDocument();
  });

  it('renders view mode toggle buttons', () => {
    render(<MemoryRouter><Showroom /></MemoryRouter>);
    expect(screen.getByLabelText('Grid view')).toBeInTheDocument();
    expect(screen.getByLabelText('List view')).toBeInTheDocument();
  });

  it('shows description text', () => {
    render(<MemoryRouter><Showroom /></MemoryRouter>);
    expect(screen.getByText(/escrow-backed transactions/)).toBeInTheDocument();
  });
});

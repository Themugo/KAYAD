import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
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
// The real useToast() returns a useCallback-memoized `toast` inside a stable
// object, so its identity does not change across renders. Returning a fresh
// `{ toast: vi.fn() }` object (and a fresh vi.fn()) on every call breaks that
// contract: Showroom's loadCars is memoized on [getApiParams, toast], so an
// unstable toast reference gives loadCars a new identity every render, which
// retriggers the effect that calls it (useEffect(..., [filters, sortBy,
// loadCars])) in a tight loop - confirmed via instrumentation to fire 30+
// times in 400ms - flickering `loading` and racing the empty-state assertion.
// Hoisting one stable toast fn (as the real module provides) fixes it.
const toastMocks = vi.hoisted(() => ({ toast: vi.fn() }));
vi.mock('../../context/ToastContext', () => ({
  useToast: () => toastMocks,
}));
vi.mock('../../components/features/common/SearchSidebar', () => ({ default: () => null }));
vi.mock('../../components/features/car/CartyGrid', () => ({ default: () => null }));
vi.mock('../../components/features/common/SeoStructuredData', () => ({
  ItemListStructuredData: () => null,
  BreadcrumbStructuredData: () => null,
}));

describe('Showroom', () => {
  afterEach(() => { cleanup(); });

  it('renders page heading', async () => {
    render(<MemoryRouter><Showroom /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText(/Kenya's Premium Automotive Gallery/)).toBeInTheDocument());
  });

  it('renders The Gallery title', async () => {
    render(<MemoryRouter><Showroom /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('The Gallery')).toBeInTheDocument());
  });

  it('shows the honest empty state when the real API returns no vehicles', async () => {
    render(<MemoryRouter><Showroom /></MemoryRouter>);
    expect(await screen.findByText(/No vehicles match this search/i)).toBeInTheDocument();
  });
});

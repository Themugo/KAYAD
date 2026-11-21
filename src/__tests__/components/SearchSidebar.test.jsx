import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import SearchSidebar from '../../components/features/common/SearchSidebar';

const defaultFilters = {
  filter: 'all', keyword: '', brand: '', location: '', priceMin: '', priceMax: '',
  yearMin: '', yearMax: '', body: '', fuel: '', transmission: '', color: '',
  condition: '', mileageMin: '', mileageMax: '',
};

describe('SearchSidebar', () => {
  afterEach(() => { cleanup(); });

  it('renders brand section title', () => {
    render(<SearchSidebar cars={[]} filters={defaultFilters} onFilterChange={vi.fn()} onBrandChange={vi.fn()} activeBrand="" />);
    expect(screen.getByText('All Makes')).toBeInTheDocument();
  });

  it('renders price section', () => {
    render(<SearchSidebar cars={[]} filters={defaultFilters} onFilterChange={vi.fn()} onBrandChange={vi.fn()} activeBrand="" />);
    expect(screen.getByText('Price (KES)')).toBeInTheDocument();
  });

  it('renders location section', () => {
    render(<SearchSidebar cars={[]} filters={defaultFilters} onFilterChange={vi.fn()} onBrandChange={vi.fn()} activeBrand="" />);
    expect(screen.getByText('All Kenya')).toBeInTheDocument();
  });

  it('renders body type section', () => {
    render(<SearchSidebar cars={[]} filters={defaultFilters} onFilterChange={vi.fn()} onBrandChange={vi.fn()} activeBrand="" />);
    expect(screen.getByText('Body Type')).toBeInTheDocument();
  });

  it('renders fuel section', () => {
    render(<SearchSidebar cars={[]} filters={defaultFilters} onFilterChange={vi.fn()} onBrandChange={vi.fn()} activeBrand="" />);
    expect(screen.getByText('Fuel')).toBeInTheDocument();
  });
});

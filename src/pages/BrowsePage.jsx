import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import CarCard from '../components/CarCard.jsx';
import FilterPanel from '../components/FilterPanel.jsx';
import { MOCK_CARS } from '../data/mockCars.js';

const SORT_OPTIONS = [
  { value: 'default', label: 'Best Match' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'year_desc', label: 'Newest First' },
  { value: 'mileage_asc', label: 'Lowest Mileage' },
];

export default function BrowsePage() {
  const [searchParams] = useSearchParams();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [sort, setSort] = useState('default');
  const [filters, setFilters] = useState({
    search: searchParams.get('q') || '',
    brand: searchParams.get('brand') || 'All',
    fuel: 'All',
    transmission: 'All',
    bodyType: 'All',
    priceMax: 20000000,
    quickFilters: [],
  });

  const filtered = useMemo(() => {
    let cars = [...MOCK_CARS];

    if (filters.search) {
      const q = filters.search.toLowerCase();
      cars = cars.filter((c) =>
        c.title.toLowerCase().includes(q) ||
        c.brand.toLowerCase().includes(q) ||
        c.location.toLowerCase().includes(q)
      );
    }
    if (filters.brand && filters.brand !== 'All') {
      cars = cars.filter((c) => c.brand === filters.brand);
    }
    if (filters.fuel && filters.fuel !== 'All') {
      cars = cars.filter((c) => c.fuel === filters.fuel);
    }
    if (filters.transmission && filters.transmission !== 'All') {
      cars = cars.filter((c) => c.transmission === filters.transmission);
    }
    if (filters.bodyType && filters.bodyType !== 'All') {
      cars = cars.filter((c) => c.bodyType === filters.bodyType);
    }
    if (filters.priceMax) {
      cars = cars.filter((c) => c.price <= filters.priceMax);
    }
    if (filters.quickFilters && filters.quickFilters.length) {
      filters.quickFilters.forEach((qf) => {
        if (qf === 'SUVs') cars = cars.filter((c) => c.bodyType === 'SUV');
        if (qf === 'Sedans') cars = cars.filter((c) => c.bodyType === 'Sedan');
        if (qf === 'Nairobi') cars = cars.filter((c) => c.location === 'Nairobi');
        if (qf === 'Live Auction') cars = cars.filter((c) => c.isAuction);
        if (qf === 'Under KSh 1M') cars = cars.filter((c) => c.price < 1000000);
      });
    }

    switch (sort) {
      case 'price_asc': return cars.sort((a, b) => a.price - b.price);
      case 'price_desc': return cars.sort((a, b) => b.price - a.price);
      case 'year_desc': return cars.sort((a, b) => b.year - a.year);
      case 'mileage_asc': return cars.sort((a, b) =>
        parseInt(a.mileage) - parseInt(b.mileage)
      );
      default: return cars;
    }
  }, [filters, sort]);

  return (
    <>
      <div className="page-header">
        <div className="container">
          <div className="eyebrow">Marketplace</div>
          <h1>Browse Cars</h1>
          <p>{MOCK_CARS.length} cars available across Kenya</p>
        </div>
      </div>

      <div className="container">
        <div className="browse-layout">
          <div className={`filter-panel-wrapper${mobileFiltersOpen ? ' mobile-open' : ''}`}>
            <FilterPanel filters={filters} onChange={setFilters} />
          </div>

          <div>
            <div className="browse-results-header">
              <p className="results-count">
                <strong>{filtered.length}</strong> cars found
                {filters.brand !== 'All' && ` for "${filters.brand}"`}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  className="btn btn-outline btn-sm"
                  style={{ display: 'none' }}
                  onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
                >
                  {mobileFiltersOpen ? '✕ Hide Filters' : '⚙ Show Filters'}
                </button>
                <select
                  className="sort-select"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="empty-state">
                <div className="icon">🔍</div>
                <h3>No cars found</h3>
                <p>Try adjusting your filters or search terms</p>
              </div>
            ) : (
              <div className="cars-grid">
                {filtered.map((car) => (
                  <CarCard key={car.id} car={car} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

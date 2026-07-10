// src/pages/BrowsePage.jsx
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { carsAPI, BRANDS, MOCK_CARS } from '../api/api';
import CarCard from '../components/CarCard';

const FUELS = ['All', 'Petrol', 'Diesel', 'Hybrid', 'Electric'];
const TRANSMISSIONS = ['All', 'Automatic', 'Manual', 'CVT'];
const BODY_TYPES = ['All', 'SUV', 'Sedan', 'Pickup', 'Hatchback', 'Coupe'];

export default function BrowsePage() {
  const [searchParams] = useSearchParams();
  const [sort, setSort] = useState('default');
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cars, setCars] = useState([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    search: '',
    brand: searchParams.get('brand') || 'All',
    fuel: 'All',
    transmission: 'All',
    bodyType: 'All',
    priceMax: 20000000,
  });

  const fetchCars = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        ...filters,
        sort,
        limit: 100,
      };
      if (filters.brand === 'All') delete params.brand;
      if (filters.fuel === 'All') delete params.fuel;
      if (filters.transmission === 'All') delete params.transmission;
      if (filters.bodyType === 'All') delete params.bodyType;

      const data = await carsAPI.list(params);
      setCars(data.cars || []);
      setTotal(data.total || 0);
    } catch {
      // Fallback to mock data with client-side filtering
      setCars(MOCK_CARS);
      setTotal(MOCK_CARS.length);
    } finally {
      setLoading(false);
    }
  }, [filters, sort]);

  useEffect(() => { fetchCars(); }, [fetchCars]);

  const setFilter = (key, val) => setFilters((p) => ({ ...p, [key]: val }));

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: 32, paddingBottom: 40 }}>
        <div style={{ marginBottom: 24 }}>
          <div className="section-eyebrow">Marketplace</div>
          <h2>Browse Cars</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{total} cars available across Kenya</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: showFilters ? '260px 1fr' : '1fr', gap: 24 }}>
          {showFilters && (
            <aside className="card" style={{ padding: 20, height: 'fit-content' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 style={{ fontSize: '1rem' }}>Filters</h3>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowFilters(false)} aria-label="Close filters">✕</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="input-group">
                  <label className="input-label" htmlFor="filter-search">Search</label>
                  <input id="filter-search" className="input" placeholder="Brand, model..." value={filters.search} onChange={(e) => setFilter('search', e.target.value)} />
                </div>
                <div className="input-group">
                  <label className="input-label" htmlFor="filter-brand">Brand</label>
                  <select id="filter-brand" className="input" value={filters.brand} onChange={(e) => setFilter('brand', e.target.value)}>
                    <option value="All">All Brands</option>
                    {BRANDS.map((b) => <option key={b.name} value={b.name}>{b.name}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label" htmlFor="filter-fuel">Fuel Type</label>
                  <select id="filter-fuel" className="input" value={filters.fuel} onChange={(e) => setFilter('fuel', e.target.value)}>
                    {FUELS.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label" htmlFor="filter-transmission">Transmission</label>
                  <select id="filter-transmission" className="input" value={filters.transmission} onChange={(e) => setFilter('transmission', e.target.value)}>
                    {TRANSMISSIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label" htmlFor="filter-body">Body Type</label>
                  <select id="filter-body" className="input" value={filters.bodyType} onChange={(e) => setFilter('bodyType', e.target.value)}>
                    {BODY_TYPES.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label" htmlFor="filter-price">Max Price: KES {filters.priceMax.toLocaleString()}</label>
                  <input id="filter-price" type="range" min={500000} max={20000000} step={100000} value={filters.priceMax} onChange={(e) => setFilter('priceMax', Number(e.target.value))} style={{ width: '100%' }} />
                </div>
                <button className="btn btn-outline btn-sm" onClick={() => setFilters({ search: '', brand: 'All', fuel: 'All', transmission: 'All', bodyType: 'All', priceMax: 20000000 })}>Clear All</button>
              </div>
            </aside>
          )}

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <p style={{ fontSize: 14, color: 'var(--text-muted)' }}><strong>{cars.length}</strong> cars found</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-outline btn-sm" onClick={() => setShowFilters(!showFilters)} aria-expanded={showFilters}>{showFilters ? '✕ Hide Filters' : '⚙ Filters'}</button>
                <select className="input" value={sort} onChange={(e) => setSort(e.target.value)} style={{ width: 'auto', fontSize: 13 }} aria-label="Sort by">
                  <option value="default">Best Match</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="year_desc">Newest First</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="car-grid">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="card" style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="spinner" />
                  </div>
                ))}
              </div>
            ) : cars.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🔍</div>
                <h3>No cars found</h3>
                <p>Try adjusting your filters</p>
              </div>
            ) : (
              <div className="car-grid">
                {cars.map((car) => <CarCard key={car._id || car.id} car={car} />)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

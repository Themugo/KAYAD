// src/pages/CarsPage.jsx
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { carsAPI } from '../api/api';
import CarCard from '../components/CarCard';

const BRANDS       = ['All', 'Toyota', 'Mercedes', 'BMW', 'Land Rover', 'Subaru', 'Mazda', 'Nissan', 'Honda', 'Volkswagen', 'Lexus', 'Audi', 'Mitsubishi'];
const FUELS        = ['All', 'Petrol', 'Diesel', 'Hybrid', 'Electric'];
const TRANSMISSIONS= ['All', 'Automatic', 'Manual'];
const BODY_TYPES   = ['All', 'SUV', 'Sedan', 'Hatchback', 'Pickup', 'Wagon', 'Van', 'Coupe'];
const CITIES       = ['All', 'Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika', 'Nyeri'];

export default function CarsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [cars, setCars]       = useState([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(true);

  // Filters state — init from URL params
  const [filters, setFilters] = useState({
    search:        searchParams.get('search') || '',
    brand:         searchParams.get('brand')  || '',
    fuel:          searchParams.get('fuel')   || '',
    transmission:  searchParams.get('transmission') || '',
    bodyType:      searchParams.get('bodyType') || '',
    city:          searchParams.get('city')   || '',
    minPrice:      searchParams.get('minPrice') || '',
    maxPrice:      searchParams.get('maxPrice') || '',
    minYear:       searchParams.get('minYear') || '',
    maxYear:       searchParams.get('maxYear') || '',
    auctionStatus: searchParams.get('auctionStatus') || '',
  });

  const LIMIT = 12;

  const fetchCars = useCallback(async (pg = 1) => {
    setLoading(true);
    try {
      const params = { page: pg, limit: LIMIT };
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      const data = await carsAPI.list(params);
      setCars(data.cars || data.data || []);
      setTotal(data.pagination?.total || data.total || 0);
      setPage(pg);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchCars(1); }, [filters]);

  const setFilter = (key, val) => {
    setFilters(prev => ({ ...prev, [key]: val }));
    setPage(1);
  };

  const clearAll = () => {
    setFilters({ search:'',brand:'',fuel:'',transmission:'',bodyType:'',city:'',minPrice:'',maxPrice:'',minYear:'',maxYear:'',auctionStatus:'' });
    setSearchParams({});
  };

  const totalPages = Math.ceil(total / LIMIT);
  const hasAuctions = filters.auctionStatus === 'live';

  const SelectFilter = ({ label, options, value, onChange }) => (
    <div className="input-group">
      <label className="input-label">{label}</label>
      <select className="input" value={value} onChange={e => onChange(e.target.value)}>
        {options.map(o => <option key={o} value={o === 'All' ? '' : o}>{o}</option>)}
      </select>
    </div>
  );

  return (
    <div className="page">
      <div className="container" style={{ padding: '32px 24px' }}>

        {/* ─── Header ─── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <div className="section-eyebrow">
              {hasAuctions ? '🔴 Live Now' : 'Marketplace'}
            </div>
            <h2>{hasAuctions ? 'Live Auctions' : 'Browse Cars'}</h2>
            {!loading && <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
              {total.toLocaleString()} cars found
            </div>}
          </div>
          <button className="btn btn-outline btn-sm" onClick={() => setShowFilters(!showFilters)}>
            {showFilters ? '✕ Hide Filters' : '⚙ Filters'}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: showFilters ? '260px 1fr' : '1fr', gap: 28 }}>

          {/* ─── FILTERS SIDEBAR ─── */}
          {showFilters && (
            <div>
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Search */}
                <div className="input-group">
                  <label className="input-label">Search</label>
                  <input className="input" placeholder="Brand, model..." value={filters.search}
                    onChange={e => setFilter('search', e.target.value)} />
                </div>

                <SelectFilter label="Brand"        options={BRANDS}        value={filters.brand}        onChange={v => setFilter('brand', v)} />
                <SelectFilter label="Fuel Type"    options={FUELS}         value={filters.fuel}         onChange={v => setFilter('fuel', v)} />
                <SelectFilter label="Transmission" options={TRANSMISSIONS} value={filters.transmission} onChange={v => setFilter('transmission', v)} />
                <SelectFilter label="Body Type"    options={BODY_TYPES}    value={filters.bodyType}     onChange={v => setFilter('bodyType', v)} />
                <SelectFilter label="City"         options={CITIES}        value={filters.city}         onChange={v => setFilter('city', v)} />

                {/* Price Range */}
                <div>
                  <label className="input-label">Price Range (KES)</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 6 }}>
                    <input className="input" placeholder="Min" type="number" value={filters.minPrice}
                      onChange={e => setFilter('minPrice', e.target.value)} />
                    <input className="input" placeholder="Max" type="number" value={filters.maxPrice}
                      onChange={e => setFilter('maxPrice', e.target.value)} />
                  </div>
                </div>

                {/* Year Range */}
                <div>
                  <label className="input-label">Year</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 6 }}>
                    <input className="input" placeholder="From" type="number" value={filters.minYear}
                      onChange={e => setFilter('minYear', e.target.value)} />
                    <input className="input" placeholder="To" type="number" value={filters.maxYear}
                      onChange={e => setFilter('maxYear', e.target.value)} />
                  </div>
                </div>

                {/* Auction toggle */}
                <button
                  className={`btn btn-sm ${filters.auctionStatus === 'live' ? 'btn-gold' : 'btn-outline'}`}
                  onClick={() => setFilter('auctionStatus', filters.auctionStatus === 'live' ? '' : 'live')}
                  style={{ justifyContent: 'center' }}
                >
                  <span className="live-dot" style={{ width: 6, height: 6 }} />
                  Live Auctions Only
                </button>

                <button className="btn btn-ghost btn-sm" onClick={clearAll} style={{ color: 'var(--text-muted)' }}>
                  ✕ Clear All Filters
                </button>
              </div>
            </div>
          )}

          {/* ─── CARS GRID ─── */}
          <div>
            {loading ? (
              <div className="loading-center"><div className="spinner" /></div>
            ) : cars.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🚗</div>
                <h3>No cars found</h3>
                <p>Try adjusting your filters or search term</p>
                <button className="btn btn-outline" style={{ marginTop: 16 }} onClick={clearAll}>Clear Filters</button>
              </div>
            ) : (
              <>
                <div className="car-grid">
                  {cars.map(car => <CarCard key={car._id} car={car} />)}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 40 }}>
                    <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => fetchCars(page - 1)}>
                      ← Prev
                    </button>
                    {[...Array(Math.min(totalPages, 7))].map((_, i) => {
                      const p = i + 1;
                      return (
                        <button key={p} className="btn btn-sm" onClick={() => fetchCars(p)}
                          style={{ background: page === p ? 'var(--gold)' : 'var(--surface)', color: page === p ? '#07090C' : 'var(--text-muted)', border: '1px solid var(--border)' }}>
                          {p}
                        </button>
                      );
                    })}
                    <button className="btn btn-outline btn-sm" disabled={page >= totalPages} onClick={() => fetchCars(page + 1)}>
                      Next →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

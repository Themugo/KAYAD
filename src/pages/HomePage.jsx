import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { carsAPI, formatKES } from '../api/api';
import { filterMockCars } from '../data/mockCars';
import CarCard from '../components/CarCard';
import { SkeletonGrid } from '../components/Skeleton';

const BRANDS = ['All', 'BMW', 'Mercedes', 'Mitsubishi', 'Nissan', 'Subaru', 'Toyota', 'Volkswagen', 'Mazda', 'Audi', 'Honda', 'Isuzu'];
const FUELS = ['All', 'Petrol', 'Diesel', 'Electric', 'Hybrid'];
const TRANSMISSIONS = ['All', 'Automatic', 'Manual', 'Tiptronic'];
const BODY_TYPES = ['All', 'SUV', 'Sedan', 'Hatchback', 'Wagon', 'Pickup', 'Coupe', 'Van'];
const CITIES = ['All', 'Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika', 'Nyeri', 'Machakos'];

const SPEC_ROWS = [
  { label: 'Price', key: 'price', fmt: v => formatKES(v) },
  { label: 'Year', key: 'year' },
  { label: 'Fuel', key: 'fuel' },
  { label: 'Transmission', key: 'transmission' },
  { label: 'Mileage', key: 'mileage', fmt: v => `${v.toLocaleString()} km` },
  { label: 'Body Type', key: 'bodyType' },
  { label: 'Location', key: 'location', get: c => c.location?.city || '—' },
];

export default function HomePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [cars, setCars] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(true);
  const [compare, setCompare] = useState([]);
  const [showCompare, setShowCompare] = useState(false);

  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    brand: searchParams.get('brand') || '',
    fuel: searchParams.get('fuel') || '',
    transmission: searchParams.get('transmission') || '',
    bodyType: searchParams.get('bodyType') || '',
    city: searchParams.get('city') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    minYear: searchParams.get('minYear') || '',
    maxYear: searchParams.get('maxYear') || '',
    auctionStatus: searchParams.get('auctionStatus') || '',
  });

  const LIMIT = 12;

  const fetchCars = useCallback(async (pg = 1) => {
    setLoading(true);
    try {
      const params = { page: pg, limit: LIMIT };
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      const data = await carsAPI.list(params);
      const apiCars = data.cars || data.data || [];
      setCars(apiCars);
      setTotal(data.pagination?.total || data.total || 0);
      setPage(pg);
    } catch {
      const filtered = filterMockCars(filters);
      const start = (pg - 1) * LIMIT;
      setCars(filtered.slice(start, start + LIMIT));
      setTotal(filtered.length);
      setPage(pg);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { setPage(1); fetchCars(1); }, [filters]);

  const setFilter = (key, val) => {
    setFilters(prev => ({ ...prev, [key]: val }));
    setCompare([]);
  };

  const clearAll = () => {
    setFilters({ search: '', brand: '', fuel: '', transmission: '', bodyType: '', city: '', minPrice: '', maxPrice: '', minYear: '', maxYear: '', auctionStatus: '' });
    setSearchParams({});
    setCompare([]);
  };

  const toggleCompare = (carId) => {
    setCompare(prev => {
      if (prev.includes(carId)) return prev.filter(id => id !== carId);
      if (prev.length >= 4) return prev;
      return [...prev, carId];
    });
  };

  const compareCars = compare.map(id => cars.find(c => c._id === id)).filter(Boolean);

  const totalPages = Math.ceil(total / LIMIT);
  const hasAuctions = filters.auctionStatus === 'live';

  const handleHeroSearch = (e) => {
    e.preventDefault();
    const val = e.target.querySelector('input')?.value || '';
    setFilter('search', val);
  };

  const pillSearch = (tag) => {
    if (tag === 'Live Auction') setFilter('auctionStatus', 'live');
    else if (tag === 'Under KSh 1M') setFilter('maxPrice', '1000000');
    else if (tag === 'Nairobi') setFilter('city', 'Nairobi');
    else setFilter('search', tag);
  };

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

      {/* ─── PREMIUM HERO ─── */}
      <section style={{
        padding: '52px 0 40px',
        background: 'linear-gradient(180deg, var(--card) 0%, rgba(10,22,40,0.98) 100%)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: 10, color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.18em',
            textTransform: 'uppercase', marginBottom: 12,
          }}>
            Kenya's Premium Car Marketplace
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.4rem', fontWeight: 700, marginBottom: 12, lineHeight: 1.15 }}>
            Find Your Next Car<br />
            <span style={{ color: 'var(--gold-light)' }}>With Confidence</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, maxWidth: 480, margin: '0 auto 24px' }}>
            Browse thousands of verified listings from trusted sellers across Kenya.
            Live auctions, M-Pesa payments, and escrow protection included.
          </p>

          <form onSubmit={handleHeroSearch} style={{ display: 'flex', gap: 0, maxWidth: 520, margin: '0 auto 20px' }}>
            <input
              className="input"
              placeholder="Search brand, model, or city..."
              style={{ borderRadius: 'var(--radius) 0 0 var(--radius)', flex: 1, borderRight: 'none', height: 48, fontSize: 14 }}
            />
            <button type="submit" className="btn btn-gold" style={{ borderRadius: '0 var(--radius) var(--radius) 0', flexShrink: 0, padding: '0 28px', height: 48, fontSize: 14 }}>
              Search Cars
            </button>
          </form>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            {['Under KSh 1M', 'SUVs', 'Sedans', 'Nairobi', 'Live Auction'].map(tag => (
              <button
                key={tag}
                onClick={() => pillSearch(tag)}
                style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 100, padding: '6px 16px', fontSize: 12,
                  color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 500,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.target.style.borderColor = 'var(--gold)'; e.target.style.color = 'var(--gold)'; }}
                onMouseLeave={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.color = 'var(--text-muted)'; }}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ─── BROWSE SECTION ─── */}
      <section style={{ padding: '28px 0 48px' }}>
        <div className="container">

          {/* Header bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div>
              <div className="section-eyebrow">
                {hasAuctions ? '🔴 Live Now' : 'Marketplace'}
              </div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>{hasAuctions ? 'Live Auctions' : 'Browse Cars'}</h2>
              {!loading && <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                {total.toLocaleString()} cars found
              </div>}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {compare.length >= 2 && (
                <button className="btn btn-gold btn-sm" onClick={() => setShowCompare(!showCompare)}>
                  📊 Compare ({compare.length})
                </button>
              )}
              <button className="btn btn-outline btn-sm" onClick={() => setShowFilters(!showFilters)}>
                {showFilters ? '✕ Hide Filters' : '⚙ Filters'}
              </button>
            </div>
          </div>

          {/* Compare bar */}
          {compare.length > 0 && !showCompare && (
            <div style={{
              background: 'var(--card)', border: '1px solid var(--gold-muted)',
              borderRadius: 'var(--radius)', padding: '10px 16px', marginBottom: 20,
              display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold)' }}>
                Comparing ({compare.length}/4):
              </span>
              {compareCars.map(c => (
                <span key={c._id} style={{
                  background: 'var(--surface)', borderRadius: 6, padding: '3px 8px',
                  fontSize: 12, display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  {c.title}
                  <button onClick={() => toggleCompare(c._id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
                </span>
              ))}
              <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto', fontSize: 11 }} onClick={() => setCompare([])}>Clear</button>
            </div>
          )}

          {/* Compare table */}
          {showCompare && compareCars.length >= 2 && (
            <div style={{ marginBottom: 24 }}>
              <div className="card" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', width: 140 }}>Spec</th>
                      {compareCars.map(c => (
                        <th key={c._id} style={{ padding: '16px 20px', textAlign: 'center', borderLeft: '1px solid var(--border)' }}>
                          <div style={{ width: 120, height: 80, borderRadius: 8, overflow: 'hidden', background: 'var(--surface)', margin: '0 auto 8px' }}>
                            {c.images?.[0]?.url
                              ? <img src={c.images[0].url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>🚗</div>
                            }
                          </div>
                          <div style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.3 }}>{c.title}</div>
                          <Link to={`/cars/${c._id}`} style={{ fontSize: 11, color: 'var(--gold)', marginTop: 4, display: 'block' }}>View →</Link>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {SPEC_ROWS.map((row, ri) => {
                      const vals = compareCars.map(c => {
                        const raw = row.get ? row.get(c) : c[row.key];
                        return row.fmt ? row.fmt(raw) : (raw || '—');
                      });
                      const allSame = vals.every(v => v === vals[0]);
                      return (
                        <tr key={row.label} style={{ background: ri % 2 === 0 ? 'var(--surface)' : 'transparent' }}>
                          <td style={{ padding: '12px 20px', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{row.label}</td>
                          {vals.map((val, i) => (
                            <td key={i} style={{
                              padding: '12px 20px', textAlign: 'center', borderLeft: '1px solid var(--border)',
                              fontWeight: row.key === 'price' ? 700 : 400,
                              color: row.key === 'price' ? 'var(--gold-light)' : (!allSame ? 'var(--text)' : 'var(--text-muted)'),
                              fontSize: row.key === 'price' ? '1rem' : 14,
                            }}>{val}</td>
                          ))}
                        </tr>
                      );
                    })}
                    <tr>
                      <td style={{ padding: '12px 20px', fontSize: 12, color: 'var(--text-muted)' }}>Actions</td>
                      {compareCars.map(c => (
                        <td key={c._id} style={{ padding: '12px 20px', textAlign: 'center', borderLeft: '1px solid var(--border)' }}>
                          <Link to={c.auctionStatus === 'live' ? `/auction/${c._id}` : `/cars/${c._id}`} className="btn btn-gold btn-sm">View Car</Link>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
              <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={() => setShowCompare(false)}>✕ Close Comparison</button>
            </div>
          )}

          <div className="sidebar-layout" style={{ gridTemplateColumns: showFilters ? '260px 1fr' : '1fr', gap: 28, minHeight: 'auto' }}>

            {/* ─── Filters Sidebar ─── */}
            {showFilters && (
              <div>
                <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="input-group">
                    <label className="input-label">Search</label>
                    <input className="input" placeholder="Brand, model..." value={filters.search} onChange={e => setFilter('search', e.target.value)} />
                  </div>

                  <SelectFilter label="Brand" options={BRANDS} value={filters.brand} onChange={v => setFilter('brand', v)} />
                  <SelectFilter label="Fuel Type" options={FUELS} value={filters.fuel} onChange={v => setFilter('fuel', v)} />
                  <SelectFilter label="Transmission" options={TRANSMISSIONS} value={filters.transmission} onChange={v => setFilter('transmission', v)} />
                  <SelectFilter label="Body Type" options={BODY_TYPES} value={filters.bodyType} onChange={v => setFilter('bodyType', v)} />
                  <SelectFilter label="City" options={CITIES} value={filters.city} onChange={v => setFilter('city', v)} />

                  <div>
                    <label className="input-label">Price (KES)</label>
                    <div className="grid-2" style={{ marginTop: 6 }}>
                      <input className="input" placeholder="Min" type="number" value={filters.minPrice} onChange={e => setFilter('minPrice', e.target.value)} />
                      <input className="input" placeholder="Max" type="number" value={filters.maxPrice} onChange={e => setFilter('maxPrice', e.target.value)} />
                    </div>
                  </div>

                  <div>
                    <label className="input-label">Year</label>
                    <div className="grid-2" style={{ marginTop: 6 }}>
                      <input className="input" placeholder="From" type="number" value={filters.minYear} onChange={e => setFilter('minYear', e.target.value)} />
                      <input className="input" placeholder="To" type="number" value={filters.maxYear} onChange={e => setFilter('maxYear', e.target.value)} />
                    </div>
                  </div>

                  <button className={`btn btn-sm ${filters.auctionStatus === 'live' ? 'btn-gold' : 'btn-outline'}`} onClick={() => setFilter('auctionStatus', filters.auctionStatus === 'live' ? '' : 'live')} style={{ justifyContent: 'center' }}>
                    <span className="live-dot" style={{ width: 6, height: 6 }} />
                    Live Auctions Only
                  </button>

                  <button className="btn btn-ghost btn-sm" onClick={clearAll} style={{ color: 'var(--text-muted)' }}>
                    ✕ Clear All Filters
                  </button>
                </div>
              </div>
            )}

            {/* ─── Car Grid ─── */}
            <div>
              {loading ? (
                <SkeletonGrid count={6} />
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
                    {cars.map(car => (
                      <CarCard
                        key={car._id}
                        car={car}
                        isComparing={compare.includes(car._id)}
                        onToggleCompare={() => toggleCompare(car._id)}
                        compareCount={compare.length}
                      />
                    ))}
                  </div>

                  {totalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 40 }}>
                      <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => fetchCars(page - 1)}>← Prev</button>
                      {[...Array(Math.min(totalPages, 7))].map((_, i) => {
                        const p = i + 1;
                        return (
                          <button key={p} className="btn btn-sm" onClick={() => fetchCars(p)}
                            style={{ background: page === p ? 'var(--gold)' : 'var(--surface)', color: page === p ? '#0A1628' : 'var(--text-muted)', border: '1px solid var(--border)' }}>
                            {p}
                          </button>
                        );
                      })}
                      <button className="btn btn-outline btn-sm" disabled={page >= totalPages} onClick={() => fetchCars(page + 1)}>Next →</button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', padding: '32px 0', textAlign: 'center' }}>
        <div className="container">
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', marginBottom: 12, fontWeight: 600 }}>Gari Motors</div>
          <div style={{ display: 'flex', gap: 20, justifyContent: 'center', fontSize: 12, color: 'var(--text-dim)', flexWrap: 'wrap' }}>
            <Link to="/" style={{ color: 'var(--text-muted)' }}>Browse Cars</Link>
            <Link to="/?auctionStatus=live" style={{ color: 'var(--text-muted)' }}>Live Auctions</Link>
            <Link to="/register?role=dealer" style={{ color: 'var(--text-muted)' }}>List Your Car</Link>
          </div>
          <div style={{ marginTop: 16, color: 'var(--text-dim)', fontSize: 11 }}>
            © {new Date().getFullYear()} Gari Motors Ltd. All rights reserved.
          </div>
        </div>
      </footer>

    </div>
  );
}

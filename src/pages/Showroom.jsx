import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { carsAPI, isDemoMode } from '../api/api';
import { filterMockCars } from '../data/mockCars';
import CartyGrid from '../components/CartyGrid';
import BrowseSidebar from '../components/BrowseSidebar';

const BRANDS = ['All', 'BMW', 'Mercedes', 'Toyota', 'Nissan', 'Subaru', 'Mitsubishi', 'Volkswagen', 'Mazda', 'Audi', 'Range Rover', 'Lexus', 'Isuzu', 'Honda'];

export default function Showroom() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const activeFilter = searchParams.get('filter') || 'all';

  const setFilter = (val) => {
    const next = new URLSearchParams(searchParams);
    if (val === 'all') next.delete('filter');
    else next.set('filter', val);
    setSearchParams(next);
  };

  const brandFilter = searchParams.get('brand') || '';
  const searchQuery = searchParams.get('q') || '';
  const locationFilter = searchParams.get('location') || '';

  const handleFilterUpdate = (type, value) => {
    const next = new URLSearchParams(searchParams);
    if (type === 'search') {
      if (value) next.set('q', value);
      else next.delete('q');
    } else if (type === 'category') {
      if (value === 'Full Gallery') next.delete('filter');
      else if (value === 'Elite Auctions') next.set('filter', 'auction');
      else if (value === 'Showroom Direct') next.set('filter', 'fixed');
      else if (value === 'Private Escrow') next.set('filter', 'escrow');
    } else if (type === 'location') {
      if (value) next.set('location', value);
      else next.delete('location');
    }
    setSearchParams(next);
  };

  useEffect(() => {
    const load = () => {
      if (isDemoMode()) {
        const all = filterMockCars({});
        setCars(all);
        setLoading(false);
        return;
      }
      const params = { limit: 100 };
      if (brandFilter) params.brand = brandFilter;
      carsAPI.list(params)
        .then(data => setCars(data.cars || data.data || []))
        .catch(() => setCars(filterMockCars({})))
        .finally(() => setLoading(false));
    };
    load();
  }, [brandFilter]);

  const filtered = useMemo(() => {
    let list = cars;
    if (brandFilter) {
      list = list.filter(c => c.brand?.toLowerCase() === brandFilter.toLowerCase());
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c =>
        c.title?.toLowerCase().includes(q) ||
        c.brand?.toLowerCase().includes(q) ||
        c.model?.toLowerCase().includes(q)
      );
    }
    if (locationFilter) {
      list = list.filter(c =>
        c.location?.city?.toLowerCase() === locationFilter.toLowerCase()
      );
    }
    if (activeFilter === 'auction') return list.filter(c => c.auctionStatus === 'live' || c.allowBid);
    if (activeFilter === 'fixed') return list.filter(c => !c.allowBid && c.auctionStatus !== 'live');
    return list;
  }, [cars, activeFilter, brandFilter, searchQuery, locationFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aElite = a.auctionStatus === 'live' || a.allowBid ? 1 : 0;
      const bElite = b.auctionStatus === 'live' || b.allowBid ? 1 : 0;
      return bElite - aElite;
    });
  }, [filtered]);

  return (
    <div className="flex min-h-[calc(100vh-72px)] bg-[#050505]">
      <BrowseSidebar onFilterChange={handleFilterUpdate} />
      <main className="flex-1 overflow-y-auto">
        {/* ─── Hero ─── */}
        <section style={{
          padding: '120px 0 60px', textAlign: 'center',
          background: 'radial-gradient(ellipse at 50% 0%, rgba(212,168,67,0.06) 0%, transparent 60%)',
        }}>
          <div style={{ fontSize: 10, color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 16 }}>
            Kenya's Premium Automotive Gallery
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic',
            fontSize: 'clamp(2.5rem, 8vw, 6rem)', lineHeight: 0.85,
            textTransform: 'uppercase', color: '#fff', marginBottom: 40,
          }}>
            The <span style={{ color: 'var(--gold)' }}>Gallery</span>
          </h1>

          {/* ─── Power-Switcher ─── */}
          <div style={{
            display: 'inline-flex', background: 'rgba(255,255,255,0.04)', padding: 6,
            borderRadius: '9999px', border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(12px)',
          }}>
            {[
              { key: 'all', label: 'Full Catalog' },
              { key: 'auction', label: 'Live Auctions' },
              { key: 'fixed', label: 'Direct Buy' },
            ].map(t => (
              <button key={t.key} onClick={() => setFilter(t.key)} style={{
                padding: '14px 32px', borderRadius: '9999px',
                fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em',
                background: activeFilter === t.key ? '#fff' : 'transparent',
                color: activeFilter === t.key ? '#000' : 'rgba(255,255,255,0.4)',
                border: 'none', cursor: 'pointer', transition: 'all 0.3s',
              }}
                onMouseEnter={e => { if (activeFilter !== t.key) e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { if (activeFilter !== t.key) e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}
              >
                {t.key === 'auction' && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', display: 'inline-block', marginRight: 8, verticalAlign: 'middle' }} />}
                {t.label}
              </button>
            ))}
          </div>
        </section>

        {/* ─── Filter Bar ─── */}
        <section style={{ padding: '0 0 40px' }}>
          <div className="container">
            <div style={{
              display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8,
              scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch',
            }}>
              {BRANDS.map(b => (
                <button key={b} style={{
                  flexShrink: 0, padding: '8px 20px', borderRadius: 9999,
                  background: searchParams.get('brand') === b ? 'var(--gold)' : 'rgba(255,255,255,0.04)',
                  color: searchParams.get('brand') === b ? '#000' : 'rgba(255,255,255,0.5)',
                  border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer',
                  fontSize: 11, fontWeight: 700, transition: 'all 0.2s',
                }}
                  onClick={() => {
                    const next = new URLSearchParams(searchParams);
                    if (b === 'All' || next.get('brand') === b) next.delete('brand');
                    else next.set('brand', b);
                    setSearchParams(next);
                  }}>
                  {b}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Grid ─── */}
        <section style={{ padding: '0 0 80px' }}>
          <div className="container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
              <div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  {activeFilter === 'auction' ? 'Live Auctions' : activeFilter === 'fixed' ? 'Direct Buy' : 'Full Catalog'}
                </div>
                {!loading && (
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 700, fontStyle: 'italic', color: '#fff' }}>
                    {sorted.length} {sorted.length === 1 ? 'Vehicle' : 'Vehicles'}
                  </div>
                )}
              </div>
              {searchParams.get('brand') && (
                <button onClick={() => {
                  const next = new URLSearchParams(searchParams);
                  next.delete('brand');
                  setSearchParams(next);
                }} style={{
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 9999, padding: '8px 18px', color: 'rgba(255,255,255,0.5)',
                  fontSize: 11, fontWeight: 600, cursor: 'pointer',
                }}>
                  ✕ {searchParams.get('brand')}
                </button>
              )}
            </div>

            {loading ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 28 }}>
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} style={{ aspectRatio: '4/5', background: 'rgba(255,255,255,0.03)', borderRadius: '2.5rem', animation: 'pulse 1.5s infinite' }} />
                ))}
              </div>
            ) : sorted.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 0', color: 'rgba(255,255,255,0.3)' }}>
                <div style={{ fontSize: 64, marginBottom: 16 }}>🚗</div>
                <h3 style={{ color: '#fff', fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontStyle: 'italic' }}>No vehicles found</h3>
                <p style={{ fontSize: 13, marginTop: 8 }}>Try adjusting your filters</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 28 }}>
                {sorted.map(car => <CartyGrid key={car._id} car={car} />)}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

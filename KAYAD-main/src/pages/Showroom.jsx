import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { carsAPI } from '../api/api';
import CartyGrid from '../components/CartyGrid';
import SearchSidebar from '../components/SearchSidebar';
import GalleryHero from '../components/GalleryHero';
import { LayoutGrid, List } from 'lucide-react';

export default function Showroom() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [page, setPage] = useState(1);
  const perPage = 12;

  const filters = useMemo(() => ({
    filter: searchParams.get('filter') || 'all',
    brand: searchParams.get('brand') || '',
    location: searchParams.get('location') || '',
    priceMin: searchParams.get('priceMin') || '',
    priceMax: searchParams.get('priceMax') || '',
    yearMin: searchParams.get('yearMin') || '',
    yearMax: searchParams.get('yearMax') || '',
    body: searchParams.get('body') || '',
    fuel: searchParams.get('fuel') || '',
    transmission: searchParams.get('transmission') || '',
    color: searchParams.get('color') || '',
    condition: searchParams.get('condition') || '',
    mileageMin: searchParams.get('mileageMin') || '',
    mileageMax: searchParams.get('mileageMax') || '',
  }), [searchParams]);

  const onFilterChange = useCallback((type, value) => {
    const next = new URLSearchParams(searchParams);
    if (type === 'clear') {
      ['filter','brand','location','priceMin','priceMax','yearMin','yearMax',
       'body','fuel','transmission','color','condition','mileageMin','mileageMax'].forEach(k => next.delete(k));
    } else if (type === 'category') {
      if (value === 'all') next.delete('filter');
      else next.set('filter', value);
    } else if (type === 'priceRange') {
      const [min, max] = value.split('-');
      next.set('priceMin', min);
      next.set('priceMax', max);
    } else {
      if (!value) next.delete(type);
      else next.set(type, value);
    }
    setSearchParams(next);
    setPage(1);
  }, [searchParams, setSearchParams]);

  const onBrandChange = useCallback((brand) => {
    const next = new URLSearchParams(searchParams);
    if (!brand || brand === 'All') next.delete('brand');
    else next.set('brand', brand);
    setSearchParams(next);
    setPage(1);
  }, [searchParams, setSearchParams]);

  const activeFilter = filters.filter;
  const brandFilter = filters.brand;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params = { limit: 100 };
        if (brandFilter) params.brand = brandFilter;
        const data = await carsAPI.list(params);
        setCars(data.cars || data.data || []);
      } catch {
        setCars([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [brandFilter]);

  const filtered = useMemo(() => {
    let list = cars;
    if (filters.brand) {
      list = list.filter(c => c.brand?.toLowerCase() === filters.brand.toLowerCase());
    }
    if (filters.location) {
      list = list.filter(c => c.location?.city?.toLowerCase() === filters.location.toLowerCase());
    }
    if (filters.priceMin) {
      list = list.filter(c => c.price >= Number(filters.priceMin));
    }
    if (filters.priceMax) {
      list = list.filter(c => c.price <= Number(filters.priceMax));
    }
    if (filters.yearMin) {
      list = list.filter(c => c.year >= Number(filters.yearMin));
    }
    if (filters.yearMax) {
      list = list.filter(c => c.year <= Number(filters.yearMax));
    }
    if (filters.body) {
      list = list.filter(c => c.bodyType?.toLowerCase() === filters.body);
    }
    if (filters.fuel) {
      list = list.filter(c => c.fuel?.toLowerCase() === filters.fuel);
    }
    if (filters.transmission) {
      list = list.filter(c => c.transmission?.toLowerCase() === filters.transmission);
    }
    if (filters.color) {
      list = list.filter(c => c.color?.toLowerCase() === filters.color);
    }
    if (filters.condition) {
      list = list.filter(c => c.condition?.toLowerCase() === filters.condition);
    }
    if (filters.mileageMin) {
      list = list.filter(c => c.mileage >= Number(filters.mileageMin));
    }
    if (filters.mileageMax) {
      list = list.filter(c => c.mileage <= Number(filters.mileageMax));
    }
    if (activeFilter === 'auction') return list.filter(c => c.auctionStatus === 'live' || c.allowBid);
    if (activeFilter === 'fixed') return list.filter(c => !c.allowBid && c.auctionStatus !== 'live');
    return list;
  }, [cars, activeFilter, filters]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aElite = a.auctionStatus === 'live' || a.allowBid ? 1 : 0;
      const bElite = b.auctionStatus === 'live' || b.allowBid ? 1 : 0;
      return bElite - aElite;
    });
  }, [filtered]);

  const totalPages = Math.ceil(sorted.length / perPage);
  const paged = sorted.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="min-h-[calc(100vh-72px)] bg-[#050505]">
      <div style={{ display: 'flex' }}>
        <SearchSidebar
          cars={cars}
          filters={filters}
          onFilterChange={onFilterChange}
          onBrandChange={onBrandChange}
          activeBrand={filters.brand}
        />
        <main style={{ flex: 1, minWidth: 0 }}>
          <GalleryHero />

          <section style={{ padding: '0 0 40px' }}>
            <div className="container">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    {activeFilter === 'auction' ? 'Live Auctions' : activeFilter === 'fixed' ? 'Direct Buy' : 'Full Catalog'}
                  </div>
                  {!loading && (
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, fontStyle: 'italic', color: '#fff' }}>
                      {sorted.length} {sorted.length === 1 ? 'Vehicle' : 'Vehicles'}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {filters.brand && (
                    <button onClick={() => onBrandChange('All')} style={{
                      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 9999, padding: '6px 14px', color: 'rgba(255,255,255,0.5)',
                      fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    }}>
                      ✕ {filters.brand}
                    </button>
                  )}
                  <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.04)', padding: 4, borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
                    <button onClick={() => setViewMode('grid')} style={{
                      padding: '6px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                      background: viewMode === 'grid' ? 'rgba(212,168,67,0.15)' : 'transparent',
                      color: viewMode === 'grid' ? 'var(--gold)' : 'rgba(255,255,255,0.3)',
                      transition: 'all 0.2s', display: 'flex', alignItems: 'center',
                    }}>
                      <LayoutGrid size={16} />
                    </button>
                    <button onClick={() => setViewMode('list')} style={{
                      padding: '6px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                      background: viewMode === 'list' ? 'rgba(212,168,67,0.15)' : 'transparent',
                      color: viewMode === 'list' ? 'var(--gold)' : 'rgba(255,255,255,0.3)',
                      transition: 'all 0.2s', display: 'flex', alignItems: 'center',
                    }}>
                      <List size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {loading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} style={{ aspectRatio: '4/5', background: 'rgba(255,255,255,0.03)', borderRadius: '1.5rem', animation: 'pulse 1.5s infinite' }} />
                  ))}
                </div>
              ) : sorted.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 0', color: 'rgba(255,255,255,0.3)' }}>
                  <div style={{ fontSize: 64, marginBottom: 16 }}>🚗</div>
                  <h3 style={{ color: '#fff', fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontStyle: 'italic' }}>No vehicles found</h3>
                  <p style={{ fontSize: 13, marginTop: 8 }}>Try adjusting your filters</p>
                </div>
              ) : (
                <>
                  {viewMode === 'grid' ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                      {paged.map(car => <CartyGrid key={car._id} car={car} />)}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden' }}>
                      {paged.map(car => <CartyGrid key={car._id} car={car} listView />)}
                    </div>
                  )}

                  {totalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 40 }}>
                      {Array.from({ length: totalPages }, (_, i) => (
                        <button key={i} onClick={() => setPage(i + 1)} style={{
                          width: 36, height: 36, borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)',
                          background: page === i + 1 ? 'var(--gold)' : 'transparent',
                          color: page === i + 1 ? '#000' : 'rgba(255,255,255,0.4)',
                          fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'all 0.2s',
                        }}>
                          {i + 1}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

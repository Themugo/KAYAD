import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { carsAPI, savedSearchAPI } from '../api/api';
import CartyGrid from '../components/CartyGrid';
import SearchSidebar from '../components/SearchSidebar';
import GalleryHero from '../components/GalleryHero';
import { LayoutGrid, List, Bookmark, BookmarkCheck, Bell, BellOff, Trash2, Search, X, ArrowUpDown, Loader, SlidersHorizontal } from 'lucide-react';
import usePageMeta from '../hooks/usePageMeta';
import useMediaQuery from '../hooks/useMediaQuery';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';

export default function Showroom() {
  usePageMeta('Browse Cars', 'Browse premium cars for sale in Kenya. Filter by make, model, price, and more on Kayad Marketplace.');
  const [searchParams, setSearchParams] = useSearchParams();
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('default');
  const [displayCount, setDisplayCount] = useState(12);
  const PER_BATCH = 12;
  const sentinelRef = useRef(null);

  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(max-width: 1024px)');

  const gridCols = isMobile ? 'repeat(1, 1fr)' : isTablet ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)';

  const [savedSearches, setSavedSearches] = useState([]);
  const [showSavedPanel, setShowSavedPanel] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [showSavePrompt, setShowSavePrompt] = useState(false);

  const socket = useSocket();
  const { toast } = useToast();
  const carsRef = useRef(cars);
  carsRef.current = cars;

  // Join showroom socket room for live listing updates
  useEffect(() => {
    if (!socket) return;
    socket.joinShowroom();
    const unsub = socket.on('listingUpdate', (data) => {
      if (!data?.carId) return;
      setCars(prev => prev.map(c =>
        c._id === data.carId ? { ...c, ...data } : c
      ));
    });
    return () => {
      socket.leaveShowroom();
      unsub();
    };
  }, [socket]);

  // Load saved searches
  useEffect(() => {
    savedSearchAPI.list().then(r => setSavedSearches(r.searches || [])).catch(() => {});
  }, []);

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

  const filtersActive = useMemo(() =>
    Object.entries(filters).some(([k, v]) => k !== 'filter' && v),
  [filters]);

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
  }, [searchParams, setSearchParams]);

  const onBrandChange = useCallback((brand) => {
    const next = new URLSearchParams(searchParams);
    if (!brand || brand === 'All') next.delete('brand');
    else next.set('brand', brand);
    setSearchParams(next);
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
    const list = [...filtered];
    if (sortBy === 'price_asc') list.sort((a, b) => (a.currentBid || a.price || 0) - (b.currentBid || b.price || 0));
    else if (sortBy === 'price_desc') list.sort((a, b) => (b.currentBid || b.price || 0) - (a.currentBid || a.price || 0));
    else if (sortBy === 'year_desc') list.sort((a, b) => (b.year || 0) - (a.year || 0));
    else if (sortBy === 'year_asc') list.sort((a, b) => (a.year || 0) - (b.year || 0));
    else if (sortBy === 'mileage_asc') list.sort((a, b) => (a.mileage || 0) - (b.mileage || 0));
    else if (sortBy === 'views_desc') list.sort((a, b) => (b.views || 0) - (a.views || 0));
    else {
      list.sort((a, b) => {
        const aElite = a.auctionStatus === 'live' || a.allowBid ? 1 : 0;
        const bElite = b.auctionStatus === 'live' || b.allowBid ? 1 : 0;
        return bElite - aElite;
      });
    }
    return list;
  }, [filtered, sortBy]);

  const visible = sorted.slice(0, displayCount);
  const hasMore = displayCount < sorted.length;

  // Reset display count when filters or sort change
  useEffect(() => {
    setDisplayCount(PER_BATCH);
  }, [filters, sortBy]);

  // Infinite scroll observer
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore) {
        setDisplayCount(prev => Math.min(prev + PER_BATCH, sorted.length));
      }
    }, { rootMargin: '200px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, sorted.length]);

  const handleSaveSearch = async () => {
    if (!saveName.trim()) return;
    try {
      await savedSearchAPI.create({ name: saveName.trim(), filters });
      const r = await savedSearchAPI.list();
      setSavedSearches(r.searches || []);
      setSaveName('');
      setShowSavePrompt(false);
      toast('Search saved', 'success');
    } catch {
      toast('Failed to save search', 'error');
    }
  };

  const handleToggleNotify = async (id, current) => {
    try {
      await savedSearchAPI.update(id, { notify: !current });
      setSavedSearches(prev => prev.map(s => s._id === id ? { ...s, notify: !current } : s));
    } catch {}
  };

  const handleDeleteSearch = async (id) => {
    try {
      await savedSearchAPI.remove(id);
      setSavedSearches(prev => prev.filter(s => s._id !== id));
      toast('Search removed', 'info');
    } catch {}
  };

  const handleApplySearch = (saved) => {
    const next = new URLSearchParams();
    Object.entries(saved.filters || {}).forEach(([k, v]) => { if (v) next.set(k, v); });
    setSearchParams(next);
    setShowSavedPanel(false);
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 100px)', background: '#050505' }}>
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row' }}>
        {/* Desktop sidebar */}
        {!isMobile && (
          <SearchSidebar
            cars={cars}
            filters={filters}
            onFilterChange={onFilterChange}
            onBrandChange={onBrandChange}
            activeBrand={filters.brand}
          />
        )}

        {/* Mobile filter drawer */}
        {isMobile && mobileFilterOpen && (
          <>
            <div onClick={() => setMobileFilterOpen(false)} style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 99,
            }} />
            <div style={{
              position: 'fixed', top: 0, left: 0, bottom: 0, width: '85%', maxWidth: 320,
              background: '#070707', zIndex: 100, overflowY: 'auto',
              boxShadow: '4px 0 40px rgba(0,0,0,0.6)',
              animation: 'slideInLeft 0.25s ease',
            }}>
              <SearchSidebar
                cars={cars}
                filters={filters}
                onFilterChange={onFilterChange}
                onBrandChange={onBrandChange}
                activeBrand={filters.brand}
                isMobile
                onClose={() => setMobileFilterOpen(false)}
              />
            </div>
          </>
        )}

        <main style={{ flex: 1, minWidth: 0, background: '#050505', paddingTop: isMobile ? 0 : 0 }}>
          <GalleryHero isMobile={isMobile} />

          <section style={{ padding: '0 0 48px' }}>
            <div className="container">
              {/* ── Toolbar ── */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center',
                marginBottom: 16, paddingTop: 8,
                flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 10 : 0,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                      {activeFilter === 'auction' ? 'Live Auctions' : activeFilter === 'fixed' ? 'Direct Buy' : 'Full Catalog'}
                    </div>
                    {!loading && (
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 700, fontStyle: 'italic', color: '#fff', lineHeight: 1.1 }}>
                        {sorted.length} {sorted.length === 1 ? 'Vehicle' : 'Vehicles'}
                      </div>
                    )}
                  </div>
                  {/* Mobile filter toggle */}
                  {isMobile && (
                    <button onClick={() => setMobileFilterOpen(true)} style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '8px 14px', borderRadius: 8,
                      background: 'rgba(212,196,168,0.1)', border: '1px solid rgba(212,196,168,0.2)',
                      color: 'var(--gold)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    }}>
                      <SlidersHorizontal size={14} /> Filters
                    </button>
                  )}
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  flexWrap: 'wrap', justifyContent: isMobile ? 'flex-start' : 'flex-end',
                }}>
                  {/* Save Search */}
                  {filtersActive && !isMobile && (
                    <button onClick={() => setShowSavePrompt(true)} style={{
                      background: 'rgba(212,196,168,0.1)', border: '1px solid rgba(212,196,168,0.2)',
                      borderRadius: 8, padding: '6px 12px', color: 'var(--gold)',
                      fontSize: 11, fontWeight: 700, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 5,
                    }}>
                      <Bookmark size={13} /> Save
                    </button>
                  )}

                  {/* Saved Searches Panel Toggle */}
                  {savedSearches.length > 0 && !isMobile && (
                    <button onClick={() => setShowSavedPanel(p => !p)} style={{
                      background: showSavedPanel ? 'rgba(212,196,168,0.15)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${showSavedPanel ? 'rgba(212,196,168,0.3)' : 'rgba(255,255,255,0.08)'}`,
                      borderRadius: 8, padding: '6px 12px',
                      color: showSavedPanel ? 'var(--gold)' : 'rgba(255,255,255,0.5)',
                      fontSize: 11, fontWeight: 700, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 5,
                    }}>
                      <Search size={13} /> Saved ({savedSearches.length})
                    </button>
                  )}

                  {filters.brand && (
                    <button onClick={() => onBrandChange('All')} style={{
                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 9999, padding: '5px 10px', color: 'rgba(255,255,255,0.45)',
                      fontSize: 10, fontWeight: 600, cursor: 'pointer',
                    }}>
                      ✕ {filters.brand}
                    </button>
                  )}

                  {/* Sort dropdown */}
                  <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{
                    padding: '5px 8px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.6)',
                    fontSize: 10, fontWeight: 600, cursor: 'pointer', outline: 'none',
                    maxWidth: isMobile ? 120 : 'auto',
                  }}>
                    <option value="default" style={{ background: '#111' }}>Sort: Default</option>
                    <option value="price_asc" style={{ background: '#111' }}>Price: Low → High</option>
                    <option value="price_desc" style={{ background: '#111' }}>Price: High → Low</option>
                    <option value="year_desc" style={{ background: '#111' }}>Year: Newest First</option>
                    <option value="year_asc" style={{ background: '#111' }}>Year: Oldest First</option>
                    <option value="mileage_asc" style={{ background: '#111' }}>Mileage: Lowest First</option>
                    <option value="views_desc" style={{ background: '#111' }}>Most Viewed</option>
                  </select>

                  <div style={{ display: 'flex', gap: 3, background: 'rgba(255,255,255,0.04)', padding: 3, borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
                    <button onClick={() => setViewMode('grid')} style={{
                      padding: '5px 9px', borderRadius: 6, border: 'none', cursor: 'pointer',
                      background: viewMode === 'grid' ? 'rgba(212,196,168,0.15)' : 'transparent',
                      color: viewMode === 'grid' ? 'var(--gold)' : 'rgba(255,255,255,0.3)',
                      transition: 'all 0.2s', display: 'flex', alignItems: 'center',
                    }}>
                      <LayoutGrid size={15} />
                    </button>
                    <button onClick={() => setViewMode('list')} style={{
                      padding: '5px 9px', borderRadius: 6, border: 'none', cursor: 'pointer',
                      background: viewMode === 'list' ? 'rgba(212,196,168,0.15)' : 'transparent',
                      color: viewMode === 'list' ? 'var(--gold)' : 'rgba(255,255,255,0.3)',
                      transition: 'all 0.2s', display: 'flex', alignItems: 'center',
                    }}>
                      <List size={15} />
                    </button>
                  </div>
                </div>
              </div>

              {/* ── Save Search Prompt ── */}
              {showSavePrompt && (
                <div style={{
                  background: '#0C0C0C', border: '1px solid rgba(212,196,168,0.2)',
                  borderRadius: 12, padding: '14px 18px', marginBottom: 16,
                  display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                }}>
                  <Bookmark size={16} style={{ color: 'var(--gold)', flexShrink: 0 }} />
                  <input
                    value={saveName} onChange={e => setSaveName(e.target.value)}
                    placeholder="Name this search..."
                    style={{
                      flex: 1, minWidth: 160,
                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 6, padding: '7px 10px', color: '#fff', fontSize: 12, outline: 'none',
                    }}
                    onKeyDown={e => e.key === 'Enter' && handleSaveSearch()}
                    autoFocus
                  />
                  <button onClick={handleSaveSearch} className="btn btn-gold btn-sm">Save</button>
                  <button onClick={() => { setShowSavePrompt(false); setSaveName(''); }} style={{
                    background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.3)',
                    cursor: 'pointer', fontSize: 11,
                  }}>Cancel</button>
                </div>
              )}

              {/* ── Saved Searches Panel ── */}
              {showSavedPanel && savedSearches.length > 0 && (
                <div style={{
                  background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 12, marginBottom: 16, overflow: 'hidden',
                }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Saved Searches
                  </div>
                  {savedSearches.map(s => (
                    <div key={s._id} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)',
                    }}>
                      <button onClick={() => handleApplySearch(s)} style={{
                        flex: 1, textAlign: 'left', background: 'none', border: 'none',
                        color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        padding: 0, fontFamily: 'inherit',
                      }}>
                        {s.name}
                      </button>
                      <button onClick={() => handleToggleNotify(s._id, s.notify)} style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: s.notify ? 'var(--gold)' : 'rgba(255,255,255,0.2)',
                        display: 'flex', padding: 4,
                      }} title={s.notify ? 'Notifications on' : 'Notifications off'}>
                        {s.notify ? <Bell size={13} /> : <BellOff size={13} />}
                      </button>
                      <button onClick={() => handleDeleteSearch(s._id)} style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'rgba(255,255,255,0.2)', display: 'flex', padding: 4,
                      }} title="Delete">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Grid / List ── */}
              {loading ? (
                viewMode === 'grid' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                      <div key={i} style={{ aspectRatio: '3/4', background: 'rgba(255,255,255,0.03)', borderRadius: '1rem', animation: 'pulse 1.5s infinite' }} />
                    ))}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} style={{ height: 200, background: 'rgba(255,255,255,0.03)', borderRadius: '0.5rem', animation: 'pulse 1.5s infinite' }} />
                    ))}
                  </div>
                )
              ) : sorted.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 0', color: 'rgba(255,255,255,0.28)' }}>
                  <div style={{ fontSize: 56, marginBottom: 16 }}>🚗</div>
                  <h3 style={{ color: '#fff', fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontStyle: 'italic' }}>No vehicles found</h3>
                  <p style={{ fontSize: 13, marginTop: 8 }}>Try adjusting your filters</p>
                </div>
              ) : (
                <>
                  {viewMode === 'grid' ? (
                    <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: isMobile ? 10 : 16 }}>
                      {visible.map(car => <CartyGrid key={car._id} car={car} isMobile={isMobile} />)}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, overflow: 'hidden' }}>
                      {visible.map(car => <CartyGrid key={car._id} car={car} listView isMobile={isMobile} />)}
                    </div>
                  )}

                  {/* Infinite scroll sentinel */}
                  <div ref={sentinelRef} style={{ height: 1 }} />
                  {hasMore && (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '32px 0', color: 'rgba(255,255,255,0.2)' }}>
                      <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />
                      <span style={{ fontSize: 12, fontWeight: 600 }}>Loading more vehicles…</span>
                    </div>
                  )}
                  {!hasMore && sorted.length > PER_BATCH && (
                    <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 11, color: 'rgba(255,255,255,0.15)', fontWeight: 600 }}>
                      Showing all {sorted.length} vehicles
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

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { carsAPI, savedSearchAPI } from '../api/api';
import CartyGrid from '../components/CartyGrid';
import SearchSidebar from '../components/SearchSidebar';
import SearchBar from '../components/SearchBar';
import { LayoutGrid, List, Bookmark, Bell, BellOff, Trash2, Search, X, Loader, SlidersHorizontal, ChevronDown } from 'lucide-react';
import usePageMeta from '../hooks/usePageMeta';
import useMediaQuery from '../hooks/useMediaQuery';
import useIntersectionObserver from '../hooks/useIntersectionObserver';
import { ItemListStructuredData, BreadcrumbStructuredData } from '../components/SeoStructuredData';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';

const FILTER_CHIPS = [
  { label: 'All', value: 'all' },
  { label: 'Auction', value: 'auction' },
  { label: 'Buy Now', value: 'fixed' },
  { label: 'Sold', value: 'sold' },
];

const SORT_OPTIONS = [
  { value: 'default', label: 'Sort: Default' },
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low → High' },
  { value: 'price_desc', label: 'Price: High → Low' },
  { value: 'views_desc', label: 'Most Viewed' },
];

const FILTER_LABELS = {
  brand: 'Brand',
  location: 'Location',
  priceMin: 'Min Price',
  priceMax: 'Max Price',
  yearMin: 'Min Year',
  yearMax: 'Max Year',
  body: 'Body Type',
  fuel: 'Fuel',
  transmission: 'Transmission',
  color: 'Color',
  condition: 'Condition',
  mileageMin: 'Min Mileage',
  mileageMax: 'Max Mileage',
};

export default function Showroom() {
  usePageMeta('Browse Cars', 'Browse premium cars for sale in Kenya. Filter by make, model, price, and more on Kayad Marketplace.');
  const [searchParams, setSearchParams] = useSearchParams();
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('default');
  const [sentinelRef, sentinelEntry] = useIntersectionObserver();
  const loadingRef = useRef(false);

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

  useEffect(() => {
    if (!socket) return;
    socket.joinShowroom();
    const unsub = socket.on('listingUpdate', (data) => {
      if (!data?.carId) return;
      setCars(prev => prev.map(c =>
        c._id === data.carId ? { ...c, ...data } : c
      ));
    });
    return () => { socket.leaveShowroom(); unsub(); };
  }, [socket]);

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
    Object.entries(filters).some(([k, v]) => k !== 'filter' && v), [filters]);

  const activeFilter = filters.filter;
  const brandFilter = filters.brand;

  const onFilterChange = useCallback((type, value) => {
    const next = new URLSearchParams(searchParams);
    if (type === 'clear') {
      ['filter','brand','location','priceMin','priceMax','yearMin','yearMax',
       'body','fuel','transmission','color','condition','mileageMin','mileageMax'].forEach(k => next.delete(k));
    } else if (type === 'category') {
      if (value === 'all') next.delete('filter'); else next.set('filter', value);
    } else if (type === 'priceRange') {
      const [min, max] = value.split('-');
      next.set('priceMin', min); next.set('priceMax', max);
    } else {
      if (!value) next.delete(type); else next.set(type, value);
    }
    setSearchParams(next);
  }, [searchParams, setSearchParams]);

  const onBrandChange = useCallback((brand) => {
    const next = new URLSearchParams(searchParams);
    if (!brand || brand === 'All') next.delete('brand'); else next.set('brand', brand);
    setSearchParams(next);
  }, [searchParams, setSearchParams]);

  function getApiParams(p) {
    return {
      page: p, limit: 12,
      brand: brandFilter || undefined,
      city: filters.location || undefined,
      minPrice: filters.priceMin || undefined,
      maxPrice: filters.priceMax || undefined,
      yearMin: filters.yearMin || undefined,
      yearMax: filters.yearMax || undefined,
      body: filters.body || undefined,
      fuel: filters.fuel || undefined,
      transmission: filters.transmission || undefined,
      color: filters.color || undefined,
      condition: filters.condition || undefined,
      mileageMin: filters.mileageMin || undefined,
      mileageMax: filters.mileageMax || undefined,
      category: activeFilter === 'all' ? undefined : activeFilter,
      sort: sortBy === 'default' ? undefined : sortBy,
    };
  }

  async function loadCars(pageNum, replace) {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const data = await carsAPI.list(getApiParams(pageNum));
      const newCars = data.data || data.cars || [];
      setCars(prev => replace ? newCars : [...prev, ...newCars]);
      setTotalCount(data.pagination?.total || 0);
      setHasMore(pageNum < (data.pagination?.pages || 1));
    } catch {
      if (replace) setCars([]);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }

  useEffect(() => { setPage(1); loadCars(1, true); }, [filters, sortBy]);

  useEffect(() => { if (page > 1) loadCars(page, false); }, [page]);

  useEffect(() => {
    if (sentinelEntry?.isIntersecting && hasMore && !loading) {
      setPage(p => p + 1);
    }
  }, [sentinelEntry, hasMore, loading]);

  const handleSaveSearch = async () => {
    if (!saveName.trim()) return;
    try {
      await savedSearchAPI.create({ name: saveName.trim(), filters });
      const r = await savedSearchAPI.list();
      setSavedSearches(r.searches || []);
      setSaveName('');
      setShowSavePrompt(false);
      toast('Search saved', 'success');
    } catch { toast('Failed to save search', 'error'); }
  };

  const handleToggleNotify = async (id, current) => {
    try {
      await savedSearchAPI.update(id, { notify: !current });
      setSavedSearches(prev => prev.map(s => s._id === id ? { ...s, notify: !current } : s));
    } catch (error) {
      console.warn('Unable to update saved search notifications', error);
    }
  };

  const handleDeleteSearch = async (id) => {
    try {
      await savedSearchAPI.remove(id);
      setSavedSearches(prev => prev.filter(s => s._id !== id));
      toast('Search removed', 'info');
    } catch (error) {
      console.warn('Unable to delete saved search', error);
    }
  };

  const handleApplySearch = (saved) => {
    const next = new URLSearchParams();
    Object.entries(saved.filters || {}).forEach(([k, v]) => { if (v) next.set(k, v); });
    setSearchParams(next);
    setShowSavedPanel(false);
  };

  const handleFilterChip = (value) => {
    const next = new URLSearchParams(searchParams);
    if (value === 'all') next.delete('filter'); else next.set('filter', value);
    setSearchParams(next);
  };

  const activeFilters = useMemo(() => {
    return Object.entries(filters).filter(([k, v]) => k !== 'filter' && v);
  }, [filters]);

  const shimmerStyle = {
    background: 'linear-gradient(90deg, var(--surface) 0%, var(--card) 50%, var(--surface) 100%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
    borderRadius: 'var(--radius-lg)',
  };

  return (
    <>
    <ItemListStructuredData items={cars} />
    <BreadcrumbStructuredData items={[
      { name: 'Home', url: '/' },
      { name: 'Showroom', url: '/showroom' },
    ]} />
    <div style={{ minHeight: 'calc(100vh - 100px)', background: 'var(--bg)' }}>
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row' }}>
        {!isMobile && (
          <SearchSidebar cars={cars} filters={filters} onFilterChange={onFilterChange} onBrandChange={onBrandChange} activeBrand={filters.brand} />
        )}
        {isMobile && mobileFilterOpen && (
          <>
            <div onClick={() => setMobileFilterOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 99 }} />
            <div style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: '85%', maxWidth: 320, background: 'var(--surface)', zIndex: 100, overflowY: 'auto', boxShadow: '4px 0 40px rgba(0,0,0,0.6)', animation: 'slideInLeft 0.25s ease' }}>
              <SearchSidebar cars={cars} filters={filters} onFilterChange={onFilterChange} onBrandChange={onBrandChange} activeBrand={filters.brand} isMobile onClose={() => setMobileFilterOpen(false)} />
            </div>
          </>
        )}
        <main style={{ flex: 1, minWidth: 0, background: 'var(--bg)' }}>
          <section style={{
            position: 'relative',
            padding: isMobile ? '24px 0 32px' : '40px 0 48px',
            background: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(212,196,168,0.12), transparent), radial-gradient(ellipse 60% 40% at 80% 60%, rgba(212,196,168,0.05), transparent), var(--bg)',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(212,196,168,0.2), transparent)',
            }} />
            <div className="container">
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: 9,
                  color: 'var(--gold)',
                  fontWeight: 700,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  marginBottom: 8,
                }}>
                  Kenya's Premium Automotive Gallery
                </div>
                <h1 style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 900,
                  fontStyle: 'italic',
                  fontSize: 'clamp(2rem, 4vw, 3rem)',
                  lineHeight: 1,
                  textTransform: 'uppercase',
                  color: '#fff',
                  margin: '0 0 24px',
                }}>
                  The Gallery
                </h1>
              </div>
              <SearchBar onSearch={(q) => {
                if (q) {
                  const next = new URLSearchParams(searchParams);
                  next.set('search', q);
                  setSearchParams(next);
                }
              }} />
            </div>
          </section>

          <section style={{ padding: '0 0 48px' }}>
            <div className="container">
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: isMobile ? 'stretch' : 'center',
                marginBottom: 16,
                paddingTop: 8,
                flexDirection: isMobile ? 'column' : 'row',
                gap: isMobile ? 10 : 0,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: isMobile ? '100%' : 'auto' }}>
                  <div>
                    <div style={{
                      fontSize: 10,
                      color: 'var(--text-muted)',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.12em',
                    }}>
                      {activeFilter === 'auction' ? 'Live Auctions' : activeFilter === 'fixed' ? 'Direct Buy' : 'Full Catalog'}
                    </div>
                    {!loading && (
                      <div style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '1.3rem',
                        fontWeight: 700,
                        fontStyle: 'italic',
                        color: '#fff',
                        lineHeight: 1.1,
                      }}>
                        {totalCount} {totalCount === 1 ? 'Vehicle' : 'Vehicles'}
                      </div>
                    )}
                  </div>
                  {isMobile && (
                    <button onClick={() => setMobileFilterOpen(true)} style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '8px 14px', borderRadius: 8,
                      background: 'var(--gold-glow)',
                      border: '1px solid rgba(212,196,168,0.2)',
                      color: 'var(--gold)',
                      fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    }}>
                      <SlidersHorizontal size={14} /> Filters
                    </button>
                  )}
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  flexWrap: 'wrap',
                  justifyContent: isMobile ? 'flex-start' : 'flex-end',
                }}>
                  {filtersActive && !isMobile && (
                    <button onClick={() => setShowSavePrompt(true)} style={{
                      background: 'var(--gold-glow)',
                      border: '1px solid rgba(212,196,168,0.2)',
                      borderRadius: 8, padding: '6px 12px',
                      color: 'var(--gold)',
                      fontSize: 11, fontWeight: 700, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 5,
                    }}>
                      <Bookmark size={13} /> Save
                    </button>
                  )}
                  {savedSearches.length > 0 && !isMobile && (
                    <button onClick={() => setShowSavedPanel(p => !p)} style={{
                      background: showSavedPanel ? 'var(--gold-glow)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${showSavedPanel ? 'rgba(212,196,168,0.3)' : 'var(--border)'}`,
                      borderRadius: 8, padding: '6px 12px',
                      color: showSavedPanel ? 'var(--gold)' : 'var(--text-muted)',
                      fontSize: 11, fontWeight: 700, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 5,
                    }}>
                      <Search size={13} /> Saved ({savedSearches.length})
                    </button>
                  )}
                  <div style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                  }}>
                    <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{
                      padding: '6px 28px 6px 12px',
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--text)',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      outline: 'none',
                      appearance: 'none',
                      fontFamily: 'var(--font-body)',
                      maxWidth: isMobile ? 130 : 'auto',
                    }}>
                      {SORT_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value} style={{ background: 'var(--surface)' }}>{opt.label}</option>
                      ))}
                    </select>
                    <ChevronDown size={12} style={{
                      position: 'absolute',
                      right: 10,
                      pointerEvents: 'none',
                      color: 'var(--text-muted)',
                    }} />
                  </div>
                  <div style={{
                    display: 'flex', gap: 3,
                    background: 'var(--surface)',
                    padding: 3, borderRadius: 8,
                    border: '1px solid var(--border)',
                  }}>
                    <button onClick={() => setViewMode('grid')} style={{
                      padding: '5px 9px', borderRadius: 6, border: 'none', cursor: 'pointer',
                      background: viewMode === 'grid' ? 'var(--gold-glow-strong)' : 'transparent',
                      color: viewMode === 'grid' ? 'var(--gold)' : 'var(--text-dim)',
                      transition: 'all 0.2s', display: 'flex', alignItems: 'center',
                    }}>
                      <LayoutGrid size={15} />
                    </button>
                    <button onClick={() => setViewMode('list')} style={{
                      padding: '5px 9px', borderRadius: 6, border: 'none', cursor: 'pointer',
                      background: viewMode === 'list' ? 'var(--gold-glow-strong)' : 'transparent',
                      color: viewMode === 'list' ? 'var(--gold)' : 'var(--text-dim)',
                      transition: 'all 0.2s', display: 'flex', alignItems: 'center',
                    }}>
                      <List size={15} />
                    </button>
                  </div>
                </div>
              </div>

              <div style={{
                display: 'flex',
                gap: 8,
                marginBottom: 16,
                overflowX: isMobile ? 'auto' : 'visible',
                flexWrap: isMobile ? 'nowrap' : 'wrap',
                paddingBottom: 4,
                scrollbarWidth: 'none',
              }}>
                {FILTER_CHIPS.map(f => (
                  <button
                    key={f.value}
                    onClick={() => handleFilterChip(f.value)}
                    style={{
                      padding: '8px 20px',
                      borderRadius: 9999,
                      whiteSpace: 'nowrap',
                      border: `1px solid ${activeFilter === f.value ? 'var(--gold)' : 'var(--border)'}`,
                      background: activeFilter === f.value ? 'var(--gold-glow-strong)' : 'var(--surface)',
                      color: activeFilter === f.value ? 'var(--gold-light)' : 'var(--text-muted)',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s var(--ease)',
                      letterSpacing: '0.04em',
                      fontFamily: 'var(--font-body)',
                      flexShrink: 0,
                    }}
                    onMouseEnter={e => {
                      if (activeFilter !== f.value) {
                        e.currentTarget.style.borderColor = 'var(--gold-muted)';
                        e.currentTarget.style.color = 'var(--text)';
                      }
                    }}
                    onMouseLeave={e => {
                      if (activeFilter !== f.value) {
                        e.currentTarget.style.borderColor = 'var(--border)';
                        e.currentTarget.style.color = 'var(--text-muted)';
                      }
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {activeFilters.length > 0 && (
                <div style={{
                  display: 'flex',
                  gap: 6,
                  flexWrap: 'wrap',
                  marginBottom: 16,
                  alignItems: 'center',
                }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginRight: 4 }}>
                    Active filters:
                  </span>
                  {activeFilters.map(([key, value]) => (
                    <span key={key} style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '4px 10px',
                      borderRadius: 9999,
                      background: 'var(--gold-glow)',
                      border: '1px solid rgba(212,196,168,0.15)',
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--gold-light)',
                    }}>
                      {FILTER_LABELS[key] || key}: {value}
                      <button
                        onClick={() => onFilterChange(key, '')}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--gold-muted)',
                          display: 'flex',
                          padding: 0,
                          fontSize: 13,
                          lineHeight: 1,
                        }}
                      >
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                  <button
                    onClick={() => onFilterChange('clear')}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 9999,
                      border: '1px solid var(--border)',
                      background: 'transparent',
                      color: 'var(--text-muted)',
                      fontSize: 10,
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'var(--font-body)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                  >
                    Clear all
                  </button>
                </div>
              )}

              {showSavePrompt && (
                <div style={{
                  background: 'var(--surface)',
                  border: '1px solid rgba(212,196,168,0.2)',
                  borderRadius: 12, padding: '14px 18px',
                  marginBottom: 16,
                  display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                }}>
                  <Bookmark size={16} style={{ color: 'var(--gold)', flexShrink: 0 }} />
                  <input value={saveName} onChange={e => setSaveName(e.target.value)}
                    placeholder="Name this search..."
                    style={{
                      flex: 1, minWidth: 160,
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid var(--border)',
                      borderRadius: 6, padding: '7px 10px',
                      color: '#fff', fontSize: 12, outline: 'none',
                    }}
                    onKeyDown={e => e.key === 'Enter' && handleSaveSearch()} autoFocus />
                  <button onClick={handleSaveSearch} className="btn btn-gold btn-sm">Save</button>
                  <button onClick={() => { setShowSavePrompt(false); setSaveName(''); }} style={{
                    background: 'transparent', border: 'none',
                    color: 'var(--text-muted)', cursor: 'pointer', fontSize: 11,
                  }}>Cancel</button>
                </div>
              )}

              {showSavedPanel && savedSearches.length > 0 && (
                <div style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 12, marginBottom: 16, overflow: 'hidden',
                }}>
                  <div style={{
                    padding: '12px 16px', borderBottom: '1px solid var(--border)',
                    fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
                    textTransform: 'uppercase', letterSpacing: '0.1em',
                  }}>Saved Searches</div>
                  {savedSearches.map(s => (
                    <div key={s._id} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '10px 16px', borderBottom: '1px solid var(--border)',
                    }}>
                      <button onClick={() => handleApplySearch(s)} style={{
                        flex: 1, textAlign: 'left', background: 'none', border: 'none',
                        color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        padding: 0, fontFamily: 'inherit',
                      }}>{s.name}</button>
                      <button onClick={() => handleToggleNotify(s._id, s.notify)} style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: s.notify ? 'var(--gold)' : 'var(--text-dim)',
                        display: 'flex', padding: 4,
                      }} title={s.notify ? 'Notifications on' : 'Notifications off'}>
                        {s.notify ? <Bell size={13} /> : <BellOff size={13} />}
                      </button>
                      <button onClick={() => handleDeleteSearch(s._id)} style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text-dim)', display: 'flex', padding: 4,
                      }} title="Delete"><Trash2 size={13} /></button>
                    </div>
                  ))}
                </div>
              )}

              {loading && cars.length === 0 ? (
                viewMode === 'grid' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: isMobile ? 10 : 16 }}>
                    {[1, 2, 3, 4, 5, 6].map(i => (
                      <div key={i} style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                        <div style={{ aspectRatio: '4/3', ...shimmerStyle }} />
                        <div style={{ padding: '12px 14px' }}>
                          <div style={{ height: 14, width: '70%', marginBottom: 10, ...shimmerStyle }} />
                          <div style={{ height: 12, width: '40%', marginBottom: 8, ...shimmerStyle }} />
                          <div style={{ height: 20, width: '50%', ...shimmerStyle }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} style={{ height: 140, borderRadius: 'var(--radius)', ...shimmerStyle }} />
                    ))}
                  </div>
                )
              ) : cars.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '80px 24px',
                  color: 'var(--text-muted)',
                  maxWidth: 400,
                  margin: '0 auto',
                }}>
                  <div style={{
                    width: 72,
                    height: 72,
                    borderRadius: '50%',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 20px',
                  }}>
                    <Search size={32} style={{ color: 'var(--text-dim)' }} />
                  </div>
                  <h3 style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.4rem',
                    fontStyle: 'italic',
                    color: '#fff',
                    margin: '0 0 8px',
                  }}>
                    No cars found matching your criteria
                  </h3>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                    Try adjusting your filters, searching for a different make, or clearing all filters to browse the full gallery.
                  </p>
                  {filtersActive && (
                    <button
                      onClick={() => onFilterChange('clear')}
                      className="btn btn-gold"
                      style={{ marginTop: 20 }}
                    >
                      Clear All Filters
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {viewMode === 'grid' ? (
                    <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: isMobile ? 10 : 16 }}>
                      {cars.map(car => <CartyGrid key={car._id} car={car} isMobile={isMobile} />)}
                    </div>
                  ) : (
                    <div style={{
                      display: 'flex', flexDirection: 'column',
                      border: '1px solid var(--border)',
                      borderRadius: 10, overflow: 'hidden',
                    }}>
                      {cars.map(car => <CartyGrid key={car._id} car={car} listView isMobile={isMobile} />)}
                    </div>
                  )}

                  <div ref={sentinelRef} style={{ height: 1 }} />
                  {loading && cars.length > 0 && (
                    <div style={{
                      display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8,
                      padding: '32px 0', color: 'var(--text-muted)',
                    }}>
                      <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />
                      <span style={{ fontSize: 12, fontWeight: 600 }}>Loading more vehicles…</span>
                    </div>
                  )}
                  {!hasMore && totalCount > 12 && (
                    <div style={{
                      textAlign: 'center', padding: '24px 0',
                      fontSize: 11, color: 'var(--text-dim)',
                      fontWeight: 600,
                    }}>
                      Showing all {totalCount} vehicles
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
    </>
  );
}

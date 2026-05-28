// src/pages/Showroom.jsx
// ─────────────────────────────────────────────────────────────────────────
// Premium Showroom — unified command bar.
//
// Architecture rewrite (from the previous 720-line page):
//
//   • SINGLE source of truth for every filter: URL search params.
//     Components subscribe via `useSearchParams`; mutations write back via
//     `setSearchParams`. No duplicated local state for category / brand /
//     sort etc. — they were desyncing in the old layout.
//
//   • ONE search input that actually works. The previous one navigated
//     to `?search=…` but `getApiParams` ignored the param entirely and
//     the backend expected `keyword` anyway. Fixed: typing is debounced
//     by 300 ms, written to URL as `?keyword=…`, and the API request
//     carries it through.
//
//   • ONE row of category pills (All / Auction / Buy Now / Sold).
//     The old page had this same row inside SearchBar AND below it
//     ("filter chips"), each driving a different state.
//
//   • Sticky command bar with backdrop blur — search + pills + sort +
//     view toggle + filter button live on one editorial line.
//
//   • Active-filter strip is its own band, only mounted when at least
//     one filter is set. Each chip carries an × to remove that filter
//     individually; "Save" and "Clear all" sit on the right.
//
//   • Saved searches collapsed into a dropdown anchored to a "Saved"
//     button, instead of a separate full-width panel.
//
//   • Sidebar visible from the medium breakpoint up; below that it
//     becomes a left-side bottom sheet triggered by the filter button.
// ─────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  LayoutGrid, List, Bookmark, Bell, BellOff, Trash2, X,
  Loader, SlidersHorizontal, ChevronDown,
} from 'lucide-react';

import { carsAPI, savedSearchAPI } from '../api/api';
import CartyGrid from '../components/CartyGrid';
import SearchBar from '../components/SearchBar';
import SearchSidebar from '../components/SearchSidebar';
import usePageMeta from '../hooks/usePageMeta';
import useMediaQuery from '../hooks/useMediaQuery';
import useIntersectionObserver from '../hooks/useIntersectionObserver';
import { ItemListStructuredData, BreadcrumbStructuredData } from '../components/SeoStructuredData';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';

// ─── Constants ───────────────────────────────────────────────────────────
const CATEGORY_PILLS = [
  { value: 'all',     label: 'All' },
  { value: 'fixed',   label: 'Buy Now' },
  { value: 'sold',    label: 'Sold' },
];

const SORT_OPTIONS = [
  { value: 'default',    label: 'Curated' },
  { value: 'newest',     label: 'Newest first' },
  { value: 'price_asc',  label: 'Price ↑' },
  { value: 'price_desc', label: 'Price ↓' },
  { value: 'views_desc', label: 'Most viewed' },
];

const FILTER_LABELS = {
  brand: 'Make',
  location: 'Location',
  priceMin: 'Min Price',
  priceMax: 'Max Price',
  yearMin: 'Min Year',
  yearMax: 'Max Year',
  body: 'Body',
  fuel: 'Fuel',
  transmission: 'Transmission',
  color: 'Color',
  condition: 'Condition',
  mileageMin: 'Min Mileage',
  mileageMax: 'Max Mileage',
  keyword: 'Search',
};

const ALL_FILTER_KEYS = [
  'filter', 'keyword', 'brand', 'location',
  'priceMin', 'priceMax', 'yearMin', 'yearMax',
  'body', 'fuel', 'transmission', 'color', 'condition',
  'mileageMin', 'mileageMax',
];

// Debounce hook scoped to this file.
function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

// ─── Component ───────────────────────────────────────────────────────────
export default function Showroom() {
  usePageMeta(
    'Browse Cars',
    'Browse premium cars for sale in Kenya. Filter by make, model, price, body, fuel — every listing escrow-backed on Kayad.'
  );

  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const gridCols = 'repeat(auto-fill, minmax(min(100%, 270px), 1fr))';

  // ─── Local UI state ────────────────────────────────────────────────────
  const [cars, setCars]                 = useState([]);
  const [loading, setLoading]           = useState(true);
  const [page, setPage]                 = useState(1);
  const [hasMore, setHasMore]           = useState(false);
  const [totalCount, setTotalCount]     = useState(0);
  const [viewMode, setViewMode]         = useState('grid');
  const [sortBy, setSortBy]             = useState('default');
  const [sentinelRef, sentinelEntry]    = useIntersectionObserver();
  const loadingRef                      = useRef(false);

  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [savedSearches, setSavedSearches]       = useState([]);
  const [showSavedMenu, setShowSavedMenu]       = useState(false);
  const [showSavePrompt, setShowSavePrompt]     = useState(false);
  const [saveName, setSaveName]                 = useState('');

  // Local mirror of the keyword for snappy typing; debounced before going to URL.
  const [keywordInput, setKeywordInput] = useState(searchParams.get('keyword') || '');
  const debouncedKeyword = useDebouncedValue(keywordInput, 300);

  const socket    = useSocket();
  const { toast } = useToast();

  // ─── Realtime: keep showroom listings live ─────────────────────────────
  useEffect(() => {
    if (!socket) return;
    socket.joinShowroom?.();
    const unsub = socket.on?.('listingUpdate', data => {
      if (!data?.carId) return;
      setCars(prev => prev.map(c => (c._id === data.carId ? { ...c, ...data } : c)));
    });
    return () => { socket.leaveShowroom?.(); unsub?.(); };
  }, [socket]);

  // ─── Load user's saved searches once ──────────────────────────────────
  useEffect(() => {
    savedSearchAPI.list?.().then(r => setSavedSearches(r.searches || [])).catch(() => {});
  }, []);

  // ─── URL ⇄ Filter state ───────────────────────────────────────────────
  const filters = useMemo(() => ({
    filter:        searchParams.get('filter')        || 'all',
    keyword:       searchParams.get('keyword')       || '',
    brand:         searchParams.get('brand')         || '',
    location:      searchParams.get('location')      || '',
    priceMin:      searchParams.get('priceMin')      || '',
    priceMax:      searchParams.get('priceMax')      || '',
    yearMin:       searchParams.get('yearMin')       || '',
    yearMax:       searchParams.get('yearMax')       || '',
    body:          searchParams.get('body')          || '',
    fuel:          searchParams.get('fuel')          || '',
    transmission:  searchParams.get('transmission')  || '',
    color:         searchParams.get('color')         || '',
    condition:     searchParams.get('condition')     || '',
    mileageMin:    searchParams.get('mileageMin')    || '',
    mileageMax:    searchParams.get('mileageMax')    || '',
  }), [searchParams]);

  const activeFilter  = filters.filter;
  const brandFilter   = filters.brand;
  const activeFilters = useMemo(
    () => Object.entries(filters).filter(([k, v]) => k !== 'filter' && v),
    [filters]
  );
  const anyFilterActive = activeFilters.length > 0;

  // Push debounced keyword into URL.
  useEffect(() => {
    if (debouncedKeyword === filters.keyword) return;
    const next = new URLSearchParams(searchParams);
    if (debouncedKeyword) next.set('keyword', debouncedKeyword);
    else next.delete('keyword');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedKeyword]);

  // Keep the input mirror in sync when the URL changes externally (back/forward, saved-search restore).
  useEffect(() => {
    const k = searchParams.get('keyword') || '';
    if (k !== keywordInput) setKeywordInput(k);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // ─── Filter mutations ─────────────────────────────────────────────────
  const onFilterChange = useCallback((type, value) => {
    const next = new URLSearchParams(searchParams);
    if (type === 'clear') {
      ALL_FILTER_KEYS.forEach(k => next.delete(k));
      setKeywordInput('');
    } else if (type === 'category') {
      if (value === 'all') next.delete('filter');
      else                 next.set('filter', value);
    } else if (type === 'priceRange') {
      const [min, max] = value.split('-');
      next.set('priceMin', min); next.set('priceMax', max);
    } else {
      if (!value) next.delete(type);
      else        next.set(type, value);
    }
    setSearchParams(next);
  }, [searchParams, setSearchParams]);

  const onBrandChange = useCallback(brand => {
    const next = new URLSearchParams(searchParams);
    if (!brand || brand === 'All') next.delete('brand');
    else                            next.set('brand', brand);
    setSearchParams(next);
  }, [searchParams, setSearchParams]);

  // ─── API call ─────────────────────────────────────────────────────────
  const getApiParams = useCallback(p => ({
    page: p,
    limit: 12,
    keyword:      filters.keyword     || undefined,
    brand:        brandFilter         || undefined,
    city:         filters.location    || undefined,
    minPrice:     filters.priceMin    || undefined,
    maxPrice:     filters.priceMax    || undefined,
    yearMin:      filters.yearMin     || undefined,
    yearMax:      filters.yearMax     || undefined,
    body:         filters.body        || undefined,
    fuel:         filters.fuel        || undefined,
    transmission: filters.transmission|| undefined,
    color:        filters.color       || undefined,
    condition:    filters.condition   || undefined,
    mileageMin:   filters.mileageMin  || undefined,
    mileageMax:   filters.mileageMax  || undefined,
    category:     activeFilter === 'all' ? undefined : activeFilter,
    sort:         sortBy === 'default' ? undefined : sortBy,
  }), [filters, brandFilter, activeFilter, sortBy]);

  const loadCars = useCallback(async (pageNum, replace) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const data = await carsAPI.list(getApiParams(pageNum));
      const newCars = data.data || data.cars || [];
      setCars(prev => (replace ? newCars : [...prev, ...newCars]));
      setTotalCount(data.pagination?.total || 0);
      setHasMore(pageNum < (data.pagination?.pages || 1));
    } catch {
      if (replace) setCars([]);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [getApiParams]);

  useEffect(() => { setPage(1); loadCars(1, true); }, [filters, sortBy, loadCars]);
  useEffect(() => { if (page > 1) loadCars(page, false); }, [page, loadCars]);

  // Infinite scroll
  useEffect(() => {
    if (sentinelEntry?.isIntersecting && hasMore && !loading) setPage(p => p + 1);
  }, [sentinelEntry, hasMore, loading]);

  // ─── Saved searches actions ───────────────────────────────────────────
  const handleSaveSearch = async () => {
    if (!saveName.trim()) { toast('Give the search a name', 'error'); return; }
    try {
      const filtersPayload = Object.fromEntries(searchParams.entries());
      const res = await savedSearchAPI.create({
        name: saveName.trim(),
        filters: filtersPayload,
        notifyOnNewMatch: true,
      });
      setSavedSearches(prev => [res.search || res.savedSearch || res, ...prev]);
      setShowSavePrompt(false);
      setSaveName('');
      toast('✓ Saved', 'success');
    } catch { toast('Failed to save', 'error'); }
  };

  const handleRestoreSavedSearch = saved => {
    const params = new URLSearchParams(saved.query || '');
    if (!saved.query && saved.filters && typeof saved.filters === 'object') {
      Object.entries(saved.filters).forEach(([key, val]) => {
        if (val !== undefined && val !== null && String(val).length > 0) {
          params.set(key, String(val));
        }
      });
    }
    setSearchParams(params);
    setShowSavedMenu(false);
  };

  const handleToggleAlert = async saved => {
    try {
      const nextNotify = !(saved.notify ?? saved.alertsEnabled);
      const updated = await savedSearchAPI.toggleAlerts(saved._id, nextNotify);
      setSavedSearches(prev => prev.map(s => (s._id === saved._id ? updated.search || updated.savedSearch || updated : s)));
    } catch { toast('Could not toggle alerts', 'error'); }
  };

  const handleDeleteSaved = async saved => {
    if (!window.confirm(`Delete "${saved.name}"?`)) return;
    try {
      await savedSearchAPI.delete(saved._id);
      setSavedSearches(prev => prev.filter(s => s._id !== saved._id));
    } catch { toast('Could not delete', 'error'); }
  };

  // ─── Render ───────────────────────────────────────────────────────────
  return (
    <>
      <ItemListStructuredData items={cars} />
      <BreadcrumbStructuredData items={[
        { name: 'Home', url: '/' },
        { name: 'Showroom', url: '/showroom' },
      ]} />

      <div style={{ minHeight: 'calc(100vh - 100px)', background: 'var(--bg, #050505)' }}>
        {/* ── Editorial hero ─────────────────────────────────────────── */}
        <section style={{
          position: 'relative',
          padding: isMobile ? '32px 0 24px' : '56px 0 40px',
          background:
            'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(212,196,168,0.10), transparent),' +
            'radial-gradient(ellipse 60% 40% at 80% 80%, rgba(212,196,168,0.04), transparent),' +
            'var(--bg, #050505)',
          overflow: 'hidden',
        }}>
          {/* top hairline */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(212,196,168,0.25), transparent)',
          }} />
          <div className="container" style={{ textAlign: 'center', maxWidth: 720, margin: '0 auto' }}>
            <div style={{
              fontSize: 10,
              color: 'var(--gold, #D4C4A8)',
              fontWeight: 700,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              marginBottom: 10,
            }}>
              Kenya's Premium Automotive Gallery
            </div>
            <h1 style={{
              fontFamily: 'var(--font-display, "Cormorant Garamond", Georgia, serif)',
              fontWeight: 900,
              fontStyle: 'italic',
              fontSize: 'clamp(2.2rem, 5vw, 3.4rem)',
              lineHeight: 1,
              color: '#fff',
              margin: '0 0 14px',
              letterSpacing: '-0.02em',
            }}>
              The Gallery
            </h1>
            <p style={{
              fontSize: 13,
              color: 'rgba(255,255,255,0.45)',
              maxWidth: 480,
              margin: '0 auto',
              lineHeight: 1.6,
              fontFamily: 'var(--font-body, "DM Sans", sans-serif)',
            }}>
              Curated listings, transparent pricing, escrow-backed transactions.
              Every vehicle independently verifiable.
            </p>
          </div>
        </section>

        {/* ── Sticky command bar ──────────────────────────────────────── */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 30,
          background: 'rgba(5,5,5,0.85)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          borderTop: '1px solid rgba(255,255,255,0.04)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div className="container" style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'stretch' : 'center',
            gap: isMobile ? 10 : 14,
            padding: isMobile ? '14px 16px' : '14px 0',
          }}>
            {/* Search — flexible, takes priority */}
            <div style={{ flex: isMobile ? 'unset' : '1 1 280px', minWidth: 0, maxWidth: 360 }}>
              <SearchBar
                value={keywordInput}
                onChange={setKeywordInput}
                size="sm"
                placeholder="Search make, model, keyword…"
              />
            </div>

            {/* Category pills — single source of truth from URL */}
            <div
              role="tablist"
              aria-label="Listing category"
              style={{
                display: 'flex', gap: 6,
                overflowX: isMobile ? 'auto' : 'visible',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                padding: isMobile ? '2px 0' : 0,
                margin: isMobile ? '0 -2px' : 0,
              }}
            >
              {CATEGORY_PILLS.map(c => {
                const isActive = activeFilter === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => onFilterChange('category', c.value)}
                    style={{
                      padding: '7px 16px',
                      borderRadius: 9999,
                      border: `1px solid ${isActive ? 'var(--gold, #D4C4A8)' : 'rgba(255,255,255,0.08)'}`,
                      background: isActive ? 'rgba(212,196,168,0.10)' : 'rgba(255,255,255,0.02)',
                      color: isActive ? 'var(--gold, #D4C4A8)' : 'rgba(255,255,255,0.55)',
                      fontSize: 12, fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      letterSpacing: '0.04em',
                      fontFamily: 'var(--font-body, sans-serif)',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                    onMouseEnter={e => {
                      if (!isActive) {
                        e.currentTarget.style.borderColor = 'rgba(212,196,168,0.3)';
                        e.currentTarget.style.color = '#fff';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isActive) {
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                        e.currentTarget.style.color = 'rgba(255,255,255,0.55)';
                      }
                    }}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>

            {/* Right rail — sort, view, filter */}
            <div style={{
              display: 'flex', gap: 8, alignItems: 'center',
              marginLeft: isMobile ? 0 : 'auto',
              flexShrink: 0,
            }}>
              {/* Sort */}
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  aria-label="Sort results"
                  style={{
                    padding: '8px 28px 8px 12px',
                    borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.02)',
                    color: 'rgba(255,255,255,0.85)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    outline: 'none',
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    fontFamily: 'var(--font-body, sans-serif)',
                  }}
                >
                  {SORT_OPTIONS.map(o => (
                    <option key={o.value} value={o.value} style={{ background: '#0c0c0c' }}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={12} style={{
                  position: 'absolute', right: 9,
                  pointerEvents: 'none',
                  color: 'rgba(255,255,255,0.45)',
                }} />
              </div>

              {/* View toggle */}
              <div
                role="group" aria-label="Layout"
                style={{
                  display: 'flex', gap: 2,
                  background: 'rgba(255,255,255,0.02)',
                  padding: 3, borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  aria-label="Grid view"
                  aria-pressed={viewMode === 'grid'}
                  style={{
                    padding: '6px 9px', borderRadius: 6, border: 'none',
                    background: viewMode === 'grid' ? 'rgba(212,196,168,0.12)' : 'transparent',
                    color: viewMode === 'grid' ? 'var(--gold, #D4C4A8)' : 'rgba(255,255,255,0.45)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex', alignItems: 'center',
                  }}
                >
                  <LayoutGrid size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  aria-label="List view"
                  aria-pressed={viewMode === 'list'}
                  style={{
                    padding: '6px 9px', borderRadius: 6, border: 'none',
                    background: viewMode === 'list' ? 'rgba(212,196,168,0.12)' : 'transparent',
                    color: viewMode === 'list' ? 'var(--gold, #D4C4A8)' : 'rgba(255,255,255,0.45)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex', alignItems: 'center',
                  }}
                >
                  <List size={14} />
                </button>
              </div>

              {/* Filter button — opens sidebar on mobile only */}
              {isMobile && (
                <button
                  type="button"
                  onClick={() => setMobileFilterOpen(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 12px', borderRadius: 8,
                    background: anyFilterActive ? 'rgba(212,196,168,0.12)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${anyFilterActive ? 'rgba(212,196,168,0.3)' : 'rgba(255,255,255,0.08)'}`,
                    color: anyFilterActive ? 'var(--gold, #D4C4A8)' : 'rgba(255,255,255,0.85)',
                    fontSize: 12, fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <SlidersHorizontal size={13} />
                  Filter{anyFilterActive ? ` · ${activeFilters.length}` : ''}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Active-filter band (renders only when needed) ─────────────── */}
        {(anyFilterActive || savedSearches.length > 0) && (
          <div className="container" style={{
            display: 'flex', flexWrap: 'wrap', alignItems: 'center',
            gap: 8,
            padding: isMobile ? '12px 16px' : '14px 0',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
          }}>
            {/* Result count — premium italic */}
            <div style={{
              fontFamily: 'var(--font-display, serif)',
              fontStyle: 'italic',
              fontWeight: 700,
              fontSize: 15,
              color: '#fff',
              marginRight: 8,
            }}>
              {loading && cars.length === 0
                ? '…'
                : `${totalCount.toLocaleString()} ${totalCount === 1 ? 'vehicle' : 'vehicles'}`}
            </div>

            {/* Filter chips with × */}
            {activeFilters.map(([key, value]) => (
              <span
                key={key}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '5px 10px',
                  borderRadius: 9999,
                  background: 'rgba(212,196,168,0.08)',
                  border: '1px solid rgba(212,196,168,0.18)',
                  fontSize: 11, fontWeight: 600,
                  color: 'rgba(255,255,255,0.85)',
                  fontFamily: 'var(--font-body, sans-serif)',
                }}
              >
                <span style={{ color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 9 }}>
                  {FILTER_LABELS[key] || key}
                </span>
                <span>{value}</span>
                <button
                  type="button"
                  onClick={() => onFilterChange(key, '')}
                  aria-label={`Remove ${FILTER_LABELS[key] || key} filter`}
                  style={{
                    background: 'none', border: 'none', padding: 0,
                    color: 'rgba(212,196,168,0.7)',
                    cursor: 'pointer', display: 'flex', lineHeight: 1,
                  }}
                >
                  <X size={11} />
                </button>
              </span>
            ))}

            {/* Right cluster: save / saved / clear */}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
              {anyFilterActive && (
                <button
                  type="button"
                  onClick={() => setShowSavePrompt(true)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    background: 'rgba(212,196,168,0.06)',
                    border: '1px solid rgba(212,196,168,0.18)',
                    borderRadius: 8, padding: '5px 11px',
                    color: 'var(--gold, #D4C4A8)',
                    fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  <Bookmark size={12} /> Save
                </button>
              )}

              {savedSearches.length > 0 && (
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => setShowSavedMenu(p => !p)}
                    aria-expanded={showSavedMenu}
                    aria-haspopup="menu"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      background: showSavedMenu ? 'rgba(212,196,168,0.08)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${showSavedMenu ? 'rgba(212,196,168,0.2)' : 'rgba(255,255,255,0.08)'}`,
                      borderRadius: 8, padding: '5px 11px',
                      color: showSavedMenu ? 'var(--gold, #D4C4A8)' : 'rgba(255,255,255,0.7)',
                      fontSize: 11, fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    Saved · {savedSearches.length}
                    <ChevronDown size={11} style={{ transform: showSavedMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                  </button>

                  {showSavedMenu && (
                    <div
                      role="menu"
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 6px)',
                        right: 0,
                        minWidth: 260, maxWidth: 360,
                        background: '#0c0c0c',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 10,
                        boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
                        overflow: 'hidden',
                        zIndex: 40,
                      }}
                    >
                      {savedSearches.map(s => (
                        <div
                          key={s._id}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '10px 12px',
                            borderBottom: '1px solid rgba(255,255,255,0.04)',
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => handleRestoreSavedSearch(s)}
                            style={{
                              flex: 1,
                              background: 'transparent', border: 'none',
                              color: 'rgba(255,255,255,0.85)',
                              fontSize: 12, fontWeight: 600,
                              textAlign: 'left', cursor: 'pointer',
                              padding: 0,
                              fontFamily: 'var(--font-body, sans-serif)',
                            }}
                          >
                            {s.name}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleAlert(s)}
                            aria-label={(s.notify ?? s.alertsEnabled) ? 'Disable alerts' : 'Enable alerts'}
                            style={{
                              background: 'transparent', border: 'none',
                              cursor: 'pointer', display: 'flex',
                              color: (s.notify ?? s.alertsEnabled) ? 'var(--gold, #D4C4A8)' : 'rgba(255,255,255,0.3)',
                              padding: 2,
                            }}
                          >
                            {(s.notify ?? s.alertsEnabled) ? <Bell size={13} /> : <BellOff size={13} />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSaved(s)}
                            aria-label="Delete saved search"
                            style={{
                              background: 'transparent', border: 'none',
                              cursor: 'pointer', display: 'flex',
                              color: 'rgba(255,255,255,0.3)', padding: 2,
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {anyFilterActive && (
                <button
                  type="button"
                  onClick={() => onFilterChange('clear')}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 8, padding: '5px 11px',
                    color: 'rgba(255,255,255,0.55)',
                    fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.color = '#ef4444';
                    e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.color = 'rgba(255,255,255,0.55)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                  }}
                >
                  Clear all
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Save-search prompt ────────────────────────────────────── */}
        {showSavePrompt && (
          <div className="container" style={{ padding: isMobile ? '12px 16px 0' : '12px 0 0' }}>
            <div style={{
              background: '#0c0c0c',
              border: '1px solid rgba(212,196,168,0.18)',
              borderRadius: 10,
              padding: '12px 14px',
              display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
            }}>
              <Bookmark size={14} style={{ color: 'var(--gold, #D4C4A8)', flexShrink: 0 }} />
              <input
                value={saveName}
                onChange={e => setSaveName(e.target.value)}
                placeholder="Name this search…"
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter') handleSaveSearch(); }}
                style={{
                  flex: 1, minWidth: 160,
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 6, padding: '7px 10px',
                  color: '#fff', fontSize: 12, outline: 'none',
                  fontFamily: 'var(--font-body, sans-serif)',
                }}
              />
              <button type="button" onClick={handleSaveSearch} className="btn btn-gold btn-sm">Save</button>
              <button
                type="button"
                onClick={() => { setShowSavePrompt(false); setSaveName(''); }}
                style={{
                  background: 'transparent', border: 'none',
                  color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 11,
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── Body: sidebar + grid ─────────────────────────────────── */}
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          paddingTop: 8,
        }}>
          {/* Desktop / tablet sidebar */}
          {!isMobile && (
            <aside style={{ flexShrink: 0 }}>
              <SearchSidebar
                cars={cars}
                filters={filters}
                onFilterChange={onFilterChange}
                onBrandChange={onBrandChange}
                activeBrand={filters.brand}
              />
            </aside>
          )}

          {/* Mobile bottom-sheet sidebar */}
          {isMobile && mobileFilterOpen && (
            <>
              <div
                role="presentation"
                onClick={() => setMobileFilterOpen(false)}
                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 99 }}
              />
              <div style={{
                position: 'fixed', top: 0, left: 0, bottom: 0,
                width: '85%', maxWidth: 320,
                background: '#0a0a0a',
                zIndex: 100,
                overflowY: 'auto',
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

          {/* Grid / list area */}
          <main style={{ flex: 1, minWidth: 0, padding: isMobile ? '4px 16px 48px' : '8px 0 64px' }}>
            <div className="container" style={{ padding: isMobile ? 0 : '0 0 0 24px' }}>
              {/* Loading state for first page */}
              {loading && cars.length === 0 ? (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: gridCols,
                  gap: isMobile ? 12 : 18,
                }}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      borderRadius: 14,
                      aspectRatio: '4/3',
                      animation: 'pulse 1.4s ease-in-out infinite',
                    }} />
                  ))}
                </div>
              ) : cars.length === 0 ? (
                <EmptyState onClear={() => onFilterChange('clear')} />
              ) : viewMode === 'grid' ? (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: gridCols,
                  gap: isMobile ? 12 : 18,
                }}>
                  {cars.map(car => <CartyGrid key={car._id} car={car} isMobile={isMobile} />)}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {cars.map(car => (
                    <CartyGrid key={car._id} car={car} listView isMobile={isMobile} />
                  ))}
                </div>
              )}

              {/* Infinite scroll sentinel */}
              {hasMore && (
                <div
                  ref={sentinelRef}
                  style={{
                    display: 'flex', justifyContent: 'center',
                    padding: 32, color: 'rgba(255,255,255,0.4)',
                  }}
                >
                  <Loader size={18} className="spin" />
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────
function EmptyState({ onClear }) {
  return (
    <div style={{
      textAlign: 'center',
      padding: '60px 20px',
      maxWidth: 480,
      margin: '0 auto',
    }}>
      <div style={{
        fontSize: 11, color: 'var(--gold, #D4C4A8)',
        fontWeight: 700, letterSpacing: '0.2em',
        textTransform: 'uppercase', marginBottom: 14,
      }}>
        Empty Gallery
      </div>
      <h2 style={{
        fontFamily: 'var(--font-display, serif)',
        fontStyle: 'italic',
        fontWeight: 700,
        fontSize: 'clamp(1.4rem, 3vw, 1.8rem)',
        color: '#fff',
        margin: '0 0 12px',
      }}>
        No vehicles match this search
      </h2>
      <p style={{
        fontSize: 13, color: 'rgba(255,255,255,0.5)',
        lineHeight: 1.6, marginBottom: 22,
        fontFamily: 'var(--font-body, sans-serif)',
      }}>
        Try loosening a filter — or browse the full catalogue.
      </p>
      <button
        type="button"
        onClick={onClear}
        style={{
          background: 'var(--gold, #D4C4A8)',
          border: 'none',
          borderRadius: 10,
          padding: '10px 22px',
          color: '#0a0a0a',
          fontSize: 12,
          fontWeight: 800,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          cursor: 'pointer',
          fontFamily: 'var(--font-body, sans-serif)',
        }}
      >
        Reset Filters
      </button>
    </div>
  );
}

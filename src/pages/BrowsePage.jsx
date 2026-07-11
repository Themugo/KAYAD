import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { carsAPI, BRANDS, MOCK_CARS } from '../api/api';
import CarCard from '../components/CarCard';
import { Button, Badge, FilterChip, RangeSlider, EmptyState, Skeleton, Segmented, Drawer } from '../components/ui';
import { useInfiniteScroll } from '../utils/useInfiniteScroll';
import { dedupedFetch, clearCache } from '../utils/requestCache';

const FUELS = ['All', 'Petrol', 'Diesel', 'Hybrid', 'Electric'];
const TRANSMISSIONS = ['All', 'Automatic', 'Manual', 'CVT'];
const BODY_TYPES = ['All', 'SUV', 'Sedan', 'Pickup', 'Hatchback', 'Coupe'];
const SORTS = [
  { id: 'default',    label: 'Best Match' },
  { id: 'price_asc',  label: 'Price: Low → High' },
  { id: 'price_desc', label: 'Price: High → Low' },
  { id: 'year_desc',  label: 'Newest First' },
];
const PAGE_SIZE = 24;

export default function BrowsePage() {
  const [searchParams] = useSearchParams();
  const [sort, setSort] = useState('default');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cars, setCars] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [view, setView] = useState('grid');
  const [activeChips, setActiveChips] = useState([]);
  const filterKey = useRef(0);

  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    brand: searchParams.get('brand') || 'All',
    fuel: 'All',
    transmission: 'All',
    bodyType: searchParams.get('bodyType') || 'All',
    priceMax: 20000000,
    mileageMax: 200000,
    auctionOnly: false,
    verifiedOnly: false,
    inspectedOnly: false,
  });

  const fetchCars = useCallback(async (pageNum = 1, append = false) => {
    if (pageNum === 1) { setLoading(true); filterKey.current++; }
    else setLoadingMore(true);
    try {
      const params = { ...filters, sort, limit: PAGE_SIZE * pageNum };
      if (filters.brand === 'All') delete params.brand;
      if (filters.fuel === 'All') delete params.fuel;
      if (filters.transmission === 'All') delete params.transmission;
      if (filters.bodyType === 'All') delete params.bodyType;
      if (filters.auctionOnly) params.auctionStatus = 'live';

      const cacheKey = `cars:${JSON.stringify(params)}:page${pageNum}`;
      const data = await dedupedFetch(cacheKey, () => carsAPI.listPaginated(params, pageNum, PAGE_SIZE), 15000);

      if (append) {
        setCars(prev => [...prev, ...(data.cars || [])]);
      } else {
        setCars(data.cars || []);
      }
      setTotal(data.total || 0);
      setHasMore(data.hasMore !== false);
      setPage(pageNum);
    } catch {
      if (!append) setCars(MOCK_CARS);
      setTotal(MOCK_CARS.length);
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filters, sort]);

  useEffect(() => { fetchCars(1); }, [fetchCars]);

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore) fetchCars(page + 1, true);
  }, [loadingMore, hasMore, page, fetchCars]);

  const sentinelRef = useInfiniteScroll(handleLoadMore, hasMore && !loading, 400);

  const setFilter = useCallback((key, val) => {
    setFilters(p => ({ ...p, [key]: val }));
  }, []);

  const toggleChip = useCallback((chip) => {
    setActiveChips(prev => prev.includes(chip) ? prev.filter(c => c !== chip) : [...prev, chip]);
    if (chip === 'Auction Only') setFilters(p => ({ ...p, auctionOnly: !p.auctionOnly }));
    if (chip === 'Verified') setFilters(p => ({ ...p, verifiedOnly: !p.verifiedOnly }));
    if (chip === 'Inspected') setFilters(p => ({ ...p, inspectedOnly: !p.inspectedOnly }));
  }, []);

  const clearAll = useCallback(() => {
    setFilters({ search: '', brand: 'All', fuel: 'All', transmission: 'All', bodyType: 'All', priceMax: 20000000, mileageMax: 200000, auctionOnly: false, verifiedOnly: false, inspectedOnly: false });
    setActiveChips([]);
  }, []);

  const resultLabel = useMemo(() => {
    if (loading) return '';
    return `${total} vehicle${total !== 1 ? 's' : ''} available across Kenya`;
  }, [total, loading]);

  const skeletonCards = useMemo(() => (
    [...Array(8)].map((_, i) => <div key={i} className="skeleton-card" />)
  ), []);

  const FilterContent = useCallback(() => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="ui-input-group">
        <label className="ui-input-label">Search</label>
        <input className="ui-input" placeholder="Brand, model, keyword…" value={filters.search} onChange={e => setFilter('search', e.target.value)} />
      </div>
      <div className="ui-input-group">
        <label className="ui-input-label">Brand</label>
        <select className="ui-input ui-select" value={filters.brand} onChange={e => setFilter('brand', e.target.value)}>
          <option value="All">All Brands</option>
          {BRANDS.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
        </select>
      </div>
      <div className="ui-input-group">
        <label className="ui-input-label">Fuel Type</label>
        <select className="ui-input ui-select" value={filters.fuel} onChange={e => setFilter('fuel', e.target.value)}>
          {FUELS.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>
      <div className="ui-input-group">
        <label className="ui-input-label">Transmission</label>
        <select className="ui-input ui-select" value={filters.transmission} onChange={e => setFilter('transmission', e.target.value)}>
          {TRANSMISSIONS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div className="ui-input-group">
        <label className="ui-input-label">Body Type</label>
        <select className="ui-input ui-select" value={filters.bodyType} onChange={e => setFilter('bodyType', e.target.value)}>
          {BODY_TYPES.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>
      <RangeSlider label="Max Price" min={500000} max={20000000} step={100000} value={filters.priceMax}
        onChange={v => setFilter('priceMax', v)} formatValue={v => `KES ${v.toLocaleString()}`} />
      <RangeSlider label="Max Mileage" min={0} max={200000} step={5000} value={filters.mileageMax}
        onChange={v => setFilter('mileageMax', v)} formatValue={v => `${v.toLocaleString()} km`} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label className="ui-input-label">Quick Filters</label>
        {['Auction Only', 'Verified', 'Inspected'].map(chip => (
          <FilterChip key={chip} label={chip} active={activeChips.includes(chip)} onToggle={() => toggleChip(chip)} />
        ))}
      </div>
      <Button variant="outline" size="sm" onClick={clearAll}>Clear All Filters</Button>
    </div>
  ), [filters, activeChips, setFilter, toggleChip, clearAll]);

  return (
    <div className="page" style={{ paddingTop: 68 }}>
      <div className="browse-header">
        <div className="container" style={{ padding: '0 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div className="section-eyebrow" style={{ marginBottom: 2 }}>Marketplace</div>
              <h2 style={{ fontSize: '1.3rem', margin: 0 }}>Browse Cars</h2>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <Segmented
                options={[{ id: 'grid', icon: '▦' }, { id: 'list', icon: '☰' }]}
                value={view}
                onChange={setView}
              />
              <select className="ui-input ui-select" value={sort} onChange={e => setSort(e.target.value)}
                style={{ width: 'auto', fontSize: 13, padding: '8px 32px 8px 12px' }} aria-label="Sort by">
                {SORTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="container" style={{ paddingBottom: 40 }}>
        <div className="glass" style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', borderRadius: 'var(--radius-lg)', padding: 14 }}>
          <input className="ui-input" placeholder="🔍 Search vehicles…" style={{ flex: '1 1 220px' }}
            value={filters.search} onChange={e => setFilter('search', e.target.value)} aria-label="Search vehicles" />
          <select className="ui-input ui-select" value={filters.brand} onChange={e => setFilter('brand', e.target.value)}
            style={{ width: 'auto', minWidth: 130 }} aria-label="Brand">
            <option value="All">All Brands</option>
            {BRANDS.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
          </select>
          <Button variant="outline" icon="⚙" onClick={() => setDrawerOpen(true)}>Filters</Button>
        </div>

        {activeChips.length > 0 && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            {activeChips.map(chip => (
              <FilterChip key={chip} label={chip} active onRemove={() => toggleChip(chip)} onToggle={() => toggleChip(chip)} />
            ))}
            <button onClick={clearAll} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', padding: '4px 8px' }}>
              Clear all
            </button>
          </div>
        )}

        {!loading && cars.length > 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>{resultLabel}</p>
        )}

        {loading ? (
          <div className="car-grid">{skeletonCards}</div>
        ) : cars.length === 0 ? (
          <EmptyState icon="🔍" title="No cars found" desc="Try adjusting your filters or search terms."
            action={() => clearAll()} actionLabel="Clear Filters" />
        ) : (
          <>
            <div className="car-grid">
              {cars.map(car => <CarCard key={car._id || car.id} car={car} />)}
            </div>
            {loadingMore && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
                <div className="spinner" />
              </div>
            )}
            {hasMore && <div ref={sentinelRef} style={{ height: 1 }} />}
          </>
        )}
      </div>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Filters"
        footer={<><Button variant="ghost" onClick={clearAll}>Clear</Button><Button variant="primary" onClick={() => setDrawerOpen(false)} full>Apply Filters</Button></>}>
        <FilterContent />
      </Drawer>
    </div>
  );
}

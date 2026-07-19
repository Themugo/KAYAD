import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { 
  Search, SlidersHorizontal, X, Grid3X3, List, 
  ChevronDown, ArrowUpDown, RotateCcw, BarChart3, Heart, RefreshCw
} from 'lucide-react';
import CarCard, { type Car } from '../components/CarCard';
import { SkeletonGrid } from '../components/SkeletonCard';
import { carsAPI } from '../api/api';
import { useCompare } from '../context/CompareContext';
import { useToast } from '../context/ToastContext';

type VehicleType = 'All' | 'SUV' | 'Pickup' | 'Sedan' | 'Wagon';
type SortOption = 'default' | 'price_asc' | 'price_desc' | 'newest' | 'year_desc';
type ViewMode = 'grid' | 'list';

interface GalleryProps {
  viewCar: (car: Car) => void;
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function Gallery({ viewCar }: GalleryProps) {
  const { compareIds, toggleCar, isComparing, compareCount } = useCompare();
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<VehicleType>('All');
  const [maxPrice, setMaxPrice] = useState(20000000);
  const [minYear, setMinYear] = useState(2000);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('default');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  
  // API data state
  const [allCars, setAllCars] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [fetchError, setFetchError] = useState<string | null>(null);
  
  // Debounced search
  const debouncedQuery = useDebounce(query, 300);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) observerRef.current.disconnect();
    if (node && hasMore && !loadingMore) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) {
            loadMoreCars();
          }
        },
        { rootMargin: '200px' }
      );
      observerRef.current.observe(node);
    }
  }, [hasMore, loadingMore]);

  const types: VehicleType[] = ['All', 'SUV', 'Pickup', 'Sedan', 'Wagon'];
  
  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'default', label: 'Curated' },
    { value: 'newest', label: 'Newest First' },
    { value: 'year_desc', label: 'Year (Newest)' },
    { value: 'price_asc', label: 'Price: Low to High' },
    { value: 'price_desc', label: 'Price: High to Low' },
  ];

  // Get unique values for filters from API data
  const { makes, cities, years } = useMemo(() => {
    const makes = [...new Set(allCars.map(c => c.brand || c.make))].filter(Boolean).sort();
    const cities = [...new Set(allCars.map(c => c.location?.city || c.city))].filter(Boolean).sort();
    const years = [...new Set(allCars.map(c => c.year))].filter(Boolean).sort((a, b) => b - a);
    return { makes, cities, years };
  }, [allCars]);

  const [selectedMake, setSelectedMake] = useState('All');
  const [selectedCity, setSelectedCity] = useState('All');

  // Fetch cars from API
  const fetchCars = useCallback(async (pageNum: number = 1, reset: boolean = false) => {
    try {
      if (reset) setLoading(true);
      setFetchError(null);
      
      const params: any = {
        page: pageNum,
        limit: 24,
        status: 'active',
      };
      
      // Add filter params
      if (debouncedQuery) params.keyword = debouncedQuery;
      if (typeFilter !== 'All') params.body = typeFilter;
      if (selectedMake !== 'All') params.brand = selectedMake;
      if (selectedCity !== 'All') params.location = selectedCity;
      if (maxPrice < 20000000) params.priceMax = maxPrice;
      if (minYear > 2000) params.yearMin = minYear;
      
      // Add sorting
      if (sortBy === 'price_asc') params.sort = 'price_asc';
      else if (sortBy === 'price_desc') params.sort = 'price_desc';
      else if (sortBy === 'newest' || sortBy === 'year_desc') params.sort = 'newest';
      
      const data = await carsAPI.list(params);
      const carList = data?.cars || data?.data || [];
      const total = data?.total || carList.length;
      
      if (reset) {
        setAllCars(carList);
      } else {
        setAllCars(prev => [...prev, ...carList]);
      }
      setTotalCount(total);
      setHasMore(carList.length >= 24 && (reset ? carList.length : allCars.length + carList.length) < total);
      setPage(pageNum);
    } catch (error) {
      console.error('Failed to fetch cars:', error);
      // Fallback to demo data
      const { CARS } = await import('../data/cars');
      const demoCars = CARS.map((c: any) => ({
        _id: String(c.id),
        id: c.id,
        brand: c.make,
        title: `${c.make} ${c.model}`,
        model: c.model,
        price: c.price,
        year: c.year,
        mileage: c.mileage,
        fuel: c.fuel,
        type: c.type,
        city: c.city,
        image: c.image,
        images: [c.image],
        badges: c.badges || [],
        status: 'active',
      }));
      if (reset) {
        setAllCars(demoCars);
      }
      setTotalCount(demoCars.length);
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [debouncedQuery, typeFilter, selectedMake, selectedCity, maxPrice, minYear, sortBy]);

  // Initial fetch and refetch on filter changes
  useEffect(() => {
    fetchCars(1, true);
  }, [debouncedQuery, typeFilter, selectedMake, selectedCity, maxPrice, minYear, sortBy]);

  // Load more
  const loadMoreCars = useCallback(() => {
    if (!loadingMore && hasMore) {
      setLoadingMore(true);
      fetchCars(page + 1, false);
    }
  }, [loadingMore, hasMore, page, fetchCars]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, typeFilter, maxPrice, minYear, selectedMake, selectedCity, sortBy]);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (typeFilter !== 'All') count++;
    if (maxPrice < 20000000) count++;
    if (minYear > 2000) count++;
    if (selectedMake !== 'All') count++;
    if (selectedCity !== 'All') count++;
    return count;
  }, [typeFilter, maxPrice, minYear, selectedMake, selectedCity]);

  // Convert API car to CarCard format
  const toCardCar = useCallback((car: any): Car => ({
    id: car._id ? parseInt(car._id.replace(/\D/g, '') || '1') : 1,
    make: car.brand || car.make || '',
    model: car.model || car.title || '',
    price: car.price || car.currentBid || 0,
    year: car.year || 2024,
    mileage: typeof car.mileage === 'number' ? `${car.mileage} km` : (car.mileage || '0 km'),
    fuel: car.fuel || 'Petrol',
    city: car.location?.city || 'Nairobi',
    type: (car.type || car.bodyType || 'SUV') as Car['type'],
    badges: [],
    image: typeof car.images?.[0] === 'string' ? car.images[0] : car.images?.[0]?.url || car.image || '',
  }), []);

  const clearAllFilters = useCallback(() => {
    setQuery('');
    setTypeFilter('All');
    setMaxPrice(20000000);
    setMinYear(2000);
    setSelectedMake('All');
    setSelectedCity('All');
    setSortBy('default');
    setPage(1);
  }, []);

  const hasActiveFilters = activeFiltersCount > 0 || query;

  const toggleFavorite = useCallback((carId: number) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(carId)) {
        next.delete(carId);
      } else {
        next.add(carId);
      }
      return next;
    });
  }, []);

  const handleToggleCompare = useCallback((carId: number) => {
    toggleCar(String(carId));
  }, [toggleCar]);

  return (
    <div className="min-h-screen bg-cream-50 pt-16">
      {/* Header */}
      <div className="relative bg-charcoal-900 pt-16 pb-14 overflow-hidden">
        <div className="absolute bottom-0 right-0 w-1/2 h-full bg-gold-400/6 blur-3xl rounded-full pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="section-label text-gold-400 mb-3">Browse All Listings</p>
          <h1 className="font-serif text-3xl sm:text-5xl text-white font-bold mb-2">Vehicle Gallery</h1>
          <p className="font-sans text-white/50 text-sm">{allCars.length} vehicles available</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Search + Filter Bar */}
        <div className="flex flex-col lg:flex-row gap-3 mb-6">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-warm-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by make, model, or city..."
              className="w-full pl-10 pr-10 py-3 bg-white border border-cream-300 rounded-xl font-sans text-sm text-charcoal-800 placeholder-warm-400 outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500/30 transition-all"
            />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X size={14} className="text-warm-400 hover:text-warm-600" />
              </button>
            )}
          </div>

          {/* Controls Row */}
          <div className="flex items-center gap-2">
            {/* Compare indicator */}
            {compareCount > 0 && (
              <button
                onClick={() => {/* Navigate to compare page */}}
                className="flex items-center gap-2 bg-gold-500 text-charcoal-900 font-sans text-sm font-semibold px-4 py-3 rounded-xl hover:bg-gold-400 transition-all"
              >
                <BarChart3 size={14} />
                <span>Compare ({compareCount})</span>
              </button>
            )}

            {/* Sort Dropdown */}
            <div className="relative">
              <button
                onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
                className="flex items-center gap-2 bg-white border border-cream-300 text-charcoal-800 font-sans text-sm font-medium px-4 py-3 rounded-xl hover:border-gold-500 transition-all"
              >
                <ArrowUpDown size={14} />
                <span className="hidden sm:inline">{sortOptions.find(o => o.value === sortBy)?.label}</span>
                <ChevronDown size={14} className={`transition-transform ${sortDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {sortDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl border border-cream-200 shadow-lg z-50 overflow-hidden">
                  {sortOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => { setSortBy(opt.value); setSortDropdownOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 font-sans text-sm hover:bg-cream-100 transition-colors ${
                        sortBy === opt.value ? 'text-gold-700 font-semibold bg-gold-50' : 'text-charcoal-800'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* View Toggle */}
            <div className="flex bg-white border border-cream-300 rounded-xl overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-3 transition-colors ${viewMode === 'grid' ? 'bg-charcoal-900 text-white' : 'text-warm-400 hover:text-charcoal-800'}`}
              >
                <Grid3X3 size={16} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-3 transition-colors ${viewMode === 'list' ? 'bg-charcoal-900 text-white' : 'text-warm-400 hover:text-charcoal-800'}`}
              >
                <List size={16} />
              </button>
            </div>

            {/* Filter Button */}
            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              className={`flex items-center gap-2 bg-white border text-charcoal-800 font-sans text-sm font-medium px-4 py-3 rounded-xl transition-all ${
                filtersOpen ? 'border-gold-500 text-gold-700' : 'border-cream-300 hover:border-gold-500'
              }`}
            >
              <SlidersHorizontal size={16} />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span className="w-5 h-5 bg-gold-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Active Filters Strip */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 mb-6 p-3 bg-white rounded-xl border border-cream-200">
            <span className="font-sans text-xs text-warm-400 mr-2">Active filters:</span>
            {query && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-charcoal-900 text-white rounded-full text-xs font-medium">
                "{query}"
                <button onClick={() => setQuery('')}><X size={12} /></button>
              </span>
            )}
            {typeFilter !== 'All' && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-gold-100 text-gold-700 rounded-full text-xs font-medium">
                {typeFilter}
                <button onClick={() => setTypeFilter('All')}><X size={12} /></button>
              </span>
            )}
            {selectedMake !== 'All' && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-gold-100 text-gold-700 rounded-full text-xs font-medium">
                {selectedMake}
                <button onClick={() => setSelectedMake('All')}><X size={12} /></button>
              </span>
            )}
            {selectedCity !== 'All' && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-gold-100 text-gold-700 rounded-full text-xs font-medium">
                {selectedCity}
                <button onClick={() => setSelectedCity('All')}><X size={12} /></button>
              </span>
            )}
            {maxPrice < 20000000 && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-gold-100 text-gold-700 rounded-full text-xs font-medium">
                Max: KES {maxPrice.toLocaleString()}
                <button onClick={() => setMaxPrice(20000000)}><X size={12} /></button>
              </span>
            )}
            {minYear > 2000 && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-gold-100 text-gold-700 rounded-full text-xs font-medium">
                From: {minYear}
                <button onClick={() => setMinYear(2000)}><X size={12} /></button>
              </span>
            )}
            <button
              onClick={clearAllFilters}
              className="ml-auto flex items-center gap-1 text-xs text-warm-400 hover:text-gold-600 transition-colors"
            >
              <RotateCcw size={12} /> Clear all
            </button>
          </div>
        )}

        {/* Expanded Filters */}
        {filtersOpen && (
          <div className="bg-white rounded-2xl border border-cream-200 p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Vehicle Type */}
              <div>
                <p className="font-sans text-xs font-semibold text-warm-400 tracking-widest uppercase mb-3">Vehicle Type</p>
                <div className="flex flex-wrap gap-2">
                  {types.map(t => (
                    <button
                      key={t}
                      onClick={() => setTypeFilter(t)}
                      className={typeFilter === t ? 'pill-active' : 'pill-inactive'}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Make */}
              <div>
                <p className="font-sans text-xs font-semibold text-warm-400 tracking-widest uppercase mb-3">Make</p>
                <select
                  value={selectedMake}
                  onChange={e => setSelectedMake(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-cream-300 rounded-lg font-sans text-sm text-charcoal-800 outline-none focus:border-gold-500"
                >
                  <option value="All">All Makes</option>
                  {makes.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              {/* City */}
              <div>
                <p className="font-sans text-xs font-semibold text-warm-400 tracking-widest uppercase mb-3">Location</p>
                <select
                  value={selectedCity}
                  onChange={e => setSelectedCity(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-cream-300 rounded-lg font-sans text-sm text-charcoal-800 outline-none focus:border-gold-500"
                >
                  <option value="All">All Locations</option>
                  {cities.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Max Price */}
              <div>
                <p className="font-sans text-xs font-semibold text-warm-400 tracking-widest uppercase mb-3">
                  Max Price: <span className="text-gold-700">KES {maxPrice.toLocaleString()}</span>
                </p>
                <input
                  type="range"
                  min={1000000}
                  max={20000000}
                  step={500000}
                  value={maxPrice}
                  onChange={e => setMaxPrice(Number(e.target.value))}
                  className="w-full accent-gold-500"
                />
                <div className="flex justify-between font-sans text-xs text-warm-400 mt-1">
                  <span>KES 1M</span>
                  <span>KES 20M</span>
                </div>
              </div>

              {/* Min Year */}
              <div>
                <p className="font-sans text-xs font-semibold text-warm-400 tracking-widest uppercase mb-3">
                  Min Year: <span className="text-gold-700">{minYear}</span>
                </p>
                <input
                  type="range"
                  min={2000}
                  max={2025}
                  step={1}
                  value={minYear}
                  onChange={e => setMinYear(Number(e.target.value))}
                  className="w-full accent-gold-500"
                />
                <div className="flex justify-between font-sans text-xs text-warm-400 mt-1">
                  <span>2000</span>
                  <span>2025</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Type Pills (always visible) */}
        <div className="flex items-center gap-2 flex-wrap mb-8">
          {types.map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={typeFilter === t ? 'pill-active' : 'pill-inactive'}
            >
              {t}
              <span className="ml-1.5 text-xs opacity-60">
                ({allCars.filter(c => t === 'All' || c.type === t).length})
              </span>
            </button>
          ))}
        </div>

        {/* Grid / List View */}
        {allCars.length > 0 ? (
          <>
            <div className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                : 'flex flex-col gap-4'
            }>
              {allCars.map(car => (
                <CarCard
                  key={car.id}
                  car={car}
                  onClick={() => viewCar(car)}
                  onToggleCompare={() => handleToggleCompare(car.id)}
                  isComparing={isComparing(String(car.id))}
                  compareCount={compareCount}
                  onFavorite={toggleFavorite}
                  isFavorited={favorites.has(car.id)}
                  listView={viewMode === 'list'}
                />
              ))}
            </div>

            {/* Infinite scroll sentinel */}
            {hasMore && (
              <div ref={sentinelRef} className="flex justify-center py-8">
                {loading && <SkeletonGrid count={4} />}
              </div>
            )}

            {/* End of allCars */}
            {!hasMore && allCars.length > 0 && (
              <p className="text-center text-warm-400 py-8">
                Showing all {allCars.length} vehicles
              </p>
            )}
          </>
        ) : (
          <div className="text-center py-24">
            <p className="font-serif text-2xl text-warm-400 mb-2">No vehicles found</p>
            <p className="font-sans text-sm text-warm-400">Try adjusting your search or filters</p>
            <button 
              onClick={clearAllFilters} 
              className="mt-4 px-6 py-2 bg-charcoal-900 text-white font-sans text-sm font-medium rounded-full hover:bg-charcoal-800 transition-colors"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Vehicle } from '../../../types';
import VehicleCard from '../../../components/VehicleCard';
import { SlidersHorizontal, Search, RotateCcw, Grid, List as ListIcon, ArrowRightLeft, Filter, X, Bookmark, ChevronLeft, ChevronRight, Gavel, ShieldCheck, CheckCircle2, Lock, Landmark, Clock, Bell, PanelLeftClose, PanelLeftOpen, LayoutGrid } from 'lucide-react';
import { Select, Button, Card, SkeletonGrid } from '../../../components/ui';
import MarketingCard from '../../../components/MarketingCard';
import { MOCK_SPONSOR_CARDS } from '../../../data/mockSponsors';

interface VehicleMarketplaceProps {
  vehicles: Vehicle[];
  savedVehicles: string[];
  comparedVehicles: string[];
  onToggleSave: (id: string) => void;
  onToggleCompare: (id: string) => void;
  onQuickView: (vehicle: Vehicle) => void;
  onStartEscrow: (vehicle: Vehicle) => void;
  selectedCounty: string;
  onCountyChange: (county: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenCompareModal: () => void;
  onNavigate?: (navId: string) => void;
  onOpenAuth?: () => void;
}

interface SavedSearchPreset {
  id: string;
  name: string;
  make: string;
  model: string;
  maxPrice: number;
  bodyStyle: string;
  fuel: string;
  location: string;
  createdDate: string;
}

export const VehicleMarketplace: React.FC<VehicleMarketplaceProps> = ({
  vehicles,
  savedVehicles,
  comparedVehicles,
  onToggleSave,
  onToggleCompare,
  onQuickView,
  onStartEscrow,
  selectedCounty,
  onCountyChange,
  searchQuery,
  onSearchChange,
  onOpenCompareModal,
  onNavigate = () => {},
  onOpenAuth
}) => {
  // Filter States
  const [selectedMake, setSelectedMake] = useState<string>('All');
  const [selectedModel, setSelectedModel] = useState<string>('All');
  const [selectedBodyStyle, setSelectedBodyStyle] = useState<string>('All');
  const [selectedFuel, setSelectedFuel] = useState<string>('All');
  const [selectedTransmission, setSelectedTransmission] = useState<string>('All');
  const [selectedCondition, setSelectedCondition] = useState<string>('All');
  const [selectedSellerType, setSelectedSellerType] = useState<string>('All');
  const [minPrice, setMinPrice] = useState<number>(50000);
  const [maxPrice, setMaxPrice] = useState<number>(20000000);
  const [minYear, setMinYear] = useState<number>(2005);
  const [maxYear, setMaxYear] = useState<number>(2026);
  const [maxMileage, setMaxMileage] = useState<number>(250000);
  
  // Boolean Feature Toggles
  const [onlyInspected, setOnlyInspected] = useState<boolean>(false);
  const [onlyEscrow, setOnlyEscrow] = useState<boolean>(false);
  const [onlyFinance, setOnlyFinance] = useState<boolean>(false);
  const [onlyAuction, setOnlyAuction] = useState<boolean>(false);
  const [onlyNewArrivals, setOnlyNewArrivals] = useState<boolean>(false);

  // Layout & Navigation States
  // Went through 2 revisions: originally defaulted to 'grid' (fewer
  // columns), then to 'compact' (denser, up to 5 columns) for scale.
  // Now simplified to just 2 modes total - 'grid' and 'compact' both
  // ended up capped at 4 columns per direct instruction (compact was
  // 5), leaving them nearly identical (only a 4px gap size differed) -
  // a genuine redundancy, removed per explicit request. 'list' stays,
  // since a vertical stacked layout is a real different browsing mode,
  // not just a column-count variation. Defaults to 'grid' (the
  // consolidated mode) rather than requiring a toggle click to reach
  // the standard dense layout.
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<
    'newest' | 'price-asc' | 'price-desc' | 'mileage' | 'year' | 'recently-reduced' | 'most-viewed' | 'auction-ending'
  >('newest');
  const [showDesktopSidebar, setShowDesktopSidebar] = useState<boolean>(true);
  const [showMobileFilterDrawer, setShowMobileFilterDrawer] = useState<boolean>(false);

  // Toast / Notification State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Pagination States
  const [currentPage, setCurrentPage] = useState<number>(1);
  // Defaults to 24 rather than 12 - now that compact mode (also the new
  // default view) fits up to 5 per row on large screens, 12 would only
  // fill ~2.4 rows per page. 24 uses the space better and halves how
  // often visitors need to paginate at real scale.
  const [pageSize, setPageSize] = useState<number>(24);

  // Loading Simulation for fast feedback
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Recently Viewed Vehicles Tracking (stored in localStorage)
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('kayad_recently_viewed');
      return stored ? JSON.parse(stored) : ['v1', 'v3', 'v5'];
    } catch {
      return ['v1', 'v3', 'v5'];
    }
  });

  // Track quick view click for recently viewed list
  const handleVehicleSelect = useCallback((vehicle: Vehicle) => {
    setRecentlyViewedIds((prev) => {
      const filtered = prev.filter((id) => id !== vehicle.id);
      const updated = [vehicle.id, ...filtered].slice(0, 8); // keep last 8
      try {
        localStorage.setItem('kayad_recently_viewed', JSON.stringify(updated));
      } catch (e) {
        // ignore storage errors
      }
      return updated;
    });
    onQuickView(vehicle);
  }, [onQuickView]);

  // Saved Searches State
  const [savedPresets, setSavedPresets] = useState<SavedSearchPreset[]>([
    { id: 'p1', name: 'Under Ksh 3.5M SUVs', make: 'All', model: 'All', maxPrice: 3500000, bodyStyle: 'SUV', fuel: 'All', location: 'All East Africa', createdDate: '2026-07-28' },
    { id: 'p2', name: 'Toyota Land Cruisers', make: 'Toyota', model: 'All', maxPrice: 15000000, bodyStyle: 'All', fuel: 'All', location: 'Nairobi', createdDate: '2026-07-25' },
    { id: 'p3', name: 'Low-Mileage Hybrids', make: 'All', model: 'All', maxPrice: 5000000, bodyStyle: 'All', fuel: 'Hybrid', location: 'All East Africa', createdDate: '2026-07-20' },
  ]);
  const [newPresetName, setNewPresetName] = useState<string>('');
  const [showSaveSearchModal, setShowSaveSearchModal] = useState<boolean>(false);

  // Show Toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Brief skeleton loading animation on filter changes
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 180);
    return () => clearTimeout(timer);
  }, [
    searchQuery, selectedCounty, selectedMake, selectedModel, selectedBodyStyle, 
    selectedFuel, selectedTransmission, selectedCondition, selectedSellerType, 
    minPrice, maxPrice, minYear, maxYear, maxMileage, onlyInspected, onlyEscrow, 
    onlyFinance, onlyAuction, onlyNewArrivals, sortBy
  ]);

  // Dynamic Filter Options Extracted directly from backend dataset
  const makes = useMemo(() => {
    const list = Array.from(new Set(vehicles.map((v) => v.make).filter(Boolean))).sort();
    return ['All', ...list];
  }, [vehicles]);

  const models = useMemo(() => {
    const source = selectedMake === 'All' 
      ? vehicles 
      : vehicles.filter((v) => v.make.toLowerCase() === selectedMake.toLowerCase());
    const list = Array.from(new Set(source.map((v) => v.model).filter(Boolean))).sort();
    return ['All', ...list];
  }, [vehicles, selectedMake]);

  const bodyStyles = useMemo(() => {
    const list = Array.from(new Set(vehicles.map((v) => v.bodyStyle).filter(Boolean))).sort();
    return ['All', ...list];
  }, [vehicles]);

  const fuelTypes = useMemo(() => {
    const list = Array.from(new Set(vehicles.map((v) => v.fuelType).filter(Boolean))).sort();
    return ['All', ...list];
  }, [vehicles]);

  const transmissionOptions = ['All', 'Automatic', 'Manual', 'CVT', 'Semi-Automatic'];
  const conditionOptions = ['All', 'Foreign Used', 'Locally Used', 'Brand New'];
  const sellerTypeOptions = ['All', 'Verified Dealer', 'Private Seller', 'Bank Repossession', 'Direct Port Import'];

  const locations = useMemo(() => {
    const list = Array.from(new Set(vehicles.map((v) => v.county || v.location).filter(Boolean))).sort();
    return ['All East Africa', ...list];
  }, [vehicles]);

  const availableYears = useMemo(() => {
    const list = Array.from(new Set(vehicles.map((v) => v.year).filter((y): y is number => Boolean(y)))).sort((a: number, b: number) => b - a);
    return list;
  }, [vehicles]);

  // Primary Filtering Engine
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      // 1. Keyword search
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const match = v.title.toLowerCase().includes(q) || 
                      v.make.toLowerCase().includes(q) || 
                      v.model.toLowerCase().includes(q) ||
                      v.sellerName.toLowerCase().includes(q) ||
                      v.location.toLowerCase().includes(q) ||
                      v.county.toLowerCase().includes(q);
        if (!match) return false;
      }

      // 2. County / Location
      if (selectedCounty !== 'All East Africa' && v.county !== selectedCounty && v.location !== selectedCounty) {
        return false;
      }

      // 3. Make & Model
      if (selectedMake !== 'All' && v.make.toLowerCase() !== selectedMake.toLowerCase()) return false;
      if (selectedModel !== 'All' && v.model.toLowerCase() !== selectedModel.toLowerCase()) return false;

      // 4. Body Style
      if (selectedBodyStyle !== 'All' && v.bodyStyle !== selectedBodyStyle) return false;

      // 5. Fuel Type
      if (selectedFuel !== 'All' && v.fuelType !== selectedFuel) return false;

      // 6. Transmission
      if (selectedTransmission !== 'All' && !v.transmission.toLowerCase().includes(selectedTransmission.toLowerCase())) return false;

      // 7. Condition
      if (selectedCondition !== 'All' && v.condition !== selectedCondition) return false;

      // 8. Seller Type
      if (selectedSellerType !== 'All') {
        if (selectedSellerType === 'Verified Dealer' && v.sellerType !== 'Verified Dealer') return false;
        if (selectedSellerType === 'Private Seller' && v.sellerType !== 'Private Seller') return false;
        if (selectedSellerType === 'Bank Repossession' && !v.title.toLowerCase().includes('bank')) return false;
        if (selectedSellerType === 'Direct Port Import' && !v.title.toLowerCase().includes('import')) return false;
      }

      // 9. Numerical Ranges
      if (v.price < minPrice || v.price > maxPrice) return false;
      if (v.year < minYear || v.year > maxYear) return false;
      if (v.mileage > maxMileage) return false;

      // 10. Boolean Badging / Feature Checks
      if (onlyInspected && !v.inspectionPassed) return false;
      if (onlyEscrow && !v.escrowEligible) return false;
      if (onlyFinance && !v.financeAvailable) return false;
      if (onlyAuction && !v.isAuction) return false;
      if (onlyNewArrivals && !v.isNewArrival && !v.badge?.toLowerCase().includes('new')) return false;

      return true;
    }).sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      if (sortBy === 'mileage') return a.mileage - b.mileage;
      if (sortBy === 'year') return b.year - a.year;
      if (sortBy === 'recently-reduced') {
        const diffA = (a.marketPriceAvg || a.price) - a.price;
        const diffB = (b.marketPriceAvg || b.price) - b.price;
        return diffB - diffA;
      }
      if (sortBy === 'most-viewed') return (b.viewsCount || 0) - (a.viewsCount || 0);
      if (sortBy === 'auction-ending') {
        if (a.isAuction && !b.isAuction) return -1;
        if (!a.isAuction && b.isAuction) return 1;
        return 0;
      }
      return 0; // default newest
    });
  }, [
    vehicles, searchQuery, selectedCounty, selectedMake, selectedModel, 
    selectedBodyStyle, selectedFuel, selectedTransmission, selectedCondition, 
    selectedSellerType, minPrice, maxPrice, minYear, maxYear, maxMileage, 
    onlyInspected, onlyEscrow, onlyFinance, onlyAuction, onlyNewArrivals, sortBy
  ]);

  // Reset pagination when filter results change
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredVehicles.length]);

  // Paginated Slice
  const totalPages = Math.max(1, Math.ceil(filteredVehicles.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedVehicles = filteredVehicles.slice(startIndex, startIndex + pageSize);

  // Reset all filters to default
  const resetFilters = useCallback(() => {
    onSearchChange('');
    setSelectedMake('All');
    setSelectedModel('All');
    setSelectedBodyStyle('All');
    setSelectedFuel('All');
    setSelectedTransmission('All');
    setSelectedCondition('All');
    setSelectedSellerType('All');
    setMinPrice(50000);
    setMaxPrice(20000000);
    setMinYear(2005);
    setMaxYear(2026);
    setMaxMileage(250000);
    setOnlyInspected(false);
    setOnlyEscrow(false);
    setOnlyFinance(false);
    setOnlyAuction(false);
    setOnlyNewArrivals(false);
    onCountyChange('All East Africa');
  }, [onSearchChange, onCountyChange]);

  // Save current filter preset
  const handleSaveCurrentPreset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetName.trim()) return;
    const preset: SavedSearchPreset = {
      id: `p-${Date.now()}`,
      name: newPresetName.trim(),
      make: selectedMake,
      model: selectedModel,
      maxPrice,
      bodyStyle: selectedBodyStyle,
      fuel: selectedFuel,
      location: selectedCounty,
      createdDate: new Date().toISOString().split('T')[0]
    };
    setSavedPresets((prev) => [preset, ...prev]);
    setNewPresetName('');
    setShowSaveSearchModal(false);
    showToast(`Saved search "${preset.name}". You will receive instant notifications when new matching inventory arrives!`);
  };

  const applyPreset = (preset: SavedSearchPreset) => {
    setSelectedMake(preset.make);
    setSelectedModel(preset.model || 'All');
    setMaxPrice(preset.maxPrice);
    setSelectedBodyStyle(preset.bodyStyle);
    setSelectedFuel(preset.fuel);
    if (preset.location) onCountyChange(preset.location);
    showToast(`Applied saved search: "${preset.name}"`);
  };

  // Compute active removable chips for Summary Bar
  const activeFilters = useMemo(() => {
    const list: { id: string; label: string; onClear: () => void }[] = [];
    if (searchQuery) list.push({ id: 'search', label: `"${searchQuery}"`, onClear: () => onSearchChange('') });
    if (selectedCounty !== 'All East Africa') list.push({ id: 'county', label: `Location: ${selectedCounty}`, onClear: () => onCountyChange('All East Africa') });
    if (selectedMake !== 'All') list.push({ id: 'make', label: `Make: ${selectedMake}`, onClear: () => { setSelectedMake('All'); setSelectedModel('All'); } });
    if (selectedModel !== 'All') list.push({ id: 'model', label: `Model: ${selectedModel}`, onClear: () => setSelectedModel('All') });
    if (selectedBodyStyle !== 'All') list.push({ id: 'body', label: `Body: ${selectedBodyStyle}`, onClear: () => setSelectedBodyStyle('All') });
    if (selectedFuel !== 'All') list.push({ id: 'fuel', label: `Fuel: ${selectedFuel}`, onClear: () => setSelectedFuel('All') });
    if (selectedTransmission !== 'All') list.push({ id: 'trans', label: `Trans: ${selectedTransmission}`, onClear: () => setSelectedTransmission('All') });
    if (selectedSellerType !== 'All') list.push({ id: 'seller', label: `Seller: ${selectedSellerType}`, onClear: () => setSelectedSellerType('All') });
    if (selectedCondition !== 'All') list.push({ id: 'cond', label: `Condition: ${selectedCondition}`, onClear: () => setSelectedCondition('All') });
    if (maxPrice < 20000000) list.push({ id: 'price', label: `Under Ksh ${(maxPrice / 1000000).toFixed(1)}M`, onClear: () => setMaxPrice(20000000) });
    if (minYear > 2005) list.push({ id: 'minyear', label: `From ${minYear}`, onClear: () => setMinYear(2005) });
    if (maxYear < 2026) list.push({ id: 'maxyear', label: `Up to ${maxYear}`, onClear: () => setMaxYear(2026) });
    if (onlyInspected) list.push({ id: 'inspected', label: '150-Pt Inspected', onClear: () => setOnlyInspected(false) });
    if (onlyEscrow) list.push({ id: 'escrow', label: 'Escrow Protected', onClear: () => setOnlyEscrow(false) });
    if (onlyFinance) list.push({ id: 'finance', label: 'Finance Available', onClear: () => setOnlyFinance(false) });
    if (onlyAuction) list.push({ id: 'auction', label: 'Live Auction', onClear: () => setOnlyAuction(false) });
    if (onlyNewArrivals) list.push({ id: 'new', label: 'Recently Added', onClear: () => setOnlyNewArrivals(false) });
    return list;
  }, [
    searchQuery, selectedCounty, selectedMake, selectedModel, selectedBodyStyle, 
    selectedFuel, selectedTransmission, selectedSellerType, selectedCondition, 
    maxPrice, minYear, maxYear, onlyInspected, onlyEscrow, onlyFinance, onlyAuction, onlyNewArrivals, onSearchChange, onCountyChange
  ]);

  // Recently Viewed Vehicle Objects
  const recentlyViewedVehicles = useMemo(() => {
    return recentlyViewedIds
      .map((id) => vehicles.find((v) => v.id === id))
      .filter((v): v is Vehicle => Boolean(v));
  }, [recentlyViewedIds, vehicles]);

  // Price formatting helper
  const formatPriceM = (val: number) => {
    if (val >= 1000000) {
      const m = val / 1000000;
      return `Ksh ${m % 1 === 0 ? m : m.toFixed(1)}M`;
    }
    return `Ksh ${(val / 1000).toFixed(0)}K`;
  };

  // FEATURED PICKS — a small, curated strip shown above the full
  // filterable inventory grid. Home-page redesign pass: the page
  // previously went straight from the trust strip into "browse
  // everything," with no editorial moment giving a first-time visitor
  // 2-3 reasons to trust what they're looking at before committing to
  // filtering through the full catalog. Reuses real, already-computed
  // fields (marketPriceAvg, viewsCount, auctionEndsAt) rather than
  // introducing new data - each pick is drawn from the actual vehicles
  // prop, not separately curated/mocked content.
  const featuredPicks = useMemo(() => {
    const picks: { vehicle: Vehicle; reason: string }[] = [];

    const biggestSaving = [...vehicles]
      .filter((v) => v.marketPriceAvg && v.price < v.marketPriceAvg)
      .sort((a, b) => (b.marketPriceAvg! - b.price) - (a.marketPriceAvg! - a.price))[0];
    if (biggestSaving) picks.push({ vehicle: biggestSaving, reason: 'Biggest Saving' });

    const mostViewed = [...vehicles]
      .filter((v) => v.id !== biggestSaving?.id && (v.viewsCount || 0) > 0)
      .sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0))[0];
    if (mostViewed) picks.push({ vehicle: mostViewed, reason: 'Most Viewed' });

    const endingSoon = [...vehicles]
      .filter((v) => v.isAuction && v.auctionEndsAt && !picks.some((p) => p.vehicle.id === v.id))
      .sort((a, b) => new Date(a.auctionEndsAt!).getTime() - new Date(b.auctionEndsAt!).getTime())[0];
    if (endingSoon) picks.push({ vehicle: endingSoon, reason: 'Auction Ending Soon' });

    return picks;
  }, [vehicles]);

  // Interleaves sponsor/partner cards into the grid every 4th position -
  // one full row in the 4-column grid, so each sponsor card lands at a
  // clean row boundary rather than breaking mid-row. Originally used an
  // every-8th interval (2 rows), but found while writing test coverage
  // for this that the real mock dataset (INITIAL_VEHICLES) only has 6
  // vehicles - confirmed directly via a runtime console.log in a
  // throwaway debug test, not the file's own object-literal count via
  // grep, which turned out to be unreliable (matched nested object
  // braces, not just top-level vehicles). An every-8th interval never
  // triggers at all with only 6 real vehicles to interleave into,
  // meaning the whole feature would have been invisible against the
  // actual current data. Every-4th guarantees at least one sponsor
  // placement shows up even with a small catalog, while still reading
  // as a natural row-boundary insertion rather than every-item ad
  // clutter once the catalog is genuinely large.
  const gridItemsWithSponsors = useMemo(() => {
    const items: ({ type: 'vehicle'; vehicle: Vehicle } | { type: 'sponsor'; sponsor: typeof MOCK_SPONSOR_CARDS[number] })[] = [];
    let sponsorIndex = 0;
    paginatedVehicles.forEach((v, i) => {
      if (i > 0 && i % 4 === 0 && MOCK_SPONSOR_CARDS.length > 0) {
        items.push({ type: 'sponsor', sponsor: MOCK_SPONSOR_CARDS[sponsorIndex % MOCK_SPONSOR_CARDS.length] });
        sponsorIndex += 1;
      }
      items.push({ type: 'vehicle', vehicle: v });
    });
    return items;
  }, [paginatedVehicles]);

  return (
    <div className="space-y-5 pb-16">
      {/* TOAST NOTIFICATION FLOATER */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 bg-[#1E3063] text-white px-4 py-3 rounded-xl shadow-2xl border border-white/20 flex items-center gap-2.5 text-xs font-bold animate-slide-down">
          <Bell className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. UNIFIED SEARCH + TRUST CARD — search bar and trust strip were
          2 separate cards stacked on top of each other (their own
          padding, border, rounded corners, shadow each), and the search
          bar was ALSO position: sticky, meaning it permanently occupied
          viewport space while scrolling through results - a sticky
          element is exactly the kind of thing that reads as "wasted
          space" even when it's technically useful, since it's real
          estate a user can never scroll past. Combined into one card,
          dropped sticky entirely (functionality preserved - search and
          filters are still right at the top of the page, just no longer
          pinned there while browsing), and picked the trust strip's dark
          navy gradient as the shared background (it read as a stronger
          brand/identity statement - "the 3 things that make KAYAD a
          marketplace, not a listings board" - than plain white chrome),
          adapting the search/filter controls to it rather than the
          other way around. */}
      <div className="bg-gradient-to-r from-[#17244B] to-[#1E3063] rounded-2xl p-3 sm:p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-2.5">
          {/* Instant Keyword Input */}
          <div className="relative flex-1 w-full flex items-center">
            <Search className="w-4 h-4 absolute left-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Instant search (e.g. Toyota Prado, Leather, Turbo, Nairobi...)"
              className="w-full pl-10 pr-9 py-2 bg-white text-slate-900 placeholder-slate-400 border border-white/20 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-3 text-slate-400 hover:text-slate-600 p-0.5"
                title="Clear query"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Selects & Controls */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-between md:justify-end">
            {/* Make Selector - hidden only at the lg: breakpoint when
                the sidebar is also showing, not hidden outright. See
                the git history on this exact selector for the full
                reasoning (a JS-conditional first attempt would have
                broken it below lg: entirely) - unchanged by this merge,
                just restyled for the dark card background. */}
            <select
              value={selectedMake}
              onChange={(e) => {
                setSelectedMake(e.target.value);
                setSelectedModel('All');
              }}
              className={`px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-xs font-bold text-white focus:outline-none cursor-pointer ${showDesktopSidebar ? 'lg:hidden' : ''}`}
            >
              <option value="All" className="text-slate-900">All Makes</option>
              {makes.filter((m) => m !== 'All').map((m) => (
                <option key={m} value={m} className="text-slate-900">{m}</option>
              ))}
            </select>

            {/* Region / Location Selector */}
            <select
              value={selectedCounty}
              onChange={(e) => onCountyChange(e.target.value)}
              className="px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-xs font-bold text-white focus:outline-none cursor-pointer"
            >
              {locations.map((loc) => (
                <option key={loc} value={loc} className="text-slate-900">{loc}</option>
              ))}
            </select>

            {/* Desktop Sidebar Toggle */}
            <button
              onClick={() => setShowDesktopSidebar(!showDesktopSidebar)}
              className={`hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                showDesktopSidebar
                  ? 'bg-amber-400 text-[#17244B] border-amber-400'
                  : 'bg-white/10 text-white border-white/20 hover:bg-white/15'
              }`}
              title="Toggle filter sidebar"
            >
              {showDesktopSidebar ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4 text-amber-400" />}
              <span>Filters</span>
              {activeFilters.length > 0 && (
                <span className="bg-[#17244B] text-amber-400 text-[10px] font-black px-1.5 py-0.2 rounded-full ml-0.5">
                  {activeFilters.length}
                </span>
              )}
            </button>

            {/* Mobile Filter Drawer Button */}
            <button
              onClick={() => setShowMobileFilterDrawer(true)}
              className="lg:hidden flex items-center gap-1.5 px-3.5 py-2 bg-amber-400 text-[#17244B] rounded-xl text-xs font-bold shadow-sm"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Filters</span>
              {activeFilters.length > 0 && (
                <span className="bg-[#17244B] text-amber-400 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                  {activeFilters.length}
                </span>
              )}
            </button>

            {/* Save Search Button */}
            <button
              onClick={() => setShowSaveSearchModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/10 text-amber-400 hover:bg-white/15 rounded-xl text-xs font-bold border border-white/20 transition-all"
              title="Save search alert"
            >
              <Bookmark className="w-3.5 h-3.5 fill-amber-400" />
              <span className="hidden sm:inline">Save Search</span>
            </button>
          </div>
        </div>

        {/* Trust pillars - copy corrected for accuracy, sizing tightened
            further. Previously read as blanket, universal claims about
            every listing on the marketplace - checked against real mock
            data before rewriting anything (confirmed via a direct
            count: only 3 of 6 vehicles are actually inspected, only 2
            of 6 are auctions, escrow is mandatory for private sellers
            specifically but only optional/available for dealers, not
            an automatic guarantee on every transaction). "Every
            inspected listing checked before it's live" was technically
            true in isolation but the heading + subtext together read as
            "every listing is inspected", which isn't the case - fixed
            to describe these as available features/rules rather than
            universal facts. Icon boxes reduced w-9->w-7, padding
            tightened pt-4->pt-3. */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6 sm:divide-x sm:divide-white/10 pt-3 border-t border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-400/15 border border-amber-400/25 flex items-center justify-center shrink-0">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-white leading-tight">Escrow Protection</p>
              <p className="text-[11px] text-slate-300 leading-tight truncate">Required for private sellers, available for dealers</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 sm:pl-6">
            <div className="w-7 h-7 rounded-lg bg-amber-400/15 border border-amber-400/25 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-white leading-tight">150-Point Inspection</p>
              <p className="text-[11px] text-slate-300 leading-tight truncate">On certified listings only - look for the badge</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 sm:pl-6">
            <div className="w-7 h-7 rounded-lg bg-amber-400/15 border border-amber-400/25 flex items-center justify-center shrink-0">
              <Gavel className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-white leading-tight">Live Auctions</p>
              <p className="text-[11px] text-slate-300 leading-tight truncate">Bid live on select auction vehicles</p>
            </div>
          </div>
        </div>
      </div>

      {/* 1.6 FEATURED PICKS — curated highlights before the full grid */}
      {featuredPicks.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2.5 px-0.5">
            <LayoutGrid className="w-3.5 h-3.5 text-amber-500" />
            <h2 className="text-xs font-black text-[#1E3063] uppercase tracking-wide">Featured Picks</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {featuredPicks.map(({ vehicle: v, reason }) => (
              <div key={v.id}>
                <div className="flex items-center gap-1.5 mb-1.5 px-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wide">{reason}</span>
                </div>
                <VehicleCard
                  vehicle={v}
                  isSaved={savedVehicles.includes(v.id)}
                  isCompared={comparedVehicles.includes(v.id)}
                  onToggleSave={onToggleSave}
                  onToggleCompare={onToggleCompare}
                  onQuickView={handleVehicleSelect}
                  onStartEscrow={onStartEscrow}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. FILTER SUMMARY (Removable Chips) */}
      {activeFilters.length > 0 && (
        <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1 mr-1">
            <Filter className="w-3 h-3 text-amber-500" />
            Active Filters ({activeFilters.length}):
          </span>

          {activeFilters.map((f) => (
            <span
              key={f.id}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 text-[#1E3063] font-bold border border-slate-200 hover:border-slate-300 transition-colors"
            >
              <span>{f.label}</span>
              <button
                onClick={f.onClear}
                className="hover:text-rose-600 transition-colors rounded-full p-0.5 hover:bg-slate-200"
                title="Remove filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          <button
            onClick={resetFilters}
            className="text-[11px] font-extrabold text-rose-600 hover:text-rose-700 hover:underline ml-auto flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" /> Clear All
          </button>
        </div>
      )}

      {/* 3. RESULT HEADER & CONTROLS — merged with the Saved Search
          Presets row above it, same reasoning as the earlier search-bar
          + trust-strip merge: 2 stacked cards (well, one bare row plus
          one actual white card) with their own spacing between them,
          for content that's really one continuous "here's what you're
          looking at and how to adjust it" unit. The presets row is
          still conditional (only shown when savedPresets.length > 0 &&
          activeFilters.length === 0, unchanged) - just as the top,
          bordered-off sub-section of this card instead of its own
          separate, cardless row floating above it. */}
      <div className="bg-white/80 p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
        {savedPresets.length > 0 && activeFilters.length === 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-3 border-b border-slate-200/80 scrollbar-none">
            <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap shrink-0 flex items-center gap-1">
              <Bookmark className="w-3.5 h-3.5 text-amber-500" /> Saved Searches:
            </span>
            {savedPresets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset)}
                className="px-3 py-1.5 bg-white hover:bg-amber-50 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 hover:border-amber-300 whitespace-nowrap transition-all shadow-2xs"
              >
                ⚡ {preset.name}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-[#1E3063] font-display flex items-center gap-2">
            Vehicle Inventory
            <span className="text-xs bg-[#1E3063] text-white px-2.5 py-0.5 rounded-full font-sans font-bold">
              {filteredVehicles.length.toLocaleString()}
            </span>
          </h2>
          <p className="text-[11px] text-slate-500 font-medium">
            Showing inspected marketplace listings in <strong className="text-[#1E3063]">{selectedCounty}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end text-xs">
          {/* Per Page Selector */}
          <div className="flex items-center gap-1 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200 font-medium text-slate-600">
            <span className="hidden sm:inline">Show:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="bg-transparent font-bold text-[#1E3063] focus:outline-none cursor-pointer"
            >
              <option value={6}>6</option>
              <option value={12}>12</option>
              <option value={24}>24</option>
            </select>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 font-medium text-slate-600">
            <span>Sort:</span>
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="bg-transparent font-bold text-[#1E3063] focus:outline-none cursor-pointer text-xs"
            >
              <option value="newest">Newest First</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="mileage">Lowest Mileage</option>
              <option value="year">Year: Newest First</option>
              <option value="recently-reduced">Recently Reduced</option>
              <option value="most-viewed">Most Viewed</option>
              <option value="auction-ending">Auction Ending Soon</option>
            </select>
          </div>

          {/* View Mode Switcher - 2 modes now (grid/list), not 3. See
              the viewMode state comment above for why 'compact' was
              removed as a genuine redundancy once both grid variants
              capped at the same 4 columns. */}
          <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-[#1E3063] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              title="Grid View"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-[#1E3063] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              title="List View"
            >
              <ListIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
        </div>
      </div>

      {/* 4. MAIN INVENTORY SECTION: SIDEBAR + RESULTS GRID */}
      <div className="flex items-start gap-6">
        {/* DESKTOP COLLAPSIBLE LEFT SIDEBAR */}
        {showDesktopSidebar && (
          <aside className="hidden lg:block w-72 shrink-0 bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-5 text-xs sticky top-36">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <h3 className="font-extrabold text-[#1E3063] text-sm font-display flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-amber-500" /> Filter Vehicles
              </h3>
              <button
                onClick={resetFilters}
                className="text-[11px] font-bold text-rose-600 hover:underline flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            </div>

            {/* Make & Model */}
            <div className="space-y-3">
              <Select
                label="Make"
                value={selectedMake}
                onChange={(e) => {
                  setSelectedMake(e.target.value);
                  setSelectedModel('All');
                }}
                options={makes.map((m) => ({ value: m, label: m === 'All' ? 'All Makes' : m }))}
              />

              <Select
                label="Model"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                options={models.map((m) => ({ 
                  value: m, 
                  label: m === 'All' ? (selectedMake !== 'All' ? `All ${selectedMake}` : 'All Models') : m 
                }))}
              />
            </div>

            {/* Price Range Dual Slider & Quick Presets */}
            <div className="space-y-2 p-3 bg-slate-50/90 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between font-extrabold text-[11px]">
                <span className="text-slate-600 uppercase tracking-wider">Price Range</span>
                <span className="text-[#1E3063] font-black">{formatPriceM(maxPrice)}</span>
              </div>
              <input
                type="range"
                min={500000}
                max={20000000}
                step={250000}
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-full accent-[#1E3063] cursor-pointer h-1.5 bg-slate-200 rounded-lg"
              />
              <div className="flex flex-wrap gap-1 pt-1">
                {[
                  { label: '< 2.5M', val: 2500000 },
                  { label: '< 4M', val: 4000000 },
                  { label: '< 7M', val: 7000000 },
                  { label: 'All', val: 20000000 }
                ].map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => setMaxPrice(preset.val)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-colors ${
                      maxPrice === preset.val
                        ? 'bg-[#1E3063] text-white'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Year Range */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Year Range
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <select
                  value={minYear}
                  onChange={(e) => setMinYear(Number(e.target.value))}
                  className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                >
                  <option value={2005}>Min (2005)</option>
                  {availableYears.map((y) => (
                    <option key={`side-min-${y}`} value={y}>{y}</option>
                  ))}
                </select>
                <select
                  value={maxYear}
                  onChange={(e) => setMaxYear(Number(e.target.value))}
                  className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                >
                  <option value={2026}>Max (2026)</option>
                  {availableYears.map((y) => (
                    <option key={`side-max-${y}`} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Body Style & Fuel */}
            <div className="space-y-3">
              <Select
                label="Body Style"
                value={selectedBodyStyle}
                onChange={(e) => setSelectedBodyStyle(e.target.value)}
                options={bodyStyles.map((b) => ({ value: b, label: b === 'All' ? 'All Body Styles' : b }))}
              />

              <Select
                label="Fuel Type"
                value={selectedFuel}
                onChange={(e) => setSelectedFuel(e.target.value)}
                options={fuelTypes.map((f) => ({ value: f, label: f === 'All' ? 'All Fuel Types' : f }))}
              />
            </div>

            {/* Transmission & Seller Type */}
            <div className="space-y-3">
              <Select
                label="Transmission"
                value={selectedTransmission}
                onChange={(e) => setSelectedTransmission(e.target.value)}
                options={transmissionOptions.map((t) => ({ value: t, label: t === 'All' ? 'All Transmissions' : t }))}
              />

              <Select
                label="Seller Type"
                value={selectedSellerType}
                onChange={(e) => setSelectedSellerType(e.target.value)}
                options={sellerTypeOptions.map((s) => ({ value: s, label: s === 'All' ? 'All Sellers' : s }))}
              />
            </div>

            {/* Feature Toggles (Trust & Options) */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                Verified Guarantees
              </span>

              <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700 hover:text-[#1E3063]">
                <input
                  type="checkbox"
                  checked={onlyInspected}
                  onChange={(e) => setOnlyInspected(e.target.checked)}
                  className="rounded border-slate-300 text-[#1E3063] focus:ring-[#1E3063] accent-[#1E3063]"
                />
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>150-Point Certified</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700 hover:text-[#1E3063]">
                <input
                  type="checkbox"
                  checked={onlyEscrow}
                  onChange={(e) => setOnlyEscrow(e.target.checked)}
                  className="rounded border-slate-300 text-[#1E3063] focus:ring-[#1E3063] accent-[#1E3063]"
                />
                <Lock className="w-3.5 h-3.5 text-[#1E3063]" />
                <span>Escrow Vault Ready</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700 hover:text-[#1E3063]">
                <input
                  type="checkbox"
                  checked={onlyFinance}
                  onChange={(e) => setOnlyFinance(e.target.checked)}
                  className="rounded border-slate-300 text-[#1E3063] focus:ring-[#1E3063] accent-[#1E3063]"
                />
                <Landmark className="w-3.5 h-3.5 text-amber-600" />
                <span>Finance Available</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700 hover:text-[#1E3063]">
                <input
                  type="checkbox"
                  checked={onlyAuction}
                  onChange={(e) => setOnlyAuction(e.target.checked)}
                  className="rounded border-slate-300 text-[#1E3063] focus:ring-[#1E3063] accent-[#1E3063]"
                />
                <Gavel className="w-3.5 h-3.5 text-amber-500" />
                <span>Live Auction Listings</span>
              </label>
            </div>
          </aside>
        )}

        {/* RESULTS GRID / COMPACT / LIST / EMPTY */}
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <SkeletonGrid count={pageSize} />
          ) : filteredVehicles.length === 0 ? (
            /* EMPTY RESULTS RECOVERY STATE */
            <Card className="p-8 sm:p-12 text-center space-y-6 bg-white border border-slate-200/90 shadow-sm rounded-2xl">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
                <Search className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-[#1E3063] font-display">
                  No matching vehicles found
                </h3>
                <p className="text-slate-500 text-xs max-w-md mx-auto mt-1 leading-relaxed">
                  We couldn't find any listings matching all your selected filters in {selectedCounty}. Try expanding your search parameters or selecting one of the popular criteria below.
                </p>
              </div>

              {/* Popular Search Suggestions */}
              <div className="space-y-2 max-w-md mx-auto">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Popular Inventory Categories:</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {['Toyota Prado', 'Subaru Outback', 'Diesel SUV', 'Verified Dealer', 'Under 3.5M', 'Hybrid'].map((tag) => (
                    <button
                      key={tag}
                      onClick={() => {
                        resetFilters();
                        if (tag === 'Under 3.5M') {
                          setMaxPrice(3500000);
                        } else if (tag === 'Verified Dealer') {
                          setSelectedSellerType('Verified Dealer');
                        } else if (tag === 'Hybrid') {
                          setSelectedFuel('Hybrid');
                        } else if (tag === 'Diesel SUV') {
                          setSelectedFuel('Diesel');
                          setSelectedBodyStyle('SUV');
                        } else {
                          onSearchChange(tag);
                        }
                      }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-amber-100 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 transition-all"
                    >
                      🔍 {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <Button
                  variant="primary"
                  size="md"
                  onClick={resetFilters}
                  className="bg-[#1E3063] hover:bg-[#17244B] text-white font-bold"
                >
                  <RotateCcw className="w-4 h-4" /> Remove Filters & Show All
                </Button>
              </div>
            </Card>
          ) : (
            <div className={
              // Consolidated to a single grid definition, capped at 4
              // columns per direct instruction (previously 2 separate
              // modes topped out at 4 and 5). Gap tightened from
              // gap-3/gap-4 down to gap-2.5 - explicitly requested,
              // reduce spacing between cards. Kept the mobile (base)
              // breakpoint at 1 column - the card still carries real
              // text content (title, price, metadata line, seller row),
              // and going to 2-up on the smallest phone screens risks
              // cramming that without being able to see it rendered on
              // an actual device.
              viewMode === 'list'
                ? "space-y-4"
                : "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5"
            }>
              {viewMode === 'list'
                ? paginatedVehicles.map((v) => (
                    <VehicleCard
                      key={v.id}
                      vehicle={v}
                      isSaved={savedVehicles.includes(v.id)}
                      isCompared={comparedVehicles.includes(v.id)}
                      onToggleSave={onToggleSave}
                      onToggleCompare={onToggleCompare}
                      onQuickView={handleVehicleSelect}
                      onStartEscrow={onStartEscrow}
                    />
                  ))
                : gridItemsWithSponsors.map((item, i) =>
                    item.type === 'sponsor' ? (
                      <MarketingCard key={`sponsor-${item.sponsor.id}-${i}`} data={item.sponsor} />
                    ) : (
                      <VehicleCard
                        key={item.vehicle.id}
                        vehicle={item.vehicle}
                        isSaved={savedVehicles.includes(item.vehicle.id)}
                        isCompared={comparedVehicles.includes(item.vehicle.id)}
                        onToggleSave={onToggleSave}
                        onToggleCompare={onToggleCompare}
                        onQuickView={handleVehicleSelect}
                        onStartEscrow={onStartEscrow}
                      />
                    )
                  )}
            </div>
          )}

          {/* 5. PAGINATION CONTROLS */}
          {filteredVehicles.length > pageSize && (
            <div className="mt-6 bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold">
              <span className="text-slate-500">
                Showing <strong className="text-[#1E3063]">{startIndex + 1}–{Math.min(startIndex + pageSize, filteredVehicles.length)}</strong> of <strong className="text-[#1E3063]">{filteredVehicles.length.toLocaleString()}</strong> vehicles
              </span>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {Array.from({ length: totalPages }).map((_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 rounded-xl font-bold transition-all ${
                        currentPage === pageNum
                          ? 'bg-[#1E3063] text-white shadow-sm'
                          : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 6. RECENTLY VIEWED VEHICLES CAROUSEL */}
      {recentlyViewedVehicles.length > 0 && (
        <div className="pt-8 border-t border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-[#1E3063] font-display flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              Recently Viewed Vehicles
            </h3>
            <span className="text-xs text-slate-500 font-medium">Your browser session history</span>
          </div>

          <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-thin">
            {recentlyViewedVehicles.map((v) => (
              <div
                key={`rv-${v.id}`}
                onClick={() => handleVehicleSelect(v)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleVehicleSelect(v);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={`View details for ${v.title}`}
                className="w-64 shrink-0 bg-white rounded-2xl p-3 border border-slate-200 hover:border-[#1E3063]/40 hover:shadow-md transition-all cursor-pointer space-y-2 focus:outline-none focus:ring-2 focus:ring-[#1E3063] focus:ring-offset-2"
              >
                <div className="relative h-32 rounded-xl overflow-hidden bg-slate-100">
                  <img src={v.image} alt={v.title} className="w-full h-full object-cover" />
                  <span className="absolute top-2 left-2 bg-[#1E3063]/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                    {v.year}
                  </span>
                </div>
                <div>
                  <h4 className="font-extrabold text-[#1E3063] text-xs truncate">{v.title}</h4>
                  <p className="font-black text-emerald-700 text-sm mt-0.5">Ksh {v.price.toLocaleString()}</p>
                  <p className="text-[10px] text-slate-500 truncate mt-0.5">{v.location} • {v.fuelType}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. PERSISTENT FLOATING COMPARISON TRAY */}
      {comparedVehicles.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-8 md:max-w-lg z-40 bg-[#1E3063] text-white p-4 rounded-2xl shadow-2xl border border-white/20 flex items-center justify-between gap-4 animate-bounce-short">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-amber-400 text-[#17244B] font-black flex items-center justify-center shrink-0">
              <ArrowRightLeft className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <p className="font-extrabold text-sm truncate font-display">
                Comparing {comparedVehicles.length} {comparedVehicles.length === 1 ? 'Vehicle' : 'Vehicles'}
              </p>
              <p className="text-[11px] text-slate-300 truncate">Side-by-side technical spec matrix (Max 4)</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="accent"
              size="sm"
              onClick={onOpenCompareModal}
              className="bg-amber-400 hover:bg-amber-500 text-[#17244B] font-bold text-xs"
            >
              Compare Matrix
            </Button>
            <button
              onClick={() => comparedVehicles.forEach((id) => onToggleCompare(id))}
              className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10"
              title="Clear comparison list"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 8. SAVE SEARCH MODAL */}
      {showSaveSearchModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-[#1E3063] text-sm font-display flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-amber-500 fill-amber-500" />
                Save Current Search Filter
              </h3>
              <button onClick={() => setShowSaveSearchModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCurrentPreset} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Search Name</label>
                <input
                  type="text"
                  placeholder="e.g. My Favorite Land Cruiser Search"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-[#1E3063]"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl text-slate-600 space-y-1 border border-slate-200 text-[11px]">
                <p className="font-bold text-[#1E3063]">Included Search Criteria:</p>
                <p>• Make: {selectedMake}</p>
                <p>• Max Budget: Ksh {(maxPrice / 1000000).toFixed(1)}M</p>
                <p>• Location: {selectedCounty}</p>
                {searchQuery && <p>• Keyword: "{searchQuery}"</p>}
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 text-[11px] flex items-start gap-2">
                <Bell className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <span>You will be notified via email and app alert whenever matching inventory is posted!</span>
              </div>

              <div className="flex gap-2 pt-1">
                <Button variant="outline" size="md" fullWidth onClick={() => setShowSaveSearchModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="md" fullWidth type="submit" className="bg-[#1E3063] text-white">
                  Save Search
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. MOBILE FULL-SCREEN FILTER DRAWER */}
      {showMobileFilterDrawer && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end">
          <div className="bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto p-5 space-y-4 shadow-2xl border-t border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 sticky top-0 bg-white z-10 pt-1">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-amber-500" />
                <h3 className="text-base font-extrabold text-[#1E3063] font-display">
                  Complete Inventory Filters
                </h3>
              </div>
              <button
                onClick={() => setShowMobileFilterDrawer(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <Select
                label="Make"
                value={selectedMake}
                onChange={(e) => {
                  setSelectedMake(e.target.value);
                  setSelectedModel('All');
                }}
                options={makes.map((m) => ({ value: m, label: m === 'All' ? 'All Makes' : m }))}
              />

              <Select
                label="Model"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                options={models.map((m) => ({ 
                  value: m, 
                  label: m === 'All' ? (selectedMake !== 'All' ? `All ${selectedMake}` : 'All Models') : m 
                }))}
              />

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Max Budget: {formatPriceM(maxPrice)}
                </label>
                <input
                  type="range"
                  min={500000}
                  max={20000000}
                  step={250000}
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="w-full accent-[#1E3063] h-2 bg-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Select
                  label="Body Style"
                  value={selectedBodyStyle}
                  onChange={(e) => setSelectedBodyStyle(e.target.value)}
                  options={bodyStyles.map((b) => ({ value: b, label: b === 'All' ? 'All Body Styles' : b }))}
                />
                <Select
                  label="Fuel Type"
                  value={selectedFuel}
                  onChange={(e) => setSelectedFuel(e.target.value)}
                  options={fuelTypes.map((f) => ({ value: f, label: f === 'All' ? 'All Fuels' : f }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Select
                  label="Transmission"
                  value={selectedTransmission}
                  onChange={(e) => setSelectedTransmission(e.target.value)}
                  options={transmissionOptions.map((t) => ({ value: t, label: t === 'All' ? 'All Trans' : t }))}
                />
                <Select
                  label="Seller Type"
                  value={selectedSellerType}
                  onChange={(e) => setSelectedSellerType(e.target.value)}
                  options={sellerTypeOptions.map((s) => ({ value: s, label: s === 'All' ? 'All Sellers' : s }))}
                />
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
                  Guarantees
                </span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <label className="flex items-center gap-1.5 cursor-pointer font-semibold">
                    <input type="checkbox" checked={onlyInspected} onChange={(e) => setOnlyInspected(e.target.checked)} className="rounded text-[#1E3063]" />
                    <span>150-Pt Inspected</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer font-semibold">
                    <input type="checkbox" checked={onlyEscrow} onChange={(e) => setOnlyEscrow(e.target.checked)} className="rounded text-[#1E3063]" />
                    <span>Escrow Vault</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-3 border-t border-slate-200 sticky bottom-0 bg-white pb-2">
              <Button variant="ghost" size="md" onClick={resetFilters} className="flex-1 text-slate-600 font-bold">
                Reset
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => setShowMobileFilterDrawer(false)}
                className="flex-[2] bg-[#1E3063] text-white font-bold py-3 rounded-xl shadow-lg"
              >
                Show {filteredVehicles.length} Vehicles
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleMarketplace;

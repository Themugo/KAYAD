import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Vehicle, UserProfile } from '../../../types';
import VehicleCard from '../../../components/VehicleCard';
import { SlidersHorizontal, Search, RotateCcw, Grid, List as ListIcon, ArrowRightLeft, Filter, X, Bookmark, ChevronLeft, ChevronRight, Gavel, ShieldCheck, CheckCircle2, Lock, Landmark, Clock, Bell, PanelLeftClose, PanelLeftOpen, LayoutGrid, Settings, AlertTriangle } from 'lucide-react';
import { Select, Button, Card, SkeletonGrid } from '../../../components/ui';
import MarketingCard from '../../../components/MarketingCard';
import { MOCK_SPONSOR_CARDS } from '../../../data/mockSponsors';
import { useHomePageConfig, ACCENT_THEME_CLASSES } from '../hooks/useHomePageConfig';
import HomePageAdminPanel from './HomePageAdminPanel';

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
  /** The currently signed-in user, if any - used only to gate the
   * admin home-page customization panel (user?.role === 'admin').
   * Optional and defaults to undefined so every existing call site
   * (including the 'saved' vehicles reuse of this same component)
   * keeps working exactly as before without passing it. */
  user?: UserProfile | null;
  /** True only for the actual home/marketplace page invocation, not the
   * 'saved' vehicles reuse of this same component - the admin
   * customization panel and its effects (section visibility, accent
   * theme, trust-pillar text) are scoped to the real home page only. */
  isHomePage?: boolean;
  /** True while the initial real vehicle-data fetch (App.tsx's
   * GET /api/cars) is still in flight, and the real error message if
   * that fetch failed. Wired directly to this component's own
   * isLoading/SkeletonGrid mechanism and a new, real error state -
   * revisits an earlier version of this comment, which deliberately
   * left this unwired on the reasoning that "mock data is already
   * valid and displayed instantly on first render." That premise no
   * longer holds: this project's own Phase 3 work changed App.tsx to
   * start `vehicles` empty and fetch real data on mount, specifically
   * so mock data is never shown as if it were real - not wiring a
   * real loading/error signal here would mean this page briefly shows
   * an empty-results screen instead, which is worse, not better, now
   * that the underlying data flow has changed. */
  isLoadingReal?: boolean;
  loadError?: string | null;
  onRetryLoad?: () => void;
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
  onOpenAuth,
  user,
  isHomePage = false,
  isLoadingReal,
  loadError,
  onRetryLoad
}) => {
  // Home page admin customization - scoped to the real home page only
  // (isHomePage), and its UI only rendered/reachable for admins
  // (user?.role === 'admin'), but the config itself always loads so the
  // page renders correctly regardless of who's viewing it.
  const { config: homeConfig, updateConfig: updateHomeConfig, resetConfig: resetHomeConfig } = useHomePageConfig();
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const isAdmin = isHomePage && user?.role === 'admin';
  const accent = ACCENT_THEME_CLASSES[homeConfig.accentTheme];

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

  // Loading Simulation for fast feedback - real fetch status
  // (isLoadingReal, from App.tsx's actual API call) takes precedence
  // when provided, matching the same fix already applied to the flat
  // VehicleMarketplace.tsx during Phase 3 real-data-consolidation work.
  const [simulatedLoading, setIsLoading] = useState<boolean>(false);
  const isLoading = isLoadingReal ?? simulatedLoading;

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
    if (onlyInspected) list.push({ id: 'inspected', label: 'Pre-Purchase Inspected', onClear: () => setOnlyInspected(false) });
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
      if (homeConfig.sectionVisibility.sponsorCardsInGrid && i > 0 && i % 4 === 0 && MOCK_SPONSOR_CARDS.length > 0) {
        items.push({ type: 'sponsor', sponsor: MOCK_SPONSOR_CARDS[sponsorIndex % MOCK_SPONSOR_CARDS.length] });
        sponsorIndex += 1;
      }
      items.push({ type: 'vehicle', vehicle: v });
    });
    return items;
  }, [paginatedVehicles, homeConfig.sectionVisibility.sponsorCardsInGrid]);

  return (
    <div className="space-y-0 pb-16">
      {/* TOAST NOTIFICATION FLOATER */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 bg-[#1E3063] text-white px-4 py-3 rounded-xl shadow-2xl border border-white/20 flex items-center gap-2.5 text-xs font-bold animate-slide-down">
          <Bell className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Redesigned per an uploaded HTML reference layout - same original
          KAYAD palette throughout (navy #1E3063/#17244B, terracotta
          #C85A32, cream #F5F2EB), no new colors introduced. Every section
          below reuses this component's own real state/logic (filters,
          sort, pagination, saved/compare, admin config) - only the visual
          layer changed, not the data or behavior. */}

      {/* 1. HERO */}
      {homeConfig.sectionVisibility.searchTrustCard && (
      <section className="relative -mx-4 sm:-mx-6 lg:-mx-8 bg-gradient-to-b from-[#17244B] to-[#1E3063] text-white overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(600px 400px at 85% 10%, rgba(200,90,50,.18), transparent 60%), radial-gradient(500px 350px at 100% 60%, rgba(251,191,36,.10), transparent 60%)'
        }} />
        <div className="relative max-w-3xl mx-auto text-center px-4 sm:px-6 pt-10 pb-20">
          <div className="inline-flex items-center gap-2 text-[11px] font-bold tracking-widest uppercase text-amber-400 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            KAYAD EA Automotive Marketplace
          </div>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-4">
            Find the right vehicle.<br />Buy with <span className="text-[#E08A6B]">confidence.</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-300 max-w-lg mx-auto mb-7">
            Quality vehicles, live auctions, and inspection reports from registered local mechanics — all verified through one escrow-protected marketplace built for East Africa.
          </p>
          <div className="flex items-center justify-center gap-3 mb-7">
            <button
              onClick={() => document.getElementById('market-results')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-[#C85A32] hover:bg-[#B34E29] text-white font-bold text-sm px-6 py-3 rounded-full transition-colors flex items-center gap-2"
            >
              Explore Vehicles →
            </button>
            <button
              onClick={() => onNavigate('seller-platform')}
              className="border border-white/35 hover:border-white text-white font-bold text-sm px-6 py-3 rounded-full transition-colors"
            >
              Sell Your Vehicle
            </button>
          </div>
          <div className="flex items-center justify-center gap-3 text-xs text-slate-300">
            <div className="flex">
              {['JM', 'AN', 'TK'].map((initials, i) => (
                <span key={initials} className={`w-7 h-7 rounded-full border-2 border-[#17244B] bg-gradient-to-br from-[#C85A32] to-[#E08A6B] flex items-center justify-center text-[10px] font-bold ${i > 0 ? '-ml-2' : ''}`}>
                  {initials}
                </span>
              ))}
            </div>
            <span>Trusted by verified sellers across East Africa</span>
            <span className="text-amber-400 font-bold">★ 4.8/5</span>
          </div>
        </div>
      </section>
      )}

      {/* 2. SEARCH BRIDGE - overlaps the hero, real, wired filter fields */}
      {homeConfig.sectionVisibility.searchTrustCard && (
      <div className="relative z-10 -mt-12 px-4 sm:px-6">
        <div className="bg-white rounded-2xl shadow-xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end max-w-5xl mx-auto">
          <div className="lg:col-span-1 flex flex-col gap-1.5 min-w-0">
            <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Search</label>
            <div className="border border-slate-200 rounded-lg px-3 py-2.5 flex items-center gap-2 bg-[#F5F2EB]/40">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Make, model or keyword…"
                className="w-full bg-transparent text-xs outline-none min-w-0"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Make</label>
            {/* Fixed: this select was always visible regardless of the
                sidebar, but the sidebar has its own Make selector too -
                showing both at once above the lg: breakpoint is
                redundant. Hidden via CSS only (never JS-removed, so it
                stays reachable below lg: where the sidebar itself is
                always CSS-hidden), matching the sidebar's own
                already-established pattern for this exact class of
                redundancy. */}
            <select
              value={selectedMake}
              onChange={(e) => { setSelectedMake(e.target.value); setSelectedModel('All'); }}
              className={`border border-slate-200 rounded-lg px-3 py-2.5 text-xs bg-[#F5F2EB]/40 outline-none ${showDesktopSidebar ? 'lg:hidden' : ''}`}
            >
              {makes.map((m) => <option key={m} value={m}>{m === 'All' ? 'All Makes' : m}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Price up to</label>
            <select
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="border border-slate-200 rounded-lg px-3 py-2.5 text-xs bg-[#F5F2EB]/40 outline-none"
            >
              <option value={20000000}>All</option>
              <option value={2500000}>Ksh 2.5M</option>
              <option value={4000000}>Ksh 4M</option>
              <option value={7000000}>Ksh 7M</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Year</label>
            <select
              value={minYear}
              onChange={(e) => setMinYear(Number(e.target.value))}
              className="border border-slate-200 rounded-lg px-3 py-2.5 text-xs bg-[#F5F2EB]/40 outline-none"
            >
              <option value={2005}>2005 – 2026</option>
              <option value={2020}>2020 – 2026</option>
              <option value={2023}>2023 – 2026</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Body Style</label>
            <select
              value={selectedBodyStyle}
              onChange={(e) => setSelectedBodyStyle(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2.5 text-xs bg-[#F5F2EB]/40 outline-none"
            >
              {bodyStyles.map((b) => <option key={b} value={b}>{b === 'All' ? 'All Body Styles' : b}</option>)}
            </select>
          </div>
          <button
            onClick={() => document.getElementById('market-results')?.scrollIntoView({ behavior: 'smooth' })}
            className="bg-[#C85A32] hover:bg-[#B34E29] text-white font-bold text-xs px-5 py-2.5 rounded-lg transition-colors whitespace-nowrap"
          >
            Filter Vehicles
          </button>
        </div>
      </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-5" id="market-results">
        {/* 4. FILTER SUMMARY CHIPS */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {activeFilters.map((f) => (
              <button
                key={f.id}
                onClick={f.onClear}
                className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:border-[#C85A32] hover:text-[#C85A32] transition-colors"
              >
                {f.label}
                <X className="w-3 h-3" />

              </button>
            ))}
            <button onClick={resetFilters} className="text-[11px] font-bold text-[#C85A32] hover:underline px-1">
              Clear all
            </button>
          </div>
        )}

        {/* 5. MARKET HEAD */}
        <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
          <div>
            <h2 className="text-xl font-bold text-[#1E3063] font-display">
              Vehicle Inventory — {filteredVehicles.length} listing{filteredVehicles.length === 1 ? '' : 's'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing inspected marketplace listings in {selectedCounty}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              Show
              <div className="flex bg-white border border-slate-200 rounded-lg overflow-hidden">
                {[12, 24, 48].map((n) => (
                  <button
                    key={n}
                    onClick={() => setPageSize(n)}
                    className={`px-2.5 py-1.5 text-xs ${pageSize === n ? 'bg-[#1E3063] text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="border border-slate-200 bg-white rounded-lg px-2.5 py-1.5 text-xs text-slate-700"
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
            <div className="flex bg-white border border-slate-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                title="Grid view"
                className={`p-2 ${viewMode === 'grid' ? 'bg-[#EAF0FD] text-[#1E3063]' : 'text-slate-400'}`}
              >
                <Grid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                title="List view"
                className={`p-2 ${viewMode === 'list' ? 'bg-[#EAF0FD] text-[#1E3063]' : 'text-slate-400'}`}
              >
                <ListIcon className="w-3.5 h-3.5" />
              </button>
            </div>
            <button
              onClick={() => setShowDesktopSidebar((s) => !s)}
              className="hidden lg:flex p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50"
              title="Toggle filter sidebar"
            >
              {showDesktopSidebar ? <PanelLeftClose className="w-3.5 h-3.5" /> : <PanelLeftOpen className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => setShowMobileFilterDrawer(true)}
              className="lg:hidden flex items-center gap-1.5 p-2 border border-slate-200 rounded-lg text-slate-600 text-xs font-semibold"
            >
              <Filter className="w-3.5 h-3.5" /> Filters
            </button>
            {isAdmin && (
              <button
                onClick={() => setShowAdminPanel(true)}
                className="flex items-center gap-1.5 p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 text-xs font-semibold"
                title="Customize Home Page"
              >
                <Settings className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">Customize Home Page</span>
              </button>
            )}
          </div>
        </div>

        {/* 6. MARKET BODY: SIDEBAR + RESULTS GRID */}
        <div className={`grid ${showDesktopSidebar ? 'lg:grid-cols-[266px_1fr]' : 'lg:grid-cols-1'} gap-6 items-start`}>
          {/* SIDEBAR */}
          {showDesktopSidebar && (
          <aside className="hidden lg:block bg-white border border-slate-200 rounded-2xl p-5 sticky top-20">
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="text-sm font-bold text-[#1E3063]">Filter Vehicles</h3>
              <button onClick={resetFilters} className="text-[11px] font-semibold text-[#C85A32] hover:underline">Reset</button>
            </div>

            <div className="border-b border-slate-100 py-3.5">
              <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Make</label>
              <select value={selectedMake} onChange={(e) => { setSelectedMake(e.target.value); setSelectedModel('All'); }} className="w-full border border-slate-200 rounded-lg px-2.5 py-2 text-xs bg-[#F5F2EB]/40">
                {makes.map((m) => <option key={m} value={m}>{m === 'All' ? 'All Makes' : m}</option>)}
              </select>
            </div>

            <div className="border-b border-slate-100 py-3.5">
              <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Model</label>
              <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} className="w-full border border-slate-200 rounded-lg px-2.5 py-2 text-xs bg-[#F5F2EB]/40">
                {models.map((m) => <option key={m} value={m}>{m === 'All' ? 'All Models' : m}</option>)}
              </select>
            </div>

            <div className="border-b border-slate-100 py-3.5">
              <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Price Range · {formatPriceM(maxPrice)}</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={minPrice || ''}
                  onChange={(e) => setMinPrice(Number(e.target.value) || 0)}
                  className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] font-mono"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={maxPrice === 20000000 ? '' : maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value) || 20000000)}
                  className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] font-mono"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[{ label: '< 2.5M', v: 2500000 }, { label: '< 4M', v: 4000000 }, { label: '< 7M', v: 7000000 }, { label: 'All', v: 20000000 }].map((c) => (
                  <button
                    key={c.label}
                    onClick={() => setMaxPrice(c.v)}
                    className={`border rounded-full px-2.5 py-1 text-[10.5px] font-medium ${maxPrice === c.v ? 'border-[#C85A32] bg-[#FBEDE7] text-[#C85A32]' : 'border-slate-200 text-slate-500'}`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-b border-slate-100 py-3.5">
              <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Year Range</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder={`Min (2005)`}
                  value={minYear === 2005 ? '' : minYear}
                  onChange={(e) => setMinYear(Number(e.target.value) || 2005)}
                  className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] font-mono"
                />
                <input
                  type="number"
                  placeholder={`Max (2026)`}
                  value={maxYear === 2026 ? '' : maxYear}
                  onChange={(e) => setMaxYear(Number(e.target.value) || 2026)}
                  className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] font-mono"
                />
              </div>
            </div>

            <div className="border-b border-slate-100 py-3.5">
              <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Body Style</label>
              <select value={selectedBodyStyle} onChange={(e) => setSelectedBodyStyle(e.target.value)} className="w-full border border-slate-200 rounded-lg px-2.5 py-2 text-xs bg-[#F5F2EB]/40">
                {bodyStyles.map((b) => <option key={b} value={b}>{b === 'All' ? 'All Body Styles' : b}</option>)}
              </select>
            </div>

            <div className="border-b border-slate-100 py-3.5">
              <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Fuel Type</label>
              <select value={selectedFuel} onChange={(e) => setSelectedFuel(e.target.value)} className="w-full border border-slate-200 rounded-lg px-2.5 py-2 text-xs bg-[#F5F2EB]/40">
                {fuelTypes.map((f) => <option key={f} value={f}>{f === 'All' ? 'All Fuel Types' : f}</option>)}
              </select>
            </div>

            <div className="border-b border-slate-100 py-3.5">
              <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Transmission</label>
              <select value={selectedTransmission} onChange={(e) => setSelectedTransmission(e.target.value)} className="w-full border border-slate-200 rounded-lg px-2.5 py-2 text-xs bg-[#F5F2EB]/40">
                {transmissionOptions.map((t) => <option key={t} value={t}>{t === 'All' ? 'All Transmissions' : t}</option>)}
              </select>
            </div>

            <div className="border-b border-slate-100 py-3.5">
              <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Seller Type</label>
              <select value={selectedSellerType} onChange={(e) => setSelectedSellerType(e.target.value)} className="w-full border border-slate-200 rounded-lg px-2.5 py-2 text-xs bg-[#F5F2EB]/40">
                {sellerTypeOptions.map((s) => <option key={s} value={s}>{s === 'All' ? 'All Sellers' : s}</option>)}
              </select>
            </div>

            <div className="py-3.5">
              <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2.5">Verified Guarantees</label>
              <div className="flex flex-col gap-2.5">
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={onlyInspected} onChange={(e) => setOnlyInspected(e.target.checked)} className="accent-[#C85A32] w-3.5 h-3.5" />
                  Pre-Purchase Inspected
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500" />
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={onlyEscrow} onChange={(e) => setOnlyEscrow(e.target.checked)} className="accent-[#C85A32] w-3.5 h-3.5" />
                  Escrow Protected
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#1E3063]" />
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={onlyFinance} onChange={(e) => setOnlyFinance(e.target.checked)} className="accent-[#C85A32] w-3.5 h-3.5" />
                  Finance Available
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400" />
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={onlyAuction} onChange={(e) => setOnlyAuction(e.target.checked)} className="accent-[#C85A32] w-3.5 h-3.5" />
                  Live Auction Listings
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-rose-500" />
                </label>
              </div>
            </div>

            <button onClick={resetFilters} className="w-full bg-[#1E3063] hover:bg-[#17244B] text-white font-bold text-xs rounded-lg py-2.5 mt-3">
              Apply Filters
            </button>
          </aside>
          )}

          {/* RESULTS */}
          <div className="min-h-[400px]">
            {isLoading ? (
              <SkeletonGrid count={pageSize} />
            ) : loadError ? (
              <div className="text-center py-16 bg-white border border-dashed border-slate-200 rounded-2xl">
                <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-[#1E3063] mb-1">Couldn't load vehicles</h4>
                <p className="text-xs text-slate-500 mb-4">{loadError}</p>
                {onRetryLoad && (
                  <button onClick={onRetryLoad} className="bg-[#1E3063] text-white text-xs font-bold rounded-lg px-4 py-2">
                    Try Again
                  </button>
                )}
              </div>
            ) : filteredVehicles.length === 0 ? (
              <div className="text-center py-16 bg-white border border-dashed border-slate-200 rounded-2xl">
                <Search className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-[#1E3063] mb-1">No vehicles match your filters</h4>
                <p className="text-xs text-slate-500 mb-4">Try widening your price range or clearing a filter to see more results.</p>
                <button onClick={resetFilters} className="bg-[#1E3063] text-white text-xs font-bold rounded-lg px-4 py-2">
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className={viewMode === 'grid'
                ? `grid grid-cols-1 sm:grid-cols-2 ${showDesktopSidebar ? 'xl:grid-cols-3' : 'xl:grid-cols-4'} gap-4`
                : 'flex flex-col gap-3'
              }>
                {onlyAuction === false && paginatedVehicles.some((v) => v.isAuction) === false && filteredVehicles.some((v) => v.isAuction) && viewMode === 'grid' && (
                  <div className="bg-gradient-to-br from-[#1E3063] to-[#17244B] rounded-2xl text-white p-5 flex flex-col relative overflow-hidden">
                    <span className="self-start bg-rose-600 text-[10px] font-bold px-2.5 py-1 rounded-md mb-3">🔴 LIVE</span>
                    <h3 className="text-lg font-bold mb-2">Live Vehicle Auctions</h3>
                    <p className="text-xs text-slate-300 mb-4">Bid on quality vehicles from trusted, verified sellers across East Africa.</p>
                    <button onClick={() => onNavigate('discovery')} className="self-start bg-[#C85A32] hover:bg-[#B34E29] text-white text-xs font-bold px-4 py-2 rounded-lg mt-auto">
                      View Auctions →
                    </button>
                  </div>
                )}
                {gridItemsWithSponsors.map((item, idx) => {
                  if (item.type === 'sponsor') {
                    return <MarketingCard key={`sponsor-${idx}`} data={item.sponsor} />;
                  }
                  const v = item.vehicle;
                  const isSaved = savedVehicles.includes(v.id);
                  const ribbon = v.inspectionPassed
                    ? { label: 'Report Available', cls: 'bg-emerald-600' }
                    : v.isAuction
                    ? { label: '🔴 Live Auction', cls: 'bg-rose-600' }
                    : v.badge
                    ? { label: `★ ${v.badge}`, cls: 'bg-[#1E3063]' }
                    : null;
                  return (
                    <div
                      key={v.id}
                      className={`bg-white border border-slate-200 rounded-2xl overflow-hidden flex hover:shadow-lg hover:-translate-y-0.5 transition-all ${viewMode === 'list' ? 'flex-row' : 'flex-col'}`}
                    >
                      <div className={`relative bg-gradient-to-br from-slate-200 to-slate-300 shrink-0 ${viewMode === 'list' ? 'w-56' : 'h-40'}`}>
                        {v.images?.[0] && (
                          <img src={v.images[0]} alt={v.title} className="w-full h-full object-cover" />
                        )}
                        {ribbon && (
                          <span className={`absolute top-2.5 left-2.5 text-[10px] font-bold px-2 py-1 rounded-md text-white ${ribbon.cls}`}>
                            {ribbon.label}
                          </span>
                        )}
                        <button
                          onClick={() => onToggleSave(v.id)}
                          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center"
                          title={isSaved ? 'Remove from saved' : 'Save vehicle'}
                        >
                          {isSaved ? '♥' : '♡'}
                        </button>
                        {v.isAuction && v.currentBid && (
                          <div className="absolute bottom-0 left-0 right-0 bg-black/75 text-white text-[10px] font-mono px-2.5 py-1.5 flex justify-between">
                            <span>Current bid: Ksh {(v.currentBid / 1000000).toFixed(2)}M</span>
                          </div>
                        )}
                      </div>
                      <div className="p-3.5 border-t border-slate-100 flex-1 flex flex-col">
                        <h4 className="text-sm font-semibold text-[#1E3063] mb-1">{v.year} {v.make} {v.model}</h4>
                        <div className="font-mono font-bold text-base text-[#1E3063] mb-2">{formatPriceM(v.price)}</div>
                        <div className="flex flex-wrap gap-2.5 text-[11px] text-slate-500 mb-2">
                          <span>{v.mileage.toLocaleString()} km</span>
                          <span>{v.fuelType}</span>
                          <span>{v.transmission}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mb-2">{v.location}</div>
                        {v.inspectionPassed ? (
                          <div className="text-[11px] rounded-lg px-2 py-1.5 mb-2.5 bg-emerald-50 text-emerald-800 flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                            <span>Inspection report available</span>
                          </div>
                        ) : (
                          <div className="text-[11px] rounded-lg px-2 py-1.5 mb-2.5 bg-slate-100 text-slate-500 flex items-center justify-between">
                            <span>No inspection report yet</span>
                            <button onClick={() => onNavigate('inspections')} className="text-[#C85A32] font-semibold">Request one →</button>
                          </div>
                        )}
                        <button
                          onClick={() => handleVehicleSelect(v)}
                          className="mt-auto w-full text-center border border-slate-200 hover:bg-[#EAF0FD] hover:border-[#EAF0FD] rounded-lg py-2 text-xs font-semibold text-[#1E3063]"
                        >
                          View Details →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* PAGINATION */}
            {filteredVehicles.length > pageSize && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 border border-slate-200 rounded-lg disabled:opacity-40"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs text-slate-500 font-medium">Page {currentPage} of {totalPages}</span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 border border-slate-200 rounded-lg disabled:opacity-40"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 7. CTA BANDS */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4 mt-12 rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-br from-[#17244B] to-[#1E3063] text-white p-8 sm:p-10 flex flex-col justify-center gap-4">
            <span className="text-[11px] font-bold uppercase tracking-widest text-amber-400">Buy with more confidence</span>
            <h3 className="text-xl sm:text-2xl font-bold font-display max-w-md">A registered local mechanic inspects it. The report stays on file — for you and every buyer after you.</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-2 text-xs text-slate-300">
              <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />Registered mechanic near the vehicle</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />Pay the mechanic directly</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />Report uploaded to the listing</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />Later buyers can unlock it</div>
            </div>
            <button onClick={() => onNavigate('inspections')} className="self-start bg-[#C85A32] hover:bg-[#B34E29] text-white text-sm font-bold px-5 py-2.5 rounded-full mt-1">
              Request an Inspection →
            </button>
          </div>
          <div className="bg-[#F5F2EB] p-8 sm:p-9 flex flex-col justify-center">
            <h4 className="text-lg font-bold text-[#1E3063] mb-2 max-w-xs">Ready to sell your vehicle?</h4>
            <p className="text-xs text-slate-600 mb-4 max-w-xs">Reach verified buyers across East Africa through the KAYAD marketplace and escrow network.</p>
            <button onClick={() => onNavigate('seller-platform')} className="self-start bg-[#1E3063] hover:bg-[#17244B] text-white text-sm font-bold px-5 py-2.5 rounded-full">
              Sell Your Vehicle →
            </button>
          </div>
        </div>
      </div>

      {/* 8. FLOATING COMPARISON TRAY */}
      {comparedVehicles.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-[#1E3063] text-white rounded-2xl shadow-2xl px-5 py-3 flex items-center gap-4">
          <ArrowRightLeft className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-semibold">{comparedVehicles.length} vehicle{comparedVehicles.length > 1 ? 's' : ''} selected to compare</span>
          <button onClick={onOpenCompareModal} className="bg-[#C85A32] text-white text-xs font-bold px-3 py-1.5 rounded-lg">
            Compare Now
          </button>
        </div>
      )}

      {/* 9. SAVE SEARCH MODAL */}
      {showSaveSearchModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowSaveSearchModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-[#1E3063] mb-3">Save this search</h3>
            <form onSubmit={handleSaveCurrentPreset} className="space-y-3">
              <input
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                placeholder="e.g. Under Ksh 3.5M SUVs"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                autoFocus
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowSaveSearchModal(false)} className="flex-1 border border-slate-200 rounded-lg py-2 text-xs font-semibold text-slate-600">
                  Cancel
                </button>
                <button type="submit" className="flex-1 bg-[#1E3063] text-white rounded-lg py-2 text-xs font-bold">
                  Save Search
                </button>
              </div>
            </form>
            {savedPresets.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-1.5">
                <p className="text-[10px] font-bold uppercase text-slate-400 mb-1.5">Saved Searches</p>
                {savedPresets.map((p) => (
                  <button key={p.id} onClick={() => applyPreset(p)} className="w-full text-left text-xs text-slate-600 hover:text-[#C85A32] flex items-center gap-1.5">
                    <Bookmark className="w-3 h-3 shrink-0" /> {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 10. MOBILE FULL-SCREEN FILTER DRAWER */}
      {showMobileFilterDrawer && (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto lg:hidden">
          <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#1E3063]">Filter Vehicles</h3>
            <button onClick={() => setShowMobileFilterDrawer(false)} className="p-1.5">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Make</label>
              <select value={selectedMake} onChange={(e) => { setSelectedMake(e.target.value); setSelectedModel('All'); }} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm">
                {makes.map((m) => <option key={m} value={m}>{m === 'All' ? 'All Makes' : m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Body Style</label>
              <select value={selectedBodyStyle} onChange={(e) => setSelectedBodyStyle(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm">
                {bodyStyles.map((b) => <option key={b} value={b}>{b === 'All' ? 'All Body Styles' : b}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Fuel Type</label>
              <select value={selectedFuel} onChange={(e) => setSelectedFuel(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm">
                {fuelTypes.map((f) => <option key={f} value={f}>{f === 'All' ? 'All Fuel Types' : f}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-2.5 pt-2">
              <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={onlyInspected} onChange={(e) => setOnlyInspected(e.target.checked)} className="accent-[#C85A32] w-4 h-4" /> Pre-Purchase Inspected</label>
              <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={onlyEscrow} onChange={(e) => setOnlyEscrow(e.target.checked)} className="accent-[#C85A32] w-4 h-4" /> Escrow Protected</label>
              <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={onlyFinance} onChange={(e) => setOnlyFinance(e.target.checked)} className="accent-[#C85A32] w-4 h-4" /> Finance Available</label>
              <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={onlyAuction} onChange={(e) => setOnlyAuction(e.target.checked)} className="accent-[#C85A32] w-4 h-4" /> Live Auction Listings</label>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={resetFilters} className="flex-1 border border-slate-200 rounded-lg py-2.5 text-xs font-bold text-slate-600">Reset</button>
              <button onClick={() => setShowMobileFilterDrawer(false)} className="flex-1 bg-[#1E3063] text-white rounded-lg py-2.5 text-xs font-bold">Show Results</button>
            </div>
          </div>
        </div>
      )}

      {isAdmin && showAdminPanel && (
        <HomePageAdminPanel
          config={homeConfig}
          onUpdate={updateHomeConfig}
          onReset={resetHomeConfig}
          onClose={() => setShowAdminPanel(false)}
          adminUser={{ id: user!.id, name: user!.name }}
        />
      )}
    </div>
  );
};

export default VehicleMarketplace;

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Vehicle, UserProfile } from '../../../types';
import VehicleCard from '../../../components/VehicleCard';
import { SlidersHorizontal, Search, RotateCcw, Grid, List as ListIcon, ArrowRightLeft, Filter, X, ChevronLeft, ChevronRight, Gavel, ShieldCheck, CheckCircle2, Lock, Landmark, Clock, Bell, PanelLeftClose, PanelLeftOpen, LayoutGrid, Settings, AlertTriangle, Megaphone, Image as ImageIcon, Gauge, Fuel, MapPin } from 'lucide-react';
import { Select, Button, Card, SkeletonGrid } from '../../../components/ui';
import MarketingCard, { MarketingCardData } from '../../../components/MarketingCard';
import FloatingAdRail from '../../../components/FloatingAdRail';
import { getVisibleHeroSlides, HeroSlide } from '../../../services/heroApi';
import { getCars, mapBackendCarToVehicle, VehicleApiError, type GetCarsParams } from '../../../services/vehicleApi';
import { getVisibleAdSlots, recordAdEvent, AdSlot } from '../../../services/adApi';
import { useHomePageConfig, ACCENT_THEME_CLASSES } from '../hooks/useHomePageConfig';
import HomePageAdminPanel from './HomePageAdminPanel';
import AdManagerPanel from '../../AdManager/AdManagerPanel';
import HeroEditorPanel from '../../HeroEditor/HeroEditorPanel';

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
  const [showAdManager, setShowAdManager] = useState(false);
  const [showHeroEditor, setShowHeroEditor] = useState(false);
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
  const [onlyAuction, setOnlyAuction] = useState<boolean>(false);

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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(homeConfig.inventoryLayout.viewMode);
  const [gridColumns, setGridColumns] = useState<3 | 4 | 5>(homeConfig.inventoryLayout.columns);
  const [sortBy, setSortBy] = useState<
    'newest' | 'price-asc' | 'price-desc' | 'mileage' | 'year' | 'most-viewed' | 'auction-ending'
  >('newest');
  const [showDesktopSidebar, setShowDesktopSidebar] = useState<boolean>(homeConfig.inventoryLayout.showSidebar);
  const [showMobileFilterDrawer, setShowMobileFilterDrawer] = useState<boolean>(false);

  // Admin presentation settings are the default layout. Visitor toolbar
  // controls can still make a temporary local change without changing the
  // saved admin configuration. When an admin changes the presentation in
  // the panel, the live page follows it immediately.
  useEffect(() => {
    setViewMode(homeConfig.inventoryLayout.viewMode);
    setGridColumns(homeConfig.inventoryLayout.columns);
    setShowDesktopSidebar(homeConfig.inventoryLayout.showSidebar);
  }, [homeConfig.inventoryLayout.viewMode, homeConfig.inventoryLayout.columns, homeConfig.inventoryLayout.showSidebar]);

  const inventoryDensity = {
    compact: {
      gap: 'gap-3', image: 'h-32 sm:h-36', body: 'p-3', title: 'text-[13px]', price: 'text-[15px]', meta: 'text-[10px]', detail: 'py-2',
    },
    standard: {
      gap: 'gap-4', image: 'h-36 sm:h-40', body: 'p-3.5', title: 'text-sm', price: 'text-base', meta: 'text-[11px]', detail: 'py-2.5',
    },
    comfortable: {
      gap: 'gap-5', image: 'h-44 sm:h-48', body: 'p-4', title: 'text-[15px]', price: 'text-lg', meta: 'text-xs', detail: 'py-3',
    },
  }[homeConfig.inventoryLayout.cardDensity];

  const gridColumnClasses: Record<3 | 4 | 5, string> = {
    3: 'xl:grid-cols-3',
    4: 'xl:grid-cols-4',
    5: 'xl:grid-cols-4 2xl:grid-cols-5',
  };

  // Toast / Notification State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Pagination States
  const [currentPage, setCurrentPage] = useState<number>(1);
  // Defaults to 24 rather than 12 - now that compact mode (also the new
  // default view) fits up to 5 per row on large screens, 12 would only
  // fill ~2.4 rows per page. 24 uses the space better and halves how
  // often visitors need to paginate at real scale.
  const [pageSize, setPageSize] = useState<number>(24);

  // Phase 42: the marketplace query is authoritative and paginated by the
  // real /api/cars endpoint. App.tsx still supplies the initial inventory
  // snapshot, but browsing controls now re-query the backend instead of
  // filtering/slicing only the first 50 records in memory.
  const [serverVehicles, setServerVehicles] = useState<Vehicle[]>(vehicles);
  const [serverTotal, setServerTotal] = useState<number>(vehicles.length);
  const [serverTotalPages, setServerTotalPages] = useState<number>(1);
  const [serverLoading, setServerLoading] = useState<boolean>(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const isLoading = isLoadingReal || serverLoading;

  const serverQuery = useMemo<GetCarsParams>(() => {
    const query: GetCarsParams = {
      page: currentPage,
      limit: pageSize,
    };

    if (searchQuery.trim()) query.keyword = searchQuery.trim();
    if (selectedMake !== 'All') query.brand = selectedMake;
    if (selectedModel !== 'All') query.model = selectedModel;
    if (selectedCounty !== 'All East Africa') query.city = selectedCounty;
    if (minPrice > 0) query.minPrice = minPrice;
    if (maxPrice < 20000000) query.maxPrice = maxPrice;
    if (minYear > 2005) query.yearMin = minYear;
    if (maxYear < 2026) query.yearMax = maxYear;
    if (selectedBodyStyle !== 'All') query.body = selectedBodyStyle;
    if (selectedFuel !== 'All') query.fuel = selectedFuel;
    if (selectedTransmission !== 'All') query.transmission = selectedTransmission;
    if (selectedCondition !== 'All') query.condition = selectedCondition;
    if (maxMileage < 250000) query.mileageMax = maxMileage;
    if (selectedSellerType === 'Verified Dealer') query.dealerType = 'dealer';
    if (selectedSellerType === 'Private Seller') query.dealerType = 'private';
    if (onlyAuction) query.auctionStatus = 'live';

    const sortMap: Record<typeof sortBy, GetCarsParams['sort']> = {
      newest: 'newest',
      'price-asc': 'price_asc',
      'price-desc': 'price_desc',
      mileage: 'mileage_asc',
      year: 'year_desc',
      'most-viewed': 'views_desc',
      'auction-ending': 'ending_soon',
    };
    query.sort = sortMap[sortBy];
    return query;
  }, [
    currentPage, pageSize, searchQuery, selectedMake, selectedModel, selectedCounty,
    minPrice, maxPrice, minYear, maxYear, selectedBodyStyle, selectedFuel,
    selectedTransmission, selectedCondition, maxMileage, selectedSellerType,
    onlyAuction, sortBy
  ]);

  useEffect(() => {
    let cancelled = false;
    setServerLoading(true);
    setServerError(null);

    getCars(serverQuery)
      .then((res) => {
        if (cancelled) return;
        const mapped = (res.data || res.cars || []).map(mapBackendCarToVehicle);
        setServerVehicles(mapped);
        setServerTotal(res.pagination?.total ?? mapped.length);
        setServerTotalPages(res.pagination?.pages ?? res.pagination?.totalPages ?? 1);
      })
      .catch((err) => {
        if (cancelled) return;
        setServerError(err instanceof VehicleApiError ? err.message : 'Unable to load marketplace results.');
        setServerVehicles([]);
        setServerTotal(0);
        setServerTotalPages(1);
      })
      .finally(() => {
        if (!cancelled) setServerLoading(false);
      });

    return () => { cancelled = true; };
  }, [serverQuery]);

  // Recently Viewed Vehicles Tracking (stored in localStorage)
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>([]);
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

  // Show Toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Dynamic Filter Options Extracted directly from backend dataset
  const makes = useMemo(() => {
    const list = Array.from(new Set(serverVehicles.map((v) => v.make).filter(Boolean))).sort();
    return ['All', ...list];
  }, [serverVehicles]);

  const models = useMemo(() => {
    const source = selectedMake === 'All'
      ? serverVehicles
      : serverVehicles.filter((v) => v.make.toLowerCase() === selectedMake.toLowerCase());
    const list = Array.from(new Set(source.map((v) => v.model).filter(Boolean))).sort();
    return ['All', ...list];
  }, [serverVehicles, selectedMake]);

  const bodyStyles = useMemo(() => {
    const list = Array.from(new Set(vehicles.map((v) => v.bodyStyle).filter(Boolean))).sort();
    return ['All', ...list];
  }, [serverVehicles]);

  const fuelTypes = useMemo(() => {
    const list = Array.from(new Set(serverVehicles.map((v) => v.fuelType).filter(Boolean))).sort();
    return ['All', ...list];
  }, [serverVehicles]);

  const transmissionOptions = ['All', 'Automatic', 'Manual', 'CVT', 'Semi-Automatic'];
  const conditionOptions = ['All', 'Foreign Used', 'Locally Used', 'Brand New'];
  const sellerTypeOptions = ['All', 'Verified Dealer', 'Private Seller'];

  const locations = useMemo(() => {
    const list = Array.from(new Set(serverVehicles.map((v) => v.county || v.location).filter(Boolean))).sort();
    return ['All East Africa', ...list];
  }, [serverVehicles]);

  const availableYears = useMemo(() => {
    const list = Array.from(new Set(serverVehicles.map((v) => v.year).filter((y): y is number => Boolean(y)))).sort((a: number, b: number) => b - a);
    return list;
  }, [serverVehicles]);

  // Phase 44: never post-filter a server-paginated page with feature flags
  // that lack an authoritative backend query contract. The backend response
  // is therefore the complete result set for this page.
  const filteredVehicles = serverVehicles;

  // Reset to the first server page when a query dimension changes. Page-size
  // changes intentionally reset too, so the backend always owns the offset.
  useEffect(() => {
    setCurrentPage(1);
  }, [
    pageSize, searchQuery, selectedCounty, selectedMake, selectedModel,
    selectedBodyStyle, selectedFuel, selectedTransmission, selectedCondition,
    selectedSellerType, minPrice, maxPrice, minYear, maxYear, maxMileage,
    onlyAuction, sortBy
  ]);

  // The backend has already paginated this page. Do not slice it again.
  const paginatedVehicles = filteredVehicles;
  const totalPages = Math.max(1, serverTotalPages);

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
    setOnlyAuction(false);
    onCountyChange('All East Africa');
  }, [onSearchChange, onCountyChange]);


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
    if (onlyAuction) list.push({ id: 'auction', label: 'Live Auction', onClear: () => setOnlyAuction(false) });
    return list;
  }, [
    searchQuery, selectedCounty, selectedMake, selectedModel, selectedBodyStyle,
    selectedFuel, selectedTransmission, selectedSellerType, selectedCondition,
    maxPrice, minYear, maxYear, onlyAuction, onSearchChange, onCountyChange
  ]);

  // Recently Viewed Vehicle Objects
  const recentlyViewedVehicles = useMemo(() => {
    return recentlyViewedIds
      .map((id) => serverVehicles.find((v) => v.id === id))
      .filter((v): v is Vehicle => Boolean(v));
  }, [recentlyViewedIds, serverVehicles]);

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
  }, [serverVehicles]);

  // Interleaves sponsor/partner cards into the grid every 4th position -
  // one full row in the 4-column grid, so each sponsor card lands at a
  // clean row boundary rather than breaking mid-row. Originally used an
  // every-8th interval (2 rows), but found while writing test coverage
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
  // Fixed: this previously interleaved static sponsor cards,
  // hardcoded placeholder content with no real advertiser or business
  // behind it at all. Now fetches real, backend-persisted ad slots
  // (placement='mid_grid') from the real Ad Manager system, mapped
  // into MarketingCard's own real shape.
  const [midGridAds, setMidGridAds] = useState<AdSlot[]>([]);
  useEffect(() => {
    let cancelled = false;
    getVisibleAdSlots('mid_grid')
      .then((data) => { if (!cancelled) { setMidGridAds(data); data.forEach((slot) => { void recordAdEvent(slot.id, 'impression').catch(() => undefined); }); } })
      .catch(() => { /* a failed ad fetch should never block the real vehicle grid */ });
    return () => { cancelled = true; };
  }, []);

  // Fixed: 'sidebar' was a real, selectable placement in the Ad
  // Manager panel - an admin could create one, see it marked "Visible
  // on page", and it would never actually appear anywhere on the real
  // page at all. Now genuinely fetched and rendered at the bottom of
  // the real filter sidebar.
  const [sidebarAds, setSidebarAds] = useState<AdSlot[]>([]);
  useEffect(() => {
    let cancelled = false;
    getVisibleAdSlots('sidebar')
      .then((data) => { if (!cancelled) { setSidebarAds(data); data.forEach((slot) => { void recordAdEvent(slot.id, 'impression').catch(() => undefined); }); } })
      .catch(() => { /* a failed ad fetch should never block the real filter sidebar */ });
    return () => { cancelled = true; };
  }, []);

  // Fixed: the hero card's text/background/CTAs are now real,
  // backend-persisted, fully admin-editable content (via
  // features/HeroEditor/HeroEditorPanel.tsx) - not hardcoded. Falls
  // back to a single, honest default slide when the admin hasn't
  // created any real ones yet, so the page never shows an empty hero
  // on a fresh install.
  const DEFAULT_HERO_SLIDE: HeroSlide = {
    id: 'default',
    eyebrowText: 'KAYAD EA Automotive Marketplace',
    headline: 'Find the right vehicle. Buy with confidence.',
    subheadline: 'Quality vehicles, live auctions, and inspection reports from registered local mechanics — all verified through one escrow-protected marketplace built for East Africa.',
    ctaPrimaryText: 'Explore Vehicles →',
    ctaSecondaryText: 'Sell Your Vehicle',
    backgroundType: 'image',
    backgroundValue: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Nairobi_City_Skyline.jpg',
    overlayColor: '#0B2A5B',
    overlayOpacity: 78,
    displayMode: 'boxed',
    layout: 'four-corner',
    mediaConfig: {
      leftTopImage: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Toyota_Probox_(53526709295).jpg',
      leftTopLabel: 'Toyota Probox',
      leftBottomImage: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Prado_imported_from_japan_to_kenya.jpg',
      leftBottomLabel: 'Land Cruiser Prado',
      rightTopImage: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Subaru-Forester.jpg',
      rightTopLabel: 'Subaru Forester',
      rightBottomImage: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Toyota_Premio_01.jpg',
      rightBottomLabel: 'Toyota Premio',
    },
    isVisible: true,
    sortOrder: 0,
    createdAt: '',
    updatedAt: '',
  };
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([DEFAULT_HERO_SLIDE]);
  const [heroSlideIndex, setHeroSlideIndex] = useState(0);
  useEffect(() => {
    let cancelled = false;
    getVisibleHeroSlides()
      .then((data) => { if (!cancelled && data.length > 0) setHeroSlides(data); })
      .catch(() => { /* a failed hero fetch falls back to the real default slide */ });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    if (heroSlides.length < 2) return;
    const timer = setInterval(() => setHeroSlideIndex((i) => (i + 1) % heroSlides.length), 6000);
    return () => clearInterval(timer);
  }, [heroSlides.length]);
  const activeHeroSlide = heroSlides[heroSlideIndex % heroSlides.length];
  const heroLayout = activeHeroSlide.layout || 'four-corner';

  const fallbackHeroMedia = DEFAULT_HERO_SLIDE.mediaConfig || {};
  const findInventoryImage = useCallback((make: string, model: string) => {
    const match = serverVehicles.find((vehicle) =>
      vehicle.make.toLowerCase().includes(make.toLowerCase()) &&
      vehicle.model.toLowerCase().includes(model.toLowerCase()) &&
      vehicle.images?.[0]
    );
    return match?.images?.[0] || '';
  }, [serverVehicles]);

  const heroMedia = {
    leftTopImage: activeHeroSlide.mediaConfig?.leftTopImage || findInventoryImage('toyota', 'probox') || fallbackHeroMedia.leftTopImage,
    leftTopLabel: activeHeroSlide.mediaConfig?.leftTopLabel || fallbackHeroMedia.leftTopLabel || 'Toyota Probox',
    leftBottomImage: activeHeroSlide.mediaConfig?.leftBottomImage || findInventoryImage('toyota', 'land cruiser') || fallbackHeroMedia.leftBottomImage,
    leftBottomLabel: activeHeroSlide.mediaConfig?.leftBottomLabel || fallbackHeroMedia.leftBottomLabel || 'Land Cruiser Prado',
    rightTopImage: activeHeroSlide.mediaConfig?.rightTopImage || findInventoryImage('subaru', 'forester') || fallbackHeroMedia.rightTopImage,
    rightTopLabel: activeHeroSlide.mediaConfig?.rightTopLabel || fallbackHeroMedia.rightTopLabel || 'Subaru Forester',
    rightBottomImage: activeHeroSlide.mediaConfig?.rightBottomImage || findInventoryImage('toyota', 'premio') || fallbackHeroMedia.rightBottomImage,
    rightBottomLabel: activeHeroSlide.mediaConfig?.rightBottomLabel || fallbackHeroMedia.rightBottomLabel || 'Toyota Premio',
  };

  const mapAdSlotToMarketingCard = (slot: AdSlot): MarketingCardData => ({
    id: slot.id,
    label: 'Sponsored',
    category: 'Advertisement',
    name: slot.title,
    tagline: slot.tagline || '',
    ctaLabel: slot.buttonText || 'Learn More',
    ctaUrl: slot.buttonUrl,
    icon: Megaphone,
    accentColor: slot.backgroundColor,
  });

  const gridItemsWithSponsors = useMemo(() => {
    const items: ({ type: 'vehicle'; vehicle: Vehicle } | { type: 'sponsor'; sponsor: MarketingCardData })[] = [];
    let sponsorIndex = 0;
    paginatedVehicles.forEach((v, i) => {
      if (homeConfig.sectionVisibility.sponsorCardsInGrid && i > 0 && i % 4 === 0 && midGridAds.length > 0) {
        items.push({ type: 'sponsor', sponsor: mapAdSlotToMarketingCard(midGridAds[sponsorIndex % midGridAds.length]) });
        sponsorIndex += 1;
      }
      items.push({ type: 'vehicle', vehicle: v });
    });
    return items;
  }, [paginatedVehicles, homeConfig.sectionVisibility.sponsorCardsInGrid, midGridAds]);

  return (
    <div className="w-full min-w-0 space-y-0 pb-16">
      {/* TOAST NOTIFICATION FLOATER */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 bg-[#0B1D3A] text-white px-4 py-3 rounded-xl shadow-2xl border border-white/20 flex items-center gap-2.5 text-xs font-bold animate-slide-down">
          <Bell className="w-4 h-4 text-[#20C4F4] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Redesigned to align the marketplace with the premium hero system:
          navy #0B1D3A, electric blue #1684FF, cyan #20C4F4 and cool
          surfaces. No product features or business rules are introduced;
          this pass is presentation-only and keeps existing data/actions. Every section
          below reuses this component's own real state/logic (filters,
          sort, pagination, saved/compare, admin config) - only the visual
          layer changed, not the data or behavior. */}

      {/* 1. HERO - premium visual refinement of the existing hero contract.
          No new homepage module is introduced: the existing text, two CTAs,
          slider, background and admin editor remain the source of truth. */}
      {homeConfig.sectionVisibility.searchTrustCard && (
        <section
          className={`relative left-1/2 -translate-x-1/2 w-screen text-white overflow-hidden bg-[#0B1D3A] ${activeHeroSlide.displayMode === 'fullscreen' ? 'min-h-[70vh] flex items-center' : ''}`}
          style={{ backgroundColor: '#0B1D3A' }}
        >
          {activeHeroSlide.backgroundType === 'image' && activeHeroSlide.backgroundValue && (
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${activeHeroSlide.backgroundValue})` }}
              aria-hidden="true"
            />
          )}
          {activeHeroSlide.backgroundType === 'color' && activeHeroSlide.backgroundValue && (
            <div className="absolute inset-0" style={{ backgroundColor: activeHeroSlide.backgroundValue }} aria-hidden="true" />
          )}
          {(activeHeroSlide.backgroundType === 'gradient' || !activeHeroSlide.backgroundValue) && (
            <div className="absolute inset-0 bg-gradient-to-br from-[#0B1D3A] via-[#173A73] to-[#102B59]" aria-hidden="true" />
          )}
          <div
            className="absolute inset-0"
            style={{ backgroundColor: activeHeroSlide.overlayColor || '#0B2A5B', opacity: activeHeroSlide.overlayOpacity / 100 }}
            aria-hidden="true"
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(600px 360px at 50% 25%, rgba(22,132,255,.20), transparent 68%), radial-gradient(420px 320px at 50% 100%, rgba(20,184,166,.12), transparent 70%)'
            }}
            aria-hidden="true"
          />

          <div className={`relative w-full mx-auto px-4 sm:px-6 lg:px-10 py-8 sm:py-10 lg:py-11 ${heroLayout === 'centered' ? 'max-w-5xl' : 'max-w-[1600px]'}`}>
            {heroLayout === 'centered' ? (
              <div className="mx-auto max-w-4xl text-center">
                <div className="mb-4 flex flex-wrap items-center justify-center gap-3">
                  {heroMedia.leftTopImage && (
                    <img src={heroMedia.leftTopImage} alt={heroMedia.leftTopLabel} className="h-16 w-24 object-contain drop-shadow-[0_14px_18px_rgba(0,0,0,.35)] sm:h-20 sm:w-32" loading="eager" />
                  )}
                  {activeHeroSlide.eyebrowText && <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#20C4F4]">● {activeHeroSlide.eyebrowText}</span>}
                  {heroMedia.rightTopImage && (
                    <img src={heroMedia.rightTopImage} alt={heroMedia.rightTopLabel} className="h-16 w-24 object-contain drop-shadow-[0_14px_18px_rgba(0,0,0,.35)] sm:h-20 sm:w-32" loading="eager" />
                  )}
                </div>
                <h1 className="font-display text-[clamp(2rem,5vw,4rem)] font-bold leading-[1.02] tracking-[-0.035em] mb-4">{activeHeroSlide.headline}</h1>
                {activeHeroSlide.subheadline && <p className="text-sm sm:text-base text-slate-200/90 max-w-3xl mx-auto mb-6 leading-relaxed">{activeHeroSlide.subheadline}</p>}
                <div className="flex flex-wrap items-center justify-center gap-3">
                  {activeHeroSlide.ctaPrimaryText && (
                    <button onClick={() => activeHeroSlide.ctaPrimaryLink ? onNavigate(activeHeroSlide.ctaPrimaryLink) : document.getElementById('market-results')?.scrollIntoView({ behavior: 'smooth' })} className="bg-[#1684FF] hover:bg-[#0F6ED8] text-white font-bold text-xs sm:text-sm px-6 py-3 rounded-full transition-colors shadow-lg shadow-[#1684FF]/20">{activeHeroSlide.ctaPrimaryText}</button>
                  )}
                  {activeHeroSlide.ctaSecondaryText && (
                    <button onClick={() => activeHeroSlide.ctaSecondaryLink ? onNavigate(activeHeroSlide.ctaSecondaryLink) : onNavigate('seller-platform')} className="border border-white/35 hover:border-white/70 text-white font-bold text-xs sm:text-sm px-6 py-3 rounded-full transition-colors">{activeHeroSlide.ctaSecondaryText}</button>
                  )}
                </div>
              </div>
            ) : (
              <div className={`grid items-center gap-5 lg:gap-8 ${heroLayout === 'media-left' ? 'lg:grid-cols-[minmax(0,1fr)_minmax(360px,1.05fr)]' : heroLayout === 'media-right' ? 'lg:grid-cols-[minmax(360px,1.05fr)_minmax(0,1fr)]' : 'lg:grid-cols-[220px_minmax(0,1fr)_220px]'}`}>
                {(heroLayout === 'four-corner' || heroLayout === 'media-left') && (
                  <div className={`hidden sm:grid ${heroLayout === 'four-corner' ? 'lg:grid-cols-1 gap-5' : 'grid-cols-2 gap-4 order-2 lg:order-1'}`}>
                    {[['leftTopImage', 'leftTopLabel'], ['leftBottomImage', 'leftBottomLabel']].map(([imageKey, labelKey]) => {
                      const image = heroMedia[imageKey as keyof typeof heroMedia];
                      const label = heroMedia[labelKey as keyof typeof heroMedia];
                      return image ? <div key={imageKey} className="relative h-28 sm:h-32 lg:h-36 flex items-end justify-center"><img src={image} alt={String(label)} className="max-h-full w-full object-contain drop-shadow-[0_18px_22px_rgba(0,0,0,.4)]" loading="eager" /><span className="absolute bottom-0 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#0B1D3A]/90 px-3 py-1 text-[9px] font-bold text-white shadow-lg">{label}</span></div> : null;
                    })}
                  </div>
                )}

                <div className={`text-center ${heroLayout === 'media-left' ? 'order-1 lg:order-2' : heroLayout === 'media-right' ? 'order-1' : ''}`}>
                  {activeHeroSlide.eyebrowText && <div className="inline-flex items-center gap-2 text-[10px] font-bold tracking-[0.16em] uppercase text-[#20C4F4] mb-4"><span className="w-1.5 h-1.5 rounded-full bg-[#20C4F4]" />{activeHeroSlide.eyebrowText}</div>}
                  <h1 className="font-display text-[clamp(2rem,4.3vw,3.8rem)] font-bold leading-[1.03] tracking-[-0.03em] mb-4">{activeHeroSlide.headline}</h1>
                  {activeHeroSlide.subheadline && <p className="text-sm sm:text-base text-slate-200/90 max-w-2xl mx-auto mb-6 leading-relaxed">{activeHeroSlide.subheadline}</p>}
                  <div className="flex flex-wrap items-center justify-center gap-3 mb-5">
                    {activeHeroSlide.ctaPrimaryText && <button onClick={() => activeHeroSlide.ctaPrimaryLink ? onNavigate(activeHeroSlide.ctaPrimaryLink) : document.getElementById('market-results')?.scrollIntoView({ behavior: 'smooth' })} className="bg-[#1684FF] hover:bg-[#0F6ED8] text-white font-bold text-xs sm:text-sm px-6 py-3 rounded-full transition-colors shadow-lg shadow-[#1684FF]/20">{activeHeroSlide.ctaPrimaryText}</button>}
                    {activeHeroSlide.ctaSecondaryText && <button onClick={() => activeHeroSlide.ctaSecondaryLink ? onNavigate(activeHeroSlide.ctaSecondaryLink) : onNavigate('seller-platform')} className="border border-white/35 hover:border-white/70 text-white font-bold text-xs sm:text-sm px-6 py-3 rounded-full transition-colors">{activeHeroSlide.ctaSecondaryText}</button>}
                  </div>
                  {heroSlides.length > 1 && <div className="flex items-center justify-center gap-2 pt-1">{heroSlides.map((slide, i) => <button key={slide.id} onClick={() => setHeroSlideIndex(i)} className={`h-1.5 rounded-full transition-all ${i === heroSlideIndex ? 'w-6 bg-[#20C4F4]' : 'w-1.5 bg-white/35'}`} aria-label={`Go to slide ${i + 1}`} />)}</div>}
                </div>

                {(heroLayout === 'four-corner' || heroLayout === 'media-right') && (
                  <div className={`hidden sm:grid ${heroLayout === 'four-corner' ? 'lg:grid-cols-1 gap-5' : 'grid-cols-2 gap-4 order-2 lg:order-2'}`}>
                    {[['rightTopImage', 'rightTopLabel'], ['rightBottomImage', 'rightBottomLabel']].map(([imageKey, labelKey]) => {
                      const image = heroMedia[imageKey as keyof typeof heroMedia];
                      const label = heroMedia[labelKey as keyof typeof heroMedia];
                      return image ? <div key={imageKey} className="relative h-28 sm:h-32 lg:h-36 flex items-end justify-center"><img src={image} alt={String(label)} className="max-h-full w-full object-contain drop-shadow-[0_18px_22px_rgba(0,0,0,.4)]" loading="eager" /><span className="absolute bottom-0 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#0B1D3A]/90 px-3 py-1 text-[9px] font-bold text-white shadow-lg">{label}</span></div> : null;
                    })}
                  </div>
                )}

                <div className="sm:hidden col-span-full flex items-center justify-center gap-3 pt-2">
                  {[['leftTopImage', 'leftTopLabel'], ['rightTopImage', 'rightTopLabel']].map(([imageKey, labelKey]) => {
                    const image = heroMedia[imageKey as keyof typeof heroMedia];
                    const label = heroMedia[labelKey as keyof typeof heroMedia];
                    return image ? <div key={imageKey} className="relative h-24 w-[45%] flex items-end justify-center"><img src={image} alt={String(label)} className="max-h-full w-full object-contain drop-shadow-[0_12px_18px_rgba(0,0,0,.35)]" loading="eager" /><span className="absolute bottom-0 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#0B1D3A]/90 px-2.5 py-1 text-[8px] font-bold text-white">{label}</span></div> : null;
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 2. SEARCH BRIDGE - overlaps the hero, real, wired filter fields */}
      {homeConfig.sectionVisibility.searchTrustCard && (
      <div className="relative z-10 -mt-12 w-full px-3 sm:px-5 lg:px-8">
        <div className="w-full bg-white rounded-2xl shadow-xl p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
          <div className="lg:col-span-1 flex flex-col gap-1.5 min-w-0">
            <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Search</label>
            <div className="border border-slate-200 rounded-lg px-3 py-2.5 flex items-center gap-2 bg-[#F8FBFF]">
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
              className={`border border-slate-200 rounded-lg px-3 py-2.5 text-xs bg-[#F8FBFF] outline-none ${showDesktopSidebar ? 'lg:hidden' : ''}`}
            >
              {makes.map((m) => <option key={m} value={m}>{m === 'All' ? 'All Makes' : m}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Price up to</label>
            <select
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="border border-slate-200 rounded-lg px-3 py-2.5 text-xs bg-[#F8FBFF] outline-none"
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
              className="border border-slate-200 rounded-lg px-3 py-2.5 text-xs bg-[#F8FBFF] outline-none"
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
              className="border border-slate-200 rounded-lg px-3 py-2.5 text-xs bg-[#F8FBFF] outline-none"
            >
              {bodyStyles.map((b) => <option key={b} value={b}>{b === 'All' ? 'All Body Styles' : b}</option>)}
            </select>
          </div>
          <button
            onClick={() => document.getElementById('market-results')?.scrollIntoView({ behavior: 'smooth' })}
            className="bg-[#1684FF] hover:bg-[#0F6ED8] text-white font-bold text-xs px-5 py-2.5 rounded-lg transition-colors whitespace-nowrap"
          >
            Filter Vehicles
          </button>
        </div>
      </div>
      )}

      <div className="w-full min-w-0 px-0 pt-5 flex gap-0 lg:gap-4 items-start" id="market-results">
        {/* Left floating ad rail - its own column, never overlapping
            the search/filter/grid content next to it. */}
        <div className="hidden 2xl:block shrink-0 w-16"><FloatingAdRail placement="left_rail" /></div>

        <div className="w-full flex-1 min-w-0 px-3 sm:px-5 lg:px-8 2xl:px-10">
        {/* 4. FILTER SUMMARY CHIPS */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {activeFilters.map((f) => (
              <button
                key={f.id}
                onClick={f.onClear}
                className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:border-[#1684FF] hover:text-[#1684FF] transition-colors"
              >
                {f.label}
                <X className="w-3 h-3" />

              </button>
            ))}
            <button onClick={resetFilters} className={`text-[11px] font-bold ${accent.text600} hover:underline px-1`}>
              Clear all
            </button>
          </div>
        )}

        {/* 5. MARKET HEAD */}
        <div className="mb-5 rounded-2xl border border-[#D7E4F5] bg-white shadow-[0_10px_30px_rgba(11,29,58,0.06)]">
          <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EAF4FF] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#0F6ED8]">
                  <LayoutGrid className="h-3.5 w-3.5" /> Marketplace inventory
                </span>
                <span className="text-[11px] font-semibold text-slate-400">{selectedCounty}</span>
              </div>
              <h2 className="mt-2 flex flex-wrap items-center gap-2 font-display text-xl sm:text-2xl font-bold tracking-[-0.02em] text-[#0B1D3A]">
                Vehicle Inventory
                <span className="inline-flex items-center rounded-full bg-[#EAF4FF] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-[#0F6ED8]">
                  {serverTotal.toLocaleString()} vehicle{serverTotal === 1 ? '' : 's'}
                </span>
              </h2>
              <p className="mt-1 max-w-2xl text-xs sm:text-[13px] leading-relaxed text-slate-500">
                Compare verified marketplace listings, inspection status, pricing and auction availability in one clear view.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-[#F8FBFF] p-1" aria-label="Results per page">
                <span className="px-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Show</span>
                {[12, 24, 48].map((n) => (
                  <button
                    key={n}
                    onClick={() => setPageSize(n)}
                    aria-pressed={pageSize === n}
                    className={`min-w-9 rounded-lg px-2.5 py-2 text-[11px] font-extrabold transition-colors ${pageSize === n ? 'bg-[#0B1D3A] text-white shadow-sm' : 'text-slate-500 hover:bg-white hover:text-[#0B1D3A]'}`}
                  >
                    {n}
                  </button>
                ))}
              </div>

              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Sort</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  aria-label="Sort inventory"
                  className="min-w-[145px] bg-transparent text-xs font-bold text-[#0B1D3A] outline-none"
                >
                  <option value="newest">Newest First</option>
                  <option value="price-asc">Price: low to high</option>
                  <option value="price-desc">Price: high to low</option>
                  <option value="mileage">Lowest mileage</option>
                  <option value="year">Newest model year</option>
                  <option value="most-viewed">Most viewed</option>
                  <option value="auction-ending">Auction ending soon</option>
                </select>
              </label>

              {viewMode === 'grid' && (
                <div className="hidden sm:flex items-center gap-1 rounded-xl border border-slate-200 bg-[#F8FBFF] p-1" aria-label="Grid columns">
                  {[3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setGridColumns(n as 3 | 4 | 5)}
                      aria-pressed={gridColumns === n}
                      className={`min-w-9 rounded-lg px-2 py-2 text-[10px] font-black transition-colors ${gridColumns === n ? 'bg-[#1684FF] text-white' : 'text-slate-500 hover:bg-white hover:text-[#0B1D3A]'}`}
                      title={`${n} columns`}
                    >
                      {n}×
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1" aria-label="Inventory view">
                <button
                  onClick={() => setViewMode('grid')}
                  aria-pressed={viewMode === 'grid'}
                  title="Grid view"
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[10px] font-bold transition-colors ${viewMode === 'grid' ? 'bg-[#EAF4FF] text-[#0F6ED8]' : 'text-slate-400 hover:text-slate-700'}`}
                >
                  <Grid className="w-3.5 h-3.5" /> <span className="hidden xl:inline">Grid</span>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  aria-pressed={viewMode === 'list'}
                  title="List view"
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[10px] font-bold transition-colors ${viewMode === 'list' ? 'bg-[#EAF4FF] text-[#0F6ED8]' : 'text-slate-400 hover:text-slate-700'}`}
                >
                  <ListIcon className="w-3.5 h-3.5" /> <span className="hidden xl:inline">List</span>
                </button>
              </div>

              <button
                onClick={() => setShowDesktopSidebar((s) => !s)}
                className="hidden lg:flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold text-slate-600 hover:border-[#B9D8F8] hover:bg-[#F8FBFF]"
                title="Toggle filter sidebar"
              >
                {showDesktopSidebar ? <PanelLeftClose className="w-3.5 h-3.5" /> : <PanelLeftOpen className="w-3.5 h-3.5" />}
                <span className="hidden 2xl:inline">{showDesktopSidebar ? 'Hide filters' : 'Show filters'}</span>
              </button>

              <button
                onClick={() => setShowMobileFilterDrawer(true)}
                className="lg:hidden flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold text-slate-600"
              >
                <Filter className="w-3.5 h-3.5" /> Filters
              </button>

              {isAdmin && (
                <button onClick={() => setShowAdminPanel(true)} className="flex items-center gap-1.5 rounded-xl bg-[#0B1D3A] px-3 py-2 text-[10px] font-bold text-white shadow-sm hover:bg-[#10284C]" title="Customize Home Page">
                  <Settings className="w-3.5 h-3.5" /> <span>Customize Home Page</span>
                </button>
              )}
              {isAdmin && (
                <button onClick={() => setShowAdManager(true)} className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold text-slate-600 hover:bg-[#F8FBFF]" title="Manage Ads">
                  <Megaphone className="w-3.5 h-3.5" /> <span className="hidden xl:inline">Ads</span>
                </button>
              )}
              {isAdmin && (
                <button onClick={() => setShowHeroEditor(true)} className="flex items-center gap-1.5 rounded-xl border border-[#B9D8F8] bg-[#EAF4FF] px-3 py-2 text-[10px] font-bold text-[#0F6ED8] hover:bg-[#DCEEFF]" title="Edit Hero">
                  <ImageIcon className="w-3.5 h-3.5" /> <span className="hidden xl:inline">Hero</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 6. MARKET BODY: SIDEBAR + RESULTS GRID */}
        <div className={`grid ${showDesktopSidebar ? 'lg:grid-cols-[236px_minmax(0,1fr)]' : 'lg:grid-cols-1'} gap-6 items-start`}>
          {/* SIDEBAR */}
          {showDesktopSidebar && (
          <aside className="hidden lg:block bg-white border border-slate-200 rounded-2xl p-5 sticky top-20">
            <div className="flex items-center justify-between mb-3.5">
              <div>
                <h3 className="text-sm font-extrabold text-[#0B1D3A]">Refine inventory</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Narrow the marketplace without leaving the page.</p>
              </div>
              <button onClick={resetFilters} className="text-[11px] font-bold text-[#1684FF] hover:underline">Reset all</button>
            </div>

            <div className="border-b border-slate-100 py-3.5">
              <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Make</label>
              <select value={selectedMake} onChange={(e) => { setSelectedMake(e.target.value); setSelectedModel('All'); }} className="w-full border border-slate-200 rounded-lg px-2.5 py-2 text-xs bg-[#F8FBFF]">
                {makes.map((m) => <option key={m} value={m}>{m === 'All' ? 'All Makes' : m}</option>)}
              </select>
            </div>

            <div className="border-b border-slate-100 py-3.5">
              <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Model</label>
              <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} className="w-full border border-slate-200 rounded-lg px-2.5 py-2 text-xs bg-[#F8FBFF]">
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
                    className={`border rounded-full px-2.5 py-1 text-[10.5px] font-medium ${maxPrice === c.v ? 'border-[#1684FF] bg-[#EAF4FF] text-[#1684FF]' : 'border-slate-200 text-slate-500'}`}
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
              <select value={selectedBodyStyle} onChange={(e) => setSelectedBodyStyle(e.target.value)} className="w-full border border-slate-200 rounded-lg px-2.5 py-2 text-xs bg-[#F8FBFF]">
                {bodyStyles.map((b) => <option key={b} value={b}>{b === 'All' ? 'All Body Styles' : b}</option>)}
              </select>
            </div>

            <div className="border-b border-slate-100 py-3.5">
              <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Fuel Type</label>
              <select value={selectedFuel} onChange={(e) => setSelectedFuel(e.target.value)} className="w-full border border-slate-200 rounded-lg px-2.5 py-2 text-xs bg-[#F8FBFF]">
                {fuelTypes.map((f) => <option key={f} value={f}>{f === 'All' ? 'All Fuel Types' : f}</option>)}
              </select>
            </div>

            <div className="border-b border-slate-100 py-3.5">
              <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Transmission</label>
              <select value={selectedTransmission} onChange={(e) => setSelectedTransmission(e.target.value)} className="w-full border border-slate-200 rounded-lg px-2.5 py-2 text-xs bg-[#F8FBFF]">
                {transmissionOptions.map((t) => <option key={t} value={t}>{t === 'All' ? 'All Transmissions' : t}</option>)}
              </select>
            </div>

            <div className="border-b border-slate-100 py-3.5">
              <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Seller Type</label>
              <select value={selectedSellerType} onChange={(e) => setSelectedSellerType(e.target.value)} className="w-full border border-slate-200 rounded-lg px-2.5 py-2 text-xs bg-[#F8FBFF]">
                {sellerTypeOptions.map((s) => <option key={s} value={s}>{s === 'All' ? 'All Sellers' : s}</option>)}
              </select>
            </div>

            <button onClick={resetFilters} className="w-full bg-[#0B1D3A] hover:bg-[#10284C] text-white font-bold text-xs rounded-xl py-2.5 mt-3">
              Reset all filters
            </button>

            {sidebarAds.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                {sidebarAds.map((slot) => (
                  <a
                    key={slot.id}
                    href={slot.buttonUrl || undefined}
                    className="block rounded-xl p-3.5 space-y-1.5"
                    style={{ backgroundColor: slot.backgroundColor, color: slot.textColor, opacity: slot.opacity / 100 }}
                  >
                    <span className="text-[9px] font-bold uppercase tracking-widest opacity-70">Advertisement</span>
                    <h5 className="text-xs font-bold leading-snug">{slot.title}</h5>
                    {slot.tagline && <p className="text-[10.5px] opacity-85 leading-snug">{slot.tagline}</p>}
                    {slot.buttonText && <span className="text-[10.5px] font-bold underline underline-offset-2">{slot.buttonText}</span>}
                  </a>
                ))}
              </div>
            )}
          </aside>
          )}

          {/* RESULTS */}
          <div className="min-h-[400px]">
            {isLoading ? (
              <SkeletonGrid count={pageSize} />
            ) : (loadError || serverError) ? (
              <div className="text-center py-16 bg-white border border-dashed border-slate-200 rounded-2xl">
                <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-[#0B1D3A] mb-1">Couldn't load vehicles</h4>
                <p className="text-xs text-slate-500 mb-4">{loadError || serverError}</p>
                {onRetryLoad && !serverError && (
                  <button onClick={onRetryLoad} className="bg-[#0B1D3A] text-white text-xs font-bold rounded-lg px-4 py-2">
                    Try Again
                  </button>
                )}
              </div>
            ) : filteredVehicles.length === 0 ? (
              <div className="text-center py-16 bg-white border border-dashed border-slate-200 rounded-2xl">
                <Search className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-[#0B1D3A] mb-1">No vehicles match your filters</h4>
                <p className="text-xs text-slate-500 mb-4">Try widening your price range or clearing a filter to see more results.</p>
                <button onClick={resetFilters} className="bg-[#0B1D3A] text-white text-xs font-bold rounded-lg px-4 py-2">
                  Reset Filters
                </button>
              </div>
            ) : (
              <div
                data-testid="inventory-grid"
                data-view-mode={viewMode}
                data-columns={viewMode === 'grid' ? gridColumns : undefined}
                className={viewMode === 'grid'
                  ? `grid grid-cols-1 sm:grid-cols-2 ${gridColumnClasses[gridColumns]} ${inventoryDensity.gap}`
                  : `flex flex-col ${inventoryDensity.gap}`
                }
              >
                {onlyAuction === false && paginatedVehicles.some((v) => v.isAuction) === false && filteredVehicles.some((v) => v.isAuction) && viewMode === 'grid' && (
                  <div className="bg-gradient-to-br from-[#0B1D3A] to-[#10284C] rounded-2xl text-white p-5 flex flex-col relative overflow-hidden">
                    <span className="self-start bg-rose-600 text-[10px] font-bold px-2.5 py-1 rounded-md mb-3">🔴 LIVE</span>
                    <h3 className="text-lg font-bold mb-2">Live Vehicle Auctions</h3>
                    <p className="text-xs text-slate-300 mb-4">Bid on quality vehicles from trusted, verified sellers across East Africa.</p>
                    <button onClick={() => onNavigate('discovery')} className="self-start bg-[#1684FF] hover:bg-[#0F6ED8] text-white text-xs font-bold px-4 py-2 rounded-lg mt-auto">
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
                    ? { label: '🔴 Live Auction', cls: 'bg-[#0F6ED8]' }
                    : v.badge
                    ? { label: `★ ${v.badge}`, cls: 'bg-[#0B1D3A]' }
                    : null;
                  return (
                    <article
                      key={v.id}
                      className={`group bg-white border border-[#D7E4F5] rounded-2xl overflow-hidden flex shadow-[0_6px_22px_rgba(11,29,58,0.055)] hover:shadow-[0_14px_34px_rgba(11,29,58,0.12)] hover:-translate-y-0.5 transition-all duration-200 ${viewMode === 'list' ? 'flex-row' : 'flex-col'}`}
                    >
                      <div className={`relative bg-[#EEF4FA] shrink-0 overflow-hidden ${viewMode === 'list' ? 'w-52 sm:w-64' : inventoryDensity.image}`}>
                        {v.images?.[0] ? (
                          <img
                            src={v.images[0]}
                            alt={v.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.035]"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <LayoutGrid className="w-8 h-8" />
                          </div>
                        )}
                        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-2.5">
                          {ribbon ? (
                            <span className={`text-[9px] font-black uppercase tracking-wide px-2 py-1 rounded-full text-white shadow-sm ${ribbon.cls}`}>
                              {ribbon.label}
                            </span>
                          ) : <span />}
                          <button
                            onClick={() => onToggleSave(v.id)}
                            className="w-8 h-8 rounded-full bg-[#0B1D3A]/75 hover:bg-[#0B1D3A] text-white flex items-center justify-center backdrop-blur-sm transition-colors"
                            title={isSaved ? 'Remove from saved' : 'Save vehicle'}
                            aria-label={isSaved ? `Remove ${v.title} from saved vehicles` : `Save ${v.title}`}
                          >
                            <span className="text-base leading-none">{isSaved ? '♥' : '♡'}</span>
                          </button>
                        </div>
                        {v.isAuction && v.currentBid && (
                          <div className="absolute bottom-0 left-0 right-0 bg-[#0B1D3A]/90 backdrop-blur-sm text-white text-[10px] px-3 py-2 flex items-center justify-between gap-2">
                            <span className="font-semibold text-slate-200">Current bid</span>
                            <span className="font-black">{formatPriceM(v.currentBid)}</span>
                          </div>
                        )}
                      </div>

                      <div className={`${inventoryDensity.body} flex-1 flex flex-col min-w-0`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[9px] font-black uppercase tracking-[0.13em] text-[#1684FF] mb-1">{v.isAuction ? 'Live auction' : v.verified ? 'Verified listing' : 'Marketplace listing'}</p>
                            <h4 className={`${inventoryDensity.title} font-extrabold leading-snug tracking-[-0.01em] text-[#0B1D3A] line-clamp-2`}>
                              {v.year} {v.make} {v.model}
                            </h4>
                          </div>
                          {v.verified && <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" aria-label="Verified listing" />}
                        </div>

                        <div className={`mt-2 ${inventoryDensity.price} font-black tracking-tight text-[#0B1D3A]`}>{formatPriceM(v.price)}</div>

                        <div className={`mt-2.5 grid grid-cols-2 gap-x-2 gap-y-1.5 ${inventoryDensity.meta} font-medium text-slate-500`}>
                          <span className="inline-flex items-center gap-1.5 min-w-0"><Gauge className="w-3 h-3 text-[#1684FF] shrink-0" />{v.mileage.toLocaleString()} km</span>
                          <span className="inline-flex items-center gap-1.5 min-w-0"><Fuel className="w-3 h-3 text-[#20C4F4] shrink-0" />{v.fuelType}</span>
                          <span className="inline-flex items-center gap-1.5 min-w-0"><ArrowRightLeft className="w-3 h-3 text-slate-400 shrink-0" />{v.transmission}</span>
                          <span className="inline-flex items-center gap-1.5 min-w-0 truncate"><MapPin className="w-3 h-3 text-slate-400 shrink-0" />{v.location}</span>
                        </div>

                        <div className={`mt-3 rounded-xl border ${v.inspectionPassed ? 'border-emerald-100 bg-emerald-50/70' : 'border-slate-200 bg-[#F8FBFF]'} px-2.5 ${inventoryDensity.detail}`}>
                          {v.inspectionPassed ? (
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700">
                              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                              <span>Inspection report available</span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-2 text-[10px] font-semibold text-slate-500">
                              <span>No inspection report yet</span>
                              <button onClick={() => onNavigate('inspections')} className="text-[#1684FF] font-bold hover:text-[#0F6ED8] whitespace-nowrap">Request →</button>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => handleVehicleSelect(v)}
                          className="mt-3 w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#B9D8F8] bg-white hover:bg-[#EAF4FF] hover:border-[#1684FF]/40 py-2.5 text-[11px] font-extrabold text-[#0F6ED8] transition-colors"
                        >
                          View vehicle details <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {/* PAGINATION */}
            {serverTotalPages > 1 && (
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
        </div>

        {/* Right floating ad rail - its own column, never overlapping
            the grid next to it. */}
        <div className="hidden 2xl:block shrink-0 w-16"><FloatingAdRail placement="right_rail" /></div>
      </div>

      <div className="w-full px-3 sm:px-5 lg:px-7 2xl:px-10">
        {/* 7. CTA BANDS */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4 mt-12 rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-br from-[#10284C] to-[#0B1D3A] text-white p-8 sm:p-10 flex flex-col justify-center gap-4">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#20C4F4]">Buy with more confidence</span>
            <h3 className="text-xl sm:text-2xl font-bold font-display max-w-md">A registered local mechanic inspects it. The report stays on file — for you and every buyer after you.</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-2 text-xs text-slate-300">
              <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />Registered mechanic near the vehicle</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />Pay the mechanic directly</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />Report uploaded to the listing</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />Later buyers can unlock it</div>
            </div>
            <button onClick={() => onNavigate('inspections')} className="self-start bg-[#1684FF] hover:bg-[#0F6ED8] text-white text-sm font-bold px-5 py-2.5 rounded-full mt-1">
              Request an Inspection →
            </button>
          </div>
          <div className="bg-[#F4F8FC] p-8 sm:p-9 flex flex-col justify-center">
            <h4 className="text-lg font-bold text-[#0B1D3A] mb-2 max-w-xs">Ready to sell your vehicle?</h4>
            <p className="text-xs text-slate-600 mb-4 max-w-xs">Reach verified buyers across East Africa through the KAYAD marketplace and escrow network.</p>
            <button onClick={() => onNavigate('seller-platform')} className="self-start bg-[#0B1D3A] hover:bg-[#10284C] text-white text-sm font-bold px-5 py-2.5 rounded-full">
              Sell Your Vehicle →
            </button>
          </div>
        </div>
      </div>

      {/* 8. FLOATING COMPARISON TRAY */}
      {comparedVehicles.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-[#0B1D3A] text-white rounded-2xl shadow-2xl px-5 py-3 flex items-center gap-4">
          <ArrowRightLeft className="w-4 h-4 text-[#20C4F4]" />
          <span className="text-xs font-semibold">{comparedVehicles.length} vehicle{comparedVehicles.length > 1 ? 's' : ''} selected to compare</span>
          <button onClick={onOpenCompareModal} className="bg-[#1684FF] text-white text-xs font-bold px-3 py-1.5 rounded-lg">
            Compare Now
          </button>
        </div>
      )}

      {/* MOBILE FULL-SCREEN FILTER DRAWER */}
      {showMobileFilterDrawer && (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto lg:hidden">
          <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
            <div><h3 className="text-sm font-extrabold text-[#0B1D3A]">Refine inventory</h3><p className="text-[10px] text-slate-400 mt-0.5">Adjust any filter, then return to the results.</p></div>
            <button onClick={() => setShowMobileFilterDrawer(false)} className="p-1.5">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
          <div className="p-4 space-y-4 pb-8">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Make</label>
              <select value={selectedMake} onChange={(e) => { setSelectedMake(e.target.value); setSelectedModel('All'); }} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-[#F8FBFF]">
                {makes.map((m) => <option key={m} value={m}>{m === 'All' ? 'All Makes' : m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Model</label>
              <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-[#F8FBFF]">
                {models.map((m) => <option key={m} value={m}>{m === 'All' ? 'All Models' : m}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Min price</label>
                <input type="number" value={minPrice || ''} onChange={(e) => setMinPrice(Number(e.target.value) || 0)} placeholder="Ksh 50K" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-[#F8FBFF]" />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Max price</label>
                <input type="number" value={maxPrice === 20000000 ? '' : maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value) || 20000000)} placeholder="Ksh 20M" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-[#F8FBFF]" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">From year</label>
                <input type="number" value={minYear === 2005 ? '' : minYear} onChange={(e) => setMinYear(Number(e.target.value) || 2005)} placeholder="2005" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-[#F8FBFF]" />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">To year</label>
                <input type="number" value={maxYear === 2026 ? '' : maxYear} onChange={(e) => setMaxYear(Number(e.target.value) || 2026)} placeholder="2026" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-[#F8FBFF]" />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Body style</label>
              <select value={selectedBodyStyle} onChange={(e) => setSelectedBodyStyle(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-[#F8FBFF]">
                {bodyStyles.map((b) => <option key={b} value={b}>{b === 'All' ? 'All Body Styles' : b}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Fuel type</label>
                <select value={selectedFuel} onChange={(e) => setSelectedFuel(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-[#F8FBFF]">
                  {fuelTypes.map((f) => <option key={f} value={f}>{f === 'All' ? 'All Fuel Types' : f}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Transmission</label>
                <select value={selectedTransmission} onChange={(e) => setSelectedTransmission(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-[#F8FBFF]">
                  {transmissionOptions.map((t) => <option key={t} value={t}>{t === 'All' ? 'All Transmissions' : t}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Seller type</label>
              <select value={selectedSellerType} onChange={(e) => setSelectedSellerType(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-[#F8FBFF]">
                {sellerTypeOptions.map((s) => <option key={s} value={s}>{s === 'All' ? 'All Sellers' : s}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-3 rounded-xl border border-[#D7E4F5] bg-[#F8FBFF] px-3 py-3 text-sm font-semibold text-slate-700">
              <input type="checkbox" checked={onlyAuction} onChange={(e) => setOnlyAuction(e.target.checked)} className="accent-[#1684FF] w-4 h-4" />
              <span><span className="block text-xs font-bold text-[#0B1D3A]">Live auction listings</span><span className="block text-[10px] font-normal text-slate-500 mt-0.5">Show vehicles currently available for bidding.</span></span>
            </label>
            <div className="flex gap-2 pt-2">
              <button onClick={resetFilters} className="flex-1 border border-slate-200 rounded-xl py-3 text-xs font-bold text-slate-600 hover:bg-slate-50">Reset all</button>
              <button onClick={() => setShowMobileFilterDrawer(false)} className="flex-1 bg-[#0B1D3A] hover:bg-[#10284C] text-white rounded-xl py-3 text-xs font-bold">Show results</button>
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

      {isAdmin && showAdManager && (
        <AdManagerPanel onClose={() => setShowAdManager(false)} />
      )}

      {isAdmin && showHeroEditor && (
        <HeroEditorPanel onClose={() => { setShowHeroEditor(false); getVisibleHeroSlides().then((data) => { if (data.length > 0) setHeroSlides(data); }).catch(() => {}); }} />
      )}
    </div>
  );
};

export default VehicleMarketplace;

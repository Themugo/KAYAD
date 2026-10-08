import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Vehicle, UserProfile } from '../../../types';
import VehicleCard from '../../../components/VehicleCard';
import { SlidersHorizontal, Search, RotateCcw, Grid, List as ListIcon, ArrowRightLeft, Filter, X, ChevronLeft, ChevronRight, Gavel, ShieldCheck, CheckCircle2, Lock, Landmark, Clock, Bell, PanelLeftOpen, LayoutGrid, Settings, AlertTriangle, Megaphone, Image as ImageIcon, Gauge, Fuel, MapPin } from 'lucide-react';
import { Select, Button, Card, SkeletonGrid } from '../../../components/ui';
import { isEscrowApplicable } from '../../../utils/escrow';
import MarketingCard, { MarketingCardData } from '../../../components/MarketingCard';
import FloatingAdRail from '../../../components/FloatingAdRail';
import { getVisibleHeroSlides, HeroSlide } from '../../../services/heroApi';
import { adminAPI } from '../../../api/api';
import { getCars, mapBackendCarToVehicle, VehicleApiError, type GetCarsParams } from '../../../services/vehicleApi';
import { getVisibleAdSlots, recordAdEvent, AdSlot } from '../../../services/adApi';
import { useHomePageConfig, ACCENT_THEME_CLASSES } from '../hooks/useHomePageConfig';
import HomePageAdminPanel from './HomePageAdminPanel';
import AdManagerPanel from '../../AdManager/AdManagerPanel';
import HeroEditorPanel from '../../HeroEditor/HeroEditorPanel';
import type { HeroPresentationConfig, HeroShowcaseVehicle } from '../types/heroPresentation';
import { HERO_EXTRAS_DEFAULTS, normalizeHeroExtras } from '../types/heroPresentation';

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
  /** Render the same canonical marketplace grid against the user's saved-vehicle collection only. */
  savedOnly?: boolean;
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
  onNavigate = (_navId: string) => {},
  onOpenAuth,
  user,
  isHomePage = false,
  isLoadingReal,
  loadError,
  onRetryLoad,
  savedOnly = false
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

  // Hero vehicle source: the public marketplace uses the real promoted/featured
  // vehicle feed. Admins can then choose all featured vehicles or a selective
  // subset through the existing platform configuration contract.
  const [heroFeaturedMode, setHeroFeaturedMode] = useState<'all' | 'selected'>('all');
  const [heroFeaturedIds, setHeroFeaturedIds] = useState<string[]>([]);
  const [featuredVehicles, setFeaturedVehicles] = useState<Vehicle[]>([]);
  const DEFAULT_HERO_PRESENTATION: HeroPresentationConfig = {
    stageHeightPct: 100, stageMaxWidthPct: 100, cardScalePct: 80, cardWidthPct: 42, cardOffsetXPct: 0, cardOffsetYPct: 0,
    cardBgOpacityPct: 95, cardBlurPx: 18, cardBorderColor: '#FFFFFF', cardTextColor: 'var(--color-navy-900)',
    backgroundUrl: '/hero/kayad-nairobi-kicc.jpg', backgroundPositionX: 50, backgroundPositionY: 50, backgroundScalePct: 100,
    overlayColor: '#EAF5F7', overlayOpacityPct: 18, secondaryOverlayColor: '#FFFFFF', secondaryOverlayOpacityPct: 10,
    leftOffsetPct: 0, rightOffsetPct: 0, leftVehicleNudgePct: 28, rightVehicleNudgePct: 28, vehicleScalePct: 100, vehicleTopPct: 50, vehicleWidthPct: 43,
    showVehicleInfoCards: true, showVehicleLabels: true, primaryButtonColor: 'var(--kayad-cyan)', secondaryButtonBorderColor: '#C7DAD8',
    arrowEnabled: true, dotsEnabled: true, tickerEnabled: true,
    tickerFallbackText: 'KAYAD · Verified vehicles across East Africa · Live auctions · Transparent bidding · Clear transaction workflows', tickerBackgroundColor: 'var(--color-navy-900)', tickerTextColor: '#FFFFFF', tickerHeightPx: 36, tickerScrollSeconds: 34,
    // Real promoted/featured inventory is the canonical public hero source.
    // Legacy 'showcase' configs are normalized to this source below.
    vehicleSource: 'featured',
    showcaseVehicles: [
      { id: 'showcase-land-cruiser', make: 'Toyota', model: 'Land Cruiser 300', year: 2026, image: '/hero/kayad-land-cruiser-cutout.png', mobileImage: '/hero/kayad-land-cruiser-mobile.webp', eyebrow: 'KAYAD SELECT', tagline: 'Premium SUV · 4WD · Automatic', enabled: true },
      { id: 'showcase-mercedes-gle', make: 'Mercedes-Benz', model: 'GLE', year: 2026, image: '/hero/kayad-mercedes-gle-cutout.png', mobileImage: '/hero/kayad-mercedes-gle-mobile.webp', eyebrow: 'KAYAD SELECT', tagline: 'Luxury SUV · Automatic', enabled: true },
    ],
    floatingCards: [],
    ...HERO_EXTRAS_DEFAULTS,
  };
  const [heroPresentation, setHeroPresentation] = useState<HeroPresentationConfig>(DEFAULT_HERO_PRESENTATION);
  const heroRotationMs = heroPresentation.rotationSeconds > 0 ? Math.round(heroPresentation.rotationSeconds * 1000) : 0;
  const [heroCardContent, setHeroCardContent] = useState<Record<string, { eyebrow?: string; message?: string; detail?: string; ctaLabel?: string; ctaLink?: string }>>({});

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
  // The desktop filter panel is a core marketplace surface and remains visible.
  const showDesktopSidebar = true;
  const [showMobileFilterDrawer, setShowMobileFilterDrawer] = useState<boolean>(false);

  // Admin presentation settings are the default layout. Visitor toolbar
  // controls can still make a temporary local change without changing the
  // saved admin configuration. When an admin changes the presentation in
  // the panel, the live page follows it immediately.
  useEffect(() => {
    setViewMode(homeConfig.inventoryLayout.viewMode);
    setGridColumns(homeConfig.inventoryLayout.columns);
  }, [homeConfig.inventoryLayout.viewMode, homeConfig.inventoryLayout.columns, homeConfig.inventoryLayout.showSidebar]);

  const inventoryDensity = {
    compact: {
      gap: 'gap-3', image: 'h-36 sm:h-40 lg:h-44', body: 'p-3.5 sm:p-4', title: 'text-sm sm:text-[15px]', price: 'text-lg', meta: 'text-[11px] sm:text-xs', detail: 'py-2.5',
    },
    standard: {
      gap: 'gap-4', image: 'h-40 sm:h-44 lg:h-48', body: 'p-4', title: 'text-[15px] sm:text-base', price: 'text-lg sm:text-xl', meta: 'text-xs', detail: 'py-3',
    },
    comfortable: {
      gap: 'gap-5', image: 'h-44 sm:h-48', body: 'p-5', title: 'text-base', price: 'text-xl', meta: 'text-[13px]', detail: 'py-3.5',
    },
  }[homeConfig.inventoryLayout.cardDensity];

  // The selected desktop column count is rendered through a dedicated CSS
  // contract instead of dynamically assembled Tailwind grid classes. This
  // keeps the 3/4/5 control deterministic in production builds and at every
  // responsive breakpoint, while still allowing the mobile/tablet fallbacks.

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
  const [serverRetryKey, setServerRetryKey] = useState(0);
  const isLoading = isLoadingReal || serverLoading;

  // Keep filter options stable while the paginated backend result changes.
  // The current page alone is not a valid source of all selector options;
  // combine the initial authoritative snapshot with the latest server page
  // so a query cannot make previously available options disappear.
  const filterSourceVehicles = useMemo(() => {
    const byId = new Map<string, Vehicle>();
    [...vehicles, ...serverVehicles].forEach((vehicle) => {
      if (vehicle?.id) byId.set(vehicle.id, vehicle);
    });
    return Array.from(byId.values());
  }, [vehicles, serverVehicles]);

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
    if (savedOnly) return;
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
  }, [serverQuery, serverRetryKey, savedOnly]);

  // Saved surface: use the resolved collection supplied by App rather than
  // re-querying the full marketplace. This keeps pagination and authorization
  // boundaries honest while reusing the canonical card/grid implementation.
  useEffect(() => {
    if (!savedOnly) return;
    setServerLoading(false);
    setServerError(null);
    setServerVehicles(vehicles);
    setServerTotal(vehicles.length);
    setServerTotalPages(1);
  }, [savedOnly, vehicles, loadError]);

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
    const list = Array.from(new Set(filterSourceVehicles.map((v) => v.make).filter(Boolean))).sort();
    return ['All', ...list];
  }, [filterSourceVehicles]);

  const models = useMemo(() => {
    const source = selectedMake === 'All'
      ? filterSourceVehicles
      : filterSourceVehicles.filter((v) => v.make.toLowerCase() === selectedMake.toLowerCase());
    const list = Array.from(new Set(source.map((v) => v.model).filter(Boolean))).sort();
    return ['All', ...list];
  }, [filterSourceVehicles, selectedMake]);

  const bodyStyles = useMemo(() => {
    const list = Array.from(new Set(filterSourceVehicles.map((v) => v.bodyStyle).filter(Boolean))).sort();
    return ['All', ...list];
  }, [filterSourceVehicles]);

  const fuelTypes = useMemo(() => {
    const list = Array.from(new Set(filterSourceVehicles.map((v) => v.fuelType).filter(Boolean))).sort();
    return ['All', ...list];
  }, [filterSourceVehicles]);

  const transmissionOptions = ['All', 'Automatic', 'Manual', 'CVT', 'Semi-Automatic'];
  const conditionOptions = ['All', 'Foreign Used', 'Locally Used', 'Brand New'];
  const sellerTypeOptions = ['All', 'Verified Dealer', 'Private Seller'];

  const locations = useMemo(() => {
    const list = Array.from(new Set(filterSourceVehicles.map((v) => v.county || v.location).filter(Boolean))).sort();
    return ['All East Africa', ...list];
  }, [filterSourceVehicles]);

  const availableYears = useMemo(() => {
    const list = Array.from(new Set(filterSourceVehicles.map((v) => v.year).filter((y): y is number => Boolean(y)))).sort((a: number, b: number) => b - a);
    return list;
  }, [filterSourceVehicles]);

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

  // Real featured-vehicle feed for the hero. This uses the same authoritative
  // /api/cars contract as inventory, with featured=true, rather than hardcoded
  // vehicle imagery.
  useEffect(() => {
    if (savedOnly) {
      setFeaturedVehicles([]);
      return;
    }
    let cancelled = false;
    getCars({ page: 1, limit: 100, featured: true, sort: 'newest' })
      .then((res) => {
        if (!cancelled) setFeaturedVehicles(res.cars.map(mapBackendCarToVehicle));
      })
      .catch(() => {
        if (!cancelled) setFeaturedVehicles([]);
      });
    return () => { cancelled = true; };
  }, [savedOnly]);

  // Public config is safe to read and keeps hero selection consistent across
  // visitors/browsers. Admin writes go through the protected config endpoint.
  useEffect(() => {
    let cancelled = false;
    adminAPI.getPublicConfig()
      .then((response: any) => {
        if (cancelled) return;
        const cfg = response?.config || response || {};
        const mode = cfg?.heroFeaturedMode === 'selected' ? 'selected' : 'all';
        const ids = Array.isArray(cfg?.heroCarIds) ? cfg.heroCarIds.filter(Boolean) : [];
        const presentation = cfg?.heroPresentation || {};
        const showcase = Array.isArray(presentation.showcaseVehicles) && presentation.showcaseVehicles.length ? presentation.showcaseVehicles : DEFAULT_HERO_PRESENTATION.showcaseVehicles;
        setHeroFeaturedMode(mode);
        setHeroFeaturedIds(ids);
        setHeroPresentation({
          ...DEFAULT_HERO_PRESENTATION,
          ...presentation,
          stageHeightPct: Math.max(70, Math.min(120, Number(presentation.stageHeightPct) || DEFAULT_HERO_PRESENTATION.stageHeightPct)),
          stageMaxWidthPct: Math.max(90, Math.min(100, Number(presentation.stageMaxWidthPct) || DEFAULT_HERO_PRESENTATION.stageMaxWidthPct)),
          cardScalePct: Math.max(70, Math.min(100, Number(presentation.cardScalePct) || DEFAULT_HERO_PRESENTATION.cardScalePct)),
          cardWidthPct: Math.max(28, Math.min(50, Number(presentation.cardWidthPct) || DEFAULT_HERO_PRESENTATION.cardWidthPct)),
          leftOffsetPct: Math.max(0, Math.min(30, Number(presentation.leftOffsetPct) || DEFAULT_HERO_PRESENTATION.leftOffsetPct)),
          rightOffsetPct: Math.max(0, Math.min(30, Number(presentation.rightOffsetPct) || DEFAULT_HERO_PRESENTATION.rightOffsetPct)),
          leftVehicleNudgePct: Math.max(0, Math.min(25, Number(presentation.leftVehicleNudgePct) || DEFAULT_HERO_PRESENTATION.leftVehicleNudgePct)),
          rightVehicleNudgePct: Math.max(0, Math.min(25, Number(presentation.rightVehicleNudgePct) || DEFAULT_HERO_PRESENTATION.rightVehicleNudgePct)),
          vehicleScalePct: Math.max(75, Math.min(125, Number(presentation.vehicleScalePct) || DEFAULT_HERO_PRESENTATION.vehicleScalePct)),
          vehicleTopPct: Math.max(35, Math.min(65, Number(presentation.vehicleTopPct) || DEFAULT_HERO_PRESENTATION.vehicleTopPct)),
          vehicleWidthPct: Math.max(32, Math.min(48, Number(presentation.vehicleWidthPct) || DEFAULT_HERO_PRESENTATION.vehicleWidthPct)),
          showcaseVehicles: showcase,
          floatingCards: Array.isArray(presentation.floatingCards) ? presentation.floatingCards : [],
          tickerEnabled: presentation.tickerEnabled !== false,
          ...normalizeHeroExtras(presentation),
          vehicleSource: presentation.vehicleSource === 'selected' ? 'selected' : 'featured',
        });
        setHeroCardContent(presentation && typeof cfg?.heroCardContent === 'object' && cfg.heroCardContent ? cfg.heroCardContent : {});
      })
      .catch(() => {
        // Default to all real featured vehicles if public config is unavailable.
      })
      .finally(() => {});
    return () => { cancelled = true; };
  }, []);

  const heroVehicles = useMemo(() => {
    if (!featuredVehicles.length) return [];
    if (heroFeaturedMode === 'selected') {
      const selected = heroFeaturedIds
        .map((id) => featuredVehicles.find((vehicle) => vehicle.id === id))
        .filter((vehicle): vehicle is Vehicle => Boolean(vehicle));
      return selected;
    }
    return featuredVehicles;
  }, [featuredVehicles, heroFeaturedIds, heroFeaturedMode]);

  // Real Featured/Promoted inventory is the only public hero identity source.
  // Admin selection controls which real featured records are shown; legacy
  // showcase rows remain stored only for backward-compatible config reads.
  const heroSourceVehicles = useMemo(() => {
    if (heroPresentation.vehicleSource === 'selected') return heroVehicles.filter((vehicle) => heroFeaturedIds.includes(vehicle.id));
    return heroVehicles;
  }, [heroPresentation.vehicleSource, heroVehicles, heroFeaturedIds]);
  const [heroPairIndex, setHeroPairIndex] = useState(0);
  const [heroPreviousPairIndex, setHeroPreviousPairIndex] = useState(0);
  const [heroTransitioning, setHeroTransitioning] = useState(false);
  const [heroIncomingVisible, setHeroIncomingVisible] = useState(true);

  useEffect(() => {
    setHeroPairIndex(0);
    setHeroPreviousPairIndex(0);
    setHeroTransitioning(false);
    setHeroIncomingVisible(true);
  }, [heroSourceVehicles.map((vehicle) => vehicle.id).join('|')]);

  // Change the pair as a single visual state. The previous pair stays mounted
  // underneath the incoming pair so transparent PNGs never disappear between
  // frames or expose a half-rendered vehicle while the browser swaps sources.
  const changeHeroPair = (nextIndex: number) => {
    const pairCount = Math.max(1, Math.ceil(heroSourceVehicles.length / 2));
    const normalized = ((nextIndex % pairCount) + pairCount) % pairCount;
    if (normalized === heroPairIndex || pairCount < 2) return;
    setHeroPreviousPairIndex(heroPairIndex);
    setHeroPairIndex(normalized);
    setHeroIncomingVisible(false);
    setHeroTransitioning(true);
  };

  useEffect(() => {
    if (!heroTransitioning) return;
    const frame = window.requestAnimationFrame(() => setHeroIncomingVisible(true));
    const timer = window.setTimeout(() => setHeroTransitioning(false), 720);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [heroTransitioning]);

  useEffect(() => {
    // Rotation timing is admin-controlled (0 = no automatic rotation).
    if (heroSourceVehicles.length < 2 || !heroRotationMs) return;
    const timer = window.setInterval(() => {
      const pairCount = Math.max(1, Math.ceil(heroSourceVehicles.length / 2));
      changeHeroPair((heroPairIndex + 1) % pairCount);
    }, heroRotationMs);
    return () => window.clearInterval(timer);
  }, [heroSourceVehicles.length, heroPairIndex, heroRotationMs]);

  const heroLeftVehicle = heroSourceVehicles.length ? heroSourceVehicles[(heroPairIndex * 2) % heroSourceVehicles.length] : undefined;
  const heroRightVehicle = heroSourceVehicles.length > 1
    ? heroSourceVehicles[(heroPairIndex * 2 + 1) % heroSourceVehicles.length]
    : heroLeftVehicle;
  const heroPreviousLeftVehicle = heroSourceVehicles.length ? heroSourceVehicles[(heroPreviousPairIndex * 2) % heroSourceVehicles.length] : undefined;
  const heroPreviousRightVehicle = heroSourceVehicles.length > 1
    ? heroSourceVehicles[(heroPreviousPairIndex * 2 + 1) % heroSourceVehicles.length]
    : heroPreviousLeftVehicle;

  const heroVehicleNarration = (vehicle?: Vehicle) => {
    if (!vehicle) return '';
    const facts = [
      vehicle.badge || (vehicle.isFeatured ? 'Featured vehicle' : ''),
      vehicle.inspectionPassed ? 'Inspection passed' : '',
      vehicle.isDealerCertified ? 'Verified dealer' : '',
      // STAGE 10 FIX: lifecycle-aware, not the bare capability flag — see the
      // identical fix applied to the main inventory grid card below.
      vehicle.auctionLifecycle === 'live' ? 'Live auction'
        : vehicle.auctionLifecycle === 'draft' ? 'Upcoming auction'
        : vehicle.auctionLifecycle === 'ended' ? 'Auction ended' : '',
      vehicle.location ? vehicle.location : '',
    ].filter(Boolean);
    return facts.slice(0, 3).join(' · ');
  };

  // Keep the existing backend hero editor available for CTA copy and admin
  // continuity. Vehicle identity and imagery still come from featured cars.
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([]);
  const [heroSlideIndex, setHeroSlideIndex] = useState(0);
  useEffect(() => {
    let cancelled = false;
    getVisibleHeroSlides()
      .then((data) => { if (!cancelled) setHeroSlides(data); })
      .catch(() => { if (!cancelled) setHeroSlides([]); });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    if (heroSlides.length < 2 || !heroRotationMs) return;
    const timer = setInterval(() => setHeroSlideIndex((index) => (index + 1) % heroSlides.length), heroRotationMs);
    return () => clearInterval(timer);
  }, [heroSlides.length, heroRotationMs]);
  const activeHeroSlide = heroSlides[heroSlideIndex % Math.max(heroSlides.length, 1)];

  const heroEyebrow = activeHeroSlide?.eyebrowText?.trim() || 'KAYAD EA · PREMIUM AUTOMOTIVE MARKETPLACE';
  const heroHeadline = activeHeroSlide?.headline?.trim() || 'Drive Your Dream Today';
  // Single source of truth for hero copy: desktop AND mobile render these, so every admin edit
  // (hero slide eyebrow / headline / subheadline / CTA text, vehicle card content) shows on both.
  const heroEyebrowDisplay = heroEyebrow === 'KAYAD EA · PREMIUM AUTOMOTIVE MARKETPLACE' ? 'KAYAD MARKETPLACE · VERIFIED VEHICLES' : heroEyebrow;
  // Only the canonical default headline gets the designed line break; any admin-authored headline renders exactly as written.
  const heroHeadlineNode: React.ReactNode = heroHeadline === 'Drive Your Dream Today' ? <>Drive Your Dream<br />Today</> : heroHeadline;
  const heroSubheadline = activeHeroSlide?.subheadline?.trim() || 'Discover quality vehicles across East Africa. Find the right car, make your move, and drive with confidence.';
  const KENYA_ROAD_HERO_BACKGROUND = '/hero/kayad-nairobi-kicc.jpg';
  const heroAdminBackgroundUrl = heroPresentation.backgroundUrl || KENYA_ROAD_HERO_BACKGROUND;
  const heroBackgroundStyle: React.CSSProperties = {
    backgroundImage: `url(\"${heroAdminBackgroundUrl}\")`,
    backgroundSize: 'cover',
    backgroundPosition: `${Math.max(0, Math.min(100, Number(heroPresentation.backgroundPositionX) || 50))}% ${Math.max(0, Math.min(100, Number(heroPresentation.backgroundPositionY) || 50))}%`,
    backgroundRepeat: 'no-repeat',
    backgroundColor: '#EAF5F7',
  };

  // Vehicle artwork always comes from the vehicle record/configuration.
  // No vehicle-specific asset mapping lives in the hero component.
  const heroImageForVehicle = (vehicle?: Vehicle) => vehicle?.images?.[0] || vehicle?.image || '';
  // Mobile carousel image: the optional high-resolution mobile asset, else the same image desktop uses.
  const heroMobileImageForVehicle = (vehicle?: Vehicle) => vehicle?.heroMobileImage || heroImageForVehicle(vehicle);

  // Warm the complete hero artwork before it is ever displayed. This is
  // intentionally limited to hero assets so the rest of the marketplace is
  // untouched.
  useEffect(() => {
    // Phones warm only the mobile hero assets; larger screens warm only the desktop ones.
    const isMobileViewport = typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 1023.98px)').matches;
    const urls = heroSourceVehicles.map(isMobileViewport ? heroMobileImageForVehicle : heroImageForVehicle).filter(Boolean);
    urls.forEach((src) => {
      const image = new Image();
      image.decoding = 'async';
      image.src = src;
    });
  }, [heroSourceVehicles]);

  const heroVehicleDetails = (vehicle?: Vehicle) => {
    if (!vehicle) return [];
    return [
      vehicle.year ? String(vehicle.year) : '',
      vehicle.price > 0 ? formatPriceM(vehicle.price) : '',
      vehicle.mileage > 0 ? `${vehicle.mileage.toLocaleString()} km` : '',
      vehicle.fuelType || '',
      vehicle.transmission || '',
      vehicle.bodyStyle || '',
      vehicle.location || '',
    ].filter(Boolean).slice(0, 4);
  };

  const activeHeroCard = heroLeftVehicle ? heroCardContent[heroLeftVehicle.id] : undefined;
  const heroSupportCopy = activeHeroCard?.message || (heroSubheadline === 'Discover quality vehicles across East Africa. Find the right car, make your move, and drive with confidence.' ? 'Verified vehicles, transparent pricing and clear transaction workflows — from discovery to ownership.' : heroSubheadline);
  // CTA labels: vehicle card content first (existing behaviour), then the admin hero slide's own button text, then the default.
  const heroPrimaryLabel = activeHeroCard?.ctaLabel || activeHeroSlide?.ctaPrimaryText?.trim() || 'Explore Vehicles';
  const heroSecondaryLabel = activeHeroSlide?.ctaSecondaryText?.trim() || 'How It Works';
  const heroAuctionMeta = (vehicle?: Vehicle) => {
    if (!vehicle?.isAuction) return '';
    const bid = vehicle.currentBid || vehicle.price || 0;
    const reserve = vehicle.reservePrice || 0;
    const end = vehicle.auctionEndsAt || vehicle.auctionEnds;
    const ending = end ? new Date(end).toLocaleString('en-KE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
    return [
      bid > 0 ? `Standing bid ${formatPriceM(bid)}` : 'Bidding open',
      reserve > 0 ? `Reserve ${formatPriceM(reserve)}` : 'No reserve',
      ending ? `Ends ${ending}` : '',
    ].filter(Boolean).join(' · ');
  };

  const heroCaption = (vehicle?: Vehicle) => {
    if (!vehicle) return '';
    return vehicle.isAuction
      ? heroAuctionMeta(vehicle)
      : heroCardContent[vehicle.id]?.detail || vehicle.description || 'Premium vehicle showcase';
  };

  // Mobile presents ONE featured vehicle at a time (desktop keeps the pair).
  // Same canonical source list; only the presentation differs.
  const [heroMobileIndex, setHeroMobileIndex] = useState(0);
  useEffect(() => { setHeroMobileIndex(0); }, [heroSourceVehicles.map((vehicle) => vehicle.id).join('|')]);
  // Direction of the last change (animation metadata only; the active slide is still heroMobileIndex).
  const heroMobileDirection = useRef<'next' | 'prev'>('next');
  const heroSwipeStart = useRef<{ x: number; y: number } | null>(null);
  const changeHeroMobile = (nextIndex: number) => {
    const count = heroSourceVehicles.length;
    if (count < 2) return;
    const normalized = ((nextIndex % count) + count) % count;
    if (normalized === heroMobileIndex % count) return;
    const forward = (normalized - (heroMobileIndex % count) + count) % count <= count / 2;
    heroMobileDirection.current = forward ? 'next' : 'prev';
    setHeroMobileIndex(normalized);
  };
  const onHeroSwipeStart = (event: React.TouchEvent) => {
    const touch = event.touches[0];
    heroSwipeStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
  };
  const onHeroSwipeEnd = (event: React.TouchEvent) => {
    const start = heroSwipeStart.current;
    heroSwipeStart.current = null;
    const touch = event.changedTouches[0];
    if (!start || !touch) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    // Horizontal, deliberate swipes only; vertical gestures keep scrolling the page.
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    changeHeroMobile(heroMobileIndex + (dx < 0 ? 1 : -1));
  };
  const heroMobileVehicle = heroSourceVehicles.length
    ? heroSourceVehicles[heroMobileIndex % heroSourceVehicles.length]
    : undefined;

  // Desktop lane geometry. Each vehicle owns a lane on its own side of the
  // centre card; admin values are clamped so a lane can never intersect the
  // card, whatever the stored configuration says. This replaces the previous
  // fixed 43% vehicle width + outward nudge, which overlapped the 42%-wide
  // card and was then clipped by the stage overflow boundary.
  const heroLane = (() => {
    const clampNum = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
    const cardVisualPct = clampNum(Number(heroPresentation.cardWidthPct) || 42, 28, 50)
      * clampNum((Number(heroPresentation.cardScalePct) || 80) / 100, 0.7, 1);
    const gutterPct = 2.5;
    const lanePct = Math.max(18, 50 - cardVisualPct / 2 - gutterPct);
    const widthPct = Math.min(clampNum(Number(heroPresentation.vehicleWidthPct) || 43, 32, 48), lanePct);
    const slackPct = Math.max(0, lanePct - widthPct);
    return {
      widthPct,
      leftPct: Math.min(clampNum(Number(heroPresentation.leftOffsetPct) || 0, 0, 30), slackPct),
      rightPct: Math.min(clampNum(Number(heroPresentation.rightOffsetPct) || 0, 0, 30), slackPct),
      // Scale never exceeds 1 so artwork stays inside its lane.
      scale: clampNum((Number(heroPresentation.vehicleScalePct) || 100) / 100, 0.75, 1),
      cardOffsetX: clampNum(Number(heroPresentation.cardOffsetXPct) || 0, -5, 5),
      cardOffsetY: clampNum(Number(heroPresentation.cardOffsetYPct) || 0, -10, 10),
    };
  })();

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

    const biggestSaving = [...serverVehicles]
      .filter((v) => v.marketPriceAvg && v.price < v.marketPriceAvg)
      .sort((a, b) => (b.marketPriceAvg! - b.price) - (a.marketPriceAvg! - a.price))[0];
    if (biggestSaving) picks.push({ vehicle: biggestSaving, reason: 'Biggest Saving' });

    const mostViewed = [...serverVehicles]
      .filter((v) => v.id !== biggestSaving?.id && (v.viewsCount || 0) > 0)
      .sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0))[0];
    if (mostViewed) picks.push({ vehicle: mostViewed, reason: 'Most Viewed' });

    const endingSoon = [...serverVehicles]
      .filter((v) => v.isAuction && v.auctionEndsAt && !picks.some((p) => p.vehicle.id === v.id))
      .sort((a, b) => new Date(a.auctionEndsAt!).getTime() - new Date(b.auctionEndsAt!).getTime())[0];
    if (endingSoon) picks.push({ vehicle: endingSoon, reason: 'Auction Ending Soon' });

    return picks;
  }, [serverVehicles]);

  const homepageLiveAuctionCount = useMemo(
    () => serverVehicles.filter((vehicle) => vehicle.isAuction).length,
    [serverVehicles],
  );
  const homepageEndingSoonCount = useMemo(() => {
    const now = Date.now();
    return serverVehicles.filter((vehicle) => {
      if (!vehicle.isAuction || !vehicle.auctionEndsAt) return false;
      const remaining = new Date(vehicle.auctionEndsAt).getTime() - now;
      return remaining > 0 && remaining <= 30 * 60 * 1000;
    }).length;
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
  // The hero is now a clean two-vehicle editorial fader. Vehicle imagery and
  // narration are derived from real featured listings; no background photo,
  // four-window card collage, or hardcoded vehicle names are used.
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
    <div className="kayad-homepage w-full min-w-0 space-y-0 pb-16">
      {/* TOAST NOTIFICATION FLOATER */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 bg-navy-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-white/20 flex items-center gap-2.5 text-xs font-bold animate-slide-down">
          <Bell className="w-4 h-4 text-[var(--kayad-cyan)] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Redesigned to align the marketplace with the premium hero system:
          graphite #0A3340, slate teal #176B87, teal #13B8A6 and cool
          surfaces. No product features or business rules are introduced;
          this pass is presentation-only and keeps existing data/actions. Every section
          below reuses this component's own real state/logic (filters,
          sort, pagination, saved/compare, admin config) - only the visual
          layer changed, not the data or behavior. */}

      {/* Marketplace discovery shell: compact by design. The marketplace opens directly into the automotive experience rather than a second dashboard-like layer. */}
      <div id="market-journey" className="mx-auto flex w-full max-w-[1480px] items-center justify-between gap-3 px-4 pb-2 pt-4 sm:px-6 lg:px-8">
        <span className="text-[9px] font-black uppercase tracking-[0.22em] text-navy-600 sm:text-[10px]">KAYAD MARKETPLACE · VERIFIED INVENTORY</span>
        <div role="group" aria-label="Marketplace at a glance" className="flex flex-wrap items-center justify-end gap-1.5 text-[9px] font-bold text-slate-500 sm:gap-2 sm:text-[10px]">
          <span className="rounded-full border border-[#D7E7E4] bg-white px-2.5 py-1">{serverError ? (savedOnly ? 'Saved vehicles unavailable' : 'Inventory unavailable') : savedOnly ? `${serverTotal.toLocaleString()} saved` : `${serverTotal.toLocaleString()} vehicles`}</span>
          {savedVehicles.length > 0 && <span className="rounded-full border border-[#D7E7E4] bg-white px-2.5 py-1">{savedVehicles.length} saved</span>}
          {comparedVehicles.length > 0 && <span className="rounded-full border border-[#D7E7E4] bg-white px-2.5 py-1">{comparedVehicles.length} compare</span>}
        </div>
      </div>

      {/* 1. HERO - one continuous commercial composition. */}
      {!savedOnly && homeConfig.sectionVisibility.searchTrustCard && (
        <section className="relative left-1/2 -translate-x-1/2 w-screen overflow-hidden border-b border-[#C7DDDA] bg-[#EAF5F7] text-white">
          <div
            className="absolute inset-0 transition-transform duration-500"
            style={{
              ...heroBackgroundStyle,
              transform: `scale(${Math.max(1, Math.min(1.3, Number(heroPresentation.backgroundScalePct) / 100 || 1))})`,
              transformOrigin: 'center center',
            }}
            aria-hidden="true"
          />
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(90deg, ${heroPresentation.overlayColor} 0%, transparent 50%, ${heroPresentation.overlayColor} 100%)`,
              opacity: Math.max(0, Math.min(100, heroPresentation.overlayOpacityPct)) / 100,
            }}
            aria-hidden="true"
          />
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to top, ${heroPresentation.secondaryOverlayColor}, transparent 60%)`,
              opacity: Math.max(0, Math.min(100, heroPresentation.secondaryOverlayOpacityPct)) / 100,
            }}
            aria-hidden="true"
          />
          {activeHeroSlide && activeHeroSlide.overlayOpacity > 0 && (
            <div
              className="absolute inset-0"
              style={{ backgroundColor: activeHeroSlide.overlayColor || 'var(--color-navy-900)', opacity: Math.max(0, Math.min(100, activeHeroSlide.overlayOpacity)) / 100 }}
              aria-hidden="true"
            />
          )}

          <div
            className="relative mx-auto w-full px-4 sm:px-8 lg:h-[var(--hero-stage-h)] lg:px-10"
            style={{
              maxWidth: `${Math.max(90, Math.min(100, heroPresentation.stageMaxWidthPct))}%`,
              ['--hero-stage-h' as string]: `${Math.round(430 * (Math.max(70, Math.min(120, heroPresentation.stageHeightPct)) / 100))}px`,
            } as React.CSSProperties}
          >
            <div className="relative overflow-hidden lg:h-full">
              {/* Large vehicle subjects stay at full commercial scale; only their position is configurable. */}
              <div className="absolute inset-0 hidden lg:block" aria-label="Featured vehicles">
                {heroLeftVehicle && heroImageForVehicle(heroLeftVehicle) && (
                  <button
                    type="button"
                    onClick={() => handleVehicleSelect(heroLeftVehicle)}
                    className="group absolute z-10 -translate-y-1/2 text-left"
                    style={{
                      top: `${Math.max(35, Math.min(65, heroPresentation.vehicleTopPct))}%`,
                      left: `${heroLane.leftPct}%`,
                      width: `${heroLane.widthPct}%`,
                    }}
                    aria-label={`View ${heroLeftVehicle.make} ${heroLeftVehicle.model}`}
                  >
                    <div className="relative flex h-[360px] items-end justify-center overflow-visible px-1">
                      <img src={heroImageForVehicle(heroLeftVehicle)} alt={`${heroLeftVehicle.year} ${heroLeftVehicle.make} ${heroLeftVehicle.model}`} className="max-h-[98%] max-w-full object-contain object-center select-none drop-shadow-[0_28px_38px_rgba(3,19,27,.40)] transition-transform duration-500 group-hover:-translate-y-1" style={{ transform: `scale(${heroLane.scale})` }} loading="eager" decoding="async" />
                      {heroPresentation.showVehicleInfoCards && (
                        <div className="absolute bottom-5 left-4 max-w-[calc(100%-2rem)] rounded-2xl border border-white/20 bg-[#071F2A]/72 px-3.5 py-2.5 backdrop-blur-md">
                          <div className="text-[8px] font-black uppercase tracking-[.16em] text-[#49D5C6]">{heroCardContent[heroLeftVehicle.id]?.eyebrow || (heroLeftVehicle.auctionLifecycle === 'live' ? 'Live auction' : heroLeftVehicle.auctionLifecycle === 'draft' ? 'Upcoming auction' : heroLeftVehicle.auctionLifecycle === 'ended' ? 'Auction ended' : 'KAYAD SELECT')}</div>
                          <div className="mt-1 truncate text-sm font-black text-white">{heroLeftVehicle.make} {heroLeftVehicle.model}</div>
                          <div className="mt-0.5 text-[9px] text-white/65">{heroLeftVehicle.isAuction ? heroAuctionMeta(heroLeftVehicle) : heroCardContent[heroLeftVehicle.id]?.detail || heroLeftVehicle.description || 'Premium vehicle showcase'}</div>
                        </div>
                      )}
                    </div>
                  </button>
                )}

                {heroRightVehicle && heroImageForVehicle(heroRightVehicle) && (
                  <button
                    type="button"
                    onClick={() => handleVehicleSelect(heroRightVehicle)}
                    className="group absolute z-10 -translate-y-1/2 text-right"
                    style={{
                      top: `${Math.max(35, Math.min(65, heroPresentation.vehicleTopPct))}%`,
                      right: `${heroLane.rightPct}%`,
                      width: `${heroLane.widthPct}%`,
                    }}
                    aria-label={`View ${heroRightVehicle.make} ${heroRightVehicle.model}`}
                  >
                    <div className="relative flex h-[360px] items-end justify-center overflow-visible px-1">
                      <img src={heroImageForVehicle(heroRightVehicle)} alt={`${heroRightVehicle.year} ${heroRightVehicle.make} ${heroRightVehicle.model}`} className="max-h-[98%] max-w-full object-contain object-center select-none drop-shadow-[0_28px_38px_rgba(3,19,27,.40)] transition-transform duration-500 group-hover:-translate-y-1" style={{ transform: `scale(${heroLane.scale})` }} loading="eager" decoding="async" />
                      {heroPresentation.showVehicleInfoCards && (
                        <div className="absolute bottom-5 right-4 max-w-[calc(100%-2rem)] rounded-2xl border border-white/20 bg-[#071F2A]/72 px-3.5 py-2.5 text-left backdrop-blur-md">
                          <div className="text-[8px] font-black uppercase tracking-[.16em] text-[#49D5C6]">{heroCardContent[heroRightVehicle.id]?.eyebrow || (heroRightVehicle.auctionLifecycle === 'live' ? 'Live auction' : heroRightVehicle.auctionLifecycle === 'draft' ? 'Upcoming auction' : heroRightVehicle.auctionLifecycle === 'ended' ? 'Auction ended' : 'KAYAD SELECT')}</div>
                          <div className="mt-1 truncate text-sm font-black text-white">{heroRightVehicle.make} {heroRightVehicle.model}</div>
                          <div className="mt-0.5 text-[9px] text-white/65">{heroRightVehicle.isAuction ? heroAuctionMeta(heroRightVehicle) : heroCardContent[heroRightVehicle.id]?.detail || heroRightVehicle.description || 'Premium vehicle showcase'}</div>
                        </div>
                      )}
                    </div>
                  </button>
                )}

                <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                  <div
                    className="pointer-events-auto origin-center transition-transform duration-300"
                    style={{
                      width: `${Math.max(28, Math.min(50, heroPresentation.cardWidthPct))}%`,
                      transform: `translate(${heroLane.cardOffsetX}%, ${heroLane.cardOffsetY}%) scale(${Math.max(0.7, Math.min(1, heroPresentation.cardScalePct / 100))})`,
                    }}
                  >
                    <div
                      className="rounded-[30px] p-7 text-center shadow-[0_30px_80px_rgba(3,19,27,.24)]"
                      style={{
                        backgroundColor: `rgba(255,255,255,${Math.max(0, Math.min(100, heroPresentation.cardBgOpacityPct)) / 100})`,
                        border: `1px solid ${heroPresentation.cardBorderColor}`,
                        color: heroPresentation.cardTextColor,
                        backdropFilter: `blur(${Math.max(0, Math.min(40, heroPresentation.cardBlurPx))}px)`,
                      }}
                    >
                      <span className="inline-flex items-center gap-2 rounded-full border border-[#B8D9D6] bg-[#F5FBFA] px-3 py-1.5 text-[10px] font-black uppercase tracking-[.18em] text-navy-600"><span className="h-1.5 w-1.5 rounded-full bg-[var(--kayad-cyan)]" />{heroEyebrowDisplay}</span>
                      <div className="mt-5 flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-[.2em] text-[#5F7B86]"><span className="h-px w-9 bg-[var(--kayad-cyan)]" /> MOVE WITH CONFIDENCE <span className="h-px w-9 bg-[var(--kayad-cyan)]" /></div>
                      <h1 className="mt-4 font-display text-[clamp(2rem,3.4vw,3.25rem)] font-black leading-[1.02] tracking-[-.045em]">{heroHeadlineNode}</h1>
                      <p className="mx-auto mt-4 max-w-[430px] text-sm font-medium leading-6 text-[#58717B]">{heroSupportCopy}</p>
                      <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
                        <button onClick={() => activeHeroSlide?.ctaPrimaryLink ? onNavigate(activeHeroSlide.ctaPrimaryLink) : document.getElementById('market-results')?.scrollIntoView({ behavior: 'smooth' })} style={{ backgroundColor: heroPresentation.primaryButtonColor }} className="inline-flex items-center rounded-full px-6 py-3 text-xs font-black text-[#07313D] shadow-[0_12px_28px_rgba(19,184,166,.22)]">{heroPrimaryLabel} <ChevronRight className="ml-1 h-4 w-4" /></button>
                        <button onClick={() => activeHeroSlide?.ctaSecondaryLink ? onNavigate(activeHeroSlide.ctaSecondaryLink) : document.getElementById('market-journey')?.scrollIntoView({ behavior: 'smooth', block: 'center' })} style={{ borderColor: heroPresentation.secondaryButtonBorderColor }} className="inline-flex items-center rounded-full border bg-white px-6 py-3 text-xs font-black text-navy-900 shadow-sm">{heroSecondaryLabel} <span className="ml-2 text-sm">▶</span></button>
                      </div>
                      <dl className="mt-6 grid grid-cols-4 border-t border-[#D7E7E4] pt-5">
                        {[['VERIFIED','Listings'],['INSPECTED','Vehicles'],['PROTECTED','Transactions'],['EAST AFRICA','Marketplace']].map(([a,b]) => <div key={a}><dt className="text-[8px] font-black uppercase tracking-[.13em] text-navy-600">{a}</dt><dd className="mt-1 text-[9px] text-[#6D858D]">{b}</dd></div>)}
                      </dl>
                    </div>
                  </div>
                </div>

                {heroPresentation.floatingCards.filter((card) => card.enabled !== false).map((card) => {
                  const cardBody = (
                    <div className="rounded-2xl border px-3.5 py-3 shadow-xl backdrop-blur-xl" style={{ width: `${Math.max(12, Math.min(35, card.widthPct || 18))}%`, backgroundColor: card.backgroundColor || 'rgba(7,31,42,.78)', color: card.textColor || '#FFFFFF', borderColor: card.borderColor || 'rgba(255,255,255,.18)', opacity: Math.max(0.5, Math.min(1, (card.opacityPct ?? 100) / 100)), backdropFilter: `blur(${Math.max(0, Math.min(24, card.blurPx ?? 12))}px)` }}>
                      {card.eyebrow && <div className="text-[8px] font-black uppercase tracking-[.16em] text-[#49D5C6]">{card.eyebrow}</div>}
                      <div className="mt-1 text-xs font-black">{card.title}</div>
                      {card.body && <div className="mt-1 text-[10px] opacity-75">{card.body}</div>}
                      {card.ctaLabel && <div className="mt-2 text-[9px] font-black uppercase tracking-wide text-[#49D5C6]">{card.ctaLabel} →</div>}
                    </div>
                  );
                  return card.ctaLink ? <a key={card.id} href={card.ctaLink} className="absolute z-25" style={{ left: `${card.leftPct ?? 5}%`, top: `${card.topPct ?? 10}%` }}>{cardBody}</a> : <div key={card.id} className="absolute z-25" style={{ left: `${card.leftPct ?? 5}%`, top: `${card.topPct ?? 10}%` }}>{cardBody}</div>;
                })}

                {heroPresentation.arrowEnabled && <button type="button" onClick={() => changeHeroPair(heroPairIndex - 1)} className="absolute left-3 top-1/2 z-30 -translate-y-1/2 rounded-full border border-white/35 bg-white/85 p-3 text-navy-900 shadow-xl backdrop-blur-md" aria-label="Previous featured vehicles"><ChevronLeft className="h-5 w-5" /></button>}
                {heroPresentation.arrowEnabled && <button type="button" onClick={() => changeHeroPair(heroPairIndex + 1)} className="absolute right-3 top-1/2 z-30 -translate-y-1/2 rounded-full border border-white/35 bg-white/85 p-3 text-navy-900 shadow-xl backdrop-blur-md" aria-label="Next featured vehicles"><ChevronRight className="h-5 w-5" /></button>}
              </div>

              <div className="relative pb-4 pt-4 lg:hidden" aria-label="KAYAD mobile hero">
                <div className="rounded-[26px] border border-white/70 bg-white/95 px-5 py-5 text-center shadow-[0_24px_55px_rgba(3,19,27,.20)] backdrop-blur-xl">
                  <span className="inline-flex items-center gap-2 rounded-full border border-[#B8D9D6] bg-[#F5FBFA] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.14em] text-navy-600"><span className="h-1.5 w-1.5 rounded-full bg-[var(--kayad-cyan)]" />{heroEyebrowDisplay}</span>
                  <h1 className="mt-3 font-display text-[clamp(1.85rem,8vw,2.45rem)] font-black leading-[1.02] tracking-[-.045em] text-navy-900">{heroHeadlineNode}</h1>
                  <p className="mx-auto mt-2.5 max-w-[320px] text-[13px] font-medium leading-5 text-[#58717B]">{heroSupportCopy}</p>
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <button onClick={() => activeHeroSlide?.ctaPrimaryLink ? onNavigate(activeHeroSlide.ctaPrimaryLink) : document.getElementById('market-results')?.scrollIntoView({ behavior: 'smooth' })} style={{ backgroundColor: heroPresentation.primaryButtonColor }} className="inline-flex min-h-[44px] items-center rounded-full px-5 text-[12px] font-black text-[#07313D] shadow-[0_10px_22px_rgba(19,184,166,.22)]">{heroPrimaryLabel} <ChevronRight className="ml-1 h-3.5 w-3.5" /></button>
                    <button onClick={() => activeHeroSlide?.ctaSecondaryLink ? onNavigate(activeHeroSlide.ctaSecondaryLink) : document.getElementById('market-journey')?.scrollIntoView({ behavior: 'smooth', block: 'center' })} style={{ borderColor: heroPresentation.secondaryButtonBorderColor }} className="inline-flex min-h-[44px] items-center rounded-full border bg-white px-5 text-[12px] font-black text-navy-900 shadow-sm">{heroSecondaryLabel} <span className="ml-1.5 text-xs">▶</span></button>
                  </div>
                </div>

                {heroMobileVehicle && heroImageForVehicle(heroMobileVehicle) && (
                  <div className="mt-3" role="group" aria-roledescription="carousel" aria-label="Featured vehicles">
                    {/* ONE complete vehicle at a time, full width, never cropped (object-contain). */}
                    <div
                      className="relative flex w-full items-center justify-center overflow-x-clip"
                      style={{ touchAction: 'pan-y', height: `clamp(${heroPresentation.mobileStageMinPx}px, 52vw, ${heroPresentation.mobileStageMaxPx}px)` }}
                      onTouchStart={onHeroSwipeStart}
                      onTouchEnd={onHeroSwipeEnd}
                    >
                      <button
                        key={heroMobileVehicle.id}
                        type="button"
                        onClick={() => handleVehicleSelect(heroMobileVehicle)}
                        className="kayad-hero-mobile-slide flex h-full w-full items-center justify-center"
                        data-direction={heroMobileDirection.current}
                        style={{ ['--kayad-hero-slide-ms' as string]: `${heroPresentation.mobileTransitionMs}ms` }}
                        aria-label={`View ${heroMobileVehicle.make} ${heroMobileVehicle.model}`}
                      >
                        <picture className="contents">
                          {/* Phones/tablets (<1024px) get the high-resolution mobile asset; desktop never downloads it. */}
                          {heroMobileVehicle.heroMobileImage && <source media="(max-width: 1023.98px)" srcSet={heroMobileVehicle.heroMobileImage} type={heroMobileVehicle.heroMobileImage.toLowerCase().endsWith('.webp') ? 'image/webp' : undefined} />}
                          <img src={heroImageForVehicle(heroMobileVehicle)} alt={`${heroMobileVehicle.year} ${heroMobileVehicle.make} ${heroMobileVehicle.model}`} width={1021} height={634} className="h-full w-full object-contain drop-shadow-[0_18px_24px_rgba(3,19,27,.35)]" loading="eager" decoding="async" />
                        </picture>
                      </button>
                    </div>

                    {/* Controls sit BELOW the vehicle so they can never cover the car at any width. */}
                    {heroSourceVehicles.length > 1 && (heroPresentation.arrowEnabled || heroPresentation.dotsEnabled) && (
                      <div className="mt-1 flex items-center justify-center gap-4" aria-label="Featured vehicle controls">
                        {heroPresentation.arrowEnabled && (
                          <button type="button" onClick={() => changeHeroMobile(heroMobileIndex - 1)} className="grid h-11 w-11 place-items-center rounded-full border border-white/25 bg-navy-900/80 text-white shadow-lg backdrop-blur-md min-[360px]:h-11 max-[359px]:h-10 max-[359px]:w-10" aria-label="Previous featured vehicle"><ChevronLeft className="h-5 w-5" aria-hidden="true" /></button>
                        )}
                        {heroPresentation.dotsEnabled && (
                          <div className="flex items-center" aria-label="Featured vehicle slides">
                            {heroSourceVehicles.map((vehicle, index) => (
                              <button key={vehicle.id} type="button" onClick={() => changeHeroMobile(index)} aria-label={`Show featured vehicle ${index + 1}`} aria-current={index === heroMobileIndex % heroSourceVehicles.length ? 'true' : undefined} className="grid h-11 w-7 place-items-center">
                                <span className={`h-2 rounded-full transition-all ${index === heroMobileIndex % heroSourceVehicles.length ? 'w-6 bg-[var(--kayad-cyan)]' : 'w-2 bg-navy-900/35'}`} />
                              </button>
                            ))}
                          </div>
                        )}
                        {heroPresentation.arrowEnabled && (
                          <button type="button" onClick={() => changeHeroMobile(heroMobileIndex + 1)} className="grid h-11 w-11 place-items-center rounded-full border border-white/25 bg-navy-900/80 text-white shadow-lg backdrop-blur-md max-[359px]:h-10 max-[359px]:w-10" aria-label="Next featured vehicle"><ChevronRight className="h-5 w-5" aria-hidden="true" /></button>
                        )}
                      </div>
                    )}

                    <div className="mt-2 rounded-2xl border border-white/20 bg-[#071F2A]/88 px-3.5 py-3 shadow-xl backdrop-blur-md">
                      <div className="min-w-0 text-left" aria-live="polite">
                        <div className="text-[10px] font-bold uppercase tracking-[.14em] text-[#49D5C6]">{heroCardContent[heroMobileVehicle.id]?.eyebrow || (heroMobileVehicle.isAuction ? 'LIVE AUCTION' : heroMobileVehicle.badge || 'KAYAD SELECT')}</div>
                        <div className="mt-0.5 truncate text-sm font-bold text-white">{heroMobileVehicle.make} {heroMobileVehicle.model}</div>
                        {/* Canonical caption: admin tagline for showcase vehicles, real auction meta for auctions. */}
                        <div className="mt-0.5 truncate text-[11px] text-white/70">{heroCaption(heroMobileVehicle)}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {heroPresentation.dotsEnabled && heroSourceVehicles.length > 1 && (
                <div className="absolute bottom-4 left-1/2 z-30 hidden -translate-x-1/2 items-center gap-1.5 rounded-full border border-white/15 bg-[#071F2A]/65 lg:flex px-3 py-1.5 backdrop-blur-md" aria-label="Featured vehicle slides">
                  {Array.from({ length: Math.ceil(heroSourceVehicles.length / 2) }).map((_, index) => <button key={index} type="button" onClick={() => changeHeroPair(index)} aria-label={`Show featured pair ${index + 1}`} className={`h-1.5 rounded-full transition-all ${index === heroPairIndex ? 'w-6 bg-[var(--kayad-cyan)]' : 'w-1.5 bg-white/45 hover:bg-white/80'}`} />)}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Marketplace categories: the visual bridge from hero to inventory, matching the original discovery concept without adding a second dashboard. */}
      {!savedOnly && <section className="border-y border-[#D7E7E4] bg-white" aria-label="Vehicle categories">
        <div className="mx-auto flex max-w-[1480px] items-center gap-2 overflow-x-auto px-4 py-3 sm:px-6 lg:px-8">
          {[
            ['All', () => { setSelectedBodyStyle('All'); setSelectedFuel('All'); }],
            ['SUV', () => setSelectedBodyStyle('SUV')],
            ['Sedan', () => setSelectedBodyStyle('Sedan')],
            ['Pickup', () => setSelectedBodyStyle('Pickup')],
            ['Hatchback', () => setSelectedBodyStyle('Hatchback')],
            ['Truck', () => setSelectedBodyStyle('Truck')],
            ['Electric', () => setSelectedFuel('Electric')],
            ['Hybrid', () => setSelectedFuel('Hybrid')],
          ].map(([label, action]) => (
            <button
              key={label as string}
              aria-pressed={
                label === 'All' ? selectedBodyStyle === 'All' && selectedFuel === 'All'
                : label === 'Electric' || label === 'Hybrid' ? selectedFuel === label
                : selectedBodyStyle === label
              }
              type="button"
              onClick={action as () => void}
              className={`shrink-0 rounded-full border px-4 py-2 text-[11px] font-extrabold transition ${(label === 'All' ? selectedBodyStyle === 'All' && selectedFuel === 'All' : label === 'Electric' || label === 'Hybrid' ? selectedFuel === label : selectedBodyStyle === label) ? 'border-navy-600 bg-navy-600 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-navy-600 hover:text-navy-600'}`}
            >
              {label as string}
            </button>
          ))}
          <button type="button" onClick={() => document.getElementById('market-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="ml-auto hidden shrink-0 items-center gap-1 text-[11px] font-extrabold text-navy-600 lg:flex">
            View all vehicles <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </section>}

      {/* 2. SEARCH BRIDGE - overlaps the hero, real, wired filter fields */}
      {!savedOnly && homeConfig.sectionVisibility.searchTrustCard && (
      <div className="kayad-search-bridge relative z-10 -mt-10 w-full px-3 sm:-mt-12 sm:px-5 lg:px-8">
        <div className="w-full rounded-2xl border border-[#D7E7E4] bg-white p-3.5 shadow-[0_18px_45px_rgba(11,29,58,.10)] sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
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
              aria-label="Hero make filter"
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
              aria-label="Hero maximum price filter"
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
              aria-label="Hero year filter"
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
              aria-label="Hero body style filter"
              className="border border-slate-200 rounded-lg px-3 py-2.5 text-xs bg-[#F8FBFF] outline-none"
            >
              {bodyStyles.map((b) => <option key={b} value={b}>{b === 'All' ? 'All Body Styles' : b}</option>)}
            </select>
          </div>
          <button
            onClick={() => document.getElementById('market-results')?.scrollIntoView({ behavior: 'smooth' })}
            className="bg-navy-600 hover:bg-navy-700 text-white font-bold text-xs px-5 py-2.5 rounded-lg transition-colors whitespace-nowrap"
          >
            Filter Vehicles
          </button>
        </div>
      </div>
      )}

      {!savedOnly && featuredPicks.length > 0 && !serverError && (
        <section className="mx-auto w-full max-w-[1480px] px-4 pt-7 sm:px-6 lg:px-8" aria-labelledby="featured-vehicles-heading">
          <div className="mb-3 flex items-end justify-between gap-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-navy-600">KAYAD SELECT</span>
              <h2 id="featured-vehicles-heading" className="mt-1 font-display text-xl font-black tracking-[-0.025em] text-navy-900">Featured vehicles</h2>
              <p className="mt-0.5 text-xs text-slate-500">Real listings worth a closer look, selected from the live catalogue.</p>
            </div>
            <button type="button" onClick={() => document.getElementById('market-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="hidden text-[11px] font-extrabold text-navy-600 sm:block">View all →</button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featuredPicks.map(({ vehicle, reason }) => (
              <div key={vehicle.id} className="relative">
                <span className="absolute left-3 top-3 z-20 rounded-full border border-white/30 bg-navy-900/85 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-[#BDF5EE] shadow-md backdrop-blur">{reason}</span>
                <VehicleCard
                  vehicle={vehicle}
                  isSaved={savedVehicles.includes(vehicle.id)}
                  isCompared={comparedVehicles.includes(vehicle.id)}
                  onToggleSave={onToggleSave}
                  onToggleCompare={onToggleCompare}
                  onQuickView={handleVehicleSelect}
                  onStartEscrow={onStartEscrow}
                />
              </div>
            ))}
          </div>
        </section>
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
                className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:border-navy-600 hover:text-navy-600 transition-colors"
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
        <div className="kayad-market-toolbar mb-5 rounded-2xl border border-[#D7E7E4] bg-white shadow-[0_10px_30px_rgba(11,29,58,0.06)]">
          <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#DDF4F0] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-navy-700">
                  <LayoutGrid className="h-3.5 w-3.5" /> Marketplace inventory
                </span>
                <span className="text-[11px] font-semibold text-slate-400">{selectedCounty}</span>
              </div>
              <h2 className="mt-2 flex flex-wrap items-center gap-2 font-display text-xl sm:text-2xl font-bold tracking-[-0.02em] text-navy-900">
                Vehicle Inventory
                {!isLoading && (
                  <span className="inline-flex items-center rounded-full bg-[#DDF4F0] px-2.5 py-1 text-[11px] font-bold tracking-[0.02em] text-navy-700">
                    {serverError || loadError ? 'Inventory unavailable' : `${serverTotal.toLocaleString()} vehicle${serverTotal === 1 ? '' : 's'}`}
                  </span>
                )}
              </h2>
              <p className="mt-1 max-w-2xl text-xs sm:text-[13px] leading-relaxed text-slate-500">
                Compare verified marketplace listings, inspection status, pricing and auction availability in one clear view.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="kayad-toolbar-control flex h-10 items-center gap-1 rounded-xl border border-slate-200 bg-[#F8FBFF] p-1" aria-label="Results per page">
                <span className="px-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Show</span>
                {[12, 24, 48].map((n) => (
                  <button
                    key={n}
                    onClick={() => setPageSize(n)}
                    aria-pressed={pageSize === n}
                    className={`h-8 min-w-9 rounded-lg px-2.5 text-[11px] font-bold transition-colors ${pageSize === n ? 'bg-navy-900 text-white shadow-sm' : 'text-slate-500 hover:bg-white hover:text-navy-900'}`}
                  >
                    {n}
                  </button>
                ))}
              </div>

              <label className="kayad-toolbar-control flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 focus-within:border-navy-600">
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Sort</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  aria-label="Sort inventory"
                  className="min-w-[145px] bg-transparent text-xs font-bold text-navy-900 outline-none"
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
                <div className="kayad-toolbar-control hidden h-10 items-center gap-1 rounded-xl border border-slate-200 bg-[#F8FBFF] p-1 md:flex" aria-label="Desktop grid columns">
                  {[3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setGridColumns(n as 3 | 4 | 5)}
                      aria-pressed={gridColumns === n}
                      className={`h-8 min-w-9 rounded-lg px-2 text-[11px] font-bold transition-colors ${gridColumns === n ? 'bg-navy-600 text-white' : 'text-slate-500 hover:bg-white hover:text-navy-900'}`}
                      title={`${n} columns`}
                      aria-label={`${n}×`}
                    >
                      <span className="hidden sm:inline">{n} columns</span><span className="sm:hidden">{n}×</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="kayad-toolbar-control flex h-10 items-center rounded-xl border border-slate-200 bg-white p-1" aria-label="Inventory view">
                <button
                  onClick={() => setViewMode('grid')}
                  aria-pressed={viewMode === 'grid'}
                  title="Grid view"
                  className={`flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-bold transition-colors ${viewMode === 'grid' ? 'bg-[#DDF4F0] text-navy-700' : 'text-slate-400 hover:text-slate-700'}`}
                >
                  <Grid className="w-3.5 h-3.5" /> <span className="hidden xl:inline">Grid</span>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  aria-pressed={viewMode === 'list'}
                  title="List view"
                  className={`flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-bold transition-colors ${viewMode === 'list' ? 'bg-[#DDF4F0] text-navy-700' : 'text-slate-400 hover:text-slate-700'}`}
                >
                  <ListIcon className="w-3.5 h-3.5" /> <span className="hidden xl:inline">List</span>
                </button>
              </div>



              <button
                onClick={() => setShowMobileFilterDrawer(true)}
                className="lg:hidden flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-bold text-slate-600"
              >
                <Filter className="w-3.5 h-3.5" /> Filters
              </button>

              {isAdmin && (
                <button onClick={() => setShowAdminPanel(true)} className="flex items-center gap-1.5 rounded-xl bg-navy-900 px-3 py-2 text-[10px] font-bold text-white shadow-sm hover:bg-navy-700" title="Customize Home Page">
                  <Settings className="w-3.5 h-3.5" /> <span>Customize Home Page</span>
                </button>
              )}
              {isAdmin && (
                <button onClick={() => setShowAdManager(true)} className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold text-slate-600 hover:bg-[#F8FBFF]" title="Manage Ads">
                  <Megaphone className="w-3.5 h-3.5" /> <span className="hidden xl:inline">Ads</span>
                </button>
              )}
              {isAdmin && (
                <button onClick={() => setShowHeroEditor(true)} className="flex items-center gap-1.5 rounded-xl border border-[#B8D9D6] bg-[#DDF4F0] px-3 py-2 text-[10px] font-bold text-navy-700 hover:bg-[#D9EFEC]" title="Edit Hero">
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
                <h3 className="text-sm font-extrabold text-navy-900">Refine inventory</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Narrow the marketplace without leaving the page.</p>
              </div>
              <button onClick={resetFilters} className="text-[11px] font-bold text-navy-600 hover:underline">Reset all</button>
            </div>

            <div className="border-b border-slate-100 py-3.5">
              <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Make</label>
              <select aria-label="Sidebar make filter" value={selectedMake} onChange={(e) => { setSelectedMake(e.target.value); setSelectedModel('All'); }} className="w-full border border-slate-200 rounded-lg px-2.5 py-2 text-xs bg-[#F8FBFF]">
                {makes.map((m) => <option key={m} value={m}>{m === 'All' ? 'All Makes' : m}</option>)}
              </select>
            </div>

            <div className="border-b border-slate-100 py-3.5">
              <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Model</label>
              <select aria-label="Sidebar model filter" value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} className="w-full border border-slate-200 rounded-lg px-2.5 py-2 text-xs bg-[#F8FBFF]">
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
                    className={`border rounded-full px-2.5 py-1 text-[10.5px] font-medium ${maxPrice === c.v ? 'border-navy-600 bg-[#DDF4F0] text-navy-600' : 'border-slate-200 text-slate-500'}`}
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
              <select aria-label="Sidebar body style filter" value={selectedBodyStyle} onChange={(e) => setSelectedBodyStyle(e.target.value)} className="w-full border border-slate-200 rounded-lg px-2.5 py-2 text-xs bg-[#F8FBFF]">
                {bodyStyles.map((b) => <option key={b} value={b}>{b === 'All' ? 'All Body Styles' : b}</option>)}
              </select>
            </div>

            <div className="border-b border-slate-100 py-3.5">
              <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Fuel Type</label>
              <select aria-label="Sidebar fuel filter" value={selectedFuel} onChange={(e) => setSelectedFuel(e.target.value)} className="w-full border border-slate-200 rounded-lg px-2.5 py-2 text-xs bg-[#F8FBFF]">
                {fuelTypes.map((f) => <option key={f} value={f}>{f === 'All' ? 'All Fuel Types' : f}</option>)}
              </select>
            </div>

            <div className="border-b border-slate-100 py-3.5">
              <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Transmission</label>
              <select aria-label="Sidebar transmission filter" value={selectedTransmission} onChange={(e) => setSelectedTransmission(e.target.value)} className="w-full border border-slate-200 rounded-lg px-2.5 py-2 text-xs bg-[#F8FBFF]">
                {transmissionOptions.map((t) => <option key={t} value={t}>{t === 'All' ? 'All Transmissions' : t}</option>)}
              </select>
            </div>

            <div className="border-b border-slate-100 py-3.5">
              <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Seller Type</label>
              <select aria-label="Sidebar seller type filter" value={selectedSellerType} onChange={(e) => setSelectedSellerType(e.target.value)} className="w-full border border-slate-200 rounded-lg px-2.5 py-2 text-xs bg-[#F8FBFF]">
                {sellerTypeOptions.map((s) => <option key={s} value={s}>{s === 'All' ? 'All Sellers' : s}</option>)}
              </select>
            </div>

            <button onClick={resetFilters} className="w-full bg-navy-900 hover:bg-navy-700 text-white font-bold text-xs rounded-xl py-2.5 mt-3">
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
          <div className="kayad-inventory-results min-h-[400px] min-w-0">
            {isLoading ? (
              <SkeletonGrid count={pageSize} />
            ) : (loadError || serverError) ? (
              <div role="status" className="rounded-2xl border border-[#D7E7E4] bg-white px-6 py-14 text-center shadow-sm">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EAF5F3] text-navy-600"><AlertTriangle className="h-5 w-5" aria-hidden="true" /></div>
                <h3 className="font-display text-base font-bold text-navy-900">Inventory is temporarily unavailable</h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">
                  We couldn&apos;t load vehicles just now. This is usually brief. Your filters and saved vehicles are kept, so you can pick up right where you left off.
                </p>
                {(() => {
                  const code = /\b(4\d\d|5\d\d)\b/.exec(String(loadError || serverError || ''))?.[1];
                  return code ? <p className="mt-2 text-xs text-slate-400">Reference: HTTP {code}</p> : null;
                })()}
                <button onClick={() => { onRetryLoad?.(); setServerRetryKey((key) => key + 1); }} className="mt-5 inline-flex h-10 items-center rounded-xl bg-navy-900 px-5 text-sm font-bold text-white transition hover:bg-navy-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--kayad-cyan)]">
                  Retry inventory
                </button>
              </div>
            ) : filteredVehicles.length === 0 ? (
              <div className="text-center py-16 bg-white border border-dashed border-slate-200 rounded-2xl">
                <Search className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-navy-900 mb-1">No vehicles match your filters</h4>
                <p className="text-xs text-slate-500 mb-4">Try widening your price range or clearing a filter to see more results.</p>
                <button onClick={resetFilters} className="bg-navy-900 text-white text-xs font-bold rounded-lg px-4 py-2">
                  Reset Filters
                </button>
              </div>
            ) : (
              <div
                data-testid="inventory-grid"
                data-view-mode={viewMode}
                data-columns={viewMode === 'grid' ? gridColumns : undefined}
                className={viewMode === 'grid'
                  ? `kayad-inventory-grid ${inventoryDensity.gap}`
                  : `flex flex-col ${inventoryDensity.gap}`
                }
                style={viewMode === 'grid' ? ({ '--kayad-grid-columns': gridColumns } as React.CSSProperties) : undefined}
              >
                {onlyAuction === false && paginatedVehicles.some((v) => v.isAuction) === false && filteredVehicles.some((v) => v.isAuction) && viewMode === 'grid' && (
                  <div className="bg-gradient-to-br from-navy-900 to-navy-700 rounded-2xl text-white p-5 flex flex-col relative overflow-hidden">
                    {/* STAGE 11 ICON CONVERGENCE: this promotional "browse auctions"
                        teaser (shown when the current page has no auction vehicles
                        but some exist elsewhere) used a raw 🔴 emoji; converged to
                        the same canonical Gavel icon used for every other auction
                        signal on this page and on VehicleCard.tsx. It never claimed
                        a specific vehicle was live, so this is an icon-consistency
                        fix only, not a lifecycle-accuracy fix. */}
                    <span className="self-start inline-flex items-center gap-1 bg-rose-600 text-[10px] font-bold px-2.5 py-1 rounded-md mb-3"><Gavel className="w-3 h-3" aria-hidden="true" /> LIVE AUCTIONS</span>
                    <h3 className="text-lg font-bold mb-2">Live Vehicle Auctions</h3>
                    <p className="text-xs text-slate-300 mb-4">Bid on quality vehicles from trusted, verified sellers across East Africa.</p>
                    <button onClick={() => onNavigate('discovery')} className="self-start bg-navy-600 hover:bg-navy-700 text-white text-xs font-bold px-4 py-2 rounded-lg mt-auto">
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
                  // STAGE 10 MARKETPLACE VISUAL CONVERGENCE FIX: this hand-rolled
                  // grid card had its own, third, independent badge calculation
                  // (a single mutually-exclusive "ribbon"), separate from both
                  // VehicleCard.tsx's canonical AUCTION/ESCROW/INSPECTION badge
                  // logic (Stage 8) and utils/escrow.ts's isEscrowApplicable().
                  // Two real defects: (1) it keyed the auction label off
                  // v.isAuction (the capability flag) rather than
                  // v.auctionLifecycle, so a scheduled (draft) or already-ended
                  // auction rendered as "🔴 Live Auction" on this, the actual
                  // paginated marketplace grid users scroll through — exactly
                  // the Stage 8 defect that was fixed in VehicleCard.tsx but
                  // never in this separate card; (2) it never showed an ESCROW
                  // signal at all, and could only ever show one of
                  // auction/escrow/inspection at a time instead of all that
                  // apply. Fixed by reusing the identical canonical fields and
                  // the same isEscrowApplicable() helper as VehicleCard.tsx —
                  // no new badge logic invented, no duplicated authority.
                  const showLiveAuction = v.auctionLifecycle === 'live';
                  const showUpcomingAuction = v.auctionLifecycle === 'draft';
                  const showEndedAuction = v.auctionLifecycle === 'ended';
                  const showEscrow = isEscrowApplicable(v);
                  const showInspected = Boolean(v.inspectionPassed);
                  return (
                    <article
                      key={v.id}
                      className={`kayad-vehicle-card group bg-white border border-[#D7E7E4] rounded-2xl overflow-hidden flex shadow-[0_6px_22px_rgba(11,29,58,0.055)] hover:shadow-[0_14px_34px_rgba(11,29,58,0.12)] hover:-translate-y-0.5 transition-all duration-200 ${viewMode === 'list' ? 'flex-col sm:flex-row' : 'flex-col'}`}
                    >
                      <div className={`relative bg-[#EEF4FA] shrink-0 overflow-hidden ${viewMode === 'list' ? 'h-44 w-full sm:h-auto sm:w-64' : inventoryDensity.image}`}>
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
                          <div className="flex flex-wrap gap-1 max-w-[78%]">
                            {showLiveAuction && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wide px-2 py-1 rounded-full text-white shadow-sm bg-rose-600">
                                <Gavel className="w-2.5 h-2.5" />Live Auction
                              </span>
                            )}
                            {showUpcomingAuction && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wide px-2 py-1 rounded-full text-white shadow-sm bg-navy-600">
                                <Gavel className="w-2.5 h-2.5" />Upcoming Auction
                              </span>
                            )}
                            {showEndedAuction && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wide px-2 py-1 rounded-full text-white shadow-sm bg-slate-500">
                                <Gavel className="w-2.5 h-2.5" />Auction Ended
                              </span>
                            )}
                            {showEscrow && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wide px-2 py-1 rounded-full text-white shadow-sm bg-navy-900">
                                <Lock className="w-2.5 h-2.5" />Escrow
                              </span>
                            )}
                            {showInspected && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wide px-2 py-1 rounded-full text-white shadow-sm bg-emerald-600">
                                <ShieldCheck className="w-2.5 h-2.5" />Inspected
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => onToggleSave(v.id)}
                            className="w-8 h-8 rounded-full bg-navy-900/75 hover:bg-navy-900 text-white flex items-center justify-center backdrop-blur-sm transition-colors"
                            title={isSaved ? 'Remove from saved' : 'Save vehicle'}
                            aria-label={isSaved ? `Remove ${v.title} from saved vehicles` : `Save ${v.title}`}
                          >
                            <span className="text-base leading-none">{isSaved ? '♥' : '♡'}</span>
                          </button>
                        </div>
                        {/* STAGE 10 FIX: gated on auctionLifecycle === 'live', not
                            the isAuction capability flag — a scheduled or ended
                            auction must never show a "current bid, live now"
                            banner implying it is bid-ready. */}
                        {showLiveAuction && v.currentBid && (
                          <div className="absolute bottom-0 left-0 right-0 bg-navy-900/90 backdrop-blur-sm text-white text-[10px] px-3 py-2 flex items-center justify-between gap-2">
                            <span className="font-semibold text-slate-200">Current bid</span>
                            <span className="font-black">{formatPriceM(v.currentBid)}</span>
                          </div>
                        )}
                      </div>

                      <div className={`${inventoryDensity.body} flex-1 flex flex-col min-w-0`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-navy-600 mb-1">{showLiveAuction ? 'Live auction' : showUpcomingAuction ? 'Upcoming auction' : showEndedAuction ? 'Auction ended' : v.verified ? 'Verified listing' : 'Marketplace listing'}</p>
                            <h4 className={`${inventoryDensity.title} font-extrabold leading-snug tracking-[-0.01em] text-navy-900 line-clamp-2`}>
                              {v.year} {v.make} {v.model}
                            </h4>
                          </div>
                          {v.verified && <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" aria-label="Verified listing" />}
                        </div>

                        <div className={`mt-2 ${inventoryDensity.price} font-black tracking-tight text-navy-900`}>{formatPriceM(v.price)}</div>

                        <div className={`mt-2.5 grid grid-cols-2 gap-x-2 gap-y-1.5 ${inventoryDensity.meta} font-medium text-slate-500`}>
                          <span className="inline-flex items-center gap-1.5 min-w-0"><Gauge className="w-3 h-3 text-navy-600 shrink-0" />{v.mileage.toLocaleString()} km</span>
                          <span className="inline-flex items-center gap-1.5 min-w-0"><Fuel className="w-3 h-3 text-[var(--kayad-cyan)] shrink-0" />{v.fuelType}</span>
                          <span className="inline-flex items-center gap-1.5 min-w-0"><ArrowRightLeft className="w-3 h-3 text-slate-400 shrink-0" />{v.transmission}</span>
                          <span className="inline-flex items-center gap-1.5 min-w-0 truncate"><MapPin className="w-3 h-3 text-slate-400 shrink-0" />{v.location}</span>
                        </div>

                        <div className={`mt-3 rounded-xl border ${v.inspectionPassed ? 'border-emerald-100 bg-emerald-50/70' : 'border-slate-200 bg-[#F8FBFF]'} px-2.5 ${inventoryDensity.detail}`}>
                          {v.inspectionPassed ? (
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700">
                              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                              <span>Inspection report available</span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-slate-500">
                              <span>No inspection report yet</span>
                              <button onClick={() => onNavigate('inspections')} className="text-navy-600 font-bold hover:text-navy-700 whitespace-nowrap">Request →</button>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => handleVehicleSelect(v)}
                          className="mt-3 w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#B8D9D6] bg-white hover:bg-[#DDF4F0] hover:border-navy-600/40 py-2.5 text-xs font-extrabold text-navy-700 transition-colors"
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
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
                <span className="text-xs text-slate-500 font-medium">Page {currentPage} of {totalPages}</span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 border border-slate-200 rounded-lg disabled:opacity-40"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
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

      {!savedOnly && <div className="w-full px-3 sm:px-5 lg:px-7 2xl:px-10">
        {/* 7. CTA BANDS */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4 mt-12 rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-br from-navy-700 to-navy-900 text-white p-8 sm:p-10 flex flex-col justify-center gap-4">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--kayad-cyan)]">Buy with more confidence</span>
            <h3 className="text-xl sm:text-2xl font-bold font-display max-w-md">A registered local mechanic inspects it. The report stays on file — for you and every buyer after you.</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-2 text-xs text-slate-300">
              <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />Registered mechanic near the vehicle</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />Pay the mechanic directly</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />Report uploaded to the listing</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />Later buyers can unlock it</div>
            </div>
            <button onClick={() => onNavigate('inspections')} className="self-start bg-navy-600 hover:bg-navy-700 text-white text-sm font-bold px-5 py-2.5 rounded-full mt-1">
              Request an Inspection →
            </button>
          </div>
          <div className="bg-[#F4F8FC] p-8 sm:p-9 flex flex-col justify-center">
            <h4 className="text-lg font-bold text-navy-900 mb-2 max-w-xs">Ready to sell your vehicle?</h4>
            <p className="text-xs text-slate-600 mb-4 max-w-xs">Reach verified buyers across East Africa through the KAYAD marketplace and escrow network.</p>
            <button onClick={() => onNavigate('seller-platform')} className="self-start bg-navy-900 hover:bg-navy-700 text-white text-sm font-bold px-5 py-2.5 rounded-full">
              Sell Your Vehicle →
            </button>
          </div>
        </div>
      </div>}

      {/* 8. FLOATING COMPARISON TRAY */}
      {comparedVehicles.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-navy-900 text-white rounded-2xl shadow-2xl px-5 py-3 flex items-center gap-4">
          <ArrowRightLeft className="w-4 h-4 text-[var(--kayad-cyan)]" />
          <span className="text-xs font-semibold">{comparedVehicles.length} vehicle{comparedVehicles.length > 1 ? 's' : ''} selected to compare</span>
          <button onClick={onOpenCompareModal} className="bg-navy-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg">
            Compare Now
          </button>
        </div>
      )}

      {/* MOBILE FULL-SCREEN FILTER DRAWER */}
      {showMobileFilterDrawer && (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto lg:hidden">
          <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
            <div><h3 className="text-sm font-extrabold text-navy-900">Refine inventory</h3><p className="text-[10px] text-slate-400 mt-0.5">Adjust any filter, then return to the results.</p></div>
            <button onClick={() => setShowMobileFilterDrawer(false)} className="p-1.5" aria-label="Close filters">
              <X className="w-5 h-5 text-slate-500" aria-hidden="true" />
            </button>
          </div>
          <div className="p-4 space-y-4 pb-8">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Make</label>
              <select aria-label="Mobile make filter" value={selectedMake} onChange={(e) => { setSelectedMake(e.target.value); setSelectedModel('All'); }} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-[#F8FBFF]">
                {makes.map((m) => <option key={m} value={m}>{m === 'All' ? 'All Makes' : m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Model</label>
              <select aria-label="Mobile model filter" value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-[#F8FBFF]">
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
              <select aria-label="Mobile body style filter" value={selectedBodyStyle} onChange={(e) => setSelectedBodyStyle(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-[#F8FBFF]">
                {bodyStyles.map((b) => <option key={b} value={b}>{b === 'All' ? 'All Body Styles' : b}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Fuel type</label>
                <select aria-label="Mobile fuel filter" value={selectedFuel} onChange={(e) => setSelectedFuel(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-[#F8FBFF]">
                  {fuelTypes.map((f) => <option key={f} value={f}>{f === 'All' ? 'All Fuel Types' : f}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Transmission</label>
                <select aria-label="Mobile transmission filter" value={selectedTransmission} onChange={(e) => setSelectedTransmission(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-[#F8FBFF]">
                  {transmissionOptions.map((t) => <option key={t} value={t}>{t === 'All' ? 'All Transmissions' : t}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Seller type</label>
              <select aria-label="Mobile seller type filter" value={selectedSellerType} onChange={(e) => setSelectedSellerType(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-[#F8FBFF]">
                {sellerTypeOptions.map((s) => <option key={s} value={s}>{s === 'All' ? 'All Sellers' : s}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-3 rounded-xl border border-[#D7E7E4] bg-[#F8FBFF] px-3 py-3 text-sm font-semibold text-slate-700">
              <input type="checkbox" checked={onlyAuction} onChange={(e) => setOnlyAuction(e.target.checked)} className="accent-navy-600 w-4 h-4" />
              <span><span className="block text-xs font-bold text-navy-900">Live auction listings</span><span className="block text-[10px] font-normal text-slate-500 mt-0.5">Show vehicles currently available for bidding.</span></span>
            </label>
            <div className="flex gap-2 pt-2">
              <button onClick={resetFilters} className="flex-1 border border-slate-200 rounded-xl py-3 text-xs font-bold text-slate-600 hover:bg-slate-50">Reset all</button>
              <button onClick={() => setShowMobileFilterDrawer(false)} className="flex-1 bg-navy-900 hover:bg-navy-700 text-white rounded-xl py-3 text-xs font-bold">Show results</button>
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
          featuredVehicles={featuredVehicles}
          heroFeaturedMode={heroFeaturedMode}
          heroFeaturedIds={heroFeaturedIds}
          heroPresentation={heroPresentation}
          heroCardContent={heroCardContent}
          onSaveHeroVehicleSelection={async (mode, ids) => {
            const currentResponse = await adminAPI.getConfig();
            const current = currentResponse?.config || currentResponse || {};
            await adminAPI.updateConfig({ ...current, heroFeaturedMode: mode, heroCarIds: ids });
            setHeroFeaturedMode(mode);
            setHeroFeaturedIds(ids);
          }}
          onSaveHeroPresentation={async (nextPresentation, nextCardContent) => {
            const currentResponse = await adminAPI.getConfig();
            const current = currentResponse?.config || currentResponse || {};
            await adminAPI.updateConfig({ ...current, heroPresentation: nextPresentation, heroCardContent: nextCardContent });
            setHeroPresentation(nextPresentation);
            setHeroCardContent(nextCardContent);
          }}
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

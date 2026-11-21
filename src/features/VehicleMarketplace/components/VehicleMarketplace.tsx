import './homepage-redesign.css';
import React, { useState, useMemo, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import InventoryFilterPanel, { ANY, type FilterValues } from './InventoryFilterPanel';
import { CONDITIONS } from '../../../constants/vehicleOptions';
import { Vehicle, UserProfile } from '../../../types';
import InventoryCardMedia from './InventoryCardMedia';
import ContactSellerSheet from './ContactSellerSheet';
import VehicleCard from '../../../components/VehicleCard';
import { SlidersHorizontal, Search, RotateCcw, Grid, List as ListIcon, ArrowRightLeft, X, ChevronLeft, ChevronRight, Gavel, ShieldCheck, CheckCircle2, Lock, Landmark, Clock, Bell, PanelLeftOpen, LayoutGrid, Settings, AlertTriangle, Megaphone, Image as ImageIcon, Gauge, Fuel, MapPin, PlayCircle, Heart, CarFront, Phone } from 'lucide-react';
import { usePrefersReducedMotion } from '../../../hooks/useMediaQuery';
import { Select, Button, Card, SkeletonGrid } from '../../../components/ui';
import { isEscrowApplicable } from '../../../utils/escrow';
import MarketingCard, { MarketingCardData } from '../../../components/MarketingCard';
import FloatingAdRail from '../../../components/FloatingAdRail';
import { getVisibleHeroSlides, HeroSlide } from '../../../services/heroApi';
import { adminAPI } from '../../../api/api';
import { getCars, peekCars, getCarById, getCurrentFeaturedCampaignCarIds, mapBackendCarToVehicle, VehicleApiError, type GetCarsParams } from '../../../services/vehicleApi';
import { classifyInventoryFailure, type InventoryFailure } from '../utils/inventoryAvailability';
import { readCatalogueUrl, writeCatalogueUrl } from '../utils/catalogueUrlState';
import { getAvailableGridColumns, getEffectiveGridColumns, validateInventoryFilterRanges } from '../utils/inventoryPresentation';
import { getSearchFacets, type SearchFacetsResponse } from '../../../services/searchApi';
import { getVisibleAdSlots, recordAdEvent, AdSlot } from '../../../services/adApi';
import { useHomePageConfig, ACCENT_THEME_CLASSES, DEFAULT_HOME_PAGE_CONFIG } from '../hooks/useHomePageConfig';
import HomePageAdminPanel from './HomePageAdminPanel';
import AdManagerPanel from '../../AdManager/AdManagerPanel';
import HeroEditorPanel from '../../HeroEditor/HeroEditorPanel';
import PremiumHero from '../../../components/home/PremiumHero';
import type { HeroPresentationConfig, HeroShowcaseVehicle } from '../types/heroPresentation';
import { HERO_EXTRAS_DEFAULTS, normalizeHeroExtras } from '../types/heroPresentation';
import { sanitizeHeroPresentation } from '../utils/heroPresentationSafety';
import { selectHeroVehicles, heroComposition, safeHeroCtaLabel, heroImageFor } from '../utils/heroSelection';
import { Pause, Play } from 'lucide-react';

const kenyaOnlyCopy = (value: string) => value.replace(/East Africa/gi, 'Kenya');

/** Compact, accessible page-number window for the server-owned inventory pagination. */
const getInventoryPageItems = (currentPage: number, totalPages: number): Array<number | 'ellipsis'> => {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
  if (currentPage <= 4) return [1, 2, 3, 4, 5, 'ellipsis', totalPages];
  if (currentPage >= totalPages - 3) return [1, 'ellipsis', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  return [1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', totalPages];
};
// Empty = the built-in procedural KAYAD showroom environment (see homepage-redesign.css). An administrator may still choose an allow-listed custom image.
const KENYA_ROAD_HERO_BACKGROUND = '';
const LEGACY_HERO_BACKGROUNDS = ['/hero/kayad-nairobi-kicc.jpg', 'https://commons.wikimedia.org/wiki/Special:FilePath/Nairobi%20skyline%20from%20Uhuru%20Park.jpg?width=2400', '/hero/kayad-kenyan-highlands-road.svg', '/hero/kayad-thika-expressway-no-signs.svg'];

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
  /** Reports the vehicles currently shown (filtered, sorted, current page) so details previous/next follow them. */
  onVisibleVehiclesChange?: (vehicles: Vehicle[]) => void;
  /** Show only one dealer's vehicles (their showroom). */
  dealerScope?: { id: string; name: string } | null;
  onClearDealerScope?: () => void;
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
  savedOnly = false,
  onVisibleVehiclesChange,
  dealerScope = null,
  onClearDealerScope
}) => {
  // Home page admin customization - scoped to the real home page only
  // (isHomePage), and its UI only rendered/reachable for admins
  // (user?.role === 'admin'), but the config itself always loads so the
  // page renders correctly regardless of who's viewing it.
  const prefersReducedMotion = usePrefersReducedMotion();
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
  // Showcase artwork is only ever considered once real inventory has finished loading, so it can never flash in before (or replace) real vehicles.
  const [featuredResolved, setFeaturedResolved] = useState(false);
  const [campaignResolved, setCampaignResolved] = useState(false);
  const DEFAULT_HERO_PRESENTATION: HeroPresentationConfig = {
    stageHeightPct: 100, stageMaxWidthPct: 100, cardScalePct: 100, cardWidthPct: 38, cardOffsetXPct: 0, cardOffsetYPct: 0,
    cardBgOpacityPct: 95, cardBlurPx: 18, cardBorderColor: '#FFFFFF', cardTextColor: 'var(--color-navy-900)',
    backgroundUrl: '', backgroundPositionX: 50, backgroundPositionY: 50, backgroundScalePct: 100,
    overlayColor: '#061C25', overlayOpacityPct: 8, secondaryOverlayColor: '#071F2A', secondaryOverlayOpacityPct: 10,
    leftOffsetPct: 0, rightOffsetPct: 0, leftVehicleNudgePct: 28, rightVehicleNudgePct: 28, vehicleScalePct: 100, vehicleTopPct: 50, vehicleWidthPct: 43,
    showVehicleInfoCards: true, showVehicleLabels: true, primaryButtonColor: 'var(--kayad-cyan)', secondaryButtonBorderColor: '#C7DAD8',
    arrowEnabled: true, dotsEnabled: true, tickerEnabled: true,
    tickerFallbackText: 'KAYARD KE · Vehicle listings across Kenya · Live auctions · Transparent bidding · Eligible escrow services', tickerBackgroundColor: 'var(--color-navy-900)', tickerTextColor: '#FFFFFF', tickerHeightPx: 36, tickerScrollSeconds: 34, tickerDirection: 'left', tickerTransition: 'scroll',
    // Real promoted/featured inventory is the canonical public hero source.
    // Legacy 'showcase' configs are normalized to this source below.
    vehicleSource: 'featured',
    showcaseFallbackEnabled: true,
    showcaseVehicles: [
      { id: 'showcase-land-cruiser', make: 'Toyota', model: 'Land Cruiser 300', year: 2026, image: '/hero/kayad-land-cruiser-cutout.png', mobileImage: '/hero/kayad-land-cruiser-mobile.webp', eyebrow: 'KAYARD KE SELECT', tagline: 'Premium SUV · 4WD · Automatic', enabled: true },
      { id: 'showcase-mercedes-gle', make: 'Mercedes-Benz', model: 'GLE', year: 2026, image: '/hero/kayad-mercedes-gle-cutout.png', mobileImage: '/hero/kayad-mercedes-gle-mobile.webp', eyebrow: 'KAYARD KE SELECT', tagline: 'Luxury SUV · Automatic', enabled: true },
    ],
    floatingCards: [],
    ...HERO_EXTRAS_DEFAULTS,
  };
  const [heroPresentation, setHeroPresentation] = useState<HeroPresentationConfig>(DEFAULT_HERO_PRESENTATION);
  const heroRotationMs = heroPresentation.rotationSeconds > 0 ? Math.round(heroPresentation.rotationSeconds * 1000) : 0;
  const [heroCardContent, setHeroCardContent] = useState<Record<string, { eyebrow?: string; message?: string; detail?: string; ctaLabel?: string; ctaLink?: string; heroImage?: string }>>({});

  const accent = ACCENT_THEME_CLASSES[homeConfig.accentTheme];

  // Shareable catalogue state: read once from the URL (invalid values are ignored by the reader).
  const initialUrl = useRef(readCatalogueUrl(typeof window === 'undefined' ? '' : window.location.search)).current;

  // Filter States
  const [selectedMake, setSelectedMake] = useState<string>(initialUrl.make);
  const [selectedModel, setSelectedModel] = useState<string>(initialUrl.model);
  const [selectedBodyStyle, setSelectedBodyStyle] = useState<string>(initialUrl.body);
  const [selectedFuel, setSelectedFuel] = useState<string>(initialUrl.fuel);
  const [selectedTransmission, setSelectedTransmission] = useState<string>(initialUrl.transmission);
  const [selectedCondition, setSelectedCondition] = useState<string>(initialUrl.condition);
  const [selectedSellerType, setSelectedSellerType] = useState<string>(initialUrl.seller);
  const [selectedColor, setSelectedColor] = useState<string>(initialUrl.color);
  const [minPrice, setMinPrice] = useState<number>(initialUrl.minPrice);
  const [maxPrice, setMaxPrice] = useState<number>(initialUrl.maxPrice);
  // 0 means "no minimum year"; the earliest year offered is the Super Admin setting filterOptions.yearFrom.
  const [minYear, setMinYear] = useState<number>(initialUrl.minYear);
  const [maxYear, setMaxYear] = useState<number>(initialUrl.maxYear);
  const [maxMileage, setMaxMileage] = useState<number>(initialUrl.maxMileage);
  const [filterRangeError, setFilterRangeError] = useState<string | null>(null);

  // Boolean Feature Toggles
  const [onlyAuction, setOnlyAuction] = useState<boolean>(initialUrl.onlyAuction);

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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(initialUrl.view ?? homeConfig.inventoryLayout.viewMode);
  const [gridColumns, setGridColumns] = useState<3 | 4 | 5>(initialUrl.cols ?? homeConfig.inventoryLayout.columns);
  const [sortBy, setSortBy] = useState<
    'newest' | 'price-asc' | 'price-desc' | 'mileage' | 'year' | 'most-viewed' | 'auction-ending'
  >(initialUrl.sort);
  // Admin controls desktop sidebar visibility. Mobile retains the filter drawer.
  const showDesktopSidebar = homeConfig.inventoryLayout.showSidebar;
  const [showMobileFilterDrawer, setShowMobileFilterDrawer] = useState<boolean>(false);
  const inventoryResultsRef = useRef<HTMLDivElement | null>(null);
  const [inventoryResultsWidth, setInventoryResultsWidth] = useState(0);

  useEffect(() => {
    const element = inventoryResultsRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      setInventoryResultsWidth(Math.round(entry.contentRect.width));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Admin presentation settings are the default layout. Visitor toolbar
  // controls can still make a temporary local change without changing the
  // saved admin configuration. When an admin changes the presentation in
  // the panel, the live page follows it immediately.
  const layoutConfigMounted = useRef(false);
  useEffect(() => {
    // First run must not clobber a layout chosen by a shared link (?view= / ?cols=).
    if (!layoutConfigMounted.current) {
      layoutConfigMounted.current = true;
      if (initialUrl.view || initialUrl.cols) return;
    }
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

  // Mirror the CSS container-query breakpoints so requested and effective columns stay explicit.
  const effectiveGridColumns = getEffectiveGridColumns(gridColumns, inventoryResultsWidth);
  const availableGridColumns = getAvailableGridColumns(inventoryResultsWidth);

  // Super Admin configurable search choices (Home page settings): price steps and the earliest year offered.
  const filterOptions = homeConfig.filterOptions ?? DEFAULT_HOME_PAGE_CONFIG.filterOptions;
  const priceSteps = filterOptions.priceSteps;
  const [contactVehicle, setContactVehicle] = useState<{ id: string; title: string } | null>(null);
  // The selected desktop column count is rendered through a dedicated CSS
  // contract instead of dynamically assembled Tailwind grid classes. This
  // keeps the 3/4/5 control deterministic in production builds and at every
  // responsive breakpoint, while still allowing the mobile/tablet fallbacks.

  // Toast / Notification State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Pagination States
  const [currentPage, setCurrentPage] = useState<number>(initialUrl.page);
  // Defaults to 24 rather than 12 - now that compact mode (also the new
  // default view) fits up to 5 per row on large screens, 12 would only
  // fill ~2.4 rows per page. 24 uses the space better and halves how
  // often visitors need to paginate at real scale.
  const [pageSize, setPageSize] = useState<number>(24);

  // Mirror the canonical catalogue state into the URL (replaceState: filter tweaks do not
  // pile up history entries, and the Back button still leaves the catalogue). Other
  // params (nav, vehicleId, ...) are preserved. Skipped for the saved-vehicles view.
  useEffect(() => {
    if (savedOnly || typeof window === 'undefined') return;
    const next = writeCatalogueUrl(window.location.search, {
      q: searchQuery.trim(), county: selectedCounty,
      make: selectedMake, model: selectedModel, body: selectedBodyStyle, fuel: selectedFuel,
      transmission: selectedTransmission, condition: selectedCondition, seller: selectedSellerType, color: selectedColor,
      minPrice, maxPrice, minYear, maxYear, maxMileage, onlyAuction, sort: sortBy, page: currentPage,
      view: viewMode === homeConfig.inventoryLayout.viewMode ? null : viewMode,
      cols: gridColumns === homeConfig.inventoryLayout.columns ? null : gridColumns,
    });
    if (next === window.location.search) return;
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${next}${window.location.hash}`);
  }, [savedOnly, searchQuery, selectedCounty, selectedMake, selectedModel, selectedBodyStyle, selectedFuel,
    selectedTransmission, selectedCondition, selectedSellerType, selectedColor, minPrice, maxPrice, minYear, maxYear,
    maxMileage, onlyAuction, sortBy, currentPage, viewMode, gridColumns, homeConfig.inventoryLayout.viewMode, homeConfig.inventoryLayout.columns]);

  // A shared link may carry a search / location: hand them to the owning parent state once.
  useEffect(() => {
    if (initialUrl.q && !searchQuery) onSearchChange(initialUrl.q);
    if (initialUrl.county !== 'All Kenya' && selectedCounty === 'All Kenya') onCountyChange(initialUrl.county);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // Phase 42: the marketplace query is authoritative and paginated by the
  // real /api/cars endpoint. App.tsx still supplies the initial inventory
  // snapshot, but browsing controls now re-query the backend instead of
  // filtering/slicing only the first 50 records in memory.
  const [serverVehicles, setServerVehicles] = useState<Vehicle[]>(vehicles);
  const [serverTotal, setServerTotal] = useState<number>(vehicles.length);
  const [serverTotalPages, setServerTotalPages] = useState<number>(1);
  const [serverLoading, setServerLoading] = useState<boolean>(!savedOnly);
  const [serverError, setServerError] = useState<string | null>(null);
  /** Classified cause of the last failed inventory request (maintenance, timeout, offline, ...). */
  const [serverFailure, setServerFailure] = useState<InventoryFailure | null>(null);
  const [serverRetryKey, setServerRetryKey] = useState(0);
  const [canonicalFacets, setCanonicalFacets] = useState<SearchFacetsResponse | null>(null);
  const [canonicalModelFacets, setCanonicalModelFacets] = useState<SearchFacetsResponse['models']>([]);
  // Signatures, not array identities: an empty/new facet array must not look like a changed query and trigger a refetch.
  const canonicalMakesKey = (canonicalFacets?.brands || []).map((item) => item.value).filter(Boolean).join('\u0001');
  const canonicalModelsKey = canonicalModelFacets.map((item) => item.value).filter(Boolean).join('\u0001');
  const isLoading = isLoadingReal || serverLoading;
  const inventoryFailure: InventoryFailure | null = serverError
    ? (serverFailure ?? classifyInventoryFailure(serverError))
    : loadError ? classifyInventoryFailure(loadError) : null;
  const inventoryStatusText = inventoryFailure
    ? (savedOnly ? 'Saved vehicles unavailable' : inventoryFailure.pill)
    : null;
  const retryInventory = () => { onRetryLoad?.(); setServerRetryKey((key) => key + 1); };

  // Search dropdowns use canonical full-inventory facets from the backend,
  // not a hard-coded list or only the currently loaded page of vehicles.
  useEffect(() => {
    let cancelled = false;
    getSearchFacets().then((facets) => { if (!cancelled) setCanonicalFacets(facets); }).catch(() => { /* current listing snapshot remains a graceful fallback */ });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const query = selectedMake !== 'All' ? { brand: selectedMake } : {};
    getSearchFacets(query).then((facets) => { if (!cancelled) setCanonicalModelFacets(facets.models || []); }).catch(() => { if (!cancelled) setCanonicalModelFacets([]); });
    return () => { cancelled = true; };
  }, [selectedMake]);

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

  // Dynamic Filter Options Extracted directly from backend dataset
  const makes = useMemo(() => {
    const canonical = (canonicalFacets?.brands || []).map((item) => item.value).filter(Boolean);
    const fallback = filterSourceVehicles.map((v) => v.make).filter(Boolean);
    return ['All', ...Array.from(new Set(canonical.length ? canonical : fallback)).sort((a, b) => a.localeCompare(b))];
  }, [filterSourceVehicles, canonicalFacets]);

  const models = useMemo(() => {
    const canonical = canonicalModelFacets.map((item) => item.value).filter(Boolean);
    const source = selectedMake === 'All' ? filterSourceVehicles : filterSourceVehicles.filter((v) => v.make.toLowerCase() === selectedMake.toLowerCase());
    const fallback = source.map((v) => v.model).filter(Boolean);
    return ['All', ...Array.from(new Set(canonical.length ? canonical : fallback)).sort((a, b) => a.localeCompare(b))];
  }, [filterSourceVehicles, selectedMake, canonicalModelFacets]);

  const bodyStyles = useMemo(() => {
    const canonical = (canonicalFacets?.bodyTypes || []).map((item) => item.value).filter(Boolean);
    const fallback = filterSourceVehicles.map((v) => v.bodyStyle).filter(Boolean);
    return ['All', ...Array.from(new Set(canonical.length ? canonical : fallback)).sort((a, b) => a.localeCompare(b))];
  }, [filterSourceVehicles, canonicalFacets]);

  const fuelTypes = useMemo(() => {
    const canonical = (canonicalFacets?.fuels || []).map((item) => item.value).filter(Boolean);
    const fallback = filterSourceVehicles.map((v) => v.fuelType).filter(Boolean);
    return ['All', ...Array.from(new Set(canonical.length ? canonical : fallback)).sort((a, b) => a.localeCompare(b))];
  }, [filterSourceVehicles, canonicalFacets]);

  const transmissionOptions = ['All', 'Automatic', 'Manual', 'CVT', 'Semi-Automatic'];
  const conditionOptions = ['All', ...CONDITIONS];
  const sellerTypeOptions = ['All', 'Verified Dealer', 'Private Seller'];

  const colorOptions = useMemo(() => ['All', ...Array.from(new Set(filterSourceVehicles.map((v) => (v as { color?: string }).color).filter((c): c is string => Boolean(c)))).sort((a, b) => a.localeCompare(b))], [filterSourceVehicles]);

  const serverQuery = useMemo<GetCarsParams>(() => {
    const query: GetCarsParams = {
      page: currentPage,
      limit: pageSize,
    };

    if (searchQuery.trim()) query.keyword = searchQuery.trim();
    // A value picked from the suggestions is matched exactly; anything the visitor typed that is not a listed option is matched by
    // "contains" on the server, so manual entry always works.
    // Only the backend's canonical facets decide "listed". The option lists shown in the panel are derived from the results themselves,
    // so using them here would make every response change the next query.
    const canonicalMakes = canonicalMakesKey ? canonicalMakesKey.split('\u0001') : [];
    const canonicalModels = canonicalModelsKey ? canonicalModelsKey.split('\u0001') : [];
    const pick = (value: string, options: string[]) => options.find((o) => o.toLowerCase() === value.toLowerCase());
    if (selectedMake !== 'All') { const hit = pick(selectedMake, canonicalMakes); if (hit) query.brand = hit; else query.brandLike = selectedMake; }
    if (selectedModel !== 'All') { const hit = pick(selectedModel, canonicalModels); if (hit) query.model = hit; else query.modelLike = selectedModel; }
    if (selectedColor !== 'All') query.colorLike = selectedColor;
    if (selectedCounty !== 'All Kenya') query.city = selectedCounty;
    if (minPrice > 0) query.minPrice = minPrice;
    if (maxPrice < 20000000) query.maxPrice = maxPrice;
    if (minYear > 0) query.yearMin = minYear;
    if (maxYear < 2026) query.yearMax = maxYear;
    if (selectedBodyStyle !== 'All') query.body = selectedBodyStyle;
    if (selectedFuel !== 'All') query.fuel = selectedFuel;
    if (selectedTransmission !== 'All') query.transmission = selectedTransmission;
    if (selectedCondition !== 'All') query.condition = selectedCondition;
    if (maxMileage < 250000) query.mileageMax = maxMileage;
    if (selectedSellerType === 'Verified Dealer') query.dealerType = 'dealer';
    if (selectedSellerType === 'Private Seller') query.dealerType = 'private';
    if (onlyAuction) query.auctionStatus = 'live';
    if (dealerScope?.id) query.dealer = dealerScope.id;

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
    selectedTransmission, selectedCondition, maxMileage, selectedSellerType, selectedColor, canonicalMakesKey, canonicalModelsKey,
    onlyAuction, sortBy, dealerScope?.id
  ]);

  // Instant inventory: a page already seen this session is painted before the browser
  // draws (no skeleton at all) and only refreshed in the background when it is stale.
  // A page never seen shows the skeleton; while a new filter loads, the previous
  // results stay on screen (dimmed) instead of collapsing to an empty skeleton.
  const hasLoadedOnce = useRef(false);
  const [refreshing, setRefreshing] = useState(false);
  const [slowLoad, setSlowLoad] = useState(false);
  useLayoutEffect(() => {
    if (savedOnly) return;
    let cancelled = false;
    setServerError(null);
    setServerFailure(null);

    const apply = (res: Awaited<ReturnType<typeof getCars>>) => {
      const mapped = (res.data || res.cars || []).map(mapBackendCarToVehicle);
      setServerVehicles(mapped);
      setServerTotal(res.pagination?.total ?? mapped.length);
      setServerTotalPages(res.pagination?.pages ?? res.pagination?.totalPages ?? 1);
      hasLoadedOnce.current = true;
    };

    const cached = peekCars(serverQuery);
    if (cached) {
      apply(cached.data);
      setServerLoading(false);
      if (cached.fresh) { setRefreshing(false); return () => { cancelled = true; }; }
      setRefreshing(true);
    } else if (hasLoadedOnce.current) {
      setRefreshing(true);
    } else {
      setServerLoading(true);
    }

    setSlowLoad(false);
    const slowTimer = window.setTimeout(() => { if (!cancelled) setSlowLoad(true); }, 6000);
    (cached ? getCars(serverQuery, { force: true }) : getCars(serverQuery))
      .then((res) => { if (!cancelled) apply(res); })
      .catch((err) => {
        if (cancelled) return;
        // A background refresh that fails keeps the page the shopper is already looking at.
        if (cached) return;
        setServerError(err instanceof VehicleApiError ? err.message : 'Unable to load marketplace results.');
        setServerFailure(classifyInventoryFailure(err));
        setServerVehicles([]);
        setServerTotal(0);
        setServerTotalPages(1);
      })
      .finally(() => {
        window.clearTimeout(slowTimer);
        if (!cancelled) { setServerLoading(false); setRefreshing(false); setSlowLoad(false); }
      });

    return () => { cancelled = true; window.clearTimeout(slowTimer); };
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

  const locations = useMemo(() => {
    const canonical = (canonicalFacets?.locations || []).map((item) => item.value).filter(Boolean);
    const fallback = filterSourceVehicles.map((v) => v.county || v.location).filter(Boolean);
    return ['All Kenya', ...Array.from(new Set(canonical.length ? canonical : fallback)).sort((a, b) => a.localeCompare(b))];
  }, [filterSourceVehicles, canonicalFacets]);

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
    onlyAuction, sortBy, selectedColor, dealerScope?.id
  ]);

  // The backend has already paginated this page. Do not slice it again.
  const paginatedVehicles = filteredVehicles;
  useEffect(() => { onVisibleVehiclesChange?.(paginatedVehicles); }, [paginatedVehicles, onVisibleVehiclesChange]);
  const totalPages = Math.max(1, serverTotalPages);

  // One set of filter values and one change handler feed BOTH the desktop sidebar and the mobile sheet.
  const MAX_PRICE = 20000000, MAX_MILEAGE = 250000;
  const filterValues: FilterValues = {
    make: selectedMake, model: selectedModel, body: selectedBodyStyle, fuel: selectedFuel, transmission: selectedTransmission,
    condition: selectedCondition, color: selectedColor, seller: selectedSellerType,
    minPrice, maxPrice, minYear, maxYear, maxMileage, auction: onlyAuction,
  };
  const applyFilterPatch = (patch: Partial<FilterValues>) => {
    const nextMinPrice = patch.minPrice ?? minPrice;
    const nextMaxPrice = patch.maxPrice ?? maxPrice;
    const nextMinYear = patch.minYear ?? minYear;
    const nextMaxYear = patch.maxYear ?? maxYear;
    const rangeError = validateInventoryFilterRanges({
      minPrice: nextMinPrice, maxPrice: nextMaxPrice, minYear: nextMinYear, maxYear: nextMaxYear,
    });
    if (rangeError) {
      setFilterRangeError(rangeError);
      return;
    }
    setFilterRangeError(null);
    // Filter changes must request page one in the same render. Relying only on
    // the later reset effect can briefly fetch the new filter on an old page.
    setCurrentPage(1);
    if (patch.make !== undefined) setSelectedMake(patch.make);
    if (patch.model !== undefined) setSelectedModel(patch.model);
    if (patch.body !== undefined) setSelectedBodyStyle(patch.body);
    if (patch.fuel !== undefined) setSelectedFuel(patch.fuel);
    if (patch.transmission !== undefined) setSelectedTransmission(patch.transmission);
    if (patch.condition !== undefined) setSelectedCondition(patch.condition);
    if (patch.color !== undefined) setSelectedColor(patch.color);
    if (patch.seller !== undefined) setSelectedSellerType(patch.seller);
    if (patch.minPrice !== undefined) setMinPrice(patch.minPrice);
    if (patch.maxPrice !== undefined) setMaxPrice(patch.maxPrice);
    if (patch.minYear !== undefined) setMinYear(patch.minYear);
    if (patch.maxYear !== undefined) setMaxYear(patch.maxYear);
    if (patch.maxMileage !== undefined) setMaxMileage(patch.maxMileage);
    if (patch.auction !== undefined) setOnlyAuction(patch.auction);
  };
  const filterOptionLists = {
    makes, models, bodies: bodyStyles, fuels: fuelTypes, transmissions: transmissionOptions, conditions: conditionOptions, colors: colorOptions,
    sellers: sellerTypeOptions, priceSteps, yearFrom: filterOptions.yearFrom, mileageSteps: [50000, 100000, 150000],
  };
  const filterLimits = { priceMax: MAX_PRICE, yearMax: 2026, mileageMax: MAX_MILEAGE };

  // Reset all filters to default
  const resetFilters = useCallback(() => {
    setFilterRangeError(null);
    setCurrentPage(1);
    onSearchChange('');
    setSelectedMake('All');
    setSelectedModel('All');
    setSelectedBodyStyle('All');
    setSelectedFuel('All');
    setSelectedTransmission('All');
    setSelectedCondition('All');
    setSelectedSellerType('All');
    setMinPrice(0);
    setSelectedColor('All');
    setMaxPrice(20000000);
    setMinYear(0);
    setMaxYear(2026);
    setMaxMileage(250000);
    setOnlyAuction(false);
    onCountyChange('All Kenya');
    onClearDealerScope?.();
  }, [onSearchChange, onCountyChange, onClearDealerScope]);


  // Compute active removable chips for Summary Bar
  const activeFilters = useMemo(() => {
    const list: { id: string; label: string; onClear: () => void }[] = [];
    if (searchQuery) list.push({ id: 'search', label: `"${searchQuery}"`, onClear: () => { setCurrentPage(1); onSearchChange(''); } });
    if (selectedCounty !== 'All Kenya') list.push({ id: 'county', label: `Location: ${selectedCounty}`, onClear: () => { setCurrentPage(1); onCountyChange('All Kenya'); } });
    if (selectedMake !== 'All') list.push({ id: 'make', label: `Make: ${selectedMake}`, onClear: () => { setCurrentPage(1); setSelectedMake('All'); setSelectedModel('All'); } });
    if (selectedModel !== 'All') list.push({ id: 'model', label: `Model: ${selectedModel}`, onClear: () => { setCurrentPage(1); setSelectedModel('All'); } });
    if (selectedBodyStyle !== 'All') list.push({ id: 'body', label: `Body: ${selectedBodyStyle}`, onClear: () => { setCurrentPage(1); setSelectedBodyStyle('All'); } });
    if (selectedFuel !== 'All') list.push({ id: 'fuel', label: `Fuel: ${selectedFuel}`, onClear: () => { setCurrentPage(1); setSelectedFuel('All'); } });
    if (selectedTransmission !== 'All') list.push({ id: 'trans', label: `Trans: ${selectedTransmission}`, onClear: () => { setCurrentPage(1); setSelectedTransmission('All'); } });
    if (selectedSellerType !== 'All') list.push({ id: 'seller', label: `Seller: ${selectedSellerType}`, onClear: () => { setCurrentPage(1); setSelectedSellerType('All'); } });
    if (selectedCondition !== 'All') list.push({ id: 'cond', label: `Condition: ${selectedCondition}`, onClear: () => { setCurrentPage(1); setSelectedCondition('All'); } });
    if (maxPrice < 20000000) list.push({ id: 'price', label: `Under Ksh ${(maxPrice / 1000000).toFixed(1)}M`, onClear: () => { setCurrentPage(1); setMaxPrice(20000000); } });
    if (minYear > 0) list.push({ id: 'minyear', label: `From ${minYear}`, onClear: () => { setCurrentPage(1); setMinYear(0); } });
    if (maxYear < 2026) list.push({ id: 'maxyear', label: `Up to ${maxYear}`, onClear: () => { setCurrentPage(1); setMaxYear(2026); } });
    if (selectedColor !== 'All') list.push({ id: 'color', label: `Colour: ${selectedColor}`, onClear: () => { setCurrentPage(1); setSelectedColor('All'); } });
    if (minPrice > 0) list.push({ id: 'minprice', label: `From Ksh ${minPrice.toLocaleString('en-KE')}`, onClear: () => { setCurrentPage(1); setMinPrice(0); } });
    if (maxMileage < 250000) list.push({ id: 'mileage', label: `Under ${maxMileage.toLocaleString('en-KE')} km`, onClear: () => { setCurrentPage(1); setMaxMileage(250000); } });
    if (onlyAuction) list.push({ id: 'auction', label: 'Live Auction', onClear: () => { setCurrentPage(1); setOnlyAuction(false); } });
    if (dealerScope?.id) list.push({ id: 'dealer', label: `Dealer: ${dealerScope.name}`, onClear: () => { setCurrentPage(1); onClearDealerScope?.(); } });
    return list;
  }, [
    searchQuery, selectedCounty, selectedMake, selectedModel, selectedBodyStyle,
    selectedFuel, selectedTransmission, selectedSellerType, selectedCondition,
    maxPrice, minPrice, maxMileage, selectedColor, minYear, maxYear, onlyAuction, onSearchChange, onCountyChange, dealerScope, onClearDealerScope
  ]);

  // Badge, mobile trigger and summary chips share this exact removable-filter count.
  const activeSidebarFilters = activeFilters.length;

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
      setFeaturedResolved(true);
      return;
    }
    let cancelled = false;
    getCars({ page: 1, limit: 24, featured: true, sort: 'newest' })
      .then((res) => {
        if (!cancelled) setFeaturedVehicles((res.data || res.cars || []).map(mapBackendCarToVehicle));
      })
      .catch(() => {
        if (!cancelled) setFeaturedVehicles([]);
      })
      .finally(() => { if (!cancelled) setFeaturedResolved(true); });
    return () => { cancelled = true; };
  }, [savedOnly]);

  // Super Admin featured campaigns: vehicles scheduled to be featured right now (empty when none or unavailable).
  const [campaignVehicles, setCampaignVehicles] = useState<Vehicle[]>([]);
  useEffect(() => {
    if (savedOnly) { setCampaignVehicles([]); setCampaignResolved(true); return; }
    let cancelled = false;
    const refresh = async () => {
      try {
        const ids = await getCurrentFeaturedCampaignCarIds();
        if (!ids.length) { if (!cancelled) setCampaignVehicles([]); return; }
        const cars = await Promise.all(ids.slice(0, 12).map((id) => getCarById(id).catch(() => null)));
        if (cancelled) return;
        setCampaignVehicles(cars.filter((c): c is NonNullable<typeof c> => !!c).map(mapBackendCarToVehicle).filter((v) => v.status !== 'sold'));
      } finally {
        if (!cancelled) setCampaignResolved(true);
      }
    };
    refresh().catch(() => {});
    const timer = window.setInterval(() => { refresh().catch(() => {}); }, 5 * 60 * 1000);
    return () => { cancelled = true; window.clearInterval(timer); };
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
        setHeroFeaturedMode(mode);
        setHeroFeaturedIds(ids);
        // Configurations saved while the old light "road" hero was the default still carry its pale overlay pair; on the graphite showroom
        // they would wash the scene out, so that exact legacy pair is treated as unset.
        const legacyOverlay = String(presentation.overlayColor || '').toUpperCase() === '#EEF7F5' && String(presentation.secondaryOverlayColor || '').toUpperCase() === '#FFFFFF';
        const merged = {
          ...DEFAULT_HERO_PRESENTATION,
          ...presentation,
          ...(legacyOverlay ? { overlayColor: DEFAULT_HERO_PRESENTATION.overlayColor, secondaryOverlayColor: DEFAULT_HERO_PRESENTATION.secondaryOverlayColor, overlayOpacityPct: DEFAULT_HERO_PRESENTATION.overlayOpacityPct, secondaryOverlayOpacityPct: DEFAULT_HERO_PRESENTATION.secondaryOverlayOpacityPct } : {}),
          // Known built-in skyline/road backgrounds migrate to the showroom; an allow-listed custom image saved by an administrator is kept.
          backgroundUrl: LEGACY_HERO_BACKGROUNDS.includes(String(presentation.backgroundUrl || '')) ? KENYA_ROAD_HERO_BACKGROUND : (presentation.backgroundUrl || KENYA_ROAD_HERO_BACKGROUND),
        };
        // One shared sanitiser (identical limits to the server): numbers clamp into safe ranges, unsafe URLs/colours/links fall back to defaults.
        const safe = sanitizeHeroPresentation(merged, DEFAULT_HERO_PRESENTATION);
        setHeroPresentation({
          ...safe,
          showcaseVehicles: Array.isArray(safe.showcaseVehicles) && safe.showcaseVehicles.length ? safe.showcaseVehicles : DEFAULT_HERO_PRESENTATION.showcaseVehicles,
          floatingCards: Array.isArray(safe.floatingCards) ? safe.floatingCards : [],
          tickerEnabled: presentation.tickerEnabled !== false,
          ...normalizeHeroExtras(presentation),
          vehicleSource: presentation.vehicleSource === 'showcase' ? 'showcase' : presentation.vehicleSource === 'selected' ? 'selected' : 'featured',
          showcaseFallbackEnabled: presentation.showcaseFallbackEnabled !== false,
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

  // Curated hero artwork is stored in the existing admin-managed platform_config.hero_presentation
  // JSON contract. It is presentation-only and is never inserted into cars/listings, counted as
  // inventory, priced, or sent through a vehicle transaction. Real featured listings take priority;
  // the curated artwork is used ONLY when there is no real eligible vehicle, and is always labelled illustrative.
  const heroShowcaseVehicles = useMemo(() => (heroPresentation.showcaseVehicles || [])
    .filter((item) => item.enabled !== false && Boolean(item.image))
    .slice(0, 6)
    .map((item, index) => ({
      id: item.id || `showcase-vehicle-${index + 1}`,
      title: `${item.make || 'KAYARD KE'} ${item.model || 'Showcase'}`.trim(),
      make: item.make || 'KAYARD KE', model: item.model || 'Showcase', year: Number(item.year) || 0,
      vin: '', price: 0, mileage: 0, location: '', bodyStyle: 'SUV' as const,
      transmission: 'Automatic' as const, fuelType: 'Petrol' as const, engine: '', horsepower: 0,
      exteriorColor: '', interiorColor: '', condition: 'Locally Used' as const, listingType: 'fixed' as const,
      images: [item.image], image: item.image, heroMobileImage: item.mobileImage || item.image,
      description: item.tagline || 'KAYARD KE visual showcase · not a live listing', features: [],
      sellerId: '', sellerName: 'KAYARD KE Visual Showcase', sellerRating: 0, isDealerCertified: false,
      savedCount: 0, status: 'active' as const, createdAt: '', badge: item.eyebrow || 'VISUAL SHOWCASE',
      isShowcaseHeroVehicle: true,
    } as Vehicle & { isShowcaseHeroVehicle: boolean })), [heroPresentation.showcaseVehicles]);

  // Hero source policy (see ../utils/heroSelection.ts): a running campaign, else real featured/selected inventory, and ONLY when there is
  // no real eligible vehicle, clearly-labelled illustrative artwork. A vehicle is never repeated and showcase art never replaces real stock.
  const heroSelection = useMemo(() => selectHeroVehicles<Vehicle>({
    campaign: campaignVehicles,
    inventory: heroPresentation.vehicleSource === 'selected' ? heroVehicles.filter((vehicle) => heroFeaturedIds.includes(vehicle.id)) : heroVehicles,
    // Illustrative artwork is withheld until real inventory has resolved, so it cannot flash in ahead of real vehicles.
    showcase: featuredResolved && campaignResolved ? heroShowcaseVehicles : [],
    // A legacy 'showcase' source now means "use the artwork when there is nothing real"; it can no longer displace real stock.
    showcaseFallbackEnabled: heroPresentation.showcaseFallbackEnabled || heroPresentation.vehicleSource === 'showcase',
  }), [campaignVehicles, heroVehicles, heroFeaturedIds, heroShowcaseVehicles, heroPresentation.vehicleSource, heroPresentation.showcaseFallbackEnabled, featuredResolved, campaignResolved]);
  const heroSourceVehicles = heroSelection.vehicles;
  const heroIllustrative = heroSelection.illustrative;
  // Single-vehicle hero rotation: each campaign/inventory/showcase vehicle gets its own slide.
  // Source precedence and ordering are still owned by selectHeroVehicles().
  const heroPairs = useMemo(() => heroSourceVehicles.map((vehicle) => [vehicle]), [heroSourceVehicles]);
  const heroPairCount = Math.max(1, heroPairs.length);
  const [heroPairIndex, setHeroPairIndex] = useState(0);
  /** Hero images that failed to load; the card keeps its truthful label over a neutral placeholder instead of a broken-image icon. */
  const [brokenHeroImages, setBrokenHeroImages] = useState<Record<string, boolean>>({});
  const [heroTransitioning, setHeroTransitioning] = useState(false);
  const [heroIncomingVisible, setHeroIncomingVisible] = useState(true);
  // Carousel pause (WCAG 2.2.2): an explicit control plus automatic pausing while the visitor hovers, focuses or has just interacted.
  const [heroUserPaused, setHeroUserPaused] = useState(false);
  const [heroPointerInside, setHeroPointerInside] = useState(false);
  const [heroFocusInside, setHeroFocusInside] = useState(false);
  const heroInteractedAt = useRef(0);
  const markHeroInteraction = () => { heroInteractedAt.current = Date.now(); };
  const heroAutoplayAllowed = !prefersReducedMotion && heroRotationMs > 0 && heroPairCount > 1;
  const heroPaused = heroUserPaused || heroPointerInside || heroFocusInside;

  useEffect(() => {
    setHeroPairIndex(0);
    setHeroTransitioning(false);
    setHeroIncomingVisible(true);
  }, [heroSourceVehicles.map((vehicle) => vehicle.id).join('|')]);

  // Change the pair as a single visual state.
  const changeHeroPair = (nextIndex: number) => {
    const normalized = ((nextIndex % heroPairCount) + heroPairCount) % heroPairCount;
    if (normalized === heroPairIndex || heroPairCount < 2) return;
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
    // Rotation timing is admin-controlled (0 = no automatic rotation). It never advances while paused or just after an interaction.
    if (!heroAutoplayAllowed || heroPaused) return;
    const timer = window.setInterval(() => {
      if (Date.now() - heroInteractedAt.current < 8000) return;
      changeHeroPair((heroPairIndex + 1) % heroPairCount);
    }, heroRotationMs);
    return () => window.clearInterval(timer);
  }, [heroAutoplayAllowed, heroPaused, heroPairCount, heroPairIndex, heroRotationMs]);

  const heroCurrentPair = heroPairs[Math.min(heroPairIndex, heroPairCount - 1)] || [];
  const heroComp = heroComposition(heroCurrentPair);
  const heroLeftVehicle: Vehicle | undefined = heroCurrentPair[0];

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
    if (prefersReducedMotion || heroSlides.length < 2 || !heroRotationMs || heroPaused) return;
    const timer = setInterval(() => setHeroSlideIndex((index) => (index + 1) % heroSlides.length), heroRotationMs);
    return () => clearInterval(timer);
  }, [heroSlides.length, heroRotationMs, prefersReducedMotion, heroPaused]);
  const activeHeroSlide = heroSlides[heroSlideIndex % Math.max(heroSlides.length, 1)];

  const heroEyebrow = activeHeroSlide?.eyebrowText?.trim() || "KENYA'S VEHICLE MARKETPLACE";
  const heroHeadline = kenyaOnlyCopy(activeHeroSlide?.headline?.trim() || 'Drive Your Dream Today');
  // Single source of truth for hero copy: desktop AND mobile render these, so every admin edit
  // (hero slide eyebrow / headline / subheadline / CTA text, vehicle card content) shows on both.
  // Brand is KAYAD KE (not KAYAD EA): a previously saved hero slide that still carries the legacy default is normalised too.
  const heroEyebrowDisplay = kenyaOnlyCopy(/^KAYA?RD? (KE|EA) · PREMIUM AUTOMOTIVE MARKETPLACE$/i.test(heroEyebrow) ? "KENYA'S VEHICLE MARKETPLACE" : heroEyebrow);
  // Only the canonical default headline gets the designed line break; any admin-authored headline renders exactly as written.
  const heroHeadlineNode: React.ReactNode = heroHeadline === 'Drive Your Dream Today' ? <>Drive Your Dream <br className="hidden lg:inline" />Today</> : heroHeadline;
  const heroSubheadline = kenyaOnlyCopy(activeHeroSlide?.subheadline?.trim() || 'Discover quality vehicles across Kenya. Find the right car, make your move, and drive with confidence.');
  // Only an allow-listed administrator image replaces the built-in showroom; empty means the procedural showroom.
  const heroAdminBackgroundUrl = heroPresentation.backgroundUrl || KENYA_ROAD_HERO_BACKGROUND;
  const heroBackgroundStyle: React.CSSProperties = {
    backgroundImage: `url("${heroAdminBackgroundUrl}")`,
    backgroundSize: 'cover',
    backgroundPosition: `${Math.max(0, Math.min(100, Number(heroPresentation.backgroundPositionX) || 50))}% ${Math.max(0, Math.min(100, Number(heroPresentation.backgroundPositionY) || 50))}%`,
    backgroundRepeat: 'no-repeat',
    backgroundColor: 'transparent',
  };

  // Vehicle artwork always comes from the vehicle record/configuration.
  // No vehicle-specific asset mapping lives in the hero component.
  // R-10: an administrator may choose one of the listing's OWN gallery photos for the hero. It is honoured only while that photo is still in the
  // gallery; otherwise the primary photo is used. The listing record and its photo order are never modified.
  const heroImageForVehicle = (vehicle?: Vehicle) => {
    const chosen = vehicle ? heroCardContent[vehicle.id]?.heroImage : '';
    const valid = chosen && vehicle?.images?.includes(chosen) ? chosen : '';
    return heroImageFor(vehicle ? { heroImage: valid, images: vehicle.images, image: vehicle.image } : vehicle);
  };
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
  const heroSupportCopy = kenyaOnlyCopy(activeHeroCard?.message || (heroSubheadline === 'Discover quality vehicles across Kenya. Find the right car, make your move, and drive with confidence.' ? 'Find, compare and buy verified vehicles from trusted sellers across Kenya.' : heroSubheadline));
  // CTA labels: vehicle card content first (existing behaviour), then the admin hero slide's own button text, then the default.
  const heroPrimaryLabel = kenyaOnlyCopy(activeHeroCard?.ctaLabel || activeHeroSlide?.ctaPrimaryText?.trim() || 'Explore Vehicles');
  const heroSecondaryLabel = kenyaOnlyCopy(activeHeroSlide?.ctaSecondaryText?.trim() || 'Sell Your Vehicle');
  // Administrator-configured labels are capped for display (full text stays in the aria-label) so they can never overflow a button.
  const heroPrimaryLabelSafe = safeHeroCtaLabel(heroPrimaryLabel);
  const heroSecondaryLabelSafe = safeHeroCtaLabel(heroSecondaryLabel);
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

  const isShowcaseHeroVehicle = (vehicle?: Vehicle) => Boolean((vehicle as (Vehicle & { isShowcaseHeroVehicle?: boolean }) | undefined)?.isShowcaseHeroVehicle);
  const handleHeroVehicleSelect = (vehicle: Vehicle) => {
    if (isShowcaseHeroVehicle(vehicle)) {
      document.getElementById('market-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    handleVehicleSelect(vehicle);
  };

  const heroVehicleEyebrow = (vehicle: Vehicle) => {
    if (isShowcaseHeroVehicle(vehicle)) return 'ILLUSTRATIVE · NOT A LISTING';
    return heroCardContent[vehicle.id]?.eyebrow || (vehicle.auctionLifecycle === 'live' ? 'Live auction' : vehicle.auctionLifecycle === 'draft' ? 'Upcoming auction' : vehicle.auctionLifecycle === 'ended' ? 'Auction ended' : 'KAYARD KE SELECT');
  };
  const heroVehicleDetailText = (vehicle: Vehicle) => {
    if (isShowcaseHeroVehicle(vehicle)) return 'KAYARD KE showroom artwork. Browse real vehicles below.';
    return vehicle.isAuction ? heroAuctionMeta(vehicle) : heroCardContent[vehicle.id]?.detail || vehicle.description || 'Premium vehicle showcase';
  };

  // Desktop lane geometry. Each vehicle owns a lane on its own side of the
  // centre card; admin values are clamped so a lane can never intersect the
  // card, whatever the stored configuration says. This replaces the previous
  // fixed 43% vehicle width + outward nudge, which overlapped the 42%-wide
  // card and was then clipped by the stage overflow boundary.
  const heroLane = (() => {
    const clampNum = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
    // The card is no longer scaled (it kept shrinking text and touch targets), so its layout width is its visual width.
    const cardVisualPct = clampNum(Number(heroPresentation.cardWidthPct) || 38, 28, 50);
    const gutterPct = 3;
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

  // FEATURED PICKS — a small curated strip built from real inventory.
  // It is rendered after the main inventory so the approved homepage
  // path from category navigation into the filterable catalogue stays
  // direct. Reuses existing marketPriceAvg, viewsCount and auctionEndsAt
  // fields; no mock or separately curated vehicle data is introduced.
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
    <div className="kayad-homepage w-full min-w-0 space-y-0 pb-32 sm:pb-20">
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

      {/* 1. HERO - one continuous commercial composition. */}
      {/* This legacy config key intentionally controls the combined hero/search discovery surface. */}
      {!savedOnly && homeConfig.sectionVisibility.searchTrustCard && (
        <PremiumHero
          environment={heroPresentation.backgroundUrl ? 'custom' : 'brand'}
          shortcuts={[
            { label: 'Find a Car', ariaLabel: 'Find a car — browse vehicle inventory', icon: <Search size={25} strokeWidth={2} />, onClick: () => { document.getElementById('market-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } },
            { label: 'Sell a Car', ariaLabel: 'Sell a car — create a vehicle listing', icon: <CarFront size={25} strokeWidth={2} />, onClick: () => onNavigate?.('dashboard:create-listing') },
            { label: 'Auctions', ariaLabel: 'Auctions — browse vehicle auctions', icon: <Gavel size={25} strokeWidth={2} />, onClick: () => onNavigate?.('discovery') },
            { label: 'Verified', ariaLabel: 'Verified vehicles — view inspection information', icon: <ShieldCheck size={25} strokeWidth={2} />, onClick: () => onNavigate?.('inspections') },
          ]}
          eyebrow={heroEyebrowDisplay}
          headline={heroHeadlineNode}
          supportCopy={heroSupportCopy}
          primaryLabel={heroPrimaryLabelSafe}
          primaryAria={`${heroPrimaryLabel} — browse KAYARD KE inventory`}
          secondaryLabel={heroSecondaryLabelSafe}
          secondaryAria={`${heroSecondaryLabel} — KAYARD KE`}
          onPrimary={() => activeHeroSlide?.ctaPrimaryLink ? onNavigate(activeHeroSlide.ctaPrimaryLink) : document.getElementById('market-results')?.scrollIntoView({ behavior: 'smooth' })}
          onSecondary={() => onNavigate(activeHeroSlide?.ctaSecondaryLink || 'dashboard:create-listing')}
          vehicle={heroLeftVehicle && heroImageForVehicle(heroLeftVehicle) ? (() => {
            const v = heroLeftVehicle;
            const showcase = isShowcaseHeroVehicle(v);
            return {
              key: v.id,
              title: `${v.year ? `${v.year} ` : ''}${v.make} ${v.model}`.trim(),
              alt: showcase ? `Illustrative KAYARD KE showroom artwork: ${v.make} ${v.model}` : `${v.year} ${v.make} ${v.model}`,
              imageSrc: heroImageForVehicle(v),
              mobileSrc: heroMobileImageForVehicle(v),
              isPhoto: !showcase && !v.heroMobileImage,
              illustrative: showcase,
              eyebrow: heroVehicleEyebrow(v),
              detail: heroVehicleDetailText(v),
              broken: Boolean(brokenHeroImages[v.id]),
              ariaLabel: showcase ? `Browse vehicles. ${v.make} ${v.model} is illustrative artwork, not a listing` : `View ${v.year} ${v.make} ${v.model}`,
            };
          })() : undefined}
          onVehicleSelect={() => heroLeftVehicle && handleHeroVehicleSelect(heroLeftVehicle)}
          onVehicleBroken={() => heroLeftVehicle && setBrokenHeroImages((prev) => (prev[heroLeftVehicle.id] ? prev : { ...prev, [heroLeftVehicle.id]: true }))}
          slideCount={heroPairCount}
          slideIndex={heroPairIndex}
          onPrev={() => changeHeroPair(heroPairIndex - 1)}
          onNext={() => changeHeroPair(heroPairIndex + 1)}
          onGo={changeHeroPair}
          showArrows={heroPresentation.arrowEnabled}
          showDots={heroPresentation.dotsEnabled}
          autoplay={heroAutoplayAllowed}
          paused={heroUserPaused}
          onTogglePause={() => setHeroUserPaused((paused) => !paused)}
          showVehicleInfo={heroPresentation.showVehicleInfoCards}
          backgroundUrl={heroPresentation.backgroundUrl || undefined}
          backgroundStyle={heroBackgroundStyle}
          primaryColor={heroPresentation.primaryButtonColor}
          secondaryBorderColor={heroPresentation.secondaryButtonBorderColor}
          emptyNote={heroComp === 'empty' && heroSelection.kind === 'none' && featuredResolved && campaignResolved ? 'Featured vehicles appear here as soon as verified sellers list them.' : undefined}
          stageHandlers={{
            onMouseEnter: () => setHeroPointerInside(true),
            onMouseLeave: () => setHeroPointerInside(false),
            onFocusCapture: () => setHeroFocusInside(true),
            onBlurCapture: (event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHeroFocusInside(false); },
            onPointerDownCapture: markHeroInteraction,
          }}
        />
      )}

      {/* Marketplace categories: the visual bridge from hero to inventory, matching the original discovery concept without adding a second dashboard. */}
      {!savedOnly && <section className="kayad-home-category-strip border-y border-[#D7E7E4] bg-white" aria-label="Vehicle categories">
        <div className="mx-auto flex max-w-[1480px] items-center gap-2 overflow-x-auto px-4 py-3 sm:px-6 lg:px-8">
          {[
            ['All', () => { setCurrentPage(1); setSelectedBodyStyle('All'); setSelectedFuel('All'); }],
            ['SUV', () => { setCurrentPage(1); setSelectedBodyStyle('SUV'); setSelectedFuel('All'); }],
            ['Sedan', () => { setCurrentPage(1); setSelectedBodyStyle('Sedan'); setSelectedFuel('All'); }],
            ['Pickup', () => { setCurrentPage(1); setSelectedBodyStyle('Pickup'); setSelectedFuel('All'); }],
            ['Hatchback', () => { setCurrentPage(1); setSelectedBodyStyle('Hatchback'); setSelectedFuel('All'); }],
            ['Truck', () => { setCurrentPage(1); setSelectedBodyStyle('Truck'); setSelectedFuel('All'); }],
            ['Electric', () => { setCurrentPage(1); setSelectedBodyStyle('All'); setSelectedFuel('Electric'); }],
            ['Hybrid', () => { setCurrentPage(1); setSelectedBodyStyle('All'); setSelectedFuel('Hybrid'); }],
          ].map(([label, action]) => (
            <button
              key={label as string}
              aria-pressed={
                label === 'All' ? selectedBodyStyle === 'All' && selectedFuel === 'All'
                : label === 'Electric' || label === 'Hybrid' ? selectedFuel === label
                : selectedBodyStyle === label
              }
              aria-label={label === 'All' ? 'All vehicle categories (does not clear other filters)' : `${label} category`}
              type="button"
              onClick={action as () => void}
              className={`shrink-0 min-h-10 rounded-full border px-4 py-2 text-[11px] font-extrabold transition ${(label === 'All' ? selectedBodyStyle === 'All' && selectedFuel === 'All' : label === 'Electric' || label === 'Hybrid' ? selectedFuel === label : selectedBodyStyle === label) ? 'border-navy-600 bg-navy-600 text-white shadow-sm' : 'border-[#D7E7E4] bg-white text-[#64748B] hover:border-navy-600 hover:text-navy-600'}`}
            >
              {label as string}
            </button>
          ))}
          <button type="button" onClick={() => document.getElementById('market-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="ml-auto hidden shrink-0 items-center gap-1 text-[11px] font-extrabold text-navy-600 lg:flex">
            View all vehicles <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </section>}




      <div className="w-full min-w-0 px-0 pt-5 flex gap-0 lg:gap-4 items-start" id="market-results">
        {/* Left floating ad rail - its own column, never overlapping
            the search/filter/grid content next to it. */}
        <FloatingAdRail placement="left_rail" />

        <div className="w-full flex-1 min-w-0 px-3 sm:px-4 lg:px-4 2xl:px-6">
        {/* 4. FILTER SUMMARY CHIPS */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {activeFilters.map((f) => (
              <button
                key={f.id}
                onClick={f.onClear}
                className="flex items-center gap-1.5 bg-white border border-[#D7E7E4] rounded-full px-3 py-1.5 text-[11px] font-semibold text-[#64748B] hover:border-navy-600 hover:text-navy-600 transition-colors"
              >
                {f.label}
                <X className="w-3 h-3" />

              </button>
            ))}
          </div>
        )}

        {/* 6. MARKET BODY: SIDEBAR + RESULTS GRID */}
        <div className={`kayad-market-layout grid ${showDesktopSidebar ? 'lg:grid-cols-[252px_minmax(0,1fr)]' : 'lg:grid-cols-1'} gap-6 items-start`}>
          {/* SIDEBAR */}
          {showDesktopSidebar && (
          <aside className="kayad-filter-panel hidden lg:flex lg:flex-col sticky top-20 overflow-hidden rounded-2xl border border-[#CFE3E0] bg-white shadow-[0_14px_40px_rgba(10,51,64,.10)]" aria-label="Vehicle inventory filters">
            <div className="kayad-filter-panel__header relative z-10 shrink-0 overflow-hidden bg-gradient-to-br from-[#0A3340] via-[#12576D] to-[#176B87] px-4 py-4 text-white">
              <div aria-hidden="true" className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-[#13B8A6]/25 blur-2xl" />
              <div className="relative flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25"><SlidersHorizontal className="h-5 w-5 text-[#7EE8DB]" aria-hidden="true" /></span>
                  <div className="min-w-0">
                    <h3 className="text-[15px] font-extrabold leading-tight">Refine inventory</h3>
                    <p className="mt-0.5 text-[11.5px] leading-snug text-white/75">Narrow the marketplace without leaving the page.</p>
                  </div>
                </div>
              </div>
              <div className="relative mt-3 flex items-center justify-between">
                <span data-testid="sidebar-active-count" className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11.5px] font-bold ${activeSidebarFilters > 0 ? 'bg-[#13B8A6] text-[#06303A]' : 'bg-white/15 text-white/85'}`}>{activeSidebarFilters > 0 ? `${activeSidebarFilters} filter${activeSidebarFilters === 1 ? '' : 's'} active` : 'No filters active'}</span>
                <button onClick={resetFilters} className="rounded-lg px-2 py-1 text-[12.5px] font-bold text-white underline-offset-2 hover:bg-white/10 hover:underline">Reset all</button>
              </div>
            </div>
            <div className="kayad-filter-panel__body min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-4">
            <InventoryFilterPanel idPrefix="sidebar" variant="sidebar" values={filterValues} limits={filterLimits} options={filterOptionLists} onChange={applyFilterPatch} onReset={resetFilters} />


            {sidebarAds.length > 0 && (
              <div className="mt-4 pt-4 border-t border-[#D7E7E4] space-y-3">
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
            </div>
          </aside>
          )}

          {/* RESULTS */}
          <div ref={inventoryResultsRef} className="kayad-inventory-results relative min-h-[400px] min-w-0" aria-busy={refreshing || undefined}>
        {filterRangeError && <div role="alert" aria-live="polite" className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-800">{filterRangeError}</div>}
        <div className="kayad-inventory-controls-stack">
        {!savedOnly && homeConfig.sectionVisibility.searchTrustCard && (
          <div className="kayad-inventory-search-row" data-testid="mobile-search-row">
            <label className="kayad-inventory-search-field">
              <Search className="h-4 w-4 shrink-0 text-[#7A98A2]" aria-hidden="true" />
              <span className="sr-only">Search vehicles by make, model or keyword</span>
              <input
                type="search"
                enterKeyHint="search"
                value={searchQuery}
                onChange={(event) => { setCurrentPage(1); onSearchChange(event.target.value); }}
                placeholder="Make, model or keyword…"
                aria-label="Search vehicles by make, model or keyword"
              />
            </label>
            <button
              type="button"
              onClick={() => setShowMobileFilterDrawer(true)}
              aria-label={activeSidebarFilters > 0 ? `Open inventory filters, ${activeSidebarFilters} active` : 'Open inventory filters'}
              className="kayad-inventory-search-filter lg:hidden"
            >
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              <span>Filters</span>
              {activeSidebarFilters > 0 && <span className="kayad-inventory-filter-count">{activeSidebarFilters}</span>}
            </button>
          </div>
        )}
        {/* 5. MARKET HEAD */}
        <div className="kayad-market-toolbar mb-5 rounded-2xl border border-[#D7E7E4] bg-white shadow-[0_10px_30px_rgba(11,29,58,0.06)]">
          <div className="flex flex-col gap-3 p-3 sm:gap-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="hidden flex-wrap items-center gap-2.5 sm:flex">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#DDF4F0] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-navy-700">
                  <LayoutGrid className="h-3.5 w-3.5" /> {savedOnly ? 'Saved vehicles' : 'Marketplace inventory'}
                </span>
                <span className="text-[11px] font-semibold text-[#64748B]">{selectedCounty}</span>
              </div>
              {/* The Saved destination has no hero, so its heading is the page's main heading. */}
              {(() => { const Heading = (savedOnly ? 'h1' : 'h2') as 'h1' | 'h2'; return (
              <Heading className="mt-0 flex flex-wrap sm:mt-2 items-center gap-2 font-display text-xl sm:text-2xl font-bold tracking-[-0.02em] text-navy-900">
                {/* The Saved destination reuses this grid but must identify itself as the buyer's saved list, not the full inventory. */}
                {savedOnly ? 'Saved Vehicles' : 'Vehicle Inventory'}
                {!isLoading && (
                  <span className="inline-flex items-center rounded-full bg-[#DDF4F0] px-2.5 py-1 text-[11px] font-bold tracking-[0.02em] text-navy-700">
                    {inventoryStatusText ?? `${serverTotal.toLocaleString()} vehicle${serverTotal === 1 ? '' : 's'}`}
                  </span>
                )}
              </Heading>); })()}
              <p className="kayad-toolbar-blurb mt-1 max-w-2xl text-xs sm:text-[13px] leading-relaxed text-[#64748B]">
                {savedOnly ? 'The vehicles you have saved, with their inspection status, pricing and auction availability.' : 'Compare vehicle listings, pricing and auction availability in one clear view.'}
              </p>
            </div>

            <div className="kayad-market-toolbar-controls flex flex-wrap items-center gap-2">
              <div className="kayad-toolbar-control flex h-10 items-center gap-1 rounded-xl border border-[#D7E7E4] bg-[#F6FAF9] p-1" aria-label="Results per page">
                <span className="px-2 text-[10px] font-black uppercase tracking-[0.12em] text-[#64748B]">Show</span>
                {[12, 24, 48].map((n) => (
                  <button
                    type="button"
                    key={n}
                    onClick={() => { setCurrentPage(1); setPageSize(n); }}
                    aria-pressed={pageSize === n}
                    className={`h-8 min-w-9 rounded-lg px-2.5 text-[11px] font-bold transition-colors ${pageSize === n ? 'bg-navy-900 text-white shadow-sm' : 'text-[#64748B] hover:bg-white hover:text-navy-900'}`}
                  >
                    {n}
                  </button>
                ))}
              </div>

              <label className="kayad-toolbar-control flex h-10 items-center gap-2 rounded-xl border border-[#D7E7E4] bg-white px-3 focus-within:border-navy-600">
                <span className="text-[10px] font-bold uppercase tracking-wide text-[#64748B]">Sort</span>
                <select
                  value={sortBy}
                  onChange={(e) => { setCurrentPage(1); setSortBy(e.target.value as typeof sortBy); }}
                  aria-label="Sort inventory"
                  className="min-w-0 flex-1 bg-transparent text-xs font-bold text-navy-900 outline-none focus-visible:ring-2 focus-visible:ring-[#13B8A6]"
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

              {viewMode === 'grid' && availableGridColumns.length > 0 && (
                <div className="kayad-toolbar-control hidden h-10 items-center gap-1 rounded-xl border border-[#D7E7E4] bg-[#F6FAF9] p-1 lg:flex" role="group" aria-label="Desktop grid columns">
                  {availableGridColumns.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setGridColumns(n)}
                      aria-pressed={effectiveGridColumns === n}
                      className={`h-8 min-w-9 rounded-lg px-2 text-[11px] font-bold transition-colors ${effectiveGridColumns === n ? 'bg-navy-600 text-white' : 'text-[#64748B] hover:bg-white hover:text-navy-900'}`}
                      title={`${n} columns`}
                      aria-label={`${n} columns${effectiveGridColumns === n ? ' (showing)' : ''}`}
                    >
                      <span className="hidden sm:inline">{n} columns</span><span className="sm:hidden">{n}×</span>
                    </button>
                  ))}
                </div>
              )}
              {viewMode === 'grid' && inventoryResultsWidth > 0 && (
                <span className="hidden lg:inline text-[10px] font-semibold text-[#64748B]" aria-live="polite" data-testid="effective-grid-columns">
                  Showing {effectiveGridColumns} column{effectiveGridColumns === 1 ? '' : 's'}
                </span>
              )}

              <div className="kayad-toolbar-control kayad-inventory-view-toggle flex h-10 items-center rounded-xl border border-[#D7E7E4] bg-white p-1" role="group" aria-label="Inventory view" data-testid="inventory-view-controls">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  aria-pressed={viewMode === 'grid'}
                  title="Grid view"
                  aria-label="Grid view"
                  className={`flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-bold transition-colors ${viewMode === 'grid' ? 'bg-[#DDF4F0] text-navy-700' : 'text-[#64748B] hover:text-[#12576D]'}`}
                >
                  <Grid className="w-3.5 h-3.5" /> <span className="hidden xl:inline">Grid</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  aria-pressed={viewMode === 'list'}
                  title="List view"
                  aria-label="List view"
                  className={`flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-bold transition-colors ${viewMode === 'list' ? 'bg-[#DDF4F0] text-navy-700' : 'text-[#64748B] hover:text-[#12576D]'}`}
                >
                  <ListIcon className="w-3.5 h-3.5" /> <span className="hidden xl:inline">List</span>
                </button>
              </div>


              {isAdmin && (
                <button onClick={() => setShowAdminPanel(true)} className="flex items-center gap-1.5 rounded-xl bg-navy-900 px-3 py-2 text-[10px] font-bold text-white shadow-sm hover:bg-navy-700" title="Customize Home Page">
                  <Settings className="w-3.5 h-3.5" /> <span>Customize Home Page</span>
                </button>
              )}
              {isAdmin && (
                <button onClick={() => setShowAdManager(true)} className="flex items-center gap-1.5 rounded-xl border border-[#D7E7E4] bg-white px-3 py-2 text-[10px] font-bold text-[#64748B] hover:bg-[#F6FAF9]" title="Manage Ads">
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


        </div>

          
            {refreshing && (
              <div role="progressbar" aria-label="Updating results" data-testid="inventory-refresh-bar" className="kayad-refresh-bar pointer-events-none absolute inset-x-0 top-0 z-10 h-[3px] overflow-hidden rounded-full bg-[#DDF4F0]">
                <span className="block h-full w-1/3 rounded-full bg-[#13B8A6]" />
              </div>
            )}
            {isLoading && !(hasLoadedOnce.current && serverVehicles.length > 0) ? (
              <>
                {slowLoad && (
                  <p role="status" data-testid="inventory-slow-hint" className="mb-3 rounded-xl border border-[#BDE5DE] bg-[#E6F6F3] px-3 py-2 text-xs font-semibold text-[#12576D]">
                    Still loading — the server may be waking up. This can take up to a minute; we’ll keep trying.
                  </p>
                )}
                <SkeletonGrid count={pageSize} />
              </>
            ) : (loadError || serverError) ? (
              <div role="status" className="rounded-2xl border border-[#D7E7E4] bg-white px-6 py-14 text-center shadow-sm">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EAF5F3] text-navy-600"><AlertTriangle className="h-5 w-5" aria-hidden="true" /></div>
                <h3 className="font-display text-base font-bold text-navy-900">{inventoryFailure?.title ?? 'Inventory is temporarily unavailable'}</h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#64748B]">
                  {inventoryFailure?.body}
                </p>
                {inventoryFailure?.status ? <p className="mt-2 text-xs text-[#64748B]">Reference: HTTP {inventoryFailure.status}</p> : null}
                <button type="button" onClick={retryInventory} className="mt-5 inline-flex h-10 items-center rounded-xl bg-navy-900 px-5 text-sm font-bold text-white transition hover:bg-navy-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--kayad-cyan)]">
                  Retry inventory
                </button>
              </div>
            ) : filteredVehicles.length === 0 ? (
              <div className="text-center py-16 bg-white border border-dashed border-[#D7E7E4] rounded-2xl">
                <Search className="w-8 h-8 text-[#BDE5DE] mx-auto mb-3" />
                {!savedOnly && serverTotal === 0 && !Object.entries(serverQuery).some(([key, value]) => !['page', 'limit', 'sort'].includes(key) && !(key === 'minPrice' && value === 50000)) ? (
                  <>
                    {/* Successful response, no filters applied, zero records: the marketplace is genuinely empty (not an outage). */}
                    <h3 className="text-sm font-bold text-navy-900 mb-1">No vehicles are listed right now</h3>
                    <p className="mx-auto mb-4 max-w-sm text-xs text-[#64748B]">New listings appear here as soon as they are approved. Please check back soon.</p>
                  </>
                ) : (
                  <>
                    <h3 className="text-sm font-bold text-navy-900 mb-1">No vehicles match your filters</h3>
                    <p className="text-xs text-[#64748B] mb-4">Try widening your price range or clearing a filter to see more results.</p>
                    <button onClick={resetFilters} className="bg-navy-900 text-white text-xs font-bold rounded-lg px-4 py-2">
                      Reset Filters
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div
                data-testid="inventory-grid"
                data-view-mode={viewMode}
                data-columns={viewMode === 'grid' ? gridColumns : undefined}
                data-effective-columns={viewMode === 'grid' ? effectiveGridColumns : undefined}
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
                    <p className="text-xs text-[#BDE5DE] mb-4">Explore vehicles listed for auction across Kenya. Review each listing and seller details before bidding.</p>
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
                      data-layout={viewMode}
                      className={`kayad-vehicle-card group bg-white border border-[#D7E7E4] rounded-2xl overflow-hidden flex shadow-[0_6px_22px_rgba(11,29,58,0.055)] hover:shadow-[0_14px_34px_rgba(11,29,58,0.12)] hover:-translate-y-0.5 hover:border-[#176B87]/45 transition-all duration-200 ${viewMode === 'list' ? 'flex-col sm:flex-row' : 'flex-col'}`}
                    >
                      <InventoryCardMedia
                        title={v.title}
                        images={v.images}
                        priority={idx < 3}
                        onOpen={() => handleVehicleSelect(v)}
                        className={viewMode === 'list' ? 'aspect-[16/10] w-full sm:aspect-[4/3] sm:h-auto sm:w-[260px] sm:shrink-0 sm:self-stretch' : 'aspect-[16/11] w-full sm:aspect-[4/3]'}
                        top={<>
                          <div className="flex flex-wrap gap-1 max-w-[78%]">
                            {v.verified && (
                              <span className="hidden max-sm:inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full text-white shadow-sm bg-[#0A3340]/90 whitespace-nowrap">
                                <ShieldCheck className="w-3.5 h-3.5 text-[#13B8A6]" aria-hidden="true" /><span aria-hidden="true">Verified</span><span className="sr-only">Verified dealer</span>
                              </span>
                            )}
                            {v.reserved && (
                              <span data-testid="reserved-badge" className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full text-white shadow-sm bg-[#9A5B13]">
                                <Lock className="w-3 h-3" aria-hidden="true" />Reserved
                              </span>
                            )}
                            {showLiveAuction && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full text-white shadow-sm bg-rose-600">
                                <Gavel className="w-3 h-3" />Live Auction
                              </span>
                            )}
                            {showUpcomingAuction && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full text-white shadow-sm bg-navy-600">
                                <Gavel className="w-3 h-3" />Upcoming Auction
                              </span>
                            )}
                            {showEndedAuction && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full text-white shadow-sm bg-[#5AAFA4]">
                                <Gavel className="w-3 h-3" />Auction Ended
                              </span>
                            )}
                            {showEscrow && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full text-white shadow-sm bg-navy-900">
                                <Lock className="w-3 h-3" />Escrow
                              </span>
                            )}
                            {showInspected && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full text-white shadow-sm bg-emerald-700">
                                <ShieldCheck className="w-3 h-3" />Inspected
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => onToggleSave(v.id)}
                            aria-pressed={isSaved}
                            className={`w-9 h-9 max-sm:w-10 max-sm:h-10 rounded-full shadow-sm flex items-center justify-center transition-colors focus-visible:ring-2 focus-visible:ring-white ${isSaved ? 'bg-rose-500 text-white' : 'bg-white/95 text-[#12576D] hover:text-rose-500'}`}
                            title={isSaved ? 'Remove from saved' : 'Save vehicle'}
                            aria-label={isSaved ? `Remove ${v.title} from saved vehicles` : `Save ${v.title}`}
                          >
                            <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} aria-hidden="true" />
                          </button>
                        </>}
                        bottom={<>
                        {/* STAGE 10 FIX: gated on auctionLifecycle === 'live', not
                            the isAuction capability flag — a scheduled or ended
                            auction must never show a "current bid, live now"
                            banner implying it is bid-ready. */}
                        {showLiveAuction && v.currentBid && (
                          <div className="absolute bottom-0 left-0 right-0 bg-navy-900/90 backdrop-blur-sm text-white text-[10px] px-3 py-2 flex items-center justify-between gap-2">
                            <span className="font-semibold text-[#DDF4F0]">Current bid</span>
                            <span className="font-black">{formatPriceM(v.currentBid)}</span>
                          </div>
                        )}
                        </>}
                      />

                      <div className={`kayad-vc-body ${inventoryDensity.body} flex-1 flex flex-col min-w-0`}>
                        {v.location && (
                          <p className="kayad-vc-loc mb-2 hidden items-center gap-1.5 text-[14px] font-semibold text-[#0A3340] max-sm:flex">
                            <MapPin className="h-4 w-4 text-[#176B87] shrink-0" aria-hidden="true" /><span className="truncate">{v.location}</span>
                          </p>
                        )}
                        <div className="kayad-vc-main flex flex-col max-sm:grid max-sm:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] max-sm:items-center max-sm:gap-x-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="kayad-vc-kicker text-[11px] font-bold text-[#176B87] mb-1">{showLiveAuction ? 'Live auction' : showUpcomingAuction ? 'Upcoming auction' : showEndedAuction ? 'Auction ended' : v.verified ? 'Verified dealer' : v.isFeatured ? 'Featured vehicle' : 'Marketplace listing'}</p>
                            <h3 className={`${inventoryDensity.title} font-extrabold leading-snug tracking-[-0.01em] text-navy-900 line-clamp-2 max-sm:text-[18px] max-sm:uppercase ${viewMode === 'grid' ? 'sm:min-h-[2.6em]' : ''}`}>
                              {v.year} {v.make} {v.model}
                            </h3>
                          </div>
                          {v.verified && <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5 max-sm:hidden" aria-label="Verified dealer" />}
                        </div>

                        <div className={`kayad-vc-price mt-2 ${inventoryDensity.price} font-black tracking-tight text-navy-900 max-sm:text-[30px] max-sm:leading-none max-sm:!text-[#176B87]`}>{formatPriceM(v.price)}</div>

                        <div className={`kayad-vc-specs mt-2.5 grid grid-cols-2 ${viewMode === 'list' ? 'sm:grid-cols-4' : ''} gap-x-2 gap-y-1.5 ${inventoryDensity.meta} font-medium text-[#64748B] max-sm:grid-cols-1 max-sm:col-start-2 max-sm:row-start-1 max-sm:row-span-2 max-sm:mt-0 max-sm:border-l max-sm:border-[#D7E7E4] max-sm:pl-3 max-sm:gap-y-2.5 max-sm:text-[13px] max-sm:text-[#334155]`}>
                          {v.mileage > 0 && <span className="inline-flex items-center gap-1.5 min-w-0"><Gauge className="w-3 h-3 text-navy-600 shrink-0" />{v.mileage.toLocaleString()} km</span>}
                          {v.fuelType && <span className="inline-flex items-center gap-1.5 min-w-0"><Fuel className="w-3 h-3 text-[var(--kayad-cyan)] shrink-0" />{v.fuelType}</span>}
                          {v.transmission && <span className="inline-flex items-center gap-1.5 min-w-0"><ArrowRightLeft className="w-3 h-3 text-[#94A3B8] shrink-0" />{v.transmission}</span>}
                          {v.location && <span className="inline-flex items-center gap-1.5 min-w-0"><MapPin className="w-3 h-3 text-[#94A3B8] shrink-0" /><span className="truncate">{v.location}</span></span>}
                        </div>

                        </div>

                        <div className={`kayad-vc-actions mt-auto pt-3 flex flex-col gap-2 ${viewMode === 'list' ? 'sm:flex-row sm:justify-end' : ''} max-sm:mt-4 max-sm:grid max-sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]`}>
                          <button
                            type="button"
                            onClick={() => handleVehicleSelect(v)}
                            className={`kayad-vc-cta w-full max-sm:capitalize max-sm:min-h-12 max-sm:text-[14px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#B8D9D6] bg-white hover:bg-[#DDF4F0] hover:border-navy-600/40 py-2.5 text-xs font-extrabold text-navy-700 transition-colors ${viewMode === 'list' ? 'sm:w-auto sm:px-6' : ''}`}
                          >
                            View vehicle details <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setContactVehicle({ id: v.id, title: v.title })}
                            aria-label={`Contact seller about ${v.title}`}
                            className="kayad-vc-contact hidden min-h-12 items-center justify-center gap-2 rounded-xl bg-[#176B87] px-3 text-[14px] font-extrabold text-white hover:bg-[#12576D] max-sm:inline-flex focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B87]"
                          >
                            <Phone className="h-4 w-4" aria-hidden="true" /> Contact Seller
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {/* Server-owned pagination: keep the result range visible even on a single page. */}
            {serverTotal > 0 && (
              <nav
                className="kayad-inventory-pagination mt-7 flex flex-col gap-3 rounded-2xl border border-[#D7E7E4] bg-white px-4 py-3 shadow-[0_5px_18px_rgba(10,51,64,.045)] sm:flex-row sm:items-center sm:justify-between"
                aria-label="Inventory pagination"
                data-testid="inventory-pagination"
              >
                <p className="text-xs font-medium text-[#64748B]" aria-live="polite" data-testid="pagination-summary">
                  Showing <strong className="font-extrabold text-navy-900">{Math.min((currentPage - 1) * pageSize + 1, serverTotal)}–{Math.min(currentPage * pageSize, serverTotal)}</strong> of <strong className="font-extrabold text-navy-900">{serverTotal.toLocaleString()}</strong> vehicles
                </p>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between gap-1.5 sm:justify-end" data-testid="pagination-controls">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-[#D7E7E4] bg-white text-navy-700 transition-colors hover:border-[#176B87] hover:bg-[#F1F8F7] disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <div className="flex min-w-0 items-center gap-1" aria-label="Choose inventory page">
                      {getInventoryPageItems(currentPage, totalPages).map((item, index) => item === 'ellipsis' ? (
                        <span key={`ellipsis-${index}`} className="px-1.5 text-sm text-[#8AA1A8]" aria-hidden="true">…</span>
                      ) : (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setCurrentPage(item)}
                          aria-label={`Go to page ${item}`}
                          aria-current={currentPage === item ? 'page' : undefined}
                          className={`kayad-pagination-page inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl border px-2 text-xs font-bold transition-colors ${currentPage === item ? 'border-[#0A3340] bg-[#0A3340] text-white shadow-sm' : 'border-transparent bg-transparent text-[#526B78] hover:border-[#D7E7E4] hover:bg-[#F1F8F7]'}`}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-[#D7E7E4] bg-white text-navy-700 transition-colors hover:border-[#176B87] hover:bg-[#F1F8F7] disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Next page"
                    >
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                )}
              </nav>
            )}
          </div>
        </div>
        </div>

        {/* Right floating ad rail - its own column, never overlapping
            the grid next to it. */}
        <div className="hidden 2xl:block shrink-0 w-16"><FloatingAdRail placement="right_rail" /></div>
      </div>

      {!savedOnly && featuredPicks.length > 0 && !serverError && (
        <section className="mx-auto w-full max-w-[1480px] px-4 pt-7 sm:px-6 lg:px-8" aria-labelledby="featured-vehicles-heading">
          <div className="mb-3 flex items-end justify-between gap-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-navy-600">KAYARD KE SELECT</span>
              <h2 id="featured-vehicles-heading" className="mt-1 font-display text-xl font-black tracking-[-0.025em] text-navy-900">Featured vehicles</h2>
              <p className="mt-0.5 text-xs text-[#64748B]">Real listings worth a closer look, selected from the live catalogue.</p>
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

      {!savedOnly && <div className="w-full px-3 sm:px-5 lg:px-7 2xl:px-10">
        {/* 7. CTA BANDS */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4 mt-12 rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-br from-navy-700 to-navy-900 text-white p-8 sm:p-10 flex flex-col justify-center gap-4">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--kayad-cyan)]">Buy with more confidence</span>
            <h3 className="text-xl sm:text-2xl font-bold font-display max-w-md">Request an independent inspection before you commit to a vehicle.</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-2 text-xs text-[#BDE5DE]">
              <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />Choose an independent provider</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />Review provider pricing and terms</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />Review how the report will be shared</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />Report access depends on the booking and sharing terms</div>
            </div>
            <button onClick={() => onNavigate('inspections')} className="self-start bg-navy-600 hover:bg-navy-700 text-white text-sm font-bold px-5 py-2.5 rounded-full mt-1">
              Request an Inspection →
            </button>
          </div>
          <div className="bg-[#F4F8FC] p-8 sm:p-9 flex flex-col justify-center">
            <h3 className="text-lg font-bold text-navy-900 mb-2 max-w-xs">Ready to sell your vehicle?</h3>
            <p className="text-xs text-[#58717B] mb-4 max-w-xs">Reach interested buyers through the KAYARD KE marketplace and manage your listing through the existing Seller Studio.</p>
            <button onClick={() => onNavigate('dashboard:my-vehicles')} className="self-start bg-navy-900 hover:bg-navy-700 text-white text-sm font-bold px-5 py-2.5 rounded-full">
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

      {contactVehicle && (
        <ContactSellerSheet
          vehicleId={contactVehicle.id}
          title={contactVehicle.title}
          onClose={() => setContactVehicle(null)}
          onOpenListing={() => { const v = [...filteredVehicles, ...vehicles].find((x) => x.id === contactVehicle.id); setContactVehicle(null); if (v) handleVehicleSelect(v); }}
        />
      )}

      {/* MOBILE FULL-SCREEN FILTER DRAWER */}
      {showMobileFilterDrawer && (
        <div className="kayad-mobile-filter-sheet fixed inset-0 bg-white z-[1100] overflow-y-auto lg:hidden" role="dialog" aria-modal="true" aria-labelledby="kayad-mobile-filter-title">
          <div className="sticky top-0 bg-white border-b border-[#D7E7E4] px-4 py-3 flex items-center justify-between">
            <div><h3 id="kayad-mobile-filter-title" className="text-sm font-extrabold text-navy-900">Refine inventory</h3><p className="text-[10px] text-[#64748B] mt-0.5">Adjust any filter, then return to the results.</p></div>
            <button onClick={() => setShowMobileFilterDrawer(false)} className="p-1.5" aria-label="Close filters">
              <X className="w-5 h-5 text-[#64748B]" aria-hidden="true" />
            </button>
          </div>
          <div className="p-4 pb-28">
            <InventoryFilterPanel idPrefix="mobile" variant="sheet" values={filterValues} limits={filterLimits} options={filterOptionLists} onChange={applyFilterPatch} onReset={resetFilters} />
          </div>
          <div className="sticky bottom-0 border-t border-[#D7E7E4] bg-white/95 px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-3 backdrop-blur">
            <button onClick={() => setShowMobileFilterDrawer(false)} className="h-12 w-full rounded-xl bg-[#0A3340] text-sm font-extrabold text-white">
              {serverLoading ? 'Updating…' : `Show ${serverTotal.toLocaleString('en-KE')} ${serverTotal === 1 ? 'vehicle' : 'vehicles'}`}
            </button>
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

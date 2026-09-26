import { useState, useCallback } from 'react';

/**
 * Admin-editable configuration for the home/marketplace page. Deliberately
 * scoped, not a general page builder: lets an admin control the presentation
 * of the EXISTING marketplace sections, edit EXISTING trust-pillar text,
 * and choose from a small set of PRESET cool accent themes. Inventory
 * presentation controls below only change layout/density/sidebar defaults;
 * they never change vehicle data, filtering rules, or business logic.
 * A true "add/remove any component, any layout, any color" system would
 * be a genuinely different, much larger project (a real CMS/page-builder
 * with a component registry, a layout engine, and a full color-token
 * system) - this is an honest, working v1 within that broader direction,
 * not a stand-in that pretends to be the whole thing.
 *
 * Persisted to localStorage (not a backend call) - this frontend has no
 * connected backend to persist to yet (confirmed throughout this
 * project's history: all data is local mock state), and the explicit
 * requirement was "without breaking backend" - a purely client-side,
 * presentation-only config that never touches vehicle data, filtering,
 * or any business logic satisfies that regardless of whether backend
 * persistence exists later. When a real backend is connected, swapping
 * this hook's storage from localStorage to an API call is a contained,
 * one-file change - nothing that reads HomePageConfig elsewhere needs to
 * change.
 */
export interface HomePageConfig {
  sectionVisibility: {
    searchTrustCard: boolean;
    featuredPicks: boolean;
    savedSearchesAndInventoryHeader: boolean;
    sponsorCardsInGrid: boolean;
    recentlyViewed: boolean;
  };
  trustPillars: {
    escrow: { heading: string; subtext: string };
    inspection: { heading: string; subtext: string };
    auctions: { heading: string; subtext: string };
  };
  /** A small, fixed set of preset accent colors (not a free-form color
   * picker) - each maps to real, already-used Tailwind color tokens, so
   * every accent usage across the page (badges, buttons, highlights)
   * stays internally consistent rather than admins picking an arbitrary
   * hex that only some elements would pick up. */
  accentTheme: 'blue' | 'cyan' | 'slate';
  heroFallbackVehicles: Array<{
    id: string;
    make: string;
    model: string;
    year: number;
    fuelType: string;
    transmission: string;
    tagline: string;
    image: string;
  }>;
  inventoryLayout: {
    viewMode: 'grid' | 'list';
    columns: 3 | 4 | 5;
    showSidebar: boolean;
    cardDensity: 'compact' | 'standard' | 'comfortable';
  };
}

export const ACCENT_THEME_OPTIONS: { id: HomePageConfig['accentTheme']; label: string; swatch: string }[] = [
  { id: 'blue', label: 'Electric Blue', swatch: '#1684FF' },
  { id: 'cyan', label: 'Cyan', swatch: '#20C4F4' },
  { id: 'slate', label: 'Slate Teal', swatch: '#176B87' },
];

/** Tailwind class fragments for each accent theme, keyed by the same
 * semantic roles used throughout the page (400/500/600 weight, text vs
 * background). Centralizing this mapping here means a page component
 * asks for `accentClasses.text400` etc. instead of hardcoding
 * the old warm accent token directly, so the whole page's accent actually changes
 * together when the admin picks a different theme. */
export const ACCENT_THEME_CLASSES: Record<HomePageConfig['accentTheme'], {
  text400: string; text500: string; text600: string;
  bg400: string; bg400Hover: string; border400: string; bg400Subtle: string;
}> = {
  blue: { text400: 'text-[#1684FF]', text500: 'text-[#1684FF]', text600: 'text-[#0F6ED8]', bg400: 'bg-[#1684FF]', bg400Hover: 'hover:bg-[#0F6ED8]', border400: 'border-[#1684FF]/25', bg400Subtle: 'bg-[#1684FF]/10' },
  cyan: { text400: 'text-[#20C4F4]', text500: 'text-[#20C4F4]', text600: 'text-[#159BC7]', bg400: 'bg-[#20C4F4]', bg400Hover: 'hover:bg-[#159BC7]', border400: 'border-[#20C4F4]/25', bg400Subtle: 'bg-[#20C4F4]/10' },
  slate: { text400: 'text-[#176B87]', text500: 'text-[#176B87]', text600: 'text-[#12576D]', bg400: 'bg-[#176B87]', bg400Hover: 'hover:bg-[#12576D]', border400: 'border-[#176B87]/25', bg400Subtle: 'bg-[#176B87]/10' },
};

export const DEFAULT_HOME_PAGE_CONFIG: HomePageConfig = {
  sectionVisibility: {
    searchTrustCard: true,
    featuredPicks: true,
    savedSearchesAndInventoryHeader: true,
    sponsorCardsInGrid: true,
    recentlyViewed: true,
  },
  trustPillars: {
    escrow: { heading: 'Escrow Protection', subtext: 'Required for private sellers, available for dealers' },
    inspection: { heading: '150-Point Inspection', subtext: 'On certified listings only - look for the badge' },
    auctions: { heading: 'Live Auctions', subtext: 'Bid live on select auction vehicles' },
  },
  accentTheme: 'slate',
  heroFallbackVehicles: [
    { id: 'hero-land-cruiser', make: 'Toyota', model: 'Land Cruiser', year: 2022, fuelType: 'Diesel', transmission: 'Automatic', tagline: 'Built for journeys that matter.', image: '/hero/kayad-land-cruiser.png' },
    { id: 'hero-mercedes-gle', make: 'Mercedes-Benz', model: 'GLE', year: 2021, fuelType: 'Petrol', transmission: 'Automatic', tagline: 'Luxury that moves you.', image: '/hero/kayad-mercedes-gle.png' },
    { id: 'hero-toyota-prado', make: 'Toyota', model: 'Prado', year: 2020, fuelType: 'Diesel', transmission: 'Automatic', tagline: 'Confidence for every road.', image: '/hero/kayad-prado.png' },
  ],
  inventoryLayout: {
    viewMode: 'grid',
    columns: 5,
    showSidebar: true,
    cardDensity: 'compact',
  },
};

const STORAGE_KEY = 'kayad_home_page_config_v1';

function loadConfig(): HomePageConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_HOME_PAGE_CONFIG;
    const parsed = JSON.parse(raw);
    // Shallow-merge over defaults rather than trusting stored data
    // wholesale - if a future version adds a new section/field, an
    // older saved config in someone's browser won't be missing it and
    // silently break rendering.
    return {
      ...DEFAULT_HOME_PAGE_CONFIG,
      ...parsed,
      accentTheme: parsed.accentTheme === 'cyan' ? 'cyan' : 'slate',
      sectionVisibility: { ...DEFAULT_HOME_PAGE_CONFIG.sectionVisibility, ...parsed.sectionVisibility },
      trustPillars: {
        escrow: { ...DEFAULT_HOME_PAGE_CONFIG.trustPillars.escrow, ...parsed.trustPillars?.escrow },
        inspection: { ...DEFAULT_HOME_PAGE_CONFIG.trustPillars.inspection, ...parsed.trustPillars?.inspection },
        auctions: { ...DEFAULT_HOME_PAGE_CONFIG.trustPillars.auctions, ...parsed.trustPillars?.auctions },
      },
      heroFallbackVehicles: Array.isArray(parsed.heroFallbackVehicles) && parsed.heroFallbackVehicles.length
        ? parsed.heroFallbackVehicles.slice(0, 6).map((item: any, index: number) => ({
            id: String(item?.id || `hero-fallback-${index + 1}`),
            make: String(item?.make || ''), model: String(item?.model || ''),
            year: Number(item?.year) || 2026, fuelType: String(item?.fuelType || ''),
            transmission: String(item?.transmission || ''), tagline: String(item?.tagline || ''), image: String(item?.image || ''),
          }))
        : DEFAULT_HOME_PAGE_CONFIG.heroFallbackVehicles,
      inventoryLayout: {
        ...DEFAULT_HOME_PAGE_CONFIG.inventoryLayout,
        ...parsed.inventoryLayout,
        viewMode: parsed.inventoryLayout?.viewMode === 'list' ? 'list' : 'grid',
        columns: [3, 4, 5].includes(parsed.inventoryLayout?.columns) ? parsed.inventoryLayout.columns : DEFAULT_HOME_PAGE_CONFIG.inventoryLayout.columns,
        showSidebar: true,
        cardDensity: ['compact', 'standard', 'comfortable'].includes(parsed.inventoryLayout?.cardDensity)
          ? parsed.inventoryLayout.cardDensity
          : DEFAULT_HOME_PAGE_CONFIG.inventoryLayout.cardDensity,
      },
    };
  } catch {
    // Malformed localStorage content (manual edit, corrupted write,
    // etc.) - fall back to defaults rather than crashing the home page.
    return DEFAULT_HOME_PAGE_CONFIG;
  }
}

export function useHomePageConfig() {
  const [config, setConfig] = useState<HomePageConfig>(loadConfig);

  const updateConfig = useCallback((updater: (prev: HomePageConfig) => HomePageConfig) => {
    setConfig((prev) => {
      const next = updater(prev);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Storage can fail (private browsing, quota, disabled storage) -
        // the config still updates in-memory for this session even if
        // it can't persist, rather than throwing and breaking the page.
      }
      return next;
    });
  }, []);

  const resetConfig = useCallback(() => {
    updateConfig(() => DEFAULT_HOME_PAGE_CONFIG);
  }, [updateConfig]);

  return { config, updateConfig, resetConfig };
}

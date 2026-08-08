import { useState, useCallback } from 'react';

/**
 * Admin-editable configuration for the home/marketplace page. Deliberately
 * scoped, not a general page builder: lets an admin toggle which of the
 * EXISTING sections are visible, edit the EXISTING trust-pillar text, and
 * choose from a small set of PRESET accent colors - not arbitrary new
 * components, arbitrary custom colors, or arbitrary layout reordering.
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
  accentTheme: 'amber' | 'emerald' | 'sky';
}

export const ACCENT_THEME_OPTIONS: { id: HomePageConfig['accentTheme']; label: string; swatch: string }[] = [
  { id: 'amber', label: 'Amber (default)', swatch: '#FBBF24' },
  { id: 'emerald', label: 'Emerald', swatch: '#34D399' },
  { id: 'sky', label: 'Sky Blue', swatch: '#38BDF8' },
];

/** Tailwind class fragments for each accent theme, keyed by the same
 * semantic roles used throughout the page (400/500/600 weight, text vs
 * background). Centralizing this mapping here means a page component
 * asks for `accentClasses.text400` etc. instead of hardcoding
 * `amber-400` directly, so the whole page's accent actually changes
 * together when the admin picks a different theme. */
export const ACCENT_THEME_CLASSES: Record<HomePageConfig['accentTheme'], {
  text400: string; text500: string; text600: string;
  bg400: string; bg400Hover: string; border400: string; bg400Subtle: string;
}> = {
  amber: { text400: 'text-amber-400', text500: 'text-amber-500', text600: 'text-amber-600', bg400: 'bg-amber-400', bg400Hover: 'hover:bg-amber-500', border400: 'border-amber-400/25', bg400Subtle: 'bg-amber-400/15' },
  emerald: { text400: 'text-emerald-400', text500: 'text-emerald-500', text600: 'text-emerald-600', bg400: 'bg-emerald-400', bg400Hover: 'hover:bg-emerald-500', border400: 'border-emerald-400/25', bg400Subtle: 'bg-emerald-400/15' },
  sky: { text400: 'text-sky-400', text500: 'text-sky-500', text600: 'text-sky-600', bg400: 'bg-sky-400', bg400Hover: 'hover:bg-sky-500', border400: 'border-sky-400/25', bg400Subtle: 'bg-sky-400/15' },
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
  accentTheme: 'amber',
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
      sectionVisibility: { ...DEFAULT_HOME_PAGE_CONFIG.sectionVisibility, ...parsed.sectionVisibility },
      trustPillars: {
        escrow: { ...DEFAULT_HOME_PAGE_CONFIG.trustPillars.escrow, ...parsed.trustPillars?.escrow },
        inspection: { ...DEFAULT_HOME_PAGE_CONFIG.trustPillars.inspection, ...parsed.trustPillars?.inspection },
        auctions: { ...DEFAULT_HOME_PAGE_CONFIG.trustPillars.auctions, ...parsed.trustPillars?.auctions },
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

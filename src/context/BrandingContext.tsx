import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { adminAPI } from '../api/api';

// Enhanced branding interface with comprehensive color customization
interface Branding {
  // Logo settings
  logoType: 'icon' | 'text' | 'image';
  logoText: string;
  logoUrl: string;
  brandTagline: string;

  // Primary color palette (KAYAD Slate Teal theme)
  primaryColor: string;      // Main brand color
  primaryLight: string;     // Lighter variant (#13B8A6)
  primaryDark: string;      // Darker variant (#0A3340)
  primaryGlow: string;       // Glow effect (rgba)

  // Accent colors
  accentColor: string;      // Secondary accent

  // Background colors
  backgroundColor: string;  // Main background
  surfaceColor: string;     // Cards/surfaces
  cardColor: string;        // Card backgrounds

  // Text colors
  textColor: string;        // Primary text
  textMutedColor: string;   // Muted text
  textDimColor: string;     // Dim text

  // UI colors
  borderColor: string;      // Borders
  successColor: string;     // Success state
  dangerColor: string;      // Danger state
  warningColor: string;     // Warning state
  infoColor: string;        // Info state
}

interface BrandingContextValue {
  branding: Branding;
  loading: boolean;
  hydrated: boolean;
  /** Raw admin navigation presentation state from the public config (unvalidated; resolved defensively by applyNavigationConfig). */
  navigation: unknown;
  // Helper to get computed CSS variables
  getCSSVariables: () => Record<string, string>;
}

// Default KAYAD Slate Teal scheme for the refined marketplace presentation
const DEFAULT_BRANDING: Branding = {
  logoType: 'icon',
  logoText: 'KAYAD',
  logoUrl: '',
  brandTagline: 'Premium Automotive Marketplace',

  // Primary KAYAD navy/blue palette
  primaryColor: '#176B87',      // Slate teal primary
  primaryLight: '#13B8A6',      // Teal accent
  primaryDark: '#0A3340',       // Deep navy
  primaryGlow: 'rgba(23, 107, 135, 0.22)',

  accentColor: '#13B8A6',       // Teal accent

  // Cool neutral background palette
  backgroundColor: '#F6FAF9',   // Main background
  surfaceColor: '#EEF7F5',      // Surface color
  cardColor: '#FFFFFF',        // Card color

  // Cool navy/slate text palette
  textColor: '#0A3340',         // Primary text
  textMutedColor: '#64748B',    // Muted text
  textDimColor: '#94A3B8',     // Dim text

  // Border and status colors
  borderColor: '#D7E7E4',
  successColor: '#10B981',
  dangerColor: '#EF4444',
  warningColor: '#176B87',
  infoColor: '#176B87',
};

// Normalize legacy amber/gold and true-black values coming from older saved admin themes.
// Non-legacy custom brand colors are preserved so existing white-label capabilities continue to work.
const LEGACY_BRAND_COLOR_MAP: Record<string, string> = {
  '#FBBF24': '#13B8A6', '#F59E0B': '#176B87', '#D97706': '#12576D',
  '#EAB308': '#13B8A6', '#CA8A04': '#176B87', '#B45309': '#12576D',
  '#92400E': '#0A3340', '#D4C4A8': '#13B8A6', '#FF9F43': '#176B87',
  '#E6C288': '#5AAFA4', '#F97316': '#176B87', '#FB923C': '#13B8A6',
  '#F0A500': '#13B8A6', '#D96B43': '#176B87', '#C77B58': '#5AAFA4',
  '#B44E28': '#12576D', '#A84A28': '#12576D', '#EA580C': '#176B87',
  '#E67E22': '#176B87', '#F39C12': '#176B87', '#FFA500': '#176B87',
  '#FFD700': '#13B8A6', '#1A1A2E': '#0A3340', '#C9A227': '#13B8A6',
  '#17244B': '#176B87', '#1E3063': '#0A3340', '#1E3A5F': '#12576D',
  '#F6F1E8': '#F6FAF9', '#F5F0E8': '#F6FAF9', '#F0EAD6': '#F6FAF9',
  '#FAFAFA': '#F6FAF9', '#F8FAFC': '#F6FAF9', '#E5E7EB': '#D7E7E4',
  '#E2E8F0': '#D7E7E4', '#1F2937': '#1E293B', '#6B7280': '#64748B',
  '#D2B48C': '#DDF4F0', '#C4A484': '#13B8A6',
  '#E2DDD5': '#F6FAF9', '#3B82F6': '#176B87', '#2563EB': '#176B87',
  '#60A5FA': '#5AAFA4', '#0F6ED8': '#0A3340', '#159BC7': '#176B87',
  '#00B0B5': '#13B8A6', '#06B6D4': '#13B8A6', '#EC4899': '#13B8A6',
  '#F472B6': '#5AAFA4', '#DBEAFE': '#DDF4F0', '#EEF4FA': '#EEF7F5',
  '#EAF5F7': '#EEF7F5', '#F8FBFF': '#F6FAF9', '#F2F8FB': '#EEF7F5',
  '#6366F1': '#176B87', '#8B5CF6': '#5AAFA4',
  '#A855F7': '#5AAFA4', '#C084FC': '#91CEC5', '#84CC16': '#5AAFA4',
  '#65A30D': '#2F8F87', '#0F172A': '#0A3340', '#111827': '#0A3340',
  '#000': '#0A3340', '#000000': '#0A3340',
  '#0A0A0A': '#0A3340', '#111': '#0A3340', '#111111': '#0A3340',
  '#1A1A1A': '#0A3340', '#0C0C0C': '#0A3340', '#080808': '#0A3340',
};

const BRANDING_COLOR_FALLBACKS: Partial<Record<keyof Branding, string>> = {
  primaryColor: '#176B87', primaryLight: '#13B8A6', primaryDark: '#0A3340',
  primaryGlow: 'rgba(23, 107, 135, 0.22)', accentColor: '#13B8A6',
  backgroundColor: '#F6FAF9', surfaceColor: '#EEF7F5', cardColor: '#FFFFFF',
  textColor: '#1E293B', textMutedColor: '#64748B', textDimColor: '#94A3B8',
  borderColor: '#D7E7E4', successColor: '#10B981', dangerColor: '#EF4444',
  warningColor: '#176B87', infoColor: '#176B87',
};

function normalizeLegacyBrandColor(value: string, field: keyof Branding): string {
  const trimmed = value.trim();
  const upper = trimmed.toUpperCase();
  const isLegacyBlack = /^#(?:000|000000|0A0A0A|111|111111|1A1A1A|0C0C0C|080808)$/.test(upper);
  if (isLegacyBlack) return BRANDING_COLOR_FALLBACKS[field] || '#0A3340';
  const exact = LEGACY_BRAND_COLOR_MAP[upper];
  if (exact) return exact;

  const hexWithAlpha = trimmed.match(/^#([0-9a-f]{6})([0-9a-f]{2})$/i);
  if (hexWithAlpha) {
    const baseKey = `#${hexWithAlpha[1]}`.toUpperCase();
    const base = LEGACY_BRAND_COLOR_MAP[baseKey];
    if (base) {
      const normalizedBase = /^#(?:000|000000|0A0A0A|111|111111|1A1A1A|0C0C0C|080808)$/.test(baseKey)
        ? (BRANDING_COLOR_FALLBACKS[field] || '#0A3340')
        : base;
      return `${normalizedBase}${hexWithAlpha[2]}`;
    }
  }

  const rgba = trimmed.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/i);
  if (rgba) {
    const rgb = `${rgba[1]},${rgba[2]},${rgba[3]}`;
    const alpha = rgba[4] ?? '1';
    const isBlack = rgb === '0,0,0' || rgb === '10,10,10' || rgb === '17,17,17' || rgb === '15,23,42' || rgb === '12,12,12';
    const amberRgbMap: Record<string, string> = {
      '251,191,36': '19,184,166', '245,158,11': '23,107,135',
      '217,119,6': '18,87,109', '234,179,8': '19,184,166',
      '212,196,168': '19,184,166', '255,159,67': '23,107,135',
      '230,194,136': '90,175,164', '249,115,22': '23,107,135',
      '251,146,60': '19,184,166', '240,165,0': '19,184,166',
      '37,99,235': '23,107,135', '59,130,246': '23,107,135',
      '96,165,250': '90,175,164', '99,102,241': '23,107,135',
      '139,92,246': '90,175,164', '168,85,247': '90,175,164',
      '192,132,252': '145,206,197', '132,204,22': '90,175,164',
      '101,163,13': '47,143,135', '6,182,212': '19,184,166',
      '236,72,153': '19,184,166', '30,48,99': '10,51,64',
      '201,162,39': '19,184,166', '255,215,0': '19,184,166',
      '255,165,0': '23,107,135', '255,255,0': '19,184,166',
      '243,156,18': '23,107,135', '196,164,132': '19,184,166',
      '30,58,95': '18,87,109', '246,241,232': '246,250,249',
      '245,240,232': '246,250,249', '240,234,214': '246,250,249',
      '210,180,140': '221,244,240', '229,231,235': '215,231,228',
      '226,232,240': '215,231,228', '248,250,252': '246,250,249',
    };
    if (isBlack && field === 'primaryGlow') return `rgba(10, 51, 64, ${alpha})`;
    if (isBlack) return BRANDING_COLOR_FALLBACKS[field] || '#0A3340';
    if (amberRgbMap[rgb]) return `rgba(${amberRgbMap[rgb]}, ${alpha})`;
  }
  return trimmed;
}

function normalizeBrandingConfig(config: Partial<Branding> | null | undefined): Branding {
  const merged = { ...DEFAULT_BRANDING, ...(config && typeof config === 'object' ? config : {}) } as Branding;
  const colorFields: Array<keyof Branding> = [
    'primaryColor', 'primaryLight', 'primaryDark', 'primaryGlow', 'accentColor',
    'backgroundColor', 'surfaceColor', 'cardColor', 'textColor', 'textMutedColor',
    'textDimColor', 'borderColor', 'successColor', 'dangerColor', 'warningColor', 'infoColor',
  ];
  for (const field of colorFields) {
    const value = merged[field];
    if (typeof value === 'string') merged[field] = normalizeLegacyBrandColor(value, field) as never;
  }
  return merged;
}

const BrandingCtx = createContext<BrandingContextValue | null>(null);

interface BrandingProviderProps {
  children: ReactNode;
}

export function BrandingProvider({ children }: BrandingProviderProps) {
  const [branding, setBranding] = useState<Branding | null>(null);
  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [navigation, setNavigation] = useState<unknown>(null);

  // Hydration guard - prevent flash on SSR/client mismatch
  useEffect(() => {
    setHydrated(true);
  }, []);

  // Apply CSS variables to document root whenever branding changes
  useEffect(() => {
    if (!branding) return;

    const root = document.documentElement;
    const cssVars = getCSSVariables(branding);

    Object.entries(cssVars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }, [branding]);

  useEffect(() => {
    if (!hydrated) return;

    adminAPI.getPublicConfig()
      .then(cfg => {
        const configBranding = cfg.config?.branding || cfg.branding;
        setBranding(normalizeBrandingConfig(configBranding));
        setNavigation(cfg.config?.navigation ?? cfg.navigation ?? null);
        setLoading(false);
      })
      .catch(() => {
        // Fallback to defaults on error
        setBranding(DEFAULT_BRANDING);
        setLoading(false);
      });
  }, [hydrated]);

  // Helper function to generate CSS variables from branding
  function getCSSVariables(brandingData: Branding): Record<string, string> {
    return {
      '--brand': brandingData.primaryColor,
      '--brand-light': brandingData.primaryLight,
      '--brand-dark': brandingData.primaryDark,
      '--brand-muted': '#5AAFA4',
      '--brand-100': '#DDF4F0',
      '--brand-200': '#BDE5DE',
      '--brand-300': '#91CEC5',
      '--brand-400': '#5AAFA4',
      '--brand-500': '#2F8F87',
      '--brand-600': '#176B87',
      '--brand-700': '#12576D',
      '--brand-800': '#0E4655',
      '--brand-900': '#0A3340',
      '--brand-glow': brandingData.primaryGlow,
      '--brand-glow-strong': brandingData.primaryGlow.replace(/,\s*[\d.]+\s*\)$/, ', 0.4)'),
      '--accent': brandingData.accentColor,
      '--bg': brandingData.backgroundColor,
      '--surface': brandingData.surfaceColor,
      '--card': brandingData.cardColor,
      '--text': brandingData.textColor,
      '--text-muted': brandingData.textMutedColor,
      '--text-dim': brandingData.textDimColor,
      '--border': brandingData.borderColor,
      '--success': brandingData.successColor,
      '--danger': brandingData.dangerColor,
      '--warning': brandingData.warningColor,
      '--info': brandingData.infoColor,
      // Deprecated compatibility aliases only; all in-app consumers use the brand tokens above.
      '--gold': brandingData.primaryColor,
      '--gold-light': brandingData.primaryLight,
      '--gold-dark': brandingData.primaryDark,
      '--gold-muted': '#5AAFA4',
      '--gold-glow': brandingData.primaryGlow,
      '--gold-glow-strong': brandingData.primaryGlow.replace(/,\s*[\d.]+\s*\)$/, ', 0.4)'),
      '--gold-100': '#DDF4F0',
      '--gold-200': '#BDE5DE',
      '--gold-300': '#91CEC5',
      '--gold-400': '#5AAFA4',
      '--gold-500': '#2F8F87',
      '--gold-600': '#176B87',
      '--gold-700': '#12576D',
      '--gold-800': '#0E4655',
      '--gold-900': '#0A3340',
    };
  }

  const value = useMemo(() => ({
    branding: branding || DEFAULT_BRANDING,
    loading,
    hydrated,
    navigation,
    getCSSVariables: branding ? () => getCSSVariables(branding) : () => getCSSVariables(DEFAULT_BRANDING),
  }), [branding, loading, hydrated, navigation]);

  // Render immediately with the local default palette; public configuration
  // hydrates after mount without leaving the entire application blank.
  return (
    <BrandingCtx.Provider value={value}>
      {children}
    </BrandingCtx.Provider>
  );
}

export const useBranding = (): BrandingContextValue => {
  const ctx = useContext(BrandingCtx);
  if (!ctx) {
    throw new Error('useBranding must be used within BrandingProvider');
  }
  return ctx;
};

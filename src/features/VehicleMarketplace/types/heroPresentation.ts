export interface HeroShowcaseVehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  image: string;
  /** Optional high-resolution transparent WebP used ONLY by the mobile carousel. Desktop always uses `image`. */
  mobileImage?: string;
  eyebrow?: string;
  tagline?: string;
  enabled: boolean;
}

export interface HeroFloatingCard {
  id: string;
  enabled: boolean;
  title: string;
  body?: string;
  eyebrow?: string;
  ctaLabel?: string;
  ctaLink?: string;
  leftPct?: number;
  topPct?: number;
  widthPct?: number;
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  opacityPct?: number;
  blurPx?: number;
}

export interface HeroPresentationConfig {
  stageHeightPct: number;
  stageMaxWidthPct: number;
  cardScalePct: number;
  cardWidthPct: number;
  cardOffsetXPct: number;
  cardOffsetYPct: number;
  cardBgOpacityPct: number;
  cardBlurPx: number;
  cardBorderColor: string;
  cardTextColor: string;
  backgroundUrl: string;
  backgroundPositionX: number;
  backgroundPositionY: number;
  backgroundScalePct: number;
  overlayColor: string;
  overlayOpacityPct: number;
  secondaryOverlayColor: string;
  secondaryOverlayOpacityPct: number;
  leftOffsetPct: number;
  rightOffsetPct: number;
  leftVehicleNudgePct: number;
  rightVehicleNudgePct: number;
  vehicleScalePct: number;
  vehicleTopPct: number;
  vehicleWidthPct: number;
  showVehicleInfoCards: boolean;
  showVehicleLabels: boolean;
  primaryButtonColor: string;
  secondaryButtonBorderColor: string;
  arrowEnabled: boolean;
  dotsEnabled: boolean;
  tickerEnabled: boolean;
  tickerFallbackText: string;
  tickerBackgroundColor: string;
  tickerTextColor: string;
  tickerHeightPx: number;
  tickerScrollSeconds: number;
  /** Mobile hero carousel stage height is clamp(min, 52vw, max) in px. */
  mobileStageMinPx: number;
  mobileStageMaxPx: number;
  /** Duration of the mobile slide transition in ms (0 = instant). Reduced motion always forces instant. */
  mobileTransitionMs: number;
  /** Seconds between automatic hero rotations (0 = no automatic rotation). Applies to the existing hero timers. */
  rotationSeconds: number;
  vehicleSource: 'showcase' | 'featured' | 'selected';
  showcaseVehicles: HeroShowcaseVehicle[];
  floatingCards: HeroFloatingCard[];
}

/** Defaults for the admin-controlled hero extras (values equal the approved visual foundation). */
export const HERO_EXTRAS_DEFAULTS = {
  mobileStageMinPx: 168,
  mobileStageMaxPx: 260,
  mobileTransitionMs: 320,
  rotationSeconds: 6.5,
} as const;

type HeroExtras = Pick<HeroPresentationConfig, 'mobileStageMinPx' | 'mobileStageMaxPx' | 'mobileTransitionMs' | 'rotationSeconds'>;

const finiteOr = (value: unknown, fallback: number) => {
  const n = typeof value === 'string' && value.trim() === '' ? NaN : Number(value);
  return Number.isFinite(n) ? n : fallback;
};
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/**
 * Single normalizer used by BOTH the public page and the admin save path, so a stored or edited
 * value can never break the layout. Unlike `Number(x) || default`, an explicit 0 is preserved
 * (0 = instant transition / no rotation / hidden skyline).
 */
export const normalizeHeroExtras = (source: Partial<Record<keyof HeroExtras, unknown>> | undefined | null): HeroExtras => {
  const src = source || {};
  const min = clamp(Math.round(finiteOr(src.mobileStageMinPx, HERO_EXTRAS_DEFAULTS.mobileStageMinPx)), 120, 320);
  const max = clamp(Math.round(finiteOr(src.mobileStageMaxPx, HERO_EXTRAS_DEFAULTS.mobileStageMaxPx)), 168, 420);
  const rotation = finiteOr(src.rotationSeconds, HERO_EXTRAS_DEFAULTS.rotationSeconds);
  return {
    mobileStageMinPx: min,
    mobileStageMaxPx: Math.max(min, max),
    mobileTransitionMs: clamp(Math.round(finiteOr(src.mobileTransitionMs, HERO_EXTRAS_DEFAULTS.mobileTransitionMs)), 0, 1000),
    rotationSeconds: rotation <= 0 ? 0 : clamp(rotation, 3, 60),
  };
};

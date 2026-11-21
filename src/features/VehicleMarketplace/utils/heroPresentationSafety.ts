/**
 * Client-side counterpart of backend/utils/heroPresentation.js (a parity test keeps the limits identical).
 * Applied both when a stored configuration is read for the public hero and when an administrator saves, so no value -
 * stored earlier, imported or typed - can clip the hero or reach CSS/navigation unsafely.
 */
export const HERO_NUMERIC_LIMITS: Readonly<Record<string, readonly [number, number, number]>> = Object.freeze({
  stageHeightPct: [70, 120, 100], stageMaxWidthPct: [90, 100, 100], cardScalePct: [70, 100, 100], cardWidthPct: [28, 50, 38],
  cardOffsetXPct: [-10, 10, 0], cardOffsetYPct: [-10, 10, 0], cardBgOpacityPct: [70, 100, 95], cardBlurPx: [0, 40, 18],
  backgroundPositionX: [0, 100, 50], backgroundPositionY: [0, 100, 50], backgroundScalePct: [100, 130, 100],
  overlayOpacityPct: [0, 60, 8], secondaryOverlayOpacityPct: [0, 60, 10],
  leftOffsetPct: [0, 30, 0], rightOffsetPct: [0, 30, 0], leftVehicleNudgePct: [0, 40, 28], rightVehicleNudgePct: [0, 40, 28],
  vehicleScalePct: [75, 125, 100], vehicleTopPct: [35, 65, 50], vehicleWidthPct: [32, 48, 43],
  tickerHeightPx: [28, 60, 36], tickerScrollSeconds: [10, 120, 34],
  mobileStageMinPx: [120, 320, 168], mobileStageMaxPx: [168, 420, 260], mobileTransitionMs: [0, 1000, 320],
});
export const HERO_COLOR_KEYS = ['cardBorderColor', 'overlayColor', 'secondaryOverlayColor', 'secondaryButtonBorderColor', 'tickerBackgroundColor', 'tickerTextColor', 'cardTextColor', 'primaryButtonColor'] as const;

const COLOR = /^(#[0-9A-Fa-f]{6}|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(\s*,\s*(0|1|0?\.\d+))?\s*\)|var\(--[a-z0-9-]+\))$/;
const SAFE_PATH = /^\/(hero|branding|uploads|assets)\/[A-Za-z0-9._\-/]+$/;
const SAFE_HTTPS = /^https:\/\/[^\s"'()\\<>]+$/;
const SAFE_LINK = /^\/(?!\/)[A-Za-z0-9._~\-/?=&%#]*$/;

export const isSafeHeroImageUrl = (v: unknown): v is string => typeof v === 'string' && v.length <= 512 && !v.includes('..') && (SAFE_PATH.test(v) || SAFE_HTTPS.test(v));
export const isSafeHeroLink = (v: unknown): v is string => typeof v === 'string' && v.length <= 256 && (SAFE_LINK.test(v) || SAFE_HTTPS.test(v));
export const isSafeHeroColor = (v: unknown): v is string => typeof v === 'string' && COLOR.test(v.trim());

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const finite = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? NaN : Number(v));

/** Returns a copy with numbers clamped to their safe range and unsafe URLs/colours/links replaced by safe defaults. Never throws. */
export function sanitizeHeroPresentation<T extends Record<string, any>>(input: T, defaults: Partial<T> = {}): T {
  const out: Record<string, any> = { ...input };
  for (const [key, [lo, hi, dflt]] of Object.entries(HERO_NUMERIC_LIMITS)) {
    if (!(key in out)) continue;
    const n = finite(out[key]);
    out[key] = Number.isFinite(n) ? clamp(n, lo, hi) : (defaults as any)[key] ?? dflt;
  }
  if ('mobileStageMinPx' in out && 'mobileStageMaxPx' in out) out.mobileStageMaxPx = Math.max(out.mobileStageMinPx, out.mobileStageMaxPx);
  for (const key of HERO_COLOR_KEYS) {
    if (key in out && out[key] !== '' && !isSafeHeroColor(out[key])) out[key] = (defaults as any)[key] ?? '';
  }
  if ('backgroundUrl' in out && out.backgroundUrl !== '' && !isSafeHeroImageUrl(out.backgroundUrl)) out.backgroundUrl = '';
  if (Array.isArray(out.showcaseVehicles)) {
    out.showcaseVehicles = out.showcaseVehicles.slice(0, 6).filter((v: any) => v && isSafeHeroImageUrl(v.image) && (!v.mobileImage || isSafeHeroImageUrl(v.mobileImage)));
  }
  if (Array.isArray(out.floatingCards)) {
    out.floatingCards = out.floatingCards.slice(0, 8).map((c: any) => (c && c.ctaLink && !isSafeHeroLink(c.ctaLink) ? { ...c, ctaLink: '' } : c));
  }
  return out as T;
}

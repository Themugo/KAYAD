// Server-side validation for the admin-controlled homepage hero (platform_config.hero_presentation).
// Mirrors src/features/VehicleMarketplace/utils/heroPresentationSafety.ts (a parity test keeps the two in step).
// Policy: numeric settings are CLAMPED to their safe range (so an out-of-range value can never clip the hero);
// unsafe strings (URLs, colours, links) are REJECTED so they can never reach CSS or navigation.

export const HERO_NUMERIC_LIMITS = Object.freeze({
  stageHeightPct: [70, 120, 100], stageMaxWidthPct: [90, 100, 100], cardScalePct: [70, 100, 100], cardWidthPct: [28, 50, 38],
  cardOffsetXPct: [-10, 10, 0], cardOffsetYPct: [-10, 10, 0], cardBgOpacityPct: [70, 100, 95], cardBlurPx: [0, 40, 18],
  backgroundPositionX: [0, 100, 50], backgroundPositionY: [0, 100, 50], backgroundScalePct: [100, 130, 100],
  overlayOpacityPct: [0, 60, 8], secondaryOverlayOpacityPct: [0, 60, 10],
  leftOffsetPct: [0, 30, 0], rightOffsetPct: [0, 30, 0], leftVehicleNudgePct: [0, 40, 28], rightVehicleNudgePct: [0, 40, 28],
  vehicleScalePct: [75, 125, 100], vehicleTopPct: [35, 65, 50], vehicleWidthPct: [32, 48, 43],
  tickerHeightPx: [28, 60, 36], tickerScrollSeconds: [10, 120, 34],
  mobileStageMinPx: [120, 320, 168], mobileStageMaxPx: [168, 420, 260], mobileTransitionMs: [0, 1000, 320],
});
export const HERO_COLOR_KEYS = Object.freeze(["cardBorderColor", "overlayColor", "secondaryOverlayColor", "secondaryButtonBorderColor", "tickerBackgroundColor", "tickerTextColor"]);
export const HERO_CTA_MAX_CHARS = 32;

const COLOR = /^(#[0-9A-Fa-f]{6}|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(\s*,\s*(0|1|0?\.\d+))?\s*\)|var\(--[a-z0-9-]+\))$/;
const SAFE_PATH = /^\/(hero|branding|uploads|assets)\/[A-Za-z0-9._\-/]+$/;
const SAFE_HTTPS = /^https:\/\/[^\s"'()\\<>]+$/;
const SAFE_LINK = /^\/(?!\/)[A-Za-z0-9._~\-/?=&%#]*$/;

export const isSafeHeroImageUrl = (v) => typeof v === "string" && v.length <= 512 && !v.includes("..") && (SAFE_PATH.test(v) || SAFE_HTTPS.test(v));
export const isSafeHeroLink = (v) => typeof v === "string" && v.length <= 256 && (SAFE_LINK.test(v) || SAFE_HTTPS.test(v));
export const isSafeHeroColor = (v) => typeof v === "string" && COLOR.test(v.trim());

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const finite = (v) => (typeof v === "string" && v.trim() === "" ? NaN : Number(v));
const text = (v, max) => String(v ?? "").replace(/[<>]/g, "").trim().slice(0, max);

export function validateHeroPresentation(input) {
  const errors = [];
  if (input === undefined || input === null) return { value: input, errors };
  if (typeof input !== "object" || Array.isArray(input)) return { value: undefined, errors: ["heroPresentation must be an object"] };
  const out = { ...input };

  for (const [key, [lo, hi]] of Object.entries(HERO_NUMERIC_LIMITS)) {
    if (!(key in input)) continue;
    const n = finite(input[key]);
    if (!Number.isFinite(n)) { delete out[key]; continue; } // unusable value: fall back to the default on read
    out[key] = clamp(n, lo, hi);
  }
  if ("mobileStageMinPx" in out && "mobileStageMaxPx" in out) out.mobileStageMaxPx = Math.max(out.mobileStageMinPx, out.mobileStageMaxPx);
  if ("rotationSeconds" in input) {
    const n = finite(input.rotationSeconds);
    out.rotationSeconds = !Number.isFinite(n) || n <= 0 ? 0 : clamp(n, 3, 60);
  }
  for (const key of HERO_COLOR_KEYS) {
    if (key in input && input[key] !== "" && !isSafeHeroColor(input[key])) errors.push(`${key} must be a hex, rgb(a) or theme-variable colour`);
  }
  if ("cardTextColor" in input && input.cardTextColor !== "" && !isSafeHeroColor(input.cardTextColor)) errors.push("cardTextColor must be a hex, rgb(a) or theme-variable colour");
  if ("primaryButtonColor" in input && input.primaryButtonColor !== "" && !isSafeHeroColor(input.primaryButtonColor)) errors.push("primaryButtonColor must be a hex, rgb(a) or theme-variable colour");
  if ("backgroundUrl" in input && input.backgroundUrl !== "" && !isSafeHeroImageUrl(input.backgroundUrl)) errors.push("backgroundUrl must be empty (KAYAD showroom), an app image path or an https image URL");
  if ("vehicleSource" in input && !["showcase", "featured", "selected"].includes(input.vehicleSource)) errors.push("vehicleSource must be showcase, featured or selected");
  for (const flag of ["showcaseFallbackEnabled", "showVehicleInfoCards", "showVehicleLabels", "arrowEnabled", "dotsEnabled", "tickerEnabled"]) {
    if (flag in input && typeof input[flag] !== "boolean") errors.push(`${flag} must be true or false`);
  }
  if ("tickerFallbackText" in input) out.tickerFallbackText = text(input.tickerFallbackText, 160);

  if ("showcaseVehicles" in input) {
    if (!Array.isArray(input.showcaseVehicles)) errors.push("showcaseVehicles must be a list");
    else {
      if (input.showcaseVehicles.length > 6) errors.push("showcaseVehicles allows at most 6 entries");
      out.showcaseVehicles = input.showcaseVehicles.slice(0, 6).map((v, i) => {
        if (!v || typeof v !== "object") { errors.push(`showcaseVehicles[${i}] must be an object`); return null; }
        for (const k of ["image", "mobileImage"]) if (v[k] && !isSafeHeroImageUrl(v[k])) errors.push(`showcaseVehicles[${i}].${k} is not an allowed image URL`);
        return { ...v, id: text(v.id, 64), make: text(v.make, 60), model: text(v.model, 60), eyebrow: text(v.eyebrow, 60), tagline: text(v.tagline, 90), year: clamp(Math.round(finite(v.year) || new Date().getFullYear()), 1980, 2100) };
      }).filter(Boolean);
    }
  }
  if ("floatingCards" in input) {
    if (!Array.isArray(input.floatingCards)) errors.push("floatingCards must be a list");
    else {
      if (input.floatingCards.length > 8) errors.push("floatingCards allows at most 8 entries");
      out.floatingCards = input.floatingCards.slice(0, 8).map((c, i) => {
        if (!c || typeof c !== "object") { errors.push(`floatingCards[${i}] must be an object`); return null; }
        if (c.ctaLink && !isSafeHeroLink(c.ctaLink)) errors.push(`floatingCards[${i}].ctaLink must be an in-app path or https link`);
        for (const k of ["backgroundColor", "textColor", "borderColor"]) if (c[k] && !isSafeHeroColor(c[k])) errors.push(`floatingCards[${i}].${k} is not an allowed colour`);
        return { ...c, title: text(c.title, 80), body: text(c.body, 240), eyebrow: text(c.eyebrow, 60), ctaLabel: text(c.ctaLabel, 40) };
      }).filter(Boolean);
    }
  }
  return { value: out, errors };
}

/** Per-vehicle card copy (heroCardContent) — free text is length-capped and links must be safe. */
export function validateHeroCardContent(input) {
  const errors = [];
  if (input === undefined || input === null) return { value: input, errors };
  if (typeof input !== "object" || Array.isArray(input)) return { value: undefined, errors: ["heroCardContent must be an object"] };
  const out = {};
  for (const [id, c] of Object.entries(input).slice(0, 200)) {
    if (!c || typeof c !== "object") continue;
    if (c.ctaLink && !isSafeHeroLink(c.ctaLink)) errors.push(`heroCardContent.${id}.ctaLink must be an in-app path or https link`);
    if (c.heroImage && !isSafeHeroImageUrl(c.heroImage)) errors.push(`heroCardContent.${id}.heroImage is not an allowed image URL`);
    out[id] = { eyebrow: text(c.eyebrow, 60), message: text(c.message, 160), detail: text(c.detail, 160), ctaLabel: text(c.ctaLabel, HERO_CTA_MAX_CHARS * 2), ctaLink: c.ctaLink || "", heroImage: c.heroImage || "" };
  }
  return { value: out, errors };
}

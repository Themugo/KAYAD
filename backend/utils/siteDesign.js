// Public-site DESIGN: the supported, validated slice of platform settings an administrator may change without code.
// Every field here has a verified runtime consumer (see docs in the delivery report). Nothing outside this list can be set by a design.
//   brand / colors   -> platform_config.branding        -> BrandingContext CSS variables, Navbar, Footer, logo
//   typography       -> platform_config.fontDisplay/Body -> BrandingContext (--font-display / --font-sans)
//   hero             -> platform_config.heroPresentation -> VehicleMarketplace hero
//   announcement     -> platform_config.heroPresentation.ticker* -> TopNoticeStrip
import crypto from "crypto";
import { isAllowedLogoUrl } from "./brandingValidation.js";

const COLOR = /^(#[0-9A-Fa-f]{6}|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(\s*,\s*(0|1|0?\.\d+))?\s*\))$/;
export const COLOR_KEYS = ["primaryColor", "primaryLight", "primaryDark", "primaryGlow", "accentColor", "backgroundColor", "surfaceColor", "cardColor", "textColor", "textMutedColor", "textDimColor", "borderColor", "successColor", "dangerColor", "warningColor", "infoColor"];
// Only fonts whose files are actually loaded by index.html (or are system fonts) - selecting anything else would silently fall back.
export const FONT_CHOICES = ["Plus Jakarta Sans", "Outfit", "Georgia", "system-ui", "Arial"];
export const DIRECTIONS = ["left", "right"];
export const TRANSITIONS = ["scroll", "fade", "pop", "slide"];
export const LOGO_TYPES = ["icon", "text", "image"];

const HERO_BG = /^\/(hero|branding)\/[A-Za-z0-9._\-/]+$/;
const isAllowedHeroBackground = (v) => v === "" || (typeof v === "string" && HERO_BG.test(v) && !v.includes("..")) || isAllowedLogoUrl(v);

export const DEFAULT_DESIGN = Object.freeze({
  brand: { logoType: "image", logoUrl: "/branding/kayad-road-mark.svg", logoText: "KAYAD", brandTagline: "Kenya's Trusted Vehicle Marketplace",
    footerDescription: "Kenya's trusted vehicle marketplace for buying, selling, auctions, inspections and eligible escrow services.", footerCopyright: "KAYAD Motors Kenya Ltd. All rights reserved." },
  colors: { primaryColor: "#176B87", primaryLight: "#13B8A6", primaryDark: "#0A3340", primaryGlow: "rgba(23, 107, 135, 0.22)", accentColor: "#13B8A6", backgroundColor: "#F6FAF9", surfaceColor: "#EEF7F5", cardColor: "#FFFFFF", textColor: "#0A3340", textMutedColor: "#64748B", textDimColor: "#94A3B8", borderColor: "#D7E7E4", successColor: "#10B981", dangerColor: "#EF4444", warningColor: "#176B87", infoColor: "#176B87" },
  typography: { fontDisplay: "Outfit", fontBody: "Plus Jakarta Sans" },
  hero: { backgroundUrl: "/hero/kayad-kenyan-highlands-road.svg", overlayColor: "#EEF7F5", overlayOpacityPct: 18, showVehicleInfoCards: true, rotationSeconds: 6.5 },
  announcement: { enabled: true, text: "KAYAD · Verified vehicles across Kenya · Live auctions · Transparent bidding · Clear transaction workflows", backgroundColor: "#0A3340", textColor: "#FFFFFF", heightPx: 36, scrollSeconds: 34, direction: "left", transition: "scroll" },
});

// Starter designs are code, not rows: always available, never deletable, never edited in place.
export const STARTERS = Object.freeze([
  { id: "kayad-default", name: "KAYAD default", description: "The standard KAYAD slate-teal look.", config: DEFAULT_DESIGN },
  { id: "deep-navy", name: "Deep navy", description: "Darker navy brand with a calmer announcement strip.", config: {
    ...DEFAULT_DESIGN,
    colors: { ...DEFAULT_DESIGN.colors, primaryColor: "#12576D", primaryDark: "#071E26", backgroundColor: "#F2F7F8", surfaceColor: "#E7F0F2", textColor: "#071E26" },
    announcement: { ...DEFAULT_DESIGN.announcement, backgroundColor: "#071E26", scrollSeconds: 45 } } },
  { id: "bright-market", name: "Bright marketplace", description: "Lighter teal palette and a faster announcement strip.", config: {
    ...DEFAULT_DESIGN,
    colors: { ...DEFAULT_DESIGN.colors, primaryColor: "#0E8F8A", primaryLight: "#2DD4BF", accentColor: "#2DD4BF", backgroundColor: "#FFFFFF", surfaceColor: "#F0FAF8" },
    announcement: { ...DEFAULT_DESIGN.announcement, backgroundColor: "#0E8F8A", scrollSeconds: 24 } } },
]);

const SHAPES = {
  brand: { logoType: "logoType", logoUrl: "logoUrl", logoText: "text40", brandTagline: "text80", footerDescription: "text300", footerCopyright: "text120" },
  typography: { fontDisplay: "font", fontBody: "font" },
  hero: { backgroundUrl: "heroBg", overlayColor: "color", overlayOpacityPct: [0, 100], showVehicleInfoCards: "bool", rotationSeconds: "rotation" },
  announcement: { enabled: "bool", text: "text200", backgroundColor: "color", textColor: "color", heightPx: [28, 60], scrollSeconds: [10, 90], direction: "direction", transition: "transition" },
};
const TEXT = { text40: 40, text80: 80, text120: 120, text200: 200, text300: 300 };

function checkValue(kind, v) {
  if (Array.isArray(kind)) return typeof v === "number" && Number.isFinite(v) && v >= kind[0] && v <= kind[1];
  if (kind === "bool") return typeof v === "boolean";
  if (kind === "color") return typeof v === "string" && COLOR.test(v.trim());
  if (kind === "logoType") return LOGO_TYPES.includes(v);
  if (kind === "logoUrl") return typeof v === "string" && isAllowedLogoUrl(v);
  if (kind === "heroBg") return isAllowedHeroBackground(v);
  if (kind === "font") return FONT_CHOICES.includes(v);
  if (kind === "direction") return DIRECTIONS.includes(v);
  if (kind === "transition") return TRANSITIONS.includes(v);
  if (kind === "rotation") return typeof v === "number" && Number.isFinite(v) && (v === 0 || (v >= 3 && v <= 60));
  if (TEXT[kind]) return typeof v === "string" && v.length <= TEXT[kind] && !/[<>]/.test(v);
  return false;
}

/** Validate a FULL design object. Unknown sections/keys are rejected (a design can only carry supported settings).
 *  @returns {{ok:true,value:object}|{ok:false,errors:Record<string,string>}} */
export function validateDesign(input) {
  const errors = {};
  if (!input || typeof input !== "object" || Array.isArray(input)) return { ok: false, errors: { _: "Design must be an object." } };
  const allowed = new Set([...Object.keys(SHAPES), "colors"]);
  for (const k of Object.keys(input)) if (!allowed.has(k)) errors[k] = "Unsupported design section.";
  const out = {};
  for (const [section, shape] of Object.entries({ ...SHAPES, colors: Object.fromEntries(COLOR_KEYS.map((k) => [k, "color"])) })) {
    const given = input[section];
    if (!given || typeof given !== "object" || Array.isArray(given)) { errors[section] = "Section is required."; continue; }
    for (const k of Object.keys(given)) if (!(k in shape)) errors[`${section}.${k}`] = "Unsupported setting.";
    out[section] = {};
    for (const [k, kind] of Object.entries(shape)) {
      if (given[k] === undefined) { errors[`${section}.${k}`] = "Missing value."; continue; }
      if (!checkValue(kind, given[k])) { errors[`${section}.${k}`] = "Invalid value."; continue; }
      out[section][k] = typeof given[k] === "string" ? given[k].trim() : given[k];
    }
  }
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value: out };
}

export const validateName = (name) => typeof name === "string" && name.trim().length >= 1 && name.trim().length <= 80 && !/[<>]/.test(name);
export const validateDescription = (d) => d === undefined || (typeof d === "string" && d.length <= 300 && !/[<>]/.test(d));

const plain = (o) => (o && typeof o.toObject === "function" ? o.toObject() : o) || {};
/** Read the CURRENT live design out of the platform config (falls back to defaults per field). Values that fail validation fall back to defaults. */
export function extractLive(config) {
  const c = plain(config); const b = plain(c.branding); const h = plain(c.heroPresentation);
  const pick = (value, fallback, kind) => (value !== undefined && value !== null && checkValue(kind, value) ? value : fallback);
  const d = DEFAULT_DESIGN;
  const out = { brand: {}, colors: {}, typography: {}, hero: {}, announcement: {} };
  for (const [k, kind] of Object.entries(SHAPES.brand)) out.brand[k] = pick(b[k], d.brand[k], kind);
  for (const k of COLOR_KEYS) out.colors[k] = pick(b[k], d.colors[k], "color");
  out.typography.fontDisplay = pick(c.fontDisplay, d.typography.fontDisplay, "font");
  out.typography.fontBody = pick(c.fontBody, d.typography.fontBody, "font");
  out.hero.backgroundUrl = pick(h.backgroundUrl, d.hero.backgroundUrl, "heroBg");
  out.hero.overlayColor = pick(h.overlayColor, d.hero.overlayColor, "color");
  out.hero.overlayOpacityPct = pick(Number(h.overlayOpacityPct), d.hero.overlayOpacityPct, [0, 100]);
  out.hero.showVehicleInfoCards = pick(h.showVehicleInfoCards, d.hero.showVehicleInfoCards, "bool");
  out.hero.rotationSeconds = pick(Number(h.rotationSeconds), d.hero.rotationSeconds, "rotation");
  const a = out.announcement;
  a.enabled = pick(h.tickerEnabled, d.announcement.enabled, "bool");
  a.text = pick(h.tickerFallbackText, d.announcement.text, "text200");
  a.backgroundColor = pick(h.tickerBackgroundColor, d.announcement.backgroundColor, "color");
  a.textColor = pick(h.tickerTextColor, d.announcement.textColor, "color");
  a.heightPx = pick(Number(h.tickerHeightPx), d.announcement.heightPx, [28, 60]);
  a.scrollSeconds = pick(Number(h.tickerScrollSeconds), d.announcement.scrollSeconds, [10, 90]);
  a.direction = pick(h.tickerDirection, d.announcement.direction, "direction");
  a.transition = pick(h.tickerTransition, d.announcement.transition, "transition");
  return out;
}

/** Apply a validated design to the platform config document. Only the keys a design owns are touched; every other setting is preserved. */
export function applyDesignToConfig(config, design) {
  const c = config;
  const b = plain(c.branding); const h = plain(c.heroPresentation);
  c.branding = { ...b, ...design.brand, ...design.colors };
  c.fontDisplay = design.typography.fontDisplay;
  c.fontBody = design.typography.fontBody;
  const a = design.announcement;
  c.heroPresentation = {
    ...h,
    backgroundUrl: design.hero.backgroundUrl, overlayColor: design.hero.overlayColor, overlayOpacityPct: design.hero.overlayOpacityPct,
    showVehicleInfoCards: design.hero.showVehicleInfoCards, rotationSeconds: design.hero.rotationSeconds,
    tickerEnabled: a.enabled, tickerFallbackText: a.text, tickerBackgroundColor: a.backgroundColor, tickerTextColor: a.textColor,
    tickerHeightPx: a.heightPx, tickerScrollSeconds: a.scrollSeconds, tickerDirection: a.direction, tickerTransition: a.transition,
  };
  return c;
}

const stable = (v) => (v && typeof v === "object" ? (Array.isArray(v) ? v.map(stable) : Object.fromEntries(Object.keys(v).sort().map((k) => [k, stable(v[k])]))) : v);
export const designHash = (design) => crypto.createHash("sha256").update(JSON.stringify(stable(design))).digest("hex");

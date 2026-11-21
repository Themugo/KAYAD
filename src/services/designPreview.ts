// Design PREVIEW for the public site, held only in this browser tab (sessionStorage). Nothing is saved or published by previewing.
// The preview is merged into the public-config response at ONE point (adminAPI.getPublicConfig), so every consumer - branding CSS
// variables, fonts, hero, announcement strip - renders the draft exactly as it would render once published.
export const PREVIEW_KEY = 'kayad_design_preview';

export interface DesignConfig {
  brand: Record<string, any>; colors: Record<string, any>; typography: Record<string, any>; hero: Record<string, any>; announcement: Record<string, any>;
}
export interface ActivePreview { designId: string | null; name: string; config: DesignConfig }

/** Same mapping the server applies on publish (backend/utils/siteDesign.js applyDesignToConfig), expressed as a public-config patch. */
export function designToPublicPatch(d: DesignConfig, existing: any = {}) {
  const a = d.announcement; const h = existing?.heroPresentation || {};
  return {
    branding: { ...(existing?.branding || {}), ...d.brand, ...d.colors },
    fontDisplay: d.typography.fontDisplay,
    fontBody: d.typography.fontBody,
    heroPresentation: {
      ...h,
      backgroundUrl: d.hero.backgroundUrl, overlayColor: d.hero.overlayColor, overlayOpacityPct: d.hero.overlayOpacityPct,
      showVehicleInfoCards: d.hero.showVehicleInfoCards, rotationSeconds: d.hero.rotationSeconds,
      tickerEnabled: a.enabled, tickerFallbackText: a.text, tickerBackgroundColor: a.backgroundColor, tickerTextColor: a.textColor,
      tickerHeightPx: a.heightPx, tickerScrollSeconds: a.scrollSeconds, tickerDirection: a.direction, tickerTransition: a.transition,
    },
  };
}

const valid = (p: any): p is ActivePreview => !!p && typeof p === 'object' && p.config && ['brand', 'colors', 'typography', 'hero', 'announcement'].every((k) => p.config[k] && typeof p.config[k] === 'object');

export function getActivePreview(): ActivePreview | null {
  try { const raw = window.sessionStorage.getItem(PREVIEW_KEY); if (!raw) return null; const p = JSON.parse(raw); return valid(p) ? p : null; } catch { return null; }
}
export function startPreview(p: ActivePreview): void { try { window.sessionStorage.setItem(PREVIEW_KEY, JSON.stringify(p)); } catch { /* storage unavailable: preview simply does not start */ } }
export function stopPreview(): void { try { window.sessionStorage.removeItem(PREVIEW_KEY); } catch { /* ignore */ } }

/** Merge the active preview (if any) into a public-config response. Accepts both `{config:{...}}` and bare shapes. */
export function applyPreviewToPublicConfig<T = any>(cfg: T): T {
  const p = getActivePreview(); if (!p || !cfg || typeof cfg !== 'object') return cfg;
  const wrapped = (cfg as any).config && typeof (cfg as any).config === 'object';
  const base = wrapped ? (cfg as any).config : cfg;
  const patched = { ...base, ...designToPublicPatch(p.config, base) };
  return (wrapped ? { ...(cfg as any), config: patched } : patched) as T;
}

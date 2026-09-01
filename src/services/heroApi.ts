import { getCsrfHeaders } from '../utils/csrf';
/**
 * Real backend hero-slide API client - the hero card's text, layered
 * background, and slider content are all real, backend-persisted, and
 * fully admin-editable, following the exact same pattern already
 * proven in services/adApi.ts. Backend-persisted deliberately (not
 * the localStorage-only pattern used for home-page section-visibility
 * toggles elsewhere) since every real visitor must see the admin's
 * edits, not just the admin's own browser.
 */

const API_BASE = import.meta.env.VITE_API_URL || '';

export type HeroBackgroundType = 'color' | 'gradient' | 'image';
export type HeroDisplayMode = 'boxed' | 'fullscreen';

export interface HeroSlide {
  id: string;
  eyebrowText?: string;
  headline: string;
  subheadline?: string;
  ctaPrimaryText?: string;
  ctaPrimaryLink?: string;
  ctaSecondaryText?: string;
  ctaSecondaryLink?: string;
  backgroundType: HeroBackgroundType;
  backgroundValue?: string;
  overlayColor: string;
  overlayOpacity: number;
  displayMode: HeroDisplayMode;
  isVisible: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface HeroSlideInput {
  eyebrowText?: string;
  headline: string;
  subheadline?: string;
  ctaPrimaryText?: string;
  ctaPrimaryLink?: string;
  ctaSecondaryText?: string;
  ctaSecondaryLink?: string;
  backgroundType?: HeroBackgroundType;
  backgroundValue?: string;
  overlayColor?: string;
  overlayOpacity?: number;
  displayMode?: HeroDisplayMode;
  sortOrder?: number;
}

export type HeroApiErrorKind = 'network' | 'unauthenticated' | 'forbidden' | 'validation' | 'not_found' | 'server';

export class HeroApiError extends Error {
  kind: HeroApiErrorKind;
  status?: number;
  constructor(message: string, kind: HeroApiErrorKind, status?: number) {
    super(message);
    this.kind = kind;
    this.status = status;
  }
}

async function heroFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...getCsrfHeaders(options.method), ...(options.headers || {}) },
      ...options,
    });
  } catch {
    throw new HeroApiError('Unable to reach KAYAD servers. Please check your connection and try again.', 'network');
  }

  let body: { success: boolean; message?: string; data?: unknown };
  try {
    body = await res.json();
  } catch {
    throw new HeroApiError('Unexpected response from server.', 'server', res.status);
  }

  if (!res.ok) {
    const kind: HeroApiErrorKind =
      res.status === 401 ? 'unauthenticated' :
      res.status === 403 ? 'forbidden' :
      res.status === 404 ? 'not_found' :
      res.status === 400 ? 'validation' : 'server';
    throw new HeroApiError(body.message || 'Hero request failed.', kind, res.status);
  }

  return body as T;
}

/** GET /api/hero - public, only currently-visible slides. */
export async function getVisibleHeroSlides(): Promise<HeroSlide[]> {
  const body = await heroFetch<{ data: HeroSlide[] }>('/api/hero');
  return body.data || [];
}

/** GET /api/hero/all - admin-only, every slide including hidden ones. */
export async function getAllHeroSlides(): Promise<HeroSlide[]> {
  const body = await heroFetch<{ data: HeroSlide[] }>('/api/hero/all');
  return body.data || [];
}

/** POST /api/hero - admin-only, create a new hero slide. */
export async function createHeroSlide(input: HeroSlideInput): Promise<HeroSlide> {
  const body = await heroFetch<{ data: HeroSlide }>('/api/hero', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return body.data;
}

/** PUT /api/hero/:id - admin-only, update any field(s) of an existing slide. */
export async function updateHeroSlide(id: string, updates: Partial<HeroSlideInput & { isVisible: boolean }>): Promise<HeroSlide> {
  const body = await heroFetch<{ data: HeroSlide }>(`/api/hero/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
  return body.data;
}

/** DELETE /api/hero/:id - admin-only, permanently remove a hero slide. */
export async function deleteHeroSlide(id: string): Promise<void> {
  await heroFetch<{ success: boolean }>(`/api/hero/${id}`, { method: 'DELETE' });
}

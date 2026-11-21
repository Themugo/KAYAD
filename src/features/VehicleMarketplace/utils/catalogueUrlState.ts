/**
 * Catalogue <-> URL state. Only non-default values are written, so a clean
 * catalogue keeps a clean URL, and unrelated params (nav, vehicleId, ...) are
 * preserved. Unknown or invalid values are ignored on read, so old or hand-made
 * links can never break the page.
 */
export type CatalogueSort = 'newest' | 'price-asc' | 'price-desc' | 'mileage' | 'year' | 'most-viewed' | 'auction-ending';

export interface CatalogueUrlState {
  q: string;
  county: string;
  make: string; model: string; body: string; fuel: string; transmission: string;
  condition: string; seller: string; color: string;
  minPrice: number; maxPrice: number; minYear: number; maxYear: number; maxMileage: number;
  onlyAuction: boolean;
  sort: CatalogueSort;
  page: number;
  view: 'grid' | 'list' | null;
  cols: 3 | 4 | 5 | null;
}

export const CATALOGUE_DEFAULTS: CatalogueUrlState = {
  q: '', county: 'All Kenya',
  make: 'All', model: 'All', body: 'All', fuel: 'All', transmission: 'All',
  condition: 'All', seller: 'All', color: 'All',
  minPrice: 0, maxPrice: 20000000, minYear: 0, maxYear: 2026, maxMileage: 250000,
  onlyAuction: false, sort: 'newest', page: 1, view: null, cols: null,
};

const SORTS: CatalogueSort[] = ['newest', 'price-asc', 'price-desc', 'mileage', 'year', 'most-viewed', 'auction-ending'];
const TEXT_KEYS: Array<[keyof CatalogueUrlState, string]> = [
  ['q', 'q'], ['county', 'location'], ['make', 'make'], ['model', 'model'], ['body', 'body'], ['fuel', 'fuel'],
  ['transmission', 'transmission'], ['condition', 'condition'], ['seller', 'seller'], ['color', 'color'],
];
const NUM_KEYS: Array<[keyof CatalogueUrlState, string]> = [
  ['minPrice', 'minPrice'], ['maxPrice', 'maxPrice'], ['minYear', 'yearFrom'], ['maxYear', 'yearTo'], ['maxMileage', 'maxKm'],
];
/** Every param this module owns (used to clear stale ones before writing). */
export const CATALOGUE_PARAM_NAMES = [
  ...TEXT_KEYS.map(([, p]) => p), ...NUM_KEYS.map(([, p]) => p), 'auction', 'sort', 'page', 'view', 'cols',
];

export function readCatalogueUrl(search: string): CatalogueUrlState {
  const p = new URLSearchParams(search);
  const out: CatalogueUrlState = { ...CATALOGUE_DEFAULTS };
  for (const [key, param] of TEXT_KEYS) {
    const v = (p.get(param) || '').trim().slice(0, 80);
    if (v) (out as unknown as Record<string, unknown>)[key] = v;
  }
  for (const [key, param] of NUM_KEYS) {
    const raw = p.get(param);
    if (raw === null || raw.trim() === '') continue;
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0 && n <= 1e10) (out as unknown as Record<string, unknown>)[key] = Math.floor(n);
  }
  out.onlyAuction = p.get('auction') === '1';
  const sort = p.get('sort') as CatalogueSort | null;
  if (sort && SORTS.includes(sort)) out.sort = sort;
  const page = Number(p.get('page'));
  if (Number.isInteger(page) && page > 1 && page < 100000) out.page = page;
  const view = p.get('view');
  if (view === 'grid' || view === 'list') out.view = view;
  const cols = Number(p.get('cols'));
  if (cols === 3 || cols === 4 || cols === 5) out.cols = cols;
  return out;
}

/** Returns the new `search` string (with leading '?', or '' when empty). */
export function writeCatalogueUrl(currentSearch: string, state: CatalogueUrlState): string {
  const p = new URLSearchParams(currentSearch);
  for (const name of CATALOGUE_PARAM_NAMES) p.delete(name);
  for (const [key, param] of TEXT_KEYS) {
    const v = String(state[key] ?? '');
    if (v && v !== String(CATALOGUE_DEFAULTS[key])) p.set(param, v);
  }
  for (const [key, param] of NUM_KEYS) {
    if (state[key] !== CATALOGUE_DEFAULTS[key]) p.set(param, String(state[key]));
  }
  if (state.onlyAuction) p.set('auction', '1');
  if (state.sort !== 'newest') p.set('sort', state.sort);
  if (state.page > 1) p.set('page', String(state.page));
  if (state.view) p.set('view', state.view);
  if (state.cols) p.set('cols', String(state.cols));
  const s = p.toString();
  return s ? `?${s}` : '';
}

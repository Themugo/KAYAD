import { request } from '../api/httpRequest';

export interface SearchSuggestion { type: string; text: string }

export async function autocompleteSearch(query: string, limit = 8): Promise<SearchSuggestion[]> {
  if (!query.trim()) return [];
  const params = new URLSearchParams({ q: query.trim(), limit: String(limit) });
  const body = await request<{ data?: SearchSuggestion[] }>(`/api/search/autocomplete?${params.toString()}`);
  return body.data || [];
}


export interface SearchFacetItem { value: string; label: string }
export interface SearchFacets {
  brands: SearchFacetItem[];
  models: SearchFacetItem[];
  locations: SearchFacetItem[];
  bodyTypes: SearchFacetItem[];
  fuels: SearchFacetItem[];
  transmissions: SearchFacetItem[];
  colors: SearchFacetItem[];
  conditions: SearchFacetItem[];
  total: number;
}

export async function getSearchFacets(filters: Record<string, unknown> = {}): Promise<SearchFacets> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '' && key !== 'page' && key !== 'limit') {
      params.set(key, Array.isArray(value) ? value.join(',') : String(value));
    }
  });
  params.set('page', '1');
  params.set('limit', '100');
  const response = await request<{
    success?: boolean;
    data?: Array<Record<string, unknown>>;
    pagination?: { total?: number };
  }>(`/api/search?${params.toString()}`);
  const rows = Array.isArray(response?.data) ? response.data : [];
  const collect = (...keys: string[]): SearchFacetItem[] => {
    const values = new Map<string, string>();
    rows.forEach((row) => {
      const raw = keys.map((key) => row[key]).find((value) => typeof value === 'string' && value.trim());
      if (typeof raw === 'string') {
        const value = raw.trim();
        values.set(value.toLowerCase(), value);
      }
    });
    return [...values.values()].sort((a, b) => a.localeCompare(b)).map((value) => ({ value, label: value }));
  };
  return {
    brands: collect('brand'),
    models: collect('model'),
    locations: collect('locationCity', 'city', 'location'),
    bodyTypes: collect('bodyType', 'body'),
    fuels: collect('fuel', 'fuelType'),
    transmissions: collect('transmission'),
    colors: collect('color', 'colour'),
    conditions: collect('condition'),
    total: Number(response?.pagination?.total ?? rows.length),
  };
}

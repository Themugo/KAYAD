import { request } from '../api/httpRequest';

export interface SearchSuggestion { type: string; text: string }

export async function autocompleteSearch(query: string, limit = 8): Promise<SearchSuggestion[]> {
  if (!query.trim()) return [];
  const params = new URLSearchParams({ q: query.trim(), limit: String(limit) });
  const body = await request<{ data?: SearchSuggestion[] }>(`/api/search/autocomplete?${params.toString()}`);
  return body.data || [];
}


export interface SearchFacetOption { value: string; label: string }
export interface SearchFacetsResponse {
  total: number;
  brands: SearchFacetOption[];
  models: SearchFacetOption[];
  locations: SearchFacetOption[];
  bodyTypes: SearchFacetOption[];
  fuels: SearchFacetOption[];
  transmissions: SearchFacetOption[];
  colors: SearchFacetOption[];
  conditions: SearchFacetOption[];
}

export async function getSearchFacets(filters: Record<string, unknown> = {}): Promise<SearchFacetsResponse> {
  const response = await request<{ success?: boolean; data?: SearchFacetsResponse; facets?: SearchFacetsResponse }>('/api/search/facets', { method: 'GET', params: filters });
  return response.data ?? response.facets ?? response as unknown as SearchFacetsResponse;
}

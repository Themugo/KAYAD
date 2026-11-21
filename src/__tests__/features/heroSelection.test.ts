import { describe, it, expect } from 'vitest';
import {
  dedupeHeroVehicles, selectHeroVehicles, pairHeroVehicles, heroComposition, safeHeroCtaLabel, heroImageFor, HERO_CTA_MAX_CHARS,
} from '../../features/VehicleMarketplace/utils/heroSelection';

const v = (id: string) => ({ id });

describe('hero vehicle selection policy', () => {
  it('R-01: dedupes by canonical id and drops id-less entries', () => {
    expect(dedupeHeroVehicles([v('a'), v('a'), v('b'), { id: '' }, v(' a ')]).map((x) => x.id)).toEqual(['a', 'b']);
    expect(dedupeHeroVehicles([v('a'), v('a')])).toHaveLength(1);
  });

  it('two or more real vehicles: shows distinct real vehicles, never showcase', () => {
    const r = selectHeroVehicles({ campaign: [], inventory: [v('1'), v('2'), v('2')], showcase: [v('s1'), v('s2')], showcaseFallbackEnabled: true });
    expect(r.kind).toBe('inventory');
    expect(r.illustrative).toBe(false);
    expect(r.vehicles.map((x) => x.id)).toEqual(['1', '2']);
  });

  it('R-09: one real vehicle is never replaced by showcase artwork', () => {
    const r = selectHeroVehicles({ campaign: [], inventory: [v('1')], showcase: [v('s1'), v('s2')], showcaseFallbackEnabled: true });
    expect(r.kind).toBe('inventory');
    expect(r.vehicles.map((x) => x.id)).toEqual(['1']);
  });

  it('a running campaign outranks featured inventory', () => {
    const r = selectHeroVehicles({ campaign: [v('c1')], inventory: [v('1'), v('2')], showcase: [], showcaseFallbackEnabled: true });
    expect(r.kind).toBe('campaign');
    expect(r.vehicles.map((x) => x.id)).toEqual(['c1']);
  });

  it('zero real vehicles: showcase is illustrative; disabled fallback gives the empty state', () => {
    const on = selectHeroVehicles({ campaign: [], inventory: [], showcase: [v('s1'), v('s2')], showcaseFallbackEnabled: true });
    expect(on.kind).toBe('showcase');
    expect(on.illustrative).toBe(true);
    const off = selectHeroVehicles({ campaign: [], inventory: [], showcase: [v('s1')], showcaseFallbackEnabled: false });
    expect(off).toEqual({ vehicles: [], kind: 'none', illustrative: false });
  });

  it('pairs never wrap or repeat a vehicle', () => {
    expect(pairHeroVehicles([v('1'), v('2'), v('3')]).map((p) => p.map((x) => x.id))).toEqual([['1', '2'], ['3']]);
    expect(pairHeroVehicles([v('1')])).toEqual([[v('1')]]);
    expect(pairHeroVehicles([])).toEqual([]);
    const flat = pairHeroVehicles([1, 2, 3, 4, 5].map((n) => v(String(n)))).flat().map((x) => x.id);
    expect(new Set(flat).size).toBe(flat.length);
  });

  it('composition reflects how many vehicles a pair holds', () => {
    expect(heroComposition([])).toBe('empty');
    expect(heroComposition(undefined)).toBe('empty');
    expect(heroComposition([1])).toBe('single');
    expect(heroComposition([1, 2])).toBe('pair');
  });

  it('R-06: long CTA labels are capped and whitespace-normalised', () => {
    expect(safeHeroCtaLabel('  Explore   Vehicles ')).toBe('Explore Vehicles');
    const long = 'Browse every verified vehicle currently available across the whole of Kenya today';
    const out = safeHeroCtaLabel(long);
    expect(out.length).toBeLessThanOrEqual(HERO_CTA_MAX_CHARS);
    expect(out.endsWith('…')).toBe(true);
  });

  it('R-10: prefers a chosen hero photo, falls back to the primary listing photo', () => {
    expect(heroImageFor({ heroImage: '/h.jpg', images: ['/a.jpg'] })).toBe('/h.jpg');
    expect(heroImageFor({ images: ['/a.jpg', '/b.jpg'] })).toBe('/a.jpg');
    expect(heroImageFor({ image: '/only.jpg' })).toBe('/only.jpg');
    expect(heroImageFor(undefined)).toBe('');
  });
});

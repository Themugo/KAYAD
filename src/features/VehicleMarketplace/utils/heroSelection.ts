/**
 * Pure selection rules for the homepage hero. Kept free of React so they can be unit-tested.
 *
 * Policy (approved 15 Nov 2026):
 *  - Real eligible inventory (running campaign, else featured/selected listings) ALWAYS takes priority.
 *  - Decorative showcase artwork is used only when there is no real eligible vehicle, and is always illustrative.
 *  - A vehicle is never repeated to fill a second position, and pairs never wrap around to reuse a vehicle.
 */

export interface HeroVehicleRef {
  id: string;
}

export type HeroSourceKind = 'campaign' | 'inventory' | 'showcase' | 'none';

export interface HeroSelection<T extends HeroVehicleRef> {
  vehicles: T[];
  kind: HeroSourceKind;
  /** True only for decorative artwork that must be labelled as illustrative and never shown as a listing. */
  illustrative: boolean;
}

/** Keep the first occurrence of each canonical vehicle id; entries without an id are dropped. */
export function dedupeHeroVehicles<T extends HeroVehicleRef>(list: readonly T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of list) {
    const id = item && item.id != null ? String(item.id).trim() : '';
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(item);
  }
  return out;
}

export interface SelectHeroInput<T extends HeroVehicleRef> {
  campaign: readonly T[];
  /** Featured (or admin-selected) real listings, already filtered to the configured mode. */
  inventory: readonly T[];
  showcase: readonly T[];
  showcaseFallbackEnabled: boolean;
}

export function selectHeroVehicles<T extends HeroVehicleRef>(input: SelectHeroInput<T>): HeroSelection<T> {
  const campaign = dedupeHeroVehicles(input.campaign);
  if (campaign.length > 0) return { vehicles: campaign, kind: 'campaign', illustrative: false };
  const inventory = dedupeHeroVehicles(input.inventory);
  if (inventory.length > 0) return { vehicles: inventory, kind: 'inventory', illustrative: false };
  const showcase = input.showcaseFallbackEnabled ? dedupeHeroVehicles(input.showcase) : [];
  if (showcase.length > 0) return { vehicles: showcase, kind: 'showcase', illustrative: true };
  return { vehicles: [], kind: 'none', illustrative: false };
}

/** Group into pairs without wrapping: [a,b,c] -> [[a,b],[c]]. The last pair may hold a single vehicle. */
export function pairHeroVehicles<T>(vehicles: readonly T[]): T[][] {
  const pairs: T[][] = [];
  for (let i = 0; i < vehicles.length; i += 2) pairs.push(vehicles.slice(i, i + 2));
  return pairs;
}

export type HeroComposition = 'empty' | 'single' | 'pair';

export function heroComposition(pair: readonly unknown[] | undefined): HeroComposition {
  if (!pair || pair.length === 0) return 'empty';
  return pair.length === 1 ? 'single' : 'pair';
}

/** Admin-supplied button text is capped so a long label can never break the layout; the full text stays in the aria-label. */
export const HERO_CTA_MAX_CHARS = 32;
export function safeHeroCtaLabel(label: string, max = HERO_CTA_MAX_CHARS): string {
  const clean = String(label ?? '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Hero artwork for a listing: an explicitly chosen hero photo, else the primary listing photo.
 * Never assumes the first gallery photo is a good hero image when a better one was chosen.
 */
export function heroImageFor(vehicle: { heroImage?: string; images?: string[]; image?: string } | undefined | null): string {
  if (!vehicle) return '';
  return (vehicle.heroImage || '').trim() || vehicle.images?.[0] || vehicle.image || '';
}

export type InventoryGridColumns = 1 | 2 | 3 | 4 | 5;

/**
 * Columns actually rendered for the result area's width. Mirrors the CSS
 * container queries in index.css (.kayad-inventory-grid):
 *   <520 -> 1, <760 -> 2, <940 -> 3, <1280 -> at most 4, >=1280 -> requested.
 */
export function getEffectiveGridColumns(
  requested: 3 | 4 | 5,
  containerWidth: number,
): InventoryGridColumns {
  if (!(containerWidth > 0)) return requested; // not measured yet (SSR/first paint)
  if (containerWidth < 520) return 1;
  if (containerWidth < 760) return 2;
  if (containerWidth < 940) return 3;
  if (containerWidth < 1280) return requested === 3 ? 3 : 4;
  return requested;
}

/** Column choices that can really be rendered at this width (never offers an unusable layout). */
export function getAvailableGridColumns(containerWidth: number): Array<3 | 4 | 5> {
  if (!(containerWidth > 0)) return [3, 4, 5];
  if (containerWidth < 760) return [];
  if (containerWidth < 940) return [3];
  if (containerWidth < 1280) return [3, 4];
  return [3, 4, 5];
}

export interface InventoryFilterRangeValues {
  minPrice: number;
  maxPrice: number;
  minYear: number;
  maxYear: number;
}

export function validateInventoryFilterRanges(values: InventoryFilterRangeValues): string | null {
  if (values.minPrice > values.maxPrice) {
    return 'Minimum price cannot be greater than maximum price.';
  }
  if (values.minYear > 0 && values.maxYear > 0 && values.minYear > values.maxYear) {
    return 'From year cannot be later than the To year.';
  }
  return null;
}

export type InventoryGridColumns = 1 | 2 | 3 | 4 | 5;

export function getEffectiveGridColumns(
  requested: 3 | 4 | 5,
  containerWidth: number,
): InventoryGridColumns {
  if (containerWidth < 520) return 1;
  if (containerWidth < 680) return 2;
  if (containerWidth < 1120) return requested === 3 ? 3 : 4;
  return requested;
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

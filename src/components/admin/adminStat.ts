/** A missing figure is shown as the word "Unavailable". At the large numeral size that word does not fit a stat tile,
 *  so the numeral size is only used when there is a real value. */
export const isUnavailable = (value: unknown): boolean => value === 'Unavailable';

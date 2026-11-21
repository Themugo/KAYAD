// Figures are typed and read with thousands separators (1,850,000). The form shows commas; the server receives plain numbers.

/** Keep digits only. Used for whole-number figures such as prices (KES) and mileage. */
export const digitsOnly = (value: string): string => value.replace(/\D/g, '');

/** "1850000" -> "1,850,000". Anything that is not a digit is dropped first, so pasted "KSh 1,850,000" works. */
export function formatThousands(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const d = digitsOnly(String(value));
  return d.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** "1,850,000" -> 1850000; '' -> undefined. */
export function parseFormattedNumber(value: string): number | undefined {
  const d = digitsOnly(value);
  return d === '' ? undefined : Number(d);
}

/**
 * onChange helper for a controlled text input: re-formats with commas and keeps the caret next to the same digit, so editing the middle of
 * a figure does not throw the cursor to the end.
 */
export function handleFormattedInput(e: { target: HTMLInputElement }, set: (formatted: string) => void): void {
  const el = e.target;
  const caret = el.selectionStart ?? el.value.length;
  const digitsBefore = digitsOnly(el.value.slice(0, caret)).length;
  const formatted = formatThousands(el.value);
  set(formatted);
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => {
      let pos = 0;
      let seen = 0;
      while (pos < formatted.length && seen < digitsBefore) { if (/\d/.test(formatted[pos])) seen += 1; pos += 1; }
      try { el.setSelectionRange(pos, pos); } catch { /* element may be gone */ }
    });
  }
}

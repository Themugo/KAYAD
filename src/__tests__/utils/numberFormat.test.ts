import { describe, it, expect } from 'vitest';
import { formatThousands, parseFormattedNumber, digitsOnly } from '../../utils/numberFormat';

describe('number formatting for Kenyan listings', () => {
  it('adds thousands separators', () => {
    expect(formatThousands('1850000')).toBe('1,850,000');
    expect(formatThousands(85000)).toBe('85,000');
    expect(formatThousands('999')).toBe('999');
    expect(formatThousands('')).toBe('');
    expect(formatThousands(null)).toBe('');
  });
  it('re-formats pasted text with currency, spaces and existing commas', () => {
    expect(formatThousands('KSh 1,850,000')).toBe('1,850,000');
    expect(formatThousands('1 850 000')).toBe('1,850,000');
    expect(formatThousands('12,34')).toBe('1,234');
  });
  it('parses back to a plain number', () => {
    expect(parseFormattedNumber('1,850,000')).toBe(1850000);
    expect(parseFormattedNumber('0')).toBe(0);
    expect(parseFormattedNumber('')).toBeUndefined();
    expect(parseFormattedNumber('abc')).toBeUndefined();
    expect(digitsOnly('a1,2b3')).toBe('123');
  });
});

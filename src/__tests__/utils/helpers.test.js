import { describe, it, expect } from 'vitest';
import {
  parseKES, formatPhone, displayPhone, isValidSafaricom,
  timeAgo, truncate, initials, slugify, compactNumber,
  nextBidOptions, bidCommitmentAmount,
  validateEmail, validatePassword, getCarImage,
  DEAL_META, AUCTION_STATUS,
  extractError, copyToClipboard,
} from '../../utils/helpers';

describe('parseKES', () => {
  it('parses "KES 1,500,000" to 1500000', () => {
    expect(parseKES('KES 1,500,000')).toBe(1500000);
  });
  it('parses "1,200.50" to 1200.5', () => {
    expect(parseKES('1,200.50')).toBe(1200.5);
  });
  it('returns 0 for non-numeric strings', () => {
    expect(parseKES('abc')).toBe(0);
  });
  it('handles empty string', () => {
    expect(parseKES('')).toBe(0);
  });
});

describe('formatPhone', () => {
  it('converts 07XX... to 2547XX...', () => {
    expect(formatPhone('0712345678')).toBe('254712345678');
  });
  it('passes through 2547XX...', () => {
    expect(formatPhone('254712345678')).toBe('254712345678');
  });
  it('prepends 254 to 7XX...', () => {
    expect(formatPhone('712345678')).toBe('254712345678');
  });
  it('strips non-digit characters', () => {
    expect(formatPhone('+254 712 345 678')).toBe('254712345678');
  });
});

describe('displayPhone', () => {
  it('formats 2547XX... to +254 XXX XXX XXX', () => {
    expect(displayPhone('254712345678')).toBe('+254 712 345 678');
  });
});

describe('isValidSafaricom', () => {
  it('validates Safaricom number', () => {
    expect(isValidSafaricom('0712345678')).toBe(true);
  });
  it('rejects non-Safaricom prefix', () => {
    expect(isValidSafaricom('0112345678')).toBe(false);
  });
});

describe('timeAgo', () => {
  it('returns "just now" for recent dates', () => {
    expect(timeAgo(new Date().toISOString())).toBe('just now');
  });
  it('returns minutes format', () => {
    const d = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(timeAgo(d)).toBe('5m ago');
  });
  it('returns hours format', () => {
    const d = new Date(Date.now() - 3 * 3600 * 1000).toISOString();
    expect(timeAgo(d)).toBe('3h ago');
  });
  it('returns days format', () => {
    const d = new Date(Date.now() - 5 * 86400 * 1000).toISOString();
    expect(timeAgo(d)).toBe('5d ago');
  });
});

describe('truncate', () => {
  it('truncates long strings with ellipsis', () => {
    expect(truncate('hello world this is a long string', 10)).toBe('hello worl…');
  });
  it('returns short strings unchanged', () => {
    expect(truncate('short', 10)).toBe('short');
  });
});

describe('initials', () => {
  it('returns first two initials', () => {
    expect(initials('John Doe')).toBe('JD');
  });
  it('handles single name', () => {
    expect(initials('John')).toBe('J');
  });
});

describe('slugify', () => {
  it('converts "Hello World" to "hello-world"', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });
  it('removes leading/trailing dashes', () => {
    expect(slugify('  Hello  World  ')).toBe('hello-world');
  });
});

describe('compactNumber', () => {
  it('formats millions', () => {
    expect(compactNumber(1500000)).toBe('1.5M');
  });
  it('formats thousands', () => {
    expect(compactNumber(2500)).toBe('2.5K');
  });
  it('returns small numbers as string', () => {
    expect(compactNumber(500)).toBe('500');
  });
});

describe('nextBidOptions', () => {
  it('returns 5 increment options', () => {
    const opts = nextBidOptions(100000);
    expect(opts).toHaveLength(5);
    expect(opts[0]).toBe(105000);
  });
});

describe('bidCommitmentAmount', () => {
  it('calculates 5% commitment', () => {
    expect(bidCommitmentAmount(100000)).toBe(5000);
  });
});

describe('validateEmail', () => {
  it('validates correct email', () => {
    expect(validateEmail('test@example.com')).toBe(true);
  });
  it('rejects invalid email', () => {
    expect(validateEmail('not-an-email')).toBe(false);
  });
});

describe('validatePassword', () => {
  it('accepts 6+ char passwords', () => {
    expect(validatePassword('abcdef')).toBe(true);
  });
  it('rejects short passwords', () => {
    expect(validatePassword('abc')).toBe(false);
  });
});

describe('getCarImage', () => {
  it('returns image URL at index', () => {
    const car = { images: [{ url: 'https://example.com/img.jpg' }] };
    expect(getCarImage(car, 0)).toBe('https://example.com/img.jpg');
  });
  it('returns null for empty images', () => {
    expect(getCarImage({ images: [] }, 0)).toBeNull();
  });
  it('returns null for no car', () => {
    expect(getCarImage(null, 0)).toBeNull();
  });
});

describe('DEAL_META', () => {
  it('has all deal types', () => {
    expect(Object.keys(DEAL_META)).toEqual(['great', 'good', 'fair', 'overpriced']);
  });
  it('great deal has label', () => {
    expect(DEAL_META.great.label).toContain('Great Deal');
  });
});

describe('AUCTION_STATUS', () => {
  it('has all statuses', () => {
    expect(Object.keys(AUCTION_STATUS)).toEqual(['draft', 'live', 'ended', 'sold']);
  });
});

describe('extractError', () => {
  it('extracts response data message', () => {
    const err = { response: { data: { message: 'Not found' } } };
    expect(extractError(err)).toBe('Not found');
  });
  it('falls back to err.message', () => {
    const err = new Error('Oops');
    expect(extractError(err)).toBe('Oops');
  });
  it('uses fallback when no message', () => {
    expect(extractError({}, 'fallback')).toBe('fallback');
  });
});

describe('copyToClipboard', () => {
  it('returns false when clipboard API fails', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: () => Promise.reject(new Error('fail')) },
      configurable: true,
    });
    const result = await copyToClipboard('test');
    expect(result).toBe(false);
  });
});

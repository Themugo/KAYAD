/**
 * Formatting Utilities
 * Common formatting functions for prices, dates, and other display values
 */

// ============================================================
// Currency Formatting
// ============================================================

/**
 * Format a price in KES with compact notation
 * @param amount - The amount in KES
 * @returns Formatted price string (e.g., "KES 1.5M")
 */
export function formatPrice(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') {
    return 'Price on request';
  }
  
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(num)) {
    return 'Price on request';
  }
  
  if (num >= 1_000_000) {
    return `KES ${(num / 1_000_000).toFixed(1)}M`;
  }
  
  return `KES ${num.toLocaleString()}`;
}

/**
 * Format a price in KES with full notation
 * @param amount - The amount in KES
 * @returns Formatted price string (e.g., "KES 1,500,000")
 */
export function formatPriceFull(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') {
    return 'Price on request';
  }
  
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(num)) {
    return 'Price on request';
  }
  
  return `KES ${num.toLocaleString('en-KE')}`;
}

/**
 * Format a price without currency prefix
 * @param amount - The amount
 * @returns Formatted number string
 */
export function formatNumber(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') {
    return '—';
  }
  
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(num)) {
    return '—';
  }
  
  return num.toLocaleString();
}

// ============================================================
// Time Formatting
// ============================================================

/**
 * Format a countdown timer from end time
 * @param endTime - Target timestamp or Date
 * @returns Formatted countdown string (e.g., "2h 30m")
 */
export function formatCountdown(endTime: number | Date | string): string {
  const end = endTime instanceof Date ? endTime.getTime() : 
               typeof endTime === 'string' ? new Date(endTime).getTime() : endTime;
  
  const diff = end - Date.now();
  
  if (diff <= 0) {
    return 'ENDED';
  }
  
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1_000);
  
  if (h > 24) {
    const d = Math.floor(h / 24);
    return `${d}d ${h % 24}h`;
  }
  
  if (h > 0) {
    return `${h}h ${m}m`;
  }
  
  if (m > 0) {
    return `${m}m ${s}s`;
  }
  
  return `${s}s`;
}

/**
 * Format a relative time string (e.g., "2 hours ago")
 * @param date - Date to format
 * @returns Relative time string
 */
export function formatRelativeTime(date: Date | string | number): string {
  const d = date instanceof Date ? date : new Date(date);
  const now = Date.now();
  const diff = now - d.getTime();
  
  const seconds = Math.floor(diff / 1_000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);
  
  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`;
  if (weeks < 4) return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
  if (months < 12) return `${months} month${months !== 1 ? 's' : ''} ago`;
  return `${years} year${years !== 1 ? 's' : ''} ago`;
}

/**
 * Format a date to a readable string
 * @param date - Date to format
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 */
export function formatDate(
  date: Date | string | number,
  options: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  }
): string {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString('en-KE', options);
}

// ============================================================
// Number Formatting
// ============================================================

/**
 * Format mileage with K prefix
 * @param km - Mileage in kilometers
 * @returns Formatted mileage string
 */
export function formatMileage(km: number | string | null | undefined): string {
  if (km === null || km === undefined || km === '') {
    return '—';
  }
  
  const num = typeof km === 'string' ? parseInt(km, 10) : km;
  
  if (isNaN(num)) {
    return '—';
  }
  
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(num % 1_000 === 0 ? 0 : 1)}K km`;
  }
  
  return `${num} km`;
}

/**
 * Format a percentage
 * @param value - Value between 0 and 1 (or 0 and 100 if raw is true)
 * @param options - Format options
 * @returns Formatted percentage string
 */
export function formatPercent(
  value: number,
  options: { decimals?: number; raw?: boolean } = {}
): string {
  const { decimals = 0, raw = false } = options;
  const percent = raw ? value : value * 100;
  return `${percent.toFixed(decimals)}%`;
}

/**
 * Compact number formatting (e.g., 1.2K, 3.5M)
 * @param num - Number to format
 * @returns Compact number string
 */
export function formatCompact(num: number | string | null | undefined): string {
  if (num === null || num === undefined || num === '') {
    return '—';
  }
  
  const n = typeof num === 'string' ? parseFloat(num) : num;
  
  if (isNaN(n)) {
    return '—';
  }
  
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1)}M`;
  }
  
  if (n >= 1_000) {
    return `${(n / 1_000).toFixed(1)}K`;
  }
  
  return n.toString();
}

// ============================================================
// Text Formatting
// ============================================================

/**
 * Truncate text to a maximum length
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @param suffix - Suffix to add when truncated
 * @returns Truncated text
 */
export function truncate(text: string, maxLength: number, suffix = '...'): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * Capitalize the first letter of a string
 * @param str - String to capitalize
 * @returns Capitalized string
 */
export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Convert a string to title case
 * @param str - String to convert
 * @returns Title cased string
 */
export function toTitleCase(str: string): string {
  return str.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
  );
}

/**
 * Format a vehicle title from parts
 * @param year - Vehicle year
 * @param brand - Vehicle brand
 * @param model - Vehicle model
 * @param variant - Optional variant
 * @returns Formatted title
 */
export function formatVehicleTitle(
  year: number | string,
  brand: string,
  model: string,
  variant?: string
): string {
  const parts = [year, brand, model];
  if (variant) {
    parts.push(variant);
  }
  return parts.join(' ');
}

// ============================================================
// Phone Number Formatting
// ============================================================

/**
 * Format a Kenyan phone number
 * @param phone - Raw phone number
 * @returns Formatted phone number
 */
export function formatPhone(phone: string): string {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  
  // Handle different formats
  if (digits.startsWith('254')) {
    return `+254 ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  
  if (digits.startsWith('0')) {
    return `+254 ${digits.slice(1, 4)} ${digits.slice(4)}`;
  }
  
  return phone;
}

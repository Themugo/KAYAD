// src/utils/helpers.ts

// ─── Currency ───────────────────────────────────────────
export const parseKES = (str: string | number): number =>
  Number(String(str).replace(/[^0-9.]/g, '')) || 0;

export const formatKES = (n: number | string): string =>
  'KES ' + Number(n || 0).toLocaleString('en-KE');

// ─── Phone ──────────────────────────────────────────────
export const formatPhone = (phone: string | number): string => {
  const clean = String(phone).replace(/\D/g, '');
  if (clean.startsWith('0') && clean.length === 10) return '254' + clean.slice(1);
  if (clean.startsWith('254') && clean.length === 12) return clean;
  if (clean.startsWith('7') && clean.length === 9) return '254' + clean;
  return clean;
};

export const displayPhone = (raw: string | number): string => {
  const p = formatPhone(raw);
  if (p.length === 12) return `+${p.slice(0,3)} ${p.slice(3,6)} ${p.slice(6,9)} ${p.slice(9)}`;
  return String(raw);
};

export const isValidSafaricom = (phone: string | number): boolean => {
  const formatted = formatPhone(phone);
  return /^2547[0-9]{8}$/.test(formatted);
};

// ─── Date / Time ────────────────────────────────────────
export const timeAgo = (iso: string | Date): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)   return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60)   return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)   return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30)   return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const formatDate = (iso: string | Date, opts: Intl.DateTimeFormatOptions = {}): string =>
  new Date(iso).toLocaleDateString('en-KE', {
    day: 'numeric', month: 'short', year: 'numeric', ...opts
  });

export const formatDateTime = (iso: string | Date): string =>
  new Date(iso).toLocaleString('en-KE', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });

// ─── String ─────────────────────────────────────────────
export const truncate = (str: string, len = 60): string =>
  str && str.length > len ? str.slice(0, len).trim() + '…' : str;

export const initials = (name = ''): string =>
  name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

export const slugify = (str: string): string =>
  str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

// ─── Numbers ────────────────────────────────────────────
export const compactNumber = (n: number): string => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return String(n);
};

// ─── Bid Increment ──────────────────────────────────────
export const nextBidOptions = (currentBid: number): number[] => {
  const min = currentBid + 5_000;
  return [min, min + 10_000, min + 25_000, min + 50_000, min + 100_000];
};

export const bidCommitmentAmount = (bidAmount: number): number =>
  Math.ceil(Number(bidAmount) * 0.05); // 5% commitment

// ─── Validation ─────────────────────────────────────────
export const validateEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const validatePassword = (pw: string): boolean =>
  Boolean(pw && pw.length >= 6);

// ─── Image ──────────────────────────────────────────────
export interface CarImage {
  url?: string;
}

export interface Car {
  images?: (CarImage | string)[];
}

export const getCarImage = (car: Car, index = 0): string | null => {
  const imgs = car?.images || [];
  const img = imgs[index];
  if (typeof img === 'string') return img;
  return img?.url || null;
};

const CLOUDINARY_RE = /^(https?:\/\/res\.cloudinary\.com\/.*\/image\/upload)\/(v?\d+\/.*)$/;
const BREAKPOINTS = [320, 640, 960, 1280];

export const getCloudinarySrcSet = (url: string | null): { src: string; srcSet: string | undefined } | null => {
  if (!url) return null;
  const m = url.match(CLOUDINARY_RE);
  if (!m) return { src: url, srcSet: undefined };
  const base = m[1];
  const tail = m[2];
  const variants = BREAKPOINTS.map(
    (w) => `${base}/w_${w},c_fill,q_auto,f_auto/${tail} ${w}w`,
  ).join(",\n");
  return { src: `${base}/q_auto,f_auto/${tail}`, srcSet: variants };
};

// ─── Deal Rating ────────────────────────────────────────
export interface DealMeta {
  label: string;
  color: string;
  bg: string;
}

export const DEAL_META: Record<string, DealMeta> = {
  great:      { label: '🔥 Great Deal', color: 'var(--green)',  bg: 'rgba(34,197,94,0.1)' },
  good:       { label: '👍 Good Price', color: 'var(--blue)',   bg: 'rgba(59,130,246,0.1)' },
  fair:       { label: '✓ Fair Price',  color: 'var(--gold)',   bg: 'rgba(212,196,168,0.1)' },
  overpriced: { label: '↑ High Price',  color: 'var(--red)',    bg: 'rgba(239,68,68,0.1)' },
};

// ─── Auction Status ─────────────────────────────────────
export interface AuctionStatus {
  label: string;
  badge: string;
  icon: string;
}

export const AUCTION_STATUS: Record<string, AuctionStatus> = {
  draft:   { label: 'Draft',   badge: 'badge-muted',   icon: '⏸' },
  live:    { label: 'Live',    badge: 'badge-green',   icon: '🔴' },
  ended:   { label: 'Ended',   badge: 'badge-muted',   icon: '🏁' },
  sold:    { label: 'Sold',    badge: 'badge-gold',    icon: '✅' },
};

// ─── Error Extract ──────────────────────────────────────
export interface ErrorResponse {
  response?: {
    data?: {
      message?: string;
      error?: string;
    };
  };
  message?: string;
}

export const extractError = (err: ErrorResponse, fallback = 'Something went wrong'): string =>
  err?.response?.data?.message ||
  err?.response?.data?.error  ||
  err?.message                ||
  fallback;

// ─── Copy to clipboard ──────────────────────────────────
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

// src/utils/helpers.js

// ─── Currency ───────────────────────────────────────────
export const formatKES = (n) =>
  'KES ' + Number(n || 0).toLocaleString('en-KE');

export const parseKES = (str) =>
  Number(String(str).replace(/[^0-9.]/g, '')) || 0;

// ─── Phone ──────────────────────────────────────────────
export const formatPhone = (phone) => {
  const clean = String(phone).replace(/\D/g, '');
  if (clean.startsWith('0') && clean.length === 10) return '254' + clean.slice(1);
  if (clean.startsWith('254') && clean.length === 12) return clean;
  if (clean.startsWith('7') && clean.length === 9) return '254' + clean;
  return clean;
};

export const displayPhone = (raw) => {
  const p = formatPhone(raw);
  if (p.length === 12) return `+${p.slice(0,3)} ${p.slice(3,6)} ${p.slice(6,9)} ${p.slice(9)}`;
  return raw;
};

export const isValidSafaricom = (phone) => {
  const formatted = formatPhone(phone);
  return /^2547[0-9]{8}$/.test(formatted);
};

// ─── Date / Time ────────────────────────────────────────
export const timeAgo = (iso) => {
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

export const formatDate = (iso, opts = {}) =>
  new Date(iso).toLocaleDateString('en-KE', {
    day: 'numeric', month: 'short', year: 'numeric', ...opts
  });

export const formatDateTime = (iso) =>
  new Date(iso).toLocaleString('en-KE', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });

// ─── String ─────────────────────────────────────────────
export const truncate = (str, len = 60) =>
  str && str.length > len ? str.slice(0, len).trim() + '…' : str;

export const initials = (name = '') =>
  name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

export const slugify = (str) =>
  str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

// ─── Numbers ────────────────────────────────────────────
export const compactNumber = (n) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return String(n);
};

// ─── Bid Increment ──────────────────────────────────────
export const nextBidOptions = (currentBid) => {
  const min = currentBid + 5_000;
  return [min, min + 10_000, min + 25_000, min + 50_000, min + 100_000];
};

export const bidCommitmentAmount = (bidAmount) =>
  Math.ceil(Number(bidAmount) * 0.05); // 5% commitment

// ─── Validation ─────────────────────────────────────────
export const validateEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const validatePassword = (pw) =>
  pw && pw.length >= 6;

// ─── Image ──────────────────────────────────────────────
export const getCarImage = (car, index = 0) => {
  const imgs = car?.images || [];
  return imgs[index]?.url || imgs[index] || null;
};

// ─── Deal Rating ────────────────────────────────────────
export const DEAL_META = {
  great:      { label: '🔥 Great Deal', color: 'var(--green)',  bg: 'rgba(34,197,94,0.1)' },
  good:       { label: '👍 Good Price', color: 'var(--blue)',   bg: 'rgba(59,130,246,0.1)' },
  fair:       { label: '✓ Fair Price',  color: 'var(--gold)',   bg: 'rgba(212,168,67,0.1)' },
  overpriced: { label: '↑ High Price',  color: 'var(--red)',    bg: 'rgba(239,68,68,0.1)' },
};

// ─── Auction Status ─────────────────────────────────────
export const AUCTION_STATUS = {
  draft:   { label: 'Draft',   badge: 'badge-muted',   icon: '⏸' },
  live:    { label: 'Live',    badge: 'badge-green',   icon: '🔴' },
  ended:   { label: 'Ended',   badge: 'badge-muted',   icon: '🏁' },
  sold:    { label: 'Sold',    badge: 'badge-gold',    icon: '✅' },
};

// ─── Error Extract ──────────────────────────────────────
export const extractError = (err, fallback = 'Something went wrong') =>
  err?.response?.data?.message ||
  err?.response?.data?.error  ||
  err?.message                ||
  fallback;

// ─── Copy to clipboard ──────────────────────────────────
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

// ─── Cloudinary Image Helpers ───────────────────────────
export const getCloudinarySrcSet = (src) => {
  if (!src) return null;
  // Return the same URL for srcSet - actual Cloudinary transformations
  // would be handled server-side or via URL parameters
  return src;
};

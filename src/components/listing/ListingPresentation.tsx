import React, { useState } from 'react';
import { Car } from 'lucide-react';

/**
 * Shared presentation pieces for a seller's own listings, used by the dealer
 * inventory and the personal-account "My listings" so both read the same way.
 * Presentation only: they render the values they are given.
 */

type Tone = 'live' | 'review' | 'draft' | 'reserved' | 'sold' | 'problem';

const TONES: Record<Tone, { chip: string; dot: string }> = {
  live: { chip: 'bg-emerald-50 text-emerald-800 ring-emerald-200', dot: 'bg-emerald-500' },
  review: { chip: 'bg-amber-50 text-amber-800 ring-amber-200', dot: 'bg-amber-500' },
  draft: { chip: 'bg-slate-50 text-slate-700 ring-slate-200', dot: 'bg-slate-400' },
  reserved: { chip: 'bg-[#E6F6F3] text-[#12576D] ring-[#BDE5DE]', dot: 'bg-[#13B8A6]' },
  sold: { chip: 'bg-[#EEF3F7] text-[#334155] ring-[#CBD5E1]', dot: 'bg-[#64748B]' },
  problem: { chip: 'bg-rose-50 text-rose-800 ring-rose-200', dot: 'bg-rose-500' },
};

export function listingTone(status?: string | null): Tone {
  switch (String(status || 'draft').toLowerCase()) {
    case 'available': case 'active': case 'published': return 'live';
    case 'pending': case 'pending_review': case 'under_review': return 'review';
    case 'reserved': return 'reserved';
    case 'sold': return 'sold';
    case 'rejected': case 'suspended': case 'flagged': return 'problem';
    default: return 'draft';
  }
}

/** Status pill with a colour dot. `label` keeps whatever wording the screen already used. */
export const ListingStatusBadge: React.FC<{ status?: string | null; label?: string; className?: string }> = ({ status, label, className = '' }) => {
  const tone = TONES[listingTone(status)];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${tone.chip} ${className}`}>
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
      {label ?? String(status || 'draft')}
    </span>
  );
};

/** Photo box: fixed ratio (no layout jump), fades in once decoded, falls back to an icon. */
export const ListingThumb: React.FC<{
  src?: string | null;
  /** Used if `src` (usually a small thumbnail) fails to load. */
  fallback?: string | null;
  alt: string;
  count?: number;
  className?: string;
  priority?: boolean;
}> = ({ src, fallback, alt, count = 0, className = '', priority = false }) => {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const current = useFallback ? fallback : src;
  const showImage = Boolean(current) && !failed;
  return (
    <div className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-b from-[#F3F8F7] to-[#E1EDEB] ${className}`}>
      {showImage ? (
        <img
          src={current as string}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => { if (!useFallback && fallback && fallback !== src) { setUseFallback(true); } else { setFailed(true); } }}
          ref={(el) => { if (el?.complete && el.naturalWidth > 0 && !loaded) setLoaded(true); }}
          className={`h-full w-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
      ) : (
        <Car className="h-7 w-7 text-[#64748B]/70" aria-hidden="true" />
      )}
      {showImage && count > 0 && (
        <span className="absolute bottom-1.5 right-1.5 rounded-md bg-[#071F2A]/75 px-1.5 py-0.5 text-[10px] font-bold text-white">
          {count} {count === 1 ? 'photo' : 'photos'}
        </span>
      )}
    </div>
  );
};

/** Small neutral facts under a listing title (year, mileage, town, views). */
export const ListingFacts: React.FC<{ items: Array<React.ReactNode | null | undefined | false>; className?: string }> = ({ items, className = '' }) => {
  const shown = items.filter(Boolean);
  if (shown.length === 0) return null;
  return (
    <ul className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#475569] ${className}`}>
      {shown.map((item, i) => (
        <li key={i} className="inline-flex items-center gap-1">{item}</li>
      ))}
    </ul>
  );
};

/** Listing-quality score as a ring; colour follows the score band. */
export const ListingScoreRing: React.FC<{ score: number }> = ({ score }) => {
  const value = Math.max(0, Math.min(100, Math.round(score)));
  const r = 20;
  const c = 2 * Math.PI * r;
  const color = value >= 80 ? '#059669' : value >= 50 ? '#D97706' : '#DC2626';
  return (
    <div className="relative h-14 w-14 shrink-0" role="img" aria-label={`Listing quality ${value} percent`}>
      <svg viewBox="0 0 48 48" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="24" cy="24" r={r} fill="none" stroke="#E2ECEA" strokeWidth="5" />
        <circle cx="24" cy="24" r={r} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[13px] font-extrabold" style={{ color }}>{value}%</span>
    </div>
  );
};

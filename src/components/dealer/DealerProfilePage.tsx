import type { FC } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Building2, MapPin, ShieldCheck, Car, Search, ChevronLeft, MessageSquare } from 'lucide-react';
import { api } from '../../api/httpClient';
import { getDealerProfile } from '../../services/dealerPlatformApi';

/**
 * Public dealer storefront (`/showroom/:dealerId`). Everything shown comes from the backend allowlist
 * (GET /dealer-platform/profile/:id and the public GET /cars?dealer=:id), never from client state.
 * Pending, rejected or suspended dealerships answer 404 and render "not available" rather than a half-filled page.
 */
interface StoreProfile {
  id: string; businessName: string | null; bio: string | null; location: string | null; logoUrl: string | null; bannerUrl: string | null;
  verified: boolean; memberSince: string | null; stats: { activeListings: number; averageRating: number | null; totalReviews: number };
}
interface StoreVehicle { id: string; title?: string; brand?: string; model?: string; year?: number; price?: number; mileage?: number; city?: string; location?: string; coverImage?: string; images?: Array<string | { url?: string }> }

const idFromPath = (pathname: string) => decodeURIComponent((pathname.match(/^\/showroom\/([^/]+)\/?$/) || [])[1] || '');
const imageOf = (v: StoreVehicle) => { const first = v.coverImage || (typeof v.images?.[0] === 'string' ? v.images[0] as string : (v.images?.[0] as { url?: string } | undefined)?.url); return first || ''; };
const kes = (n?: number) => (typeof n === 'number' ? `KES ${n.toLocaleString('en-KE')}` : 'Price on request');

export const DealerProfilePage: FC<{ dealerId?: string }> = ({ dealerId }) => {
  const id = dealerId || idFromPath(typeof window !== 'undefined' ? window.location.pathname : '');
  const [profile, setProfile] = useState<StoreProfile | null>(null);
  const [vehicles, setVehicles] = useState<StoreVehicle[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [invError, setInvError] = useState(false);
  const [q, setQ] = useState('');
  const [logoBad, setLogoBad] = useState(false);
  const [bannerBad, setBannerBad] = useState(false);

  useEffect(() => {
    let live = true;
    setState('loading'); setInvError(false);
    (async () => {
      try {
        const res: any = await getDealerProfile(id);
        if (!live) return;
        setProfile(res?.data || null);
        try {
          const inv: any = await api.get('/cars', { params: { dealer: id, limit: 48 } });
          const rows = inv?.data?.data ?? inv?.data?.cars ?? [];
          if (live) setVehicles(Array.isArray(rows) ? rows : []);
        } catch { if (live) setInvError(true); }
        if (live) setState('ready');
      } catch (err: any) {
        if (!live) return;
        setState(err?.response?.status === 404 || err?.status === 404 ? 'missing' : 'error');
      }
    })();
    return () => { live = false; };
  }, [id]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle ? vehicles.filter((v) => `${v.title || ''} ${v.brand || ''} ${v.model || ''}`.toLowerCase().includes(needle)) : vehicles;
  }, [vehicles, q]);

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-[#F6FAF9] text-[#0f2a3a]">
      <header className="border-b border-[#dbe7e5] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <a href="/" className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-[#176B87]"><ChevronLeft size={16} aria-hidden="true" />KAYARD KE marketplace</a>
        </div>
      </header>
      {children}
    </div>
  );

  if (state === 'loading') return shell(<main className="mx-auto max-w-6xl px-4 py-10" aria-busy="true"><div className="h-40 animate-pulse rounded-2xl bg-white" /><p className="mt-4 text-sm text-[#64748b]">Loading dealership…</p></main>);
  if (state === 'error') return shell(<main className="mx-auto max-w-3xl px-4 py-16 text-center"><div role="alert"><h1 className="text-xl font-bold text-[#176B87]">We couldn’t load this dealership</h1><p className="mt-2 text-sm text-[#64748b]">Please check your connection and try again.</p><button type="button" onClick={() => window.location.reload()} className="mt-5 min-h-11 rounded-xl bg-[#176B87] px-5 text-sm font-semibold text-white">Try again</button></div></main>);
  if (state === 'missing' || !profile) return shell(<main className="mx-auto max-w-3xl px-4 py-16 text-center"><Building2 className="mx-auto text-[#176B87]" size={36} aria-hidden="true" /><h1 className="mt-3 text-2xl font-bold text-[#176B87]">This dealership page isn’t available</h1><p className="mt-2 text-sm text-[#64748b]">The dealership may not be open to the public yet. Browse all vehicles instead.</p><a href="/" className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-[#176B87] px-5 text-sm font-semibold text-white">Browse vehicles</a></main>);

  const first = vehicles[0];
  return shell(
    <main>
      <section aria-label="Dealership banner" className="relative h-40 w-full bg-gradient-to-r from-[#0f2a3a] to-[#176B87] sm:h-56">
        {profile.bannerUrl && !bannerBad && <img src={profile.bannerUrl} alt="" onError={() => setBannerBad(true)} className="h-full w-full object-cover" />}
      </section>
      <div className="mx-auto max-w-6xl px-4">
        <div className="relative z-10 -mt-10 flex flex-col gap-4 rounded-2xl border border-[#dbe7e5] bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:p-6">
          <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl border border-[#dbe7e5] bg-[#F6FAF9]">
            {profile.logoUrl && !logoBad ? <img src={profile.logoUrl} alt={`${profile.businessName || 'Dealership'} logo`} onError={() => setLogoBad(true)} className="h-full w-full object-contain" /> : <Building2 className="text-[#176B87]" size={32} aria-hidden="true" />}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold leading-tight">
              <span className="break-words">{profile.businessName || 'Dealership'}</span>
              {profile.verified && <span className="inline-flex items-center gap-1 rounded-full bg-[#e6f4f1] px-2.5 py-1 text-xs font-semibold text-[#0f6b5c]"><ShieldCheck size={14} aria-hidden="true" />Verified dealer</span>}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#475569]">
              {profile.location && <span className="inline-flex items-center gap-1"><MapPin size={14} aria-hidden="true" />{profile.location}</span>}
              <span className="inline-flex items-center gap-1"><Car size={14} aria-hidden="true" />{profile.stats.activeListings} vehicle{profile.stats.activeListings === 1 ? '' : 's'} for sale</span>
              {profile.memberSince && <span>Member since {new Date(profile.memberSince).getFullYear()}</span>}
            </p>
          </div>
          {first
            ? <a href={`/cars/${encodeURIComponent(first.id)}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#176B87] px-5 text-sm font-semibold text-white"><MessageSquare size={16} aria-hidden="true" />Contact dealer</a>
            : <button type="button" disabled className="min-h-11 cursor-not-allowed rounded-xl bg-[#cbd5e1] px-5 text-sm font-semibold text-[#475569]" title="Enquiries open once a vehicle is listed">Contact dealer</button>}
        </div>

        {profile.bio && <section aria-label="About" className="mt-6"><h2 className="text-lg font-bold">About</h2><p className="mt-2 max-w-3xl whitespace-pre-line text-sm leading-6 text-[#334155]">{profile.bio}</p></section>}

        <section aria-label="Inventory" className="mt-8 pb-16">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold">Inventory</h2>
            {vehicles.length > 6 && <label className="relative block w-full sm:w-72"><span className="sr-only">Search this dealership</span><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" aria-hidden="true" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search this dealership" className="min-h-11 w-full rounded-xl border border-[#cbd5e1] bg-white pl-9 pr-3 text-sm" /></label>}
          </div>
          {invError && <p role="alert" className="mt-4 rounded-xl bg-[#fff7ed] p-4 text-sm text-[#9a3412]">We couldn’t load the vehicles right now. Please refresh to try again.</p>}
          {!invError && vehicles.length === 0 && <p className="mt-4 rounded-xl border border-dashed border-[#cbd5e1] bg-white p-8 text-center text-sm text-[#64748b]">No vehicles are listed at the moment. Check back soon.</p>}
          {!invError && vehicles.length > 0 && shown.length === 0 && <p className="mt-4 text-sm text-[#64748b]">No vehicles match “{q}”.</p>}
          <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((v) => (
              <li key={v.id} className="overflow-hidden rounded-2xl border border-[#dbe7e5] bg-white">
                <a href={`/cars/${encodeURIComponent(v.id)}`} className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#176B87]">
                  <div className="aspect-[16/10] w-full bg-[#eef3f2]">{imageOf(v) && <img src={imageOf(v)} alt={v.title || `${v.brand || ''} ${v.model || ''}`} loading="lazy" className="h-full w-full object-cover" />}</div>
                  <div className="p-4">
                    <h3 className="line-clamp-2 text-sm font-semibold">{v.title || `${v.year || ''} ${v.brand || ''} ${v.model || ''}`.trim()}</h3>
                    <p className="mt-1 text-base font-bold text-[#176B87]">{kes(v.price)}</p>
                    <p className="mt-1 text-xs text-[#64748b]">{[v.year, typeof v.mileage === 'number' ? `${v.mileage.toLocaleString('en-KE')} km` : null, v.city || v.location].filter(Boolean).join(' · ')}</p>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>,
  );
};

export default DealerProfilePage;

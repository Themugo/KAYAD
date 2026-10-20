import React, { useEffect, useMemo, useState } from 'react';
import { Heart, Loader2, CarFront, RefreshCw, Gavel, Search, ClipboardCheck, WalletCards, MessageCircle, ArrowUpRight, Clock3, ShieldCheck, Bookmark, Activity } from 'lucide-react';
import { getFavorites, BackendFavoriteCar } from '../../../services/favoriteApi';
import { ParticipantEscrowDesk } from '../../escrow/ParticipantEscrowDesk';
import InspectionsView from '../../InspectionsView';
import FinanceMarketplace from '../../FinancePlatform/pages/FinanceMarketplace';
import { getOwnershipDashboard, OwnershipVehicle } from '../../../services/ownershipApi';
import { fetchMyBids } from '../../../services/bidApi';
import type { UserProfile } from '../../../types';

/**
 * Rebuilt entirely - the original ("My Garage", 2591 lines) defined
 * 13 separate data concepts (watchlist, purchase journey, inspection
 * records, finance accounts, documents, timeline events, service
 * reminders, expenses, resale valuations, reward points, messages,
 * notifications) but was driven entirely by a single hardcoded demo user object.
 *
 * Investigated each concept for a real backend equivalent before
 * rebuilding, rather than keep any of them as-is:
 * - watchlist: genuinely real - this project's own real favorites
 *   system (services/favoriteApi.ts).
 * - escrow actions/history: genuinely real - the participant-scoped escrow
 *   desk, which reads only the authenticated user's deals from the backend.
 * - inspection records: genuinely real - the buyer's own real
 *   inspection orders (services/inspectionApi.ts's getMyInspections).
 * - finance accounts, documents, service reminders, expenses, resale
 *   valuations, reward points, in-platform messages, notifications:
 *   no real backend concept exists for any of these (confirmed
 *   directly - no matching controller/table for a per-vehicle
 *   document vault, service history, valuation engine, or loyalty
 *   points system). Removed rather than fabricate a version of any of
 *   them.
 */

interface BuyerPlatformProps {
  user?: UserProfile | null;
  onNavigate?: (section: string) => void;
  onOpenAuth?: () => void;
  initialInspectionTab?: 'mine' | 'reports';
}

const SummaryMetric: React.FC<{ icon: React.ReactNode; label: string; value: string; hint: string; onClick: () => void }> = ({ icon, label, value, hint, onClick }) => (
  <button type="button" onClick={onClick} className="group min-h-[118px] rounded-2xl border border-[#D7E7E4] bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#9ACFC6] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5AAFA4]">
    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EEF7F5] text-[#176B87] transition group-hover:bg-[#DFF2EE]">{icon}</span>
    <span className="mt-3 block text-xs font-medium text-[#64748B]">{label}</span>
    <span className="mt-0.5 block text-xl font-bold tracking-tight text-[#0A3340]">{value}</span>
    <span className="mt-1 block text-[11px] text-[#64748B]">{hint}</span>
  </button>
);

const BuyerAction: React.FC<{ icon: React.ReactNode; title: string; detail: string; onClick: () => void }> = ({ icon, title, detail, onClick }) => (
  <button type="button" onClick={onClick} className="group flex min-h-[100px] items-start gap-3 rounded-2xl border border-[#D7E7E4] bg-white p-4 text-left transition hover:border-[#9ACFC6] hover:bg-[#F8FBFA] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5AAFA4]">
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF7F5] text-[#176B87] group-hover:bg-[#DFF2EE]">{icon}</span>
    <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-[#0A3340]">{title}</span><span className="mt-1 block text-xs leading-5 text-[#64748B]">{detail}</span></span>
    <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-[#7A969D]" aria-hidden="true" />
  </button>
);

export default function BuyerPlatform({ user, onNavigate, onOpenAuth, initialInspectionTab = 'mine' }: BuyerPlatformProps) {
  const userId = user?.id ? String(user.id) : null;
  const [favorites, setFavorites] = useState<BackendFavoriteCar[]>([]);
  const [ownedVehicles, setOwnedVehicles] = useState<OwnershipVehicle[]>([]);
  const [myBids, setMyBids] = useState<Array<Record<string, unknown>>>([]);
  const [dataSessionKey, setDataSessionKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorSessionKey, setErrorSessionKey] = useState<string | null>(null);
  const [failedResources, setFailedResources] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [bidLoading, setBidLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setFavorites([]);
    setOwnedVehicles([]);
    setMyBids([]);
    setError(null);
    setErrorSessionKey(null);
    setFailedResources([]);
    setDataSessionKey(null);

    if (!userId) {
      setLoading(false);
      return () => { cancelled = true; };
    }

    setLoading(true);
    setBidLoading(true);

    Promise.allSettled([getFavorites(), getOwnershipDashboard()]).then(([favResult, ownershipResult]) => {
      if (cancelled) return;
      const failures: string[] = [];
      if (favResult.status === 'fulfilled') {
        setFavorites(favResult.value.favorites || []);
      } else {
        failures.push('saved vehicles');
      }
      if (ownershipResult.status === 'fulfilled') {
        setOwnedVehicles(ownershipResult.value.currentVehicles || []);
      } else {
        failures.push('owned vehicles');
      }
      setDataSessionKey(userId);
      setFailedResources((current) => [...current.filter((item) => item === 'auction bids' || !['saved vehicles', 'owned vehicles'].includes(item)), ...failures]);
      if (failures.length) {
        setError(`Could not load ${failures.join(' and ')}. Please retry; unavailable data has not been treated as an empty list.`);
        setErrorSessionKey(userId);
      } else {
        setError(null);
        setErrorSessionKey(null);
      }
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    fetchMyBids().then((result) => {
      if (cancelled) return;
      setMyBids(Array.isArray(result.bids) ? result.bids : []);
      setFailedResources((current) => current.filter((item) => item !== 'auction bids'));
    }).catch(() => {
      if (cancelled) return;
      setMyBids([]);
      setFailedResources((current) => current.includes('auction bids') ? current : [...current, 'auction bids']);
    }).finally(() => {
      if (!cancelled) setBidLoading(false);
    });

    return () => { cancelled = true; };
  }, [userId, reloadKey]);

  // Mask data synchronously during account transitions; an effect alone can run
  // after a render and briefly expose the previous account's garage.
  const sessionMatches = Boolean(userId && dataSessionKey === userId);
  const visibleFavorites = sessionMatches ? favorites : [];
  const visibleOwnedVehicles = sessionMatches ? ownedVehicles : [];
  const visibleBids = sessionMatches ? myBids : [];
  const activeBidCount = useMemo(() => visibleBids.filter((bid) => {
    const status = String(bid.status || '').toLowerCase();
    return !status || ['pending', 'active', 'accepted', 'leading'].includes(status);
  }).length, [visibleBids]);
  const visibleError = userId && errorSessionKey === userId ? error : null;
  const isLoading = Boolean(userId) && (!sessionMatches || loading);

  if (!user) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-[#64748B] mb-4">Sign in to see your saved vehicles, purchases, and inspection reports.</p>
        <button onClick={onOpenAuth} className="bg-[#176B87] text-white text-xs font-bold rounded-lg px-5 py-2.5">
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-7 pb-12 kayad-portal kayad-portal--buyer" data-kayad-portal="buyer">
      <header className="relative overflow-hidden rounded-2xl border border-[#D7E7E4] bg-gradient-to-br from-[#082F3A] via-[#0A4655] to-[#176B87] p-5 text-white shadow-sm sm:p-7">
        <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full border border-white/10" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-2 -top-6 h-36 w-36 rounded-full border border-white/10" />
        <div className="relative flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-100"><Activity className="h-3.5 w-3.5" aria-hidden="true" /> Buyer command centre</p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Welcome{user.name ? `, ${user.name}` : ''}</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/75">Follow your saved vehicles, auction bids, inspections and protected purchases from one place.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => onNavigate?.('marketplace')} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#0A3340] shadow-sm transition hover:bg-teal-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"><Search className="h-4 w-4" aria-hidden="true" /> Browse vehicles <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></button>
            <button type="button" onClick={() => onNavigate?.('discovery')} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"><Gavel className="h-4 w-4" aria-hidden="true" /> Live auctions</button>
          </div>
        </div>
      </header>

      <section aria-label="Buyer activity summary" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <SummaryMetric icon={<Bookmark className="h-5 w-5" aria-hidden="true" />} label="Saved vehicles" value={isLoading ? '—' : String(visibleFavorites.length)} hint="Your shortlist" onClick={() => onNavigate?.('saved')} />
        <SummaryMetric icon={<Gavel className="h-5 w-5" aria-hidden="true" />} label="Active bids" value={isLoading || bidLoading || failedResources.includes('auction bids') ? '—' : String(activeBidCount)} hint={failedResources.includes('auction bids') ? 'Bid data unavailable' : 'Open auction activity'} onClick={() => onNavigate?.('discovery')} />
        <SummaryMetric icon={<CarFront className="h-5 w-5" aria-hidden="true" />} label="In your garage" value={isLoading ? '—' : String(visibleOwnedVehicles.length)} hint="Recorded ownership" onClick={() => document.getElementById('buyer-owned-vehicles')?.scrollIntoView({ behavior: 'auto', block: 'start' })} />
        <SummaryMetric icon={<ShieldCheck className="h-5 w-5" aria-hidden="true" />} label="Escrow & purchases" value="View details" hint="Participant-scoped records" onClick={() => document.getElementById('buyer-escrow-workspace')?.scrollIntoView({ behavior: 'auto', block: 'start' })} />
      </section>

      <section aria-label="Buyer quick actions" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <BuyerAction icon={<Gavel className="h-5 w-5" aria-hidden="true" />} title="Watch auctions" detail="Live and upcoming" onClick={() => onNavigate?.('discovery')} />
        <BuyerAction icon={<ClipboardCheck className="h-5 w-5" aria-hidden="true" />} title="Request inspection" detail="Book and track requests" onClick={() => onNavigate?.('inspections')} />
        <BuyerAction icon={<WalletCards className="h-5 w-5" aria-hidden="true" />} title="Purchases & escrow" detail="Review deal milestones" onClick={() => document.getElementById('buyer-escrow-workspace')?.scrollIntoView({ behavior: 'auto', block: 'start' })} />
        <BuyerAction icon={<MessageCircle className="h-5 w-5" aria-hidden="true" />} title="Messages" detail="Talk with sellers" onClick={() => onNavigate?.('chat')} />
      </section>

      {visibleError && (
        <div role="alert" className="max-w-md mx-auto p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold text-center">
          <p>{visibleError}</p>
          <button type="button" onClick={() => setReloadKey((value) => value + 1)} className="mt-2 inline-flex items-center gap-1 rounded-lg border border-rose-300 px-3 py-1.5"><RefreshCw className="h-3 w-3" /> Retry</button>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-[#94A3B8] animate-spin" />
        </div>
      ) : (
        <>
          <section id="buyer-auction-activity" className="scroll-mt-6 rounded-2xl border border-[#D7E7E4] bg-white p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2"><Gavel className="h-4 w-4 text-[#176B87]" aria-hidden="true" /><h2 className="text-base font-bold text-[#176B87]">My auction activity</h2></div>
              <button type="button" onClick={() => onNavigate?.('discovery')} className="inline-flex items-center gap-1 text-xs font-semibold text-[#176B87] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5AAFA4]">Open auctions <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></button>
            </div>
            {bidLoading ? (
              <div role="status" className="flex items-center gap-2 rounded-xl border border-[#D7E7E4] bg-[#F8FBFA] p-4 text-sm text-[#64748B]"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading your bid history…</div>
            ) : failedResources.includes('auction bids') ? (
              <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Your bid history is temporarily unavailable. Other buyer workspace sections remain available.</div>
            ) : visibleBids.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#BDE5DE] bg-[#F8FBFA] p-5 text-center"><Clock3 className="mx-auto mb-2 h-5 w-5 text-[#176B87]" aria-hidden="true" /><p className="text-sm font-semibold text-[#0A3340]">No bids recorded yet</p><p className="mt-1 text-xs text-[#64748B]">Explore live and upcoming auctions to find your next vehicle.</p><button type="button" onClick={() => onNavigate?.('discovery')} className="mt-3 rounded-lg bg-[#0A3340] px-3 py-2 text-xs font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5AAFA4]">Explore auctions</button></div>
            ) : (
              <div className="divide-y divide-[#E4EFED]">{visibleBids.slice(0, 4).map((bid, index) => {
                const car = bid.car && typeof bid.car === 'object' ? bid.car as Record<string, unknown> : {};
                const status = String(bid.status || 'pending').replace(/[_-]+/g, ' ');
                const bidId = String(bid.id || bid._id || `${bid.carId || 'bid'}-${index}`);
                const amount = Number(bid.amount || 0);
                return <div key={bidId} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"><div className="min-w-0"><p className="truncate text-sm font-semibold text-[#0A3340]">{String(car.title || car.name || 'Vehicle auction')}</p><p className="mt-1 text-xs text-[#64748B]">{amount > 0 ? `KSh ${amount.toLocaleString('en-KE')}` : 'Bid amount unavailable'}{bid.createdAt ? ` · ${new Date(String(bid.createdAt)).toLocaleDateString('en-KE')}` : ''}</p></div><span className="rounded-full border border-[#D7E7E4] bg-[#F3FAF9] px-2.5 py-1 text-xs font-semibold capitalize text-[#12576D]">{status}</span></div>;
              })}</div>
            )}
          </section>

          {/* WATCHLIST - real, from the canonical favorites system */}
          <section id="buyer-saved-vehicles" className="scroll-mt-6 rounded-2xl border border-[#D7E7E4] bg-white p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-[#176B87]" />
                <h2 className="text-base font-bold text-[#176B87]">Saved Vehicles</h2>
              </div>
              <button type="button" onClick={() => onNavigate?.('saved')} className="inline-flex items-center gap-1 text-xs font-semibold text-[#176B87] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5AAFA4]">View all <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></button>
            </div>
            {visibleFavorites.length === 0 ? (
              <p className="text-xs text-[#94A3B8]">{failedResources.includes('saved vehicles') ? 'Saved vehicles could not be loaded.' : 'No saved vehicles yet.'}</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {visibleFavorites.map((f) => (
                  <button
                    key={f.id || f._id}
                    onClick={() => onNavigate?.('saved')}
                    className="text-left bg-white border border-[#D7E7E4] rounded-xl overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="h-24 bg-[#EEF7F5]">
                      {f.images?.[0]?.url && <img src={f.images[0].url} alt={f.title} className="w-full h-full object-cover" />}
                    </div>
                    <div className="p-2.5">
                      <p className="text-xs font-semibold text-[#176B87] truncate">{f.title}</p>
                      <p className="text-[11px] text-[#64748B]">Ksh {(f.price / 1000000).toFixed(2)}M</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* OWNED VEHICLES — sourced from the signed-in user's ownership dashboard. */}
          <section id="buyer-owned-vehicles" className="scroll-mt-6 rounded-2xl border border-[#D7E7E4] bg-white p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-4">
              <CarFront className="w-4 h-4 text-[#176B87]" />
              <h2 className="text-base font-bold text-[#176B87]">Vehicles in your garage</h2>
            </div>
            {visibleOwnedVehicles.length === 0 ? (
              <p className="text-xs text-[#94A3B8]">{failedResources.includes('owned vehicles') ? 'Owned vehicles could not be loaded.' : 'No owned vehicles are recorded in your garage yet.'}</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {visibleOwnedVehicles.map((vehicle) => (
                  <div key={vehicle.id} className="rounded-xl border border-[#D7E7E4] bg-white p-3">
                    <p className="text-sm font-semibold text-[#176B87]">{[vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ') || 'Vehicle'}</p>
                    <p className="mt-1 text-xs text-[#64748B]">{vehicle.registration_number || 'Registration not recorded'}</p>
                    <p className="mt-1 text-[11px] text-[#64748B]">Status: {vehicle.status || 'Not specified'}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* PRIVATE ESCROW WORKSPACE — participant-scoped, never rendered on the public page. */}
          <section id="buyer-escrow-workspace" className="scroll-mt-6 rounded-2xl border border-[#D7E7E4] bg-white p-4 sm:p-5">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF7F5] text-[#176B87]"><WalletCards className="h-5 w-5" aria-hidden="true" /></div>
              <div><h2 className="text-base font-bold text-[#0A3340]">Purchases & escrow</h2><p className="mt-1 text-xs leading-5 text-[#64748B]">Confirmed transaction states and actions for deals you participate in. A payment request is not proof of settlement.</p></div>
            </div>
            <ParticipantEscrowDesk key={user.id} initialEscrowId={new URLSearchParams(window.location.search).get('escrowId')} onNavigate={onNavigate} />
          </section>

          {/* PRIVATE FINANCING WORKSPACE — applications and their status stay inside the signed-in customer's account. */}
          <section id="buyer-financing-workspace" className="scroll-mt-6 rounded-2xl border border-[#D7E7E4] bg-white p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-2"><WalletCards className="h-4 w-4 text-[#176B87]" aria-hidden="true" /><h2 className="text-base font-bold text-[#176B87]">Financing</h2></div>
            <FinanceMarketplace key={`finance-${user.id}`} mode="account" user={user} />
          </section>

          {/* PRIVATE INSPECTION WORKSPACE — requests, provider bookings and reports stay in the authenticated account area. */}
          <section id="buyer-inspection-workspace" className="scroll-mt-6 rounded-2xl border border-[#D7E7E4] bg-white p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2"><ClipboardCheck className="h-4 w-4 text-[#176B87]" aria-hidden="true" /><h2 className="text-base font-bold text-[#176B87]">Inspections & reports</h2></div>
              <button type="button" onClick={() => onNavigate?.('inspections')} className="inline-flex items-center gap-1 text-xs font-semibold text-[#176B87] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5AAFA4]">Inspection marketplace <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></button>
            </div>
            <InspectionsView
              key={`${user.id}-${initialInspectionTab}`}
              viewMode="account"
              initialTab={initialInspectionTab}
              vehicles={[]}
              user={user}
              onOpenAuth={onOpenAuth}
              onOpenInspectionMarketplace={() => onNavigate?.('inspections')}
            />
          </section>
        </>
      )}
    </div>
  );
}

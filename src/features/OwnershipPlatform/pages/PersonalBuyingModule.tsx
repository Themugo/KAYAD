import React, { useEffect, useState } from 'react';
import { Heart, Loader2, CarFront, RefreshCw, Gavel, ClipboardCheck, WalletCards, ArrowUpRight, Clock3, ShieldCheck } from 'lucide-react';
import type { Vehicle } from '../../../types';
import { ParticipantEscrowDesk } from '../../escrow/ParticipantEscrowDesk';
import InspectionsView from '../../InspectionsView';
import FinanceMarketplace from '../../FinancePlatform/pages/FinanceMarketplace';
import type { OwnershipDashboard, OwnershipVehicle } from '../../../services/ownershipApi';
import type { BackendEscrow, EscrowParticipantSummary } from '../../../services/escrowApi';
import { fetchMyBids } from '../../../services/bidApi';
import type { UserProfile } from '../../../types';
import BuyerNegotiationsPanel from '../../../pages/buyer/components/BuyerNegotiationsPanel';

/**
 * Rebuilt entirely - the original ("My Garage", 2591 lines) defined
 * 13 separate data concepts (watchlist, purchase journey, inspection
 * records, finance accounts, documents, timeline events, service
 * reminders, expenses, resale valuations, reward points, messages,
 * notifications) but was driven entirely by a single hardcoded demo user object.
 *
 * Investigated each concept for a real backend equivalent before
 * rebuilding, rather than keep any of them as-is:
 * - watchlist: genuinely real - the App-level useVehicleCollections
 *   hook supplies the session-masked, server-authoritative saved vehicles.
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

interface PersonalBuyingModuleProps {
  user?: UserProfile | null;
  onNavigate?: (section: string) => void;
  onOpenAuth?: () => void;
  initialInspectionTab?: 'mine' | 'reports';
  section?: 'buying' | 'auctions' | 'deals';
  savedVehicles: Vehicle[];
  savedVehicleCount: number;
  savedVehiclesSessionUserId: string | null;
  savedVehiclesLoading: boolean;
  savedVehiclesError?: string;
  savedVehiclesErrorUserId?: string | null;
  onRefreshSavedVehicles?: () => void;
  ownershipDashboard: OwnershipDashboard | null;
  ownershipDashboardLoading: boolean;
  ownershipDashboardError: boolean;
  escrowOverview?: { escrows: BackendEscrow[]; summary: EscrowParticipantSummary | null } | null;
  escrowOverviewLoading?: boolean;
  escrowOverviewError?: boolean;
  onRefreshDashboard?: () => void;
}

export default function PersonalBuyingModule({ user, onNavigate, onOpenAuth, initialInspectionTab = 'mine', section, savedVehicles, savedVehicleCount, savedVehiclesSessionUserId, savedVehiclesLoading, savedVehiclesError = '', savedVehiclesErrorUserId = null, onRefreshSavedVehicles, ownershipDashboard, ownershipDashboardLoading, ownershipDashboardError, escrowOverview, escrowOverviewLoading = false, escrowOverviewError = false, onRefreshDashboard }: PersonalBuyingModuleProps) {
  const userId = user?.id ? String(user.id) : null;
  const [ownedVehicles, setOwnedVehicles] = useState<OwnershipVehicle[]>([]);
  const [myBids, setMyBids] = useState<Array<Record<string, unknown>>>([]);
  const [bidsSessionKey, setBidsSessionKey] = useState<string | null>(null);
  const [ownershipSessionKey, setOwnershipSessionKey] = useState<string | null>(null);
  const [failedResources, setFailedResources] = useState<string[]>([]);
  const [bidLoading, setBidLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  // The global useVehicleCollections hook owns the canonical saved-vehicle list.
  // This section consumes that same session-masked collection and fetches only bids.
  useEffect(() => {
    let cancelled = false;
    setMyBids([]);
    setBidsSessionKey(null);
    setFailedResources((current) => current.filter((item) => item === 'owned vehicles'));
    if (!userId) { setBidLoading(false); return () => { cancelled = true; }; }
    setBidLoading(true);
    fetchMyBids().then((result) => {
      if (cancelled) return;
      setMyBids(Array.isArray(result.bids) ? result.bids : []);
      setBidsSessionKey(userId);
      setFailedResources((current) => current.filter((item) => item !== 'auction bids'));
    }).catch(() => {
      if (cancelled) return;
      setMyBids([]);
      setBidsSessionKey(userId);
      setFailedResources((current) => current.includes('auction bids') ? current : [...current, 'auction bids']);
    }).finally(() => { if (!cancelled) setBidLoading(false); });
    return () => { cancelled = true; };
  }, [userId, reloadKey]);

  // Ownership data is sourced once by DashboardHub. This effect masks the previous
  // account's data during identity changes and preserves an unavailable state on errors.
  useEffect(() => {
    if (!userId) {
      setOwnedVehicles([]);
      setOwnershipSessionKey(null);
      return;
    }
    if (ownershipDashboardLoading) return;
    if (ownershipDashboardError) {
      setOwnedVehicles([]);
      setOwnershipSessionKey(userId);
      setFailedResources((current) => current.includes('owned vehicles') ? current : [...current, 'owned vehicles']);
      return;
    }
    setOwnedVehicles(ownershipDashboard?.currentVehicles || []);
    setOwnershipSessionKey(userId);
    setFailedResources((current) => current.filter((item) => item !== 'owned vehicles'));
  }, [userId, ownershipDashboard, ownershipDashboardLoading, ownershipDashboardError]);

  const savedCollectionReady = Boolean(userId && (savedVehiclesSessionUserId === userId || savedVehiclesErrorUserId === userId));
  const ownershipCollectionReady = Boolean(userId && (ownershipSessionKey === userId || ownershipDashboardError));
  const sessionMatches = Boolean(userId && savedCollectionReady && ownershipCollectionReady);
  const visibleFavorites = userId && savedVehiclesSessionUserId === userId ? savedVehicles : [];
  const visibleOwnedVehicles = userId && ownershipSessionKey === userId ? ownedVehicles : [];
  const visibleBids = userId && bidsSessionKey === userId ? myBids : [];
  const visibleError = userId && savedVehiclesErrorUserId === userId ? savedVehiclesError : null;
  const isLoading = Boolean(userId) && (!sessionMatches || (savedVehiclesLoading && savedVehiclesSessionUserId !== userId) || ownershipDashboardLoading);


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
    <div className="min-w-0 space-y-4" data-kayad-personal-buying-module="true">
      {visibleError && (
        <div role="alert" className="max-w-md mx-auto p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold text-center">
          <p>{visibleError}</p>
          <button type="button" onClick={() => { onRefreshSavedVehicles?.(); setReloadKey((value) => value + 1); }} className="mt-2 inline-flex items-center gap-1 rounded-lg border border-rose-300 px-3 py-1.5"><RefreshCw className="h-3 w-3" /> Retry</button>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-[#64748B] animate-spin" />
        </div>
      ) : (
        <>
          {(!section || section === 'auctions') && <section id="personal-auction-activity" className="scroll-mt-6 rounded-2xl border border-[#D7E7E4] bg-white p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2"><Gavel className="h-4 w-4 text-[#176B87]" aria-hidden="true" /><h2 className="text-base font-bold text-[#176B87]">My auction activity</h2></div>
              <button type="button" onClick={() => onNavigate?.('discovery')} className="inline-flex items-center gap-1 text-xs font-semibold text-[#176B87] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5AAFA4]">Open auctions <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></button>
            </div>
            {bidLoading ? (
              <div role="status" className="flex items-center gap-2 rounded-xl border border-[#D7E7E4] bg-[#F8FBFA] p-4 text-sm text-[#64748B]"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading your bid history…</div>
            ) : failedResources.includes('auction bids') ? (
              <div role="status" className="rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm text-warning">Your bid history is temporarily unavailable. Other sections remain available.</div>
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
          </section>}

          {/* WATCHLIST - real, from the canonical favorites system */}
          {(!section || section === 'buying') && <BuyerNegotiationsPanel />}

          {(!section || section === 'buying') && <section id="personal-saved-vehicles" className="scroll-mt-6 rounded-2xl border border-[#D7E7E4] bg-white p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-[#176B87]" />
                <h2 className="text-base font-bold text-[#176B87]">Saved Vehicles</h2>
              </div>
              <button type="button" onClick={() => onNavigate?.('saved')} className="inline-flex items-center gap-1 text-xs font-semibold text-[#176B87] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5AAFA4]">View all <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></button>
            </div>
            {visibleFavorites.length === 0 ? (
              <p className="text-xs text-[#64748B]">{savedVehiclesErrorUserId === userId ? 'Saved vehicles could not be loaded.' : savedVehicleCount > 0 ? 'Saved vehicles are being resolved from the live marketplace. Refresh to try again.' : 'No saved vehicles yet.'}</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {visibleFavorites.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => onNavigate?.('saved')}
                    className="text-left bg-white border border-[#D7E7E4] rounded-xl overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="h-24 bg-[#EEF7F5]">
                      {f.images?.[0] && <img src={f.images[0]} alt={f.title || `${f.year} ${f.make} ${f.model}`} className="w-full h-full object-contain bg-[#F3F8F7]" />}
                    </div>
                    <div className="p-2.5">
                      <p className="text-xs font-semibold text-[#176B87] truncate">{f.title || `${f.year} ${f.make} ${f.model}`}</p>
                      <p className="text-[11px] text-[#64748B]">KSh {Number(f.price || 0).toLocaleString('en-KE')}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {visibleFavorites.length > 0 && savedVehicleCount > visibleFavorites.length && <p className="mt-3 text-xs text-[#64748B]">Some saved vehicles are not currently available in marketplace inventory.</p>}
          </section>}

          {/* OWNED VEHICLES — sourced from the signed-in user's ownership dashboard. */}
          {(!section || section === 'buying') && <section id="personal-owned-vehicles" className="scroll-mt-6 rounded-2xl border border-[#D7E7E4] bg-white p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-4">
              <CarFront className="w-4 h-4 text-[#176B87]" />
              <h2 className="text-base font-bold text-[#176B87]">Vehicles in your garage</h2>
            </div>
            {visibleOwnedVehicles.length === 0 ? (
              <p className="text-xs text-[#64748B]">{failedResources.includes('owned vehicles') ? 'Owned vehicles could not be loaded.' : 'No owned vehicles are recorded in your garage yet.'}</p>
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
          </section>}

          {/* PRIVATE ESCROW WORKSPACE — participant-scoped, never rendered on the public page. */}
          {(!section || section === 'deals') && <section id="buyer-escrow-workspace" className="scroll-mt-6 rounded-2xl border border-[#D7E7E4] bg-white p-4 sm:p-5">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF7F5] text-[#176B87]"><WalletCards className="h-5 w-5" aria-hidden="true" /></div>
              <div><h2 className="text-base font-bold text-[#0A3340]">Purchases & escrow</h2><p className="mt-1 text-xs leading-5 text-[#64748B]">Confirmed transaction states and actions for deals you participate in. A payment request is not proof of settlement.</p></div>
            </div>
            <ParticipantEscrowDesk key={user.id} initialEscrowId={new URLSearchParams(window.location.search).get('escrowId')} onNavigate={onNavigate} initialData={escrowOverview} initialDataLoading={escrowOverviewLoading} initialDataError={escrowOverviewError} onRefreshOverview={onRefreshDashboard} />
          </section>}

          {/* PRIVATE FINANCING WORKSPACE — applications and their status stay inside the signed-in customer's account. */}
          {(!section || section === 'deals') && <section id="buyer-financing-workspace" className="scroll-mt-6 rounded-2xl border border-[#D7E7E4] bg-white p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-2"><WalletCards className="h-4 w-4 text-[#176B87]" aria-hidden="true" /><h2 className="text-base font-bold text-[#176B87]">Financing</h2></div>
            <FinanceMarketplace key={`finance-${user.id}`} mode="account" user={user} />
          </section>}

          {/* PRIVATE INSPECTION WORKSPACE — requests, provider bookings and reports stay in the authenticated account area. */}
          {(!section || section === 'buying') && <section id="buyer-inspection-workspace" className="scroll-mt-6 rounded-2xl border border-[#D7E7E4] bg-white p-4 sm:p-5">
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
          </section>}
        </>
      )}
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { Heart, Loader2, CarFront, RefreshCw } from 'lucide-react';
import { getFavorites, BackendFavoriteCar } from '../../../services/favoriteApi';
import { ParticipantEscrowDesk } from '../../escrow/ParticipantEscrowDesk';
import InspectionsView from '../../InspectionsView';
import FinanceMarketplace from '../../FinancePlatform/pages/FinanceMarketplace';
import { getOwnershipDashboard, OwnershipVehicle } from '../../../services/ownershipApi';
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

export default function BuyerPlatform({ user, onNavigate, onOpenAuth, initialInspectionTab = 'mine' }: BuyerPlatformProps) {
  const userId = user?.id ? String(user.id) : null;
  const [favorites, setFavorites] = useState<BackendFavoriteCar[]>([]);
  const [ownedVehicles, setOwnedVehicles] = useState<OwnershipVehicle[]>([]);
  const [dataSessionKey, setDataSessionKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorSessionKey, setErrorSessionKey] = useState<string | null>(null);
  const [failedResources, setFailedResources] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setFavorites([]);
    setOwnedVehicles([]);
    setError(null);
    setErrorSessionKey(null);
    setFailedResources([]);
    setDataSessionKey(null);

    if (!userId) {
      setLoading(false);
      return () => { cancelled = true; };
    }

    setLoading(true);
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
      setFailedResources(failures);
      if (failures.length) {
        setError(`Could not load ${failures.join(' and ')}. Please retry; unavailable data has not been treated as an empty list.`);
        setErrorSessionKey(userId);
      }
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [userId, reloadKey]);

  // Mask data synchronously during account transitions; an effect alone can run
  // after a render and briefly expose the previous account's garage.
  const sessionMatches = Boolean(userId && dataSessionKey === userId);
  const visibleFavorites = sessionMatches ? favorites : [];
  const visibleOwnedVehicles = sessionMatches ? ownedVehicles : [];
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
    <div className="space-y-8 pb-12 kayad-portal kayad-portal--buyer" data-kayad-portal="buyer">
      <div className="text-center py-6">
        <h1 className="text-2xl font-bold text-[#176B87] font-display">My Garage</h1>
        <p className="text-sm text-[#64748B] mt-1">Your saved vehicles, purchases, financing requests and inspection reports</p>
      </div>

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
          {/* WATCHLIST - real, from the real favorites system */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Heart className="w-4 h-4 text-[#176B87]" />
              <h2 className="text-base font-bold text-[#176B87]">Saved Vehicles</h2>
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
          <section>
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
          <section>
            <ParticipantEscrowDesk key={user.id} initialEscrowId={new URLSearchParams(window.location.search).get('escrowId')} onNavigate={onNavigate} />
          </section>

          {/* PRIVATE FINANCING WORKSPACE — applications and their status stay inside the signed-in customer's account. */}
          <section>
            <FinanceMarketplace key={`finance-${user.id}`} mode="account" user={user} />
          </section>

          {/* PRIVATE INSPECTION WORKSPACE — requests, provider bookings and reports stay in the authenticated account area. */}
          <section>
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

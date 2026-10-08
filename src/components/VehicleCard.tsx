import React, { useEffect, useState } from 'react';
import { Vehicle } from '../types';
import { isEscrowApplicable } from '../utils/escrow';
import {
  CheckCircle2,
  MapPin,
  Heart,
  ArrowRightLeft,
  Gavel,
  Building2,
  UserCheck,
  Lock,
  ShieldCheck
} from 'lucide-react';
import { Badge, Button, LazyImage } from './ui';

interface VehicleCardProps {
  vehicle: Vehicle;
  isSaved: boolean;
  isCompared: boolean;
  onToggleSave: (id: string) => void;
  onToggleCompare: (id: string) => void;
  onQuickView: (vehicle: Vehicle) => void;
  onStartEscrow: (vehicle: Vehicle) => void;
}

export const VehicleCard: React.FC<VehicleCardProps> = React.memo(({
  vehicle,
  isSaved,
  isCompared,
  onToggleSave,
  onToggleCompare,
  onQuickView,
  onStartEscrow
}) => {
  // 1. Calculate Market Price Comparison Tag (Concise Labels)
  const getMarketPriceTag = () => {
    if (!vehicle.marketPriceAvg) {
      if (vehicle.condition === 'Brand New' || vehicle.condition === 'Foreign Used') {
        return { label: vehicle.condition, variant: 'neutral' as const };
      }
      return null;
    }
    const diff = vehicle.marketPriceAvg - vehicle.price;
    if (diff > 50000) {
      return { label: 'Below Market', variant: 'success' as const };
    } else if (diff >= -50000) {
      return { label: 'Fair Price', variant: 'neutral' as const };
    } else {
      return { label: 'Premium Listing', variant: 'warning' as const };
    }
  };

  const marketTag = getMarketPriceTag();

  // 2. Trust facts are carried in the card's aria-label (screen-reader
  // accessible) rather than as visible badges — the visible overlay is
  // reserved exclusively for the auction badge.
  const trustFacts: string[] = [];
  if (vehicle.sellerType === 'Verified Dealer' || vehicle.dealerName) trustFacts.push('Dealer');
  if (vehicle.verified) trustFacts.push('Verified');
  if (vehicle.inspectionPassed) trustFacts.push('Certified');
  if (isEscrowApplicable(vehicle)) trustFacts.push('Escrow');
  if (vehicle.financeAvailable) trustFacts.push('Finance');
  const ariaLabel = `View details for ${vehicle.title}${trustFacts.length ? ` — ${trustFacts.join(', ')}` : ''}`;

  // Auction badge: calm "LIVE" while the auction is comfortably open,
  // switching to a live mm:ss countdown inside the 30-minute urgency
  // window. Ends-at times in the past are treated as urgency too.
  const URGENCY_WINDOW_MS = 30 * 60 * 1000;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (vehicle.auctionLifecycle !== 'live') return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [vehicle.auctionLifecycle]);

  const endsAtMs = vehicle.auctionEndsAt ? new Date(vehicle.auctionEndsAt).getTime() : null;
  const msRemaining = endsAtMs !== null ? endsAtMs - now : null;
  const isEndingSoon = msRemaining !== null && msRemaining <= URGENCY_WINDOW_MS;
  const countdownLabel =
    msRemaining !== null && msRemaining > 0
      ? `${Math.floor(msRemaining / 60000)}:${String(Math.floor((msRemaining % 60000) / 1000)).padStart(2, '0')}`
      : null;

  // The vehicle payload is the source of truth until a dedicated auction
  // session endpoint is loaded; never substitute sample auction data.
  const displayPrice = vehicle.currentBid ?? vehicle.price;

  // Seller display text
  const sellerDisplayName = vehicle.dealerName || vehicle.sellerName || (vehicle.sellerType === 'Private Seller' ? 'Private Seller' : 'Seller information unavailable');

  // Formatted mileage
  const formattedMileage = vehicle.mileage >= 1000
    ? `${Math.round(vehicle.mileage / 1000)}k km`
    : `${vehicle.mileage} km`;

  return (
    <div
      onClick={() => onQuickView(vehicle)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onQuickView(vehicle);
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={ariaLabel}
      className="bg-white rounded-2xl overflow-hidden border border-slate-200/80 shadow-xs hover:shadow-md hover:border-navy-600/30 transition-all duration-200 flex flex-col group relative cursor-pointer focus:outline-none focus:ring-2 focus:ring-navy-600 focus:ring-offset-2"
    >
      {/* 1. VEHICLE IMAGE CONTAINER */}
      <div className="relative h-32 overflow-hidden bg-slate-100">
        {vehicle.image ? (
          <LazyImage
            src={vehicle.image}
            alt={vehicle.title}
            wrapperClassName="w-full h-full"
            className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-500 ease-out"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs font-semibold text-slate-500">
            Vehicle image unavailable
          </div>
        )}

        {/* STAGE 8 MARKETPLACE TRUST SIGNAL FIX: Dynamic Top Overlay
            Badges (Max 3) — AUCTION / ESCROW / INSPECTION. Each is
            derived strictly from authoritative backend state carried on
            `vehicle` by mapBackendCarToVehicle; none are calculated
            independently here. Previously the lone auction badge here
            showed "LIVE" (or a countdown) for ANY vehicle.isAuction
            vehicle regardless of real lifecycle state — a scheduled
            (draft) or already-ended auction on the general marketplace
            list (which, unlike the dedicated active-auctions endpoint,
            is not filtered to auctionStatus:'live') would still render
            as "LIVE", contradicting the master prompt's explicit "scheduled
            auctions are not falsely labelled live... closed auctions are
            not active" requirement. Fixed by keying off the raw
            auctionLifecycle state instead of the isAuction capability
            flag, and separating capability from lifecycle presentation. */}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1.5 max-w-[78%] pointer-events-none z-10">
          {vehicle.auctionLifecycle === 'live' && (
            <Badge variant="live" size="sm">
              <Gavel className="w-3 h-3 shrink-0" />
              <span>{isEndingSoon && countdownLabel ? countdownLabel : 'LIVE'}</span>
            </Badge>
          )}
          {vehicle.auctionLifecycle === 'draft' && (
            <Badge variant="info" size="sm">
              <Gavel className="w-3 h-3 shrink-0" />
              <span>Upcoming Auction</span>
            </Badge>
          )}
          {vehicle.auctionLifecycle === 'ended' && (
            <Badge variant="neutral" size="sm">
              <Gavel className="w-3 h-3 shrink-0" />
              <span>Auction Ended</span>
            </Badge>
          )}
          {isEscrowApplicable(vehicle) && (
            <Badge variant="escrow" size="sm">
              <Lock className="w-3 h-3 shrink-0" />
              <span>Escrow</span>
            </Badge>
          )}
          {vehicle.inspectionPassed && (
            <Badge variant="inspected" size="sm">
              <ShieldCheck className="w-3 h-3 shrink-0" />
              <span>Inspected</span>
            </Badge>
          )}
        </div>

        {/* Action Controls (Save & Compare) */}
        <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5 z-10" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSave(vehicle.id);
            }}
            className={`w-9 h-9 rounded-full backdrop-blur-md transition-all shadow-sm flex items-center justify-center ${
              isSaved ? 'bg-rose-500 text-white' : 'bg-white/90 text-slate-700 hover:bg-white hover:text-rose-500'
            }`}
            title={isSaved ? 'Saved' : 'Save vehicle'}
            aria-label={isSaved ? 'Remove from saved' : 'Save vehicle'}
          >
            <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleCompare(vehicle.id);
            }}
            className={`w-9 h-9 rounded-full backdrop-blur-md transition-all shadow-sm flex items-center justify-center ${
              isCompared ? 'bg-amber-400 text-navy-900' : 'bg-white/90 text-slate-700 hover:bg-white hover:text-amber-600'
            }`}
            title={isCompared ? 'Remove comparison' : 'Compare vehicle'}
            aria-label={isCompared ? 'Remove from comparison' : 'Compare vehicle'}
          >
            <ArrowRightLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. CARD CONTENT BODY */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-1.5">
          {/* Header Row: Market Price Tag */}
          {marketTag && (
            <div className="flex items-center justify-between">
              <Badge variant={marketTag.variant} size="sm">
                {marketTag.label}
              </Badge>
              {vehicle.marketPriceAvg && vehicle.price < vehicle.marketPriceAvg && (
                <span className="text-[11px] font-extrabold text-emerald-700">
                  Save Ksh {((vehicle.marketPriceAvg - vehicle.price) / 1000).toFixed(0)}K
                </span>
              )}
            </div>
          )}

          {/* Title: Year Make Model Variant */}
          <h3 className="text-base font-black text-navy-600 font-display line-clamp-1 group-hover:text-amber-600 transition-colors pt-0.5">
            {vehicle.title}
          </h3>

          {/* Primary Price Focal Point */}
          <div className="flex items-baseline gap-2 pt-0.5">
            <span className="text-xl sm:text-2xl font-black text-navy-600 font-display tracking-tight">
              Ksh {displayPrice.toLocaleString()}
            </span>
            {vehicle.marketPriceAvg && (
              <span className="text-xs text-slate-400 line-through font-medium">
                Ksh {vehicle.marketPriceAvg.toLocaleString()}
              </span>
            )}
          </div>
        </div>

        {/* 3. COMPACT METADATA (Single Row Specs + Second Row Location) */}
        <div className="space-y-1 pt-1 border-t border-slate-100 text-xs">
          {/* Row 1: Single compact metadata line */}
          <p className="font-bold text-slate-800 text-[12px] truncate">
            {vehicle.year} • {formattedMileage} • {vehicle.fuelType || 'Fuel type unavailable'} • {vehicle.transmission || 'Transmission unavailable'}
          </p>

          {/* Row 2: Location */}
          <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="truncate">{vehicle.location}</span>
          </p>
        </div>

        {/* 4. SELLER INFO & PRIMARY CTA */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
          {/* Seller Name with small verification checkmark */}
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {vehicle.sellerType === 'Private Seller' ? (
              <UserCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            ) : vehicle.sellerType === 'Verified Dealer' ? (
              <Building2 className="w-3.5 h-3.5 text-navy-600 shrink-0" />
            ) : null}
            <span className="text-xs font-bold text-slate-700 truncate">
              {sellerDisplayName}
            </span>
            {vehicle.verified && (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            )}
          </div>

          {/* View Details Primary Button */}
          <Button
            variant="primary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onQuickView(vehicle);
            }}
            className="bg-navy-600 hover:bg-navy-900 text-white font-extrabold text-xs px-3 py-1.5 rounded-xl shrink-0"
          >
            View Details
          </Button>
        </div>
      </div>
    </div>
  );
});

VehicleCard.displayName = 'VehicleCard';

export default VehicleCard;

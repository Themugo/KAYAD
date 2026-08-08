import React from 'react';
import { Vehicle } from '../types';
import { isEscrowApplicable } from '../utils/escrow';
import { 
  ShieldCheck, 
  CheckCircle2, 
  ChevronRight, 
  Heart, 
  ArrowRightLeft, 
  Lock,
  Landmark,
  Gavel,
  Building2,
  UserCheck
} from 'lucide-react';
import { Badge, LazyImage } from './ui';
import { useCountdown } from '../hooks/useCountdown';

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

  // 2. Badge placement rule: ONLY the auction indicator belongs on the
  // image - it's the one genuinely time-sensitive signal (a live
  // auction or one ending soon), the kind of thing worth interrupting
  // the photo for. Dealer/Verified, Certified, Escrow, and Finance are
  // all static trust facts about the listing, not urgent - they belong
  // in the card's own details area, not stacked over a car photo that's
  // already only 128-144px tall. Split what used to be a single
  // getDynamicBadges() into 2 separate, purpose-specific functions
  // rather than one list arbitrarily capped at a badge count.
  const getAuctionBadge = () => {
    if (!vehicle.isAuction) return null;
    return { key: 'auction', icon: Gavel };
  };

  const auctionBadge = getAuctionBadge();
  // Countdown only matters when there's an actual end time to count
  // down to - a live auction with no known end time just shows "LIVE"
  // via the hook's own "no target" fallback (hasEnded/isEndingSoon both
  // false, empty label), handled in the render below.
  const countdown = useCountdown(vehicle.isAuction ? vehicle.auctionEndsAt : null);

  // Trust badges - relocated from the image to the card body. Same
  // priority logic as before (dealer/verified, then certified, then
  // escrow-or-finance), but no longer needs as tight a cap since the
  // body has real room, unlike the small image overlay these used to
  // compete for space in - capped at 3 here, matching the original
  // "up to 3" intent before it was reduced to 2 purely to fit the image.
  const getTrustBadges = () => {
    const badges: Array<{
      key: string;
      label: string;
      variant: 'live' | 'verified' | 'inspected' | 'escrow' | 'success' | 'neutral';
      icon: React.ElementType;
    }> = [];

    // Seller Verification. The dealer branch trusts
    // sellerType === 'Verified Dealer' alone (confirmed against the
    // type definition - 'Verified Dealer' | 'Private Seller' are the
    // only 2 values, so verification is baked into the dealer value's
    // name itself). Deliberately does NOT also check `|| vehicle.verified`
    // here - caught via a real rendered-output test that doing so
    // caused a verified PRIVATE seller (verified: true is independent
    // of sellerType) to be misclassified as "Dealer", since the OR
    // would short-circuit true on the verified flag alone regardless of
    // which seller type it actually was. The private-seller branch is
    // its own explicit check instead: 'Private Seller' does NOT
    // inherently mean verified - those are genuinely separate facts for
    // that seller type - so it only shows "Verified" when
    // vehicle.verified is actually true for that specific listing.
    if (vehicle.sellerType === 'Verified Dealer') {
      badges.push({
        key: 'dealer',
        label: 'Dealer',
        variant: 'verified',
        icon: ShieldCheck
      });
    } else if (vehicle.sellerType === 'Private Seller' && vehicle.verified) {
      badges.push({
        key: 'private',
        label: 'Verified',
        variant: 'neutral',
        icon: UserCheck
      });
    }

    if (vehicle.inspectionPassed && badges.length < 3) {
      badges.push({
        key: 'inspected',
        label: 'Certified',
        variant: 'inspected',
        icon: CheckCircle2
      });
    }

    if (isEscrowApplicable(vehicle) && badges.length < 3) {
      badges.push({
        key: 'escrow',
        label: 'Escrow',
        variant: 'escrow',
        icon: Lock
      });
    } else if (vehicle.financeAvailable && badges.length < 3) {
      badges.push({
        key: 'finance',
        label: 'Finance',
        variant: 'success',
        icon: Landmark
      });
    }

    return badges.slice(0, 3);
  };

  const trustBadges = getTrustBadges();

  // Seller display text
  const sellerDisplayName = vehicle.dealerName || vehicle.sellerName || (vehicle.sellerType === 'Private Seller' ? 'Private Seller' : 'Verified Dealer');

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
      aria-label={`View details for ${vehicle.title}`}
      className="bg-white rounded-2xl overflow-hidden border border-slate-200/80 shadow-xs hover:shadow-md hover:border-[#1E3063]/30 transition-all duration-200 flex flex-col group relative cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1E3063] focus:ring-offset-2"
    >
      {/* 1. VEHICLE IMAGE CONTAINER — reduced from h-48/h-52: at scale
          (thousands of listings), image height is the single biggest
          driver of how many cards fit on screen without scrolling. */}
      <div className="relative h-32 sm:h-36 overflow-hidden bg-slate-100">
        <LazyImage 
          src={vehicle.image} 
          alt={vehicle.title} 
          wrapperClassName="w-full h-full"
          className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-500 ease-out"
        />

        {/* Image overlay - auction status ONLY. Everything else (Dealer,
            Certified, Escrow, Finance) moved to the card body below -
            those are static trust facts, not urgent, and don't belong
            competing for space on a car photo. Shows a calm "LIVE" pill
            normally; once inside the countdown hook's urgency window
            (default 30 min of an actual auctionEndsAt), switches to a
            live ticking countdown with warmer, more attention-grabbing
            styling - the only thing genuinely time-sensitive enough to
            justify sitting on the image itself. */}
        {auctionBadge && (
          <div className="absolute top-2 left-2 z-10">
            <Badge variant="live" size="sm">
              <Gavel className="w-2.5 h-2.5 shrink-0" />
              {countdown.label && countdown.isEndingSoon ? (
                <span className="tabular-nums">{countdown.label}</span>
              ) : (
                <span>LIVE</span>
              )}
            </Badge>
          </div>
        )}

        {/* Action Controls (Save & Compare) */}
        <div className="absolute top-2 right-2 flex flex-col gap-1 z-10" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSave(vehicle.id);
            }}
            className={`w-7 h-7 rounded-full backdrop-blur-md transition-all shadow-sm flex items-center justify-center ${
              isSaved ? 'bg-rose-500 text-white' : 'bg-white/90 text-slate-700 hover:bg-white hover:text-rose-500'
            }`}
            title={isSaved ? 'Saved' : 'Save vehicle'}
            aria-label={isSaved ? 'Remove from saved' : 'Save vehicle'}
          >
            <Heart className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleCompare(vehicle.id);
            }}
            className={`w-7 h-7 rounded-full backdrop-blur-md transition-all shadow-sm flex items-center justify-center ${
              isCompared ? 'bg-amber-400 text-[#17244B]' : 'bg-white/90 text-slate-700 hover:bg-white hover:text-amber-600'
            }`}
            title={isCompared ? 'Remove comparison' : 'Compare vehicle'}
            aria-label={isCompared ? 'Remove from comparison' : 'Compare vehicle'}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. CARD CONTENT BODY — tightened padding/spacing throughout, and
          collapsed what were 3 separately-bordered zones (price header /
          metadata / seller+CTA, each with their own border-t + pt-X) down
          to 2, since every extra divider and padding pair adds up fast
          multiplied across a dense grid. */}
      <div className="p-2.5 flex-1 flex flex-col justify-between space-y-1.5">
        <div className="space-y-1">
          {/* Header Row: Market Price Tag */}
          {marketTag && (
            <div className="flex items-center justify-between">
              <Badge variant={marketTag.variant} size="sm">
                {marketTag.label}
              </Badge>
              {vehicle.marketPriceAvg && vehicle.price < vehicle.marketPriceAvg && (
                <span className="text-[10px] font-extrabold text-emerald-700">
                  Save Ksh {((vehicle.marketPriceAvg - vehicle.price) / 1000).toFixed(0)}K
                </span>
              )}
            </div>
          )}

          {/* Title: Year Make Model Variant */}
          <h3 className="text-[13px] font-black text-[#1E3063] font-display line-clamp-1 group-hover:text-amber-600 transition-colors">
            {vehicle.title}
          </h3>

          {/* Primary Price Focal Point */}
          <div className="flex items-baseline gap-1.5">
            <span className="text-base sm:text-lg font-black text-[#1E3063] font-display tracking-tight">
              Ksh {vehicle.price.toLocaleString()}
            </span>
            {vehicle.marketPriceAvg && (
              <span className="text-[10px] text-slate-400 line-through font-medium">
                Ksh {vehicle.marketPriceAvg.toLocaleString()}
              </span>
            )}
          </div>

          {/* Trust badges - relocated here from the image overlay (see
              getTrustBadges' own comment for why). Own row, wraps
              naturally if needed since the body has real vertical room,
              unlike the image it used to compete with. */}
          {trustBadges.length > 0 && (
            <div className="flex flex-wrap items-center gap-1">
              {trustBadges.map((b) => (
                <Badge key={b.key} variant={b.variant} size="sm">
                  {React.createElement(b.icon, { className: 'w-2.5 h-2.5 shrink-0' })}
                  <span>{b.label}</span>
                </Badge>
              ))}
            </div>
          )}

          {/* Compact metadata line - merged into the same zone as price/
              title rather than its own separately-bordered section.
              Uses county (e.g. "Nairobi") rather than the full location
              string (e.g. "Westlands, Nairobi") to keep transmission -
              a real filterable spec, dropping it wasn't a fair
              space-saving tradeoff - on the same single line instead of
              losing it entirely. Falls back to location if county isn't
              set, so nothing regresses for vehicles without it. */}
          <p className="font-semibold text-slate-600 text-[11px] truncate">
            {vehicle.year} • {formattedMileage} • {vehicle.fuelType} • {vehicle.transmission || 'Automatic'} · {vehicle.county || vehicle.location}
          </p>
        </div>

        {/* 3. SELLER INFO & PRIMARY CTA - the whole card is already
            clickable (onClick on the outer div calls onQuickView), so
            "View Details" was a full-width button duplicating that,
            costing an entire row. Reduced to a compact text+chevron
            affordance in the same row as the seller name instead of a
            separate bordered zone with its own button component. */}
        <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 min-w-0 flex-1">
            {vehicle.sellerType === 'Private Seller' ? (
              <UserCheck className="w-3 h-3 text-amber-600 shrink-0" />
            ) : (
              <Building2 className="w-3 h-3 text-[#1E3063] shrink-0" />
            )}
            <span className="text-[11px] font-bold text-slate-700 truncate">
              {sellerDisplayName}
            </span>
            {vehicle.verified && (
              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
            )}
          </div>

          <span className="text-[11px] font-extrabold text-[#1E3063] group-hover:text-amber-600 transition-colors shrink-0 flex items-center gap-0.5">
            Details
            <ChevronRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </div>
  );
});

VehicleCard.displayName = 'VehicleCard';

export default VehicleCard;

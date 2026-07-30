import React from 'react';
import { Vehicle } from '../types';
import { isEscrowApplicable } from '../utils/escrow';
import { 
  ShieldCheck, 
  CheckCircle2, 
  MapPin, 
  Heart, 
  ArrowRightLeft, 
  Lock,
  Landmark,
  Gavel,
  Building2,
  UserCheck
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

  // 2. Maximum Three Dynamic Trust Badges Rule
  const getDynamicBadges = () => {
    const badges: Array<{
      key: string;
      label: string;
      variant: 'live' | 'verified' | 'inspected' | 'escrow' | 'success' | 'neutral';
      icon: React.ElementType;
    }> = [];

    // Priority 1: Auction Status
    if (vehicle.isAuction) {
      badges.push({
        key: 'auction',
        label: 'LIVE AUCTION',
        variant: 'live',
        icon: Gavel
      });
    }

    // Priority 2: Seller Verification
    if (vehicle.sellerType === 'Verified Dealer' || vehicle.verified) {
      badges.push({
        key: 'dealer',
        label: '✓ Verified Dealer',
        variant: 'verified',
        icon: ShieldCheck
      });
    } else if (vehicle.sellerType === 'Private Seller') {
      badges.push({
        key: 'private',
        label: '✓ Verified Seller',
        variant: 'neutral',
        icon: UserCheck
      });
    }

    // Priority 3: Inspection or Escrow or Finance (up to 3 total)
    if (vehicle.inspectionPassed && badges.length < 3) {
      badges.push({
        key: 'inspected',
        label: '✓ 150-Pt Certified',
        variant: 'inspected',
        icon: CheckCircle2
      });
    }

    if (isEscrowApplicable(vehicle) && badges.length < 3) {
      badges.push({
        key: 'escrow',
        label: '✓ Escrow Protected',
        variant: 'escrow',
        icon: Lock
      });
    } else if (vehicle.financeAvailable && badges.length < 3) {
      badges.push({
        key: 'finance',
        label: '✓ Finance',
        variant: 'success',
        icon: Landmark
      });
    }

    return badges.slice(0, 3);
  };

  const dynamicBadges = getDynamicBadges();

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
      {/* 1. VEHICLE IMAGE CONTAINER */}
      <div className="relative h-48 sm:h-52 overflow-hidden bg-slate-100">
        <LazyImage 
          src={vehicle.image} 
          alt={vehicle.title} 
          wrapperClassName="w-full h-full"
          className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-500 ease-out"
        />

        {/* Dynamic Top Overlay Badges (Max 3) */}
        <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5 max-w-[78%] pointer-events-none z-10">
          {dynamicBadges.map((b) => (
            <Badge key={b.key} variant={b.variant} size="sm">
              {React.createElement(b.icon, { className: 'w-3 h-3 shrink-0' })}
              <span>{b.label}</span>
            </Badge>
          ))}
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
              isCompared ? 'bg-amber-400 text-[#17244B]' : 'bg-white/90 text-slate-700 hover:bg-white hover:text-amber-600'
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
          <h3 className="text-base font-black text-[#1E3063] font-display line-clamp-1 group-hover:text-amber-600 transition-colors pt-0.5">
            {vehicle.title}
          </h3>

          {/* Primary Price Focal Point */}
          <div className="flex items-baseline gap-2 pt-0.5">
            <span className="text-xl sm:text-2xl font-black text-[#1E3063] font-display tracking-tight">
              Ksh {vehicle.price.toLocaleString()}
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
            {vehicle.year} • {formattedMileage} • {vehicle.fuelType} • {vehicle.transmission || 'Automatic'}
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
            ) : (
              <Building2 className="w-3.5 h-3.5 text-[#1E3063] shrink-0" />
            )}
            <span className="text-xs font-bold text-slate-700 truncate">
              {sellerDisplayName}
            </span>
            {vehicle.verified && (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" title="Verified Seller" />
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
            className="bg-[#1E3063] hover:bg-[#17244B] text-white font-extrabold text-xs px-3 py-1.5 rounded-xl shrink-0"
          >
            View Details
          </Button>
        </div>
      </div>
    </div>
  );
});

export default VehicleCard;

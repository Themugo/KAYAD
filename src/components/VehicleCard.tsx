import React from 'react';
import { Vehicle } from '../types';
import { 
  ShieldCheck, 
  CheckCircle2, 
  MapPin, 
  Heart, 
  Eye, 
  ArrowRightLeft, 
  TrendingDown, 
  Lock,
  Fuel,
  Gauge,
  Landmark,
  Zap,
  Gavel
} from 'lucide-react';
import { Badge, Button, LazyImage } from './ui';
import TrustBadgeMatrix from './TrustBadgeMatrix';

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
  const isGoodPrice = vehicle.marketPriceAvg && vehicle.price < vehicle.marketPriceAvg;
  const savings = vehicle.marketPriceAvg ? vehicle.marketPriceAvg - vehicle.price : 0;

  const isPrivateSeller = vehicle.sellerType === 'Private Seller';
  const isVerifiedDealer = vehicle.sellerType === 'Verified Dealer';

  // Rule 3 & 4: Private sellers ALWAYS require escrow; Dealer listings NEVER display escrow unless explicitly enabled
  const isEscrowActive = isPrivateSeller || (isVerifiedDealer && Boolean(vehicle.escrowEligible));

  // Rule 6: Inspection badges ONLY appear when an inspection exists (inspectionPassed = true)
  const isInspectionActive = Boolean(vehicle.inspectionPassed);

  // Rule 5: Auction badges ONLY appear for auction-enabled listings (isAuction = true)
  const isAuctionActive = Boolean(vehicle.isAuction);

  // Finance badge only if financeAvailable = true
  const isFinanceActive = Boolean(vehicle.financeAvailable);

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
      className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-card hover:shadow-card-hover hover:border-amber-400/80 transition-all duration-300 flex flex-col group relative cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
    >
      {/* Vehicle Image Container */}
      <div className="relative h-52 overflow-hidden bg-slate-100">
        <LazyImage 
          src={vehicle.image} 
          alt={vehicle.title} 
          wrapperClassName="w-full h-full"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Top Floating Trust Badges - Only Applicable Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 max-w-[80%] pointer-events-none z-10">
          {vehicle.verified && (
            <Badge variant="verified">
              <ShieldCheck className="w-3 h-3 text-amber-400 shrink-0" />
              {vehicle.sellerType}
            </Badge>
          )}

          {/* Rule 6: Inspection badge ONLY when inspectionPassed is true */}
          {isInspectionActive && (
            <Badge variant="inspected">
              <CheckCircle2 className="w-3 h-3 shrink-0" />
              150-Pt Inspected
            </Badge>
          )}

          {/* Rule 5: Auction badge ONLY when isAuction is true */}
          {isAuctionActive && (
            <Badge variant="live">
              <Gavel className="w-3 h-3 shrink-0 text-amber-300" />
              LIVE AUCTION
            </Badge>
          )}

          {/* Asset Finance Badge */}
          {isFinanceActive && (
            <Badge variant="success">
              <Landmark className="w-3 h-3 shrink-0" />
              Finance Ready
            </Badge>
          )}
        </div>

        {/* Top Right Action Buttons (Save & Compare) */}
        <div className="absolute top-3 right-3 flex flex-col gap-2 z-10" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSave(vehicle.id);
            }}
            className={`w-11 h-11 rounded-full backdrop-blur-md transition-all shadow-md flex items-center justify-center ${
              isSaved ? 'bg-rose-500 text-white' : 'bg-white/90 text-slate-700 hover:bg-white hover:text-rose-500'
            }`}
            title={isSaved ? 'Saved' : 'Save vehicle'}
            aria-label={isSaved ? 'Remove from saved' : 'Save vehicle'}
          >
            <Heart className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleCompare(vehicle.id);
            }}
            className={`w-11 h-11 rounded-full backdrop-blur-md transition-all shadow-md flex items-center justify-center ${
              isCompared ? 'bg-amber-400 text-[#17244B]' : 'bg-white/90 text-slate-700 hover:bg-white hover:text-amber-600'
            }`}
            title={isCompared ? 'Remove from comparison' : 'Compare vehicle'}
            aria-label={isCompared ? 'Remove from comparison' : 'Compare vehicle'}
          >
            <ArrowRightLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Bottom Floating Badges */}
        <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center text-[11px] font-medium text-white pointer-events-none z-10">
          <span className="bg-[#17244B]/90 backdrop-blur-md px-2.5 py-1 rounded-md flex items-center gap-1 font-bold">
            <MapPin className="w-3 h-3 text-amber-400" />
            {vehicle.location}
          </span>

          {/* Rule 3 & 4: Escrow badge ONLY if applicable */}
          {isEscrowActive && (
            <Badge variant="escrow">
              <Lock className="w-3 h-3 shrink-0" />
              {isPrivateSeller ? 'Escrow Required' : 'Escrow Vault Enabled'}
            </Badge>
          )}
        </div>
      </div>

      {/* Card Body */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-3.5">
        <div>
          {/* Condition, Freshness & Price Indicator */}
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5 flex-wrap gap-1 pointer-events-none">
            <div className="flex items-center gap-1.5">
              <Badge variant="neutral">
                {vehicle.condition || 'Foreign Used'}
              </Badge>
              <Badge variant="success">
                {vehicle.listingFreshness}
              </Badge>
            </div>
            {isGoodPrice && (
              <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px]">
                <TrendingDown className="w-3.5 h-3.5" />
                Ksh {savings.toLocaleString()} under market
              </span>
            )}
          </div>

          <h3 className="text-base font-bold text-[#1E3063] font-display line-clamp-1 group-hover:text-amber-600 transition-colors">
            {vehicle.title}
          </h3>

          <div className="flex items-baseline gap-2 mt-1.5">
            <span className="text-2xl font-extrabold text-[#1E3063] font-display">
              Ksh {vehicle.price.toLocaleString()}
            </span>
            {vehicle.marketPriceAvg && (
              <span className="text-xs text-slate-400 line-through">
                Ksh {vehicle.marketPriceAvg.toLocaleString()}
              </span>
            )}
          </div>
        </div>

        {/* Trust Badges Matrix Strip */}
        <TrustBadgeMatrix vehicle={vehicle} variant="pills" />

        {/* Key Specs & Seller Info Row */}
        <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs text-slate-700 pointer-events-none">
          <div className="flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-[9px] text-slate-400 font-bold uppercase truncate">Year / Mileage</p>
              <p className="font-bold text-slate-800 truncate text-[11px]">{vehicle.year} • {(vehicle.mileage / 1000).toFixed(0)}k km</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Fuel className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-[9px] text-slate-400 font-bold uppercase truncate">Fuel & Drive</p>
              <p className="font-bold text-slate-800 truncate text-[11px]">{vehicle.fuelType}</p>
            </div>
          </div>

          <div className="min-w-0">
            <p className="text-[9px] text-slate-400 font-bold uppercase truncate">Seller Rating</p>
            <p className="font-bold text-amber-600 flex items-center gap-0.5 text-[11px] truncate">
              ★ {vehicle.sellerRating} <span className="text-[9px] text-slate-500 font-normal">({vehicle.responseTime || '< 15m'})</span>
            </p>
          </div>
        </div>

        {/* Card Primary Actions */}
        <div className="flex items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="secondary"
            size="md"
            className="flex-1 min-h-[44px]"
            onClick={(e) => {
              e.stopPropagation();
              onQuickView(vehicle);
            }}
          >
            <Eye className="w-4 h-4" /> View Details
          </Button>

          {/* Rule 3 & 4: Escrow action ONLY when Escrow is active. For non-escrow dealer listings, show Contact Dealer button */}
          {isEscrowActive ? (
            <Button
              variant="accent"
              size="md"
              className="min-h-[44px]"
              onClick={(e) => {
                e.stopPropagation();
                onStartEscrow(vehicle);
              }}
            >
              <Lock className="w-4 h-4 text-amber-400" />
              <span>Escrow Buy</span>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="md"
              className="min-h-[44px]"
              onClick={(e) => {
                e.stopPropagation();
                onQuickView(vehicle);
              }}
            >
              <ShieldCheck className="w-4 h-4 text-[#1E3063]" />
              <span>Contact Dealer</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
});

export default VehicleCard;

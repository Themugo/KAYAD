import { memo } from 'react';
import { Calendar, Gauge, Fuel, MapPin, Shield, Heart, BarChart3 } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

export interface Vehicle {
  id: number;
  make: string;
  model: string;
  price: number;
  year: number;
  mileage: string;
  fuel: string;
  city: string;
  type: 'SUV' | 'Pickup' | 'Sedan' | 'Wagon';
  badges: ('escrow' | 'auction' | 'verified' | 'sponsored' | 'financing' | 'negotiable' | string)[];
  image: string;
  transmission?: string;
  engine?: string;
  dealerName?: string;
  isVerified?: boolean;
  isNegotiable?: boolean;
  hasFinancing?: boolean;
  currentBid?: number;
  auctionEnd?: string;
}

export interface VehicleCardProps {
  vehicle: Vehicle;
  onClick?: () => void;
  onFavorite?: () => void;
  onCompare?: () => void;
  isFavorited?: boolean;
  isComparing?: boolean;
  layout?: 'standard' | 'compact' | 'horizontal';
  showFavorite?: boolean;
  showCompare?: boolean;
}

const VehicleCardComponent = ({
  vehicle,
  onClick,
  onFavorite,
  onCompare,
  isFavorited = false,
  isComparing = false,
  layout = 'standard',
  showFavorite = true,
  showCompare = false,
}: VehicleCardProps) => {
  const now = Date.now();
  const auctionEnd = vehicle.auctionEnd ? new Date(vehicle.auctionEnd).getTime() : 0;
  const isOnAuction = vehicle.badges.includes('auction') && auctionEnd > now;
  const currentPrice = isOnAuction && vehicle.currentBid && vehicle.currentBid > 0 
    ? vehicle.currentBid 
    : vehicle.price;
  const formattedPrice = `KES ${currentPrice.toLocaleString('en-KE')}`;

  if (layout === 'compact') {
    return (
      <div 
        className="vehicle-card flex cursor-pointer"
        onClick={onClick}
      >
        <div className="vehicle-card-image w-32 h-24 flex-shrink-0">
          <img 
            src={vehicle.image} 
            alt={`${vehicle.make} ${vehicle.model}`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
        <div className="vehicle-card-content flex-1 min-w-0 flex flex-col justify-between py-3 pr-3">
          <div>
            <p className="vehicle-card-make">{vehicle.make}</p>
            <h3 className="vehicle-card-model truncate">{vehicle.model}</h3>
          </div>
          <div className="flex items-center justify-between">
            <span className="vehicle-card-price text-lg">{formattedPrice}</span>
            <div className="flex items-center gap-2">
              {vehicle.isVerified && (
                <Badge variant="success" size="sm">Verified</Badge>
              )}
              {isOnAuction && (
                <Badge variant="danger" size="sm" dot>Live</Badge>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (layout === 'horizontal') {
    return (
      <div 
        className="vehicle-card flex cursor-pointer"
        onClick={onClick}
      >
        <div className="vehicle-card-image w-64 h-auto flex-shrink-0">
          <img 
            src={vehicle.image} 
            alt={`${vehicle.make} ${vehicle.model}`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
        <div className="vehicle-card-content flex-1 flex flex-col justify-between py-4 px-5">
          <div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="vehicle-card-make">{vehicle.make}</p>
                <h3 className="vehicle-card-model">{vehicle.model}</h3>
              </div>
              <div className="flex gap-2">
                {showFavorite && onFavorite && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onFavorite(); }}
                    className="p-2 rounded-full hover:bg-bg-secondary transition-colors"
                  >
                    <Heart 
                      size={18} 
                      className={isFavorited ? 'fill-current text-danger' : 'text-text-muted'} 
                    />
                  </button>
                )}
              </div>
            </div>
            <div className="vehicle-card-specs mt-3">
              <span><Calendar size={14} /> {vehicle.year}</span>
              <span><Gauge size={14} /> {vehicle.mileage}</span>
              <span><Fuel size={14} /> {vehicle.fuel}</span>
              <span><MapPin size={14} /> {vehicle.city}</span>
            </div>
          </div>
          <div className="flex items-end justify-between mt-4">
            <div>
              <p className="vehicle-card-price-label">{isOnAuction ? 'Current Bid' : 'Price'}</p>
              <p className="vehicle-card-price">{formattedPrice}</p>
            </div>
            <Button size="sm">View Details</Button>
          </div>
        </div>
      </div>
    );
  }

  // Standard layout (default)
  return (
    <div className="vehicle-card">
      <div className="vehicle-card-image" onClick={onClick}>
        <img 
          src={vehicle.image} 
          alt={`${vehicle.make} ${vehicle.model}`}
          loading="lazy"
        />
        <div className="vehicle-card-badge">
          {isOnAuction && (
            <Badge variant="danger" className="badge-live">
              <span className="badge-live-dot" />
              LIVE
            </Badge>
          )}
          {vehicle.badges.includes('escrow') && (
            <Badge variant="success" size="sm">
              <Shield size={10} />
              ESCROW
            </Badge>
          )}
          {vehicle.isVerified && !vehicle.badges.includes('escrow') && (
            <Badge variant="success" size="sm">
              <Shield size={10} />
              VERIFIED
            </Badge>
          )}
        </div>
        <div className="absolute top-3 right-3 flex flex-col gap-2">
          {showFavorite && onFavorite && (
            <button
              onClick={(e) => { e.stopPropagation(); onFavorite(); }}
              className="p-2 rounded-full backdrop-blur-md transition-all hover:scale-110"
              style={{
                background: isFavorited ? 'rgba(239,68,68,0.9)' : 'rgba(0,0,0,0.55)',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <Heart size={16} className={isFavorited ? 'fill-current' : ''} />
            </button>
          )}
          {showCompare && onCompare && (
            <button
              onClick={(e) => { e.stopPropagation(); onCompare(); }}
              className="p-2 rounded-full backdrop-blur-md transition-all hover:scale-110"
              style={{
                background: isComparing ? 'var(--brand)' : 'rgba(0,0,0,0.55)',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <BarChart3 size={16} />
            </button>
          )}
        </div>
        <div className="absolute bottom-3 right-3">
          <Badge 
            size="sm"
            style={{ background: 'rgba(255,255,255,0.9)', color: 'var(--text-secondary)' }}
          >
            {vehicle.type}
          </Badge>
        </div>
      </div>
      <div className="vehicle-card-content" onClick={onClick}>
        <p className="vehicle-card-make">{vehicle.make}</p>
        <h3 className="vehicle-card-model">{vehicle.model}</h3>
        <div className="vehicle-card-specs">
          <span><Calendar size={12} /> {vehicle.year}</span>
          <span>{vehicle.mileage}</span>
          <span>{vehicle.fuel}</span>
        </div>
        <div className="flex items-end justify-between mt-3">
          <div>
            <p className="vehicle-card-price-label">
              {isOnAuction ? (vehicle.currentBid ? 'Current Bid' : 'Starting Bid') : 'Price'}
            </p>
            <p className="vehicle-card-price">{formattedPrice}</p>
            {vehicle.isNegotiable && (
              <span className="text-xs text-muted">Negotiable</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const VehicleCard = memo(VehicleCardComponent);

export default VehicleCard;

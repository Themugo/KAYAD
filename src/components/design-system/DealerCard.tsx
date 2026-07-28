import { memo } from 'react';
import { Star, MapPin, Phone, ArrowRight } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

export interface Dealer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  city?: string;
  rating?: number;
  reviewCount?: number;
  vehicleCount?: number;
  verified?: boolean;
  joinedDate?: string;
  avatar?: string;
}

export interface DealerCardProps {
  dealer: Dealer;
  onClick?: () => void;
  onContact?: () => void;
  variant?: 'default' | 'compact' | 'featured';
}

const DealerCardComponent = ({
  dealer,
  onClick,
  onContact,
  variant = 'default',
}: DealerCardProps) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatRating = (rating: number) => {
    return rating.toFixed(1);
  };

  if (variant === 'compact') {
    return (
      <div className="dealer-card" onClick={onClick}>
        <div className="dealer-card-avatar">
          {dealer.avatar ? (
            <img 
              src={dealer.avatar} 
              alt={dealer.name}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            getInitials(dealer.name)
          )}
        </div>
        <div className="dealer-card-info">
          <p className="dealer-card-name truncate">{dealer.name}</p>
          <p className="dealer-card-meta text-sm">
            {dealer.rating && (
              <span className="flex items-center gap-1">
                <Star size={12} className="text-warning fill-current" />
                {formatRating(dealer.rating)}
                {dealer.reviewCount && ` (${dealer.reviewCount})`}
              </span>
            )}
            {dealer.vehicleCount && (
              <span className="ml-2">{dealer.vehicleCount} vehicles</span>
            )}
          </p>
        </div>
        {dealer.verified && (
          <Badge variant="success" size="sm">Verified</Badge>
        )}
      </div>
    );
  }

  if (variant === 'featured') {
    return (
      <div className="card p-0 overflow-hidden">
        <div 
          className="p-6 text-center cursor-pointer"
          onClick={onClick}
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-brand flex items-center justify-center text-white text-xl font-bold">
            {dealer.avatar ? (
              <img 
                src={dealer.avatar} 
                alt={dealer.name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              getInitials(dealer.name)
            )}
          </div>
          <h3 className="font-semibold text-lg text-primary mb-1">{dealer.name}</h3>
          {dealer.city && (
            <p className="text-sm text-muted flex items-center justify-center gap-1">
              <MapPin size={12} />
              {dealer.city}
            </p>
          )}
          {dealer.rating && (
            <div className="flex items-center justify-center gap-1 mt-2">
              <Star size={16} className="text-warning fill-current" />
              <span className="font-semibold">{formatRating(dealer.rating)}</span>
              <span className="text-sm text-muted">({dealer.reviewCount} reviews)</span>
            </div>
          )}
        </div>
        <div className="px-6 pb-6 flex gap-2">
          {onContact && (
            <Button 
              variant="primary" 
              size="sm" 
              className="flex-1"
              onClick={onContact}
            >
              Contact
            </Button>
          )}
          <Button 
            variant="secondary" 
            size="sm" 
            className="flex-1"
            onClick={onClick}
          >
            View Profile
          </Button>
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div className="dealer-card" onClick={onClick}>
      <div className="dealer-card-avatar">
        {dealer.avatar ? (
          <img 
            src={dealer.avatar} 
            alt={dealer.name}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          getInitials(dealer.name)
        )}
      </div>
      <div className="dealer-card-info flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="dealer-card-name truncate">{dealer.name}</p>
          {dealer.verified && (
            <Badge variant="success" size="sm">Verified</Badge>
          )}
        </div>
        <div className="dealer-card-meta">
          {dealer.city && (
            <span className="flex items-center gap-1">
              <MapPin size={12} />
              {dealer.city}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-2 text-sm">
          {dealer.rating && (
            <span className="flex items-center gap-1">
              <Star size={14} className="text-warning fill-current" />
              <span className="font-medium">{formatRating(dealer.rating)}</span>
              {dealer.reviewCount && (
                <span className="text-muted">({dealer.reviewCount})</span>
              )}
            </span>
          )}
          {dealer.vehicleCount && (
            <span className="text-muted">{dealer.vehicleCount} vehicles</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {dealer.phone && onContact && (
          <button
            onClick={(e) => { e.stopPropagation(); onContact(); }}
            className="p-2 rounded-full hover:bg-bg-secondary transition-colors"
          >
            <Phone size={18} className="text-brand" />
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onClick?.(); }}
          className="p-2 rounded-full hover:bg-bg-secondary transition-colors"
        >
          <ArrowRight size={18} className="text-muted" />
        </button>
      </div>
    </div>
  );
};

export const DealerCard = memo(DealerCardComponent);

export default DealerCard;

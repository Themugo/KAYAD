import { memo, useState, useEffect } from 'react';
import { Clock, Gavel, Users } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

export interface Auction {
  id: string;
  vehicleId: number;
  vehicleName: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleImage: string;
  startingBid: number;
  currentBid?: number;
  bidCount?: number;
  endTime: string;
  status?: 'upcoming' | 'live' | 'ended';
  location?: string;
  isVerified?: boolean;
}

export interface AuctionCardProps {
  auction: Auction;
  onClick?: () => void;
  onBid?: () => void;
  variant?: 'default' | 'compact' | 'list';
}

const AuctionCardComponent = ({
  auction,
  onClick,
  onBid,
  variant = 'default',
}: AuctionCardProps) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const end = new Date(auction.endTime).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft('Ended');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else if (minutes > 0) {
        setTimeLeft(`${minutes}m ${seconds}s`);
      } else {
        setTimeLeft(`${seconds}s`);
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [auction.endTime]);

  const currentPrice = auction.currentBid || auction.startingBid;
  const formattedPrice = `KES ${currentPrice.toLocaleString('en-KE')}`;
  const isLive = auction.status === 'live';

  if (variant === 'compact') {
    return (
      <div className="auction-card" onClick={onClick}>
        <div className="auction-card-header">
          <div className="flex items-center gap-2">
            {isLive && (
              <Badge variant="danger" size="sm" dot>Live</Badge>
            )}
            <span className="text-xs text-white/60 uppercase tracking-wider">
              {auction.vehicleMake}
            </span>
          </div>
          <div className="auction-card-timer">
            <Clock size={14} />
            {timeLeft}
          </div>
        </div>
        <div className="flex gap-4 p-4">
          <img 
            src={auction.vehicleImage} 
            alt={auction.vehicleName}
            className="w-24 h-18 object-cover rounded-md"
          />
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm truncate">{auction.vehicleModel}</h4>
            <p className="text-lg font-bold text-brand mt-1">{formattedPrice}</p>
            {auction.bidCount && (
              <p className="text-xs text-muted mt-1">{auction.bidCount} bids</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'list') {
    return (
      <div 
        className="flex items-center gap-4 p-4 bg-card border border-border rounded-lg hover:border-brand transition-colors cursor-pointer"
        onClick={onClick}
      >
        <img 
          src={auction.vehicleImage} 
          alt={auction.vehicleName}
          className="w-20 h-16 object-cover rounded-md"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold truncate">{auction.vehicleModel}</h4>
            {isLive && <Badge variant="danger" size="sm" dot>Live</Badge>}
          </div>
          <p className="text-sm text-muted">{auction.vehicleMake}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted uppercase tracking-wider">
            {auction.currentBid ? 'Current Bid' : 'Starting'}
          </p>
          <p className="font-bold text-brand">{formattedPrice}</p>
        </div>
        <div className="text-right min-w-20">
          <p className="text-xs text-muted uppercase tracking-wider">Time Left</p>
          <p className="font-mono font-semibold">{timeLeft}</p>
        </div>
        {onBid && isLive && (
          <Button size="sm" onClick={(e) => { e.stopPropagation(); onBid(); }}>
            <Gavel size={14} />
            Bid
          </Button>
        )}
      </div>
    );
  }

  // Default variant
  return (
    <div className="auction-card">
      <div className="auction-card-header">
        <div className="flex items-center gap-2">
          {isLive && (
            <Badge variant="danger" size="sm" dot>Live</Badge>
          )}
          <span className="text-xs text-white/60 uppercase tracking-wider">
            {auction.vehicleMake}
          </span>
        </div>
        <div className="auction-card-timer">
          <Clock size={14} />
          {timeLeft}
        </div>
      </div>
      <div className="vehicle-card-image aspect-video" onClick={onClick}>
        <img 
          src={auction.vehicleImage} 
          alt={auction.vehicleName}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="p-4">
        <h4 className="font-semibold text-lg text-primary truncate" onClick={onClick}>
          {auction.vehicleModel}
        </h4>
        {auction.location && (
          <p className="text-sm text-muted mt-1">{auction.location}</p>
        )}
        <div className="auction-card-current-bid mt-4 mb-4">
          <p className="auction-card-bid-label">
            {auction.currentBid ? 'Current Bid' : 'Starting Bid'}
          </p>
          <p className="auction-card-bid-amount">{formattedPrice}</p>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-sm text-muted">
            <Users size={14} />
            {auction.bidCount || 0} bids
          </div>
          {onBid && isLive && (
            <Button size="sm" onClick={onBid}>
              <Gavel size={14} />
              Place Bid
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export const AuctionCard = memo(AuctionCardComponent);

export default AuctionCard;

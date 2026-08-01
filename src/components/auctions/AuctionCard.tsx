import React from 'react';
import { 
  Clock, 
  Users, 
  Shield, 
  ShieldCheck,
  ClipboardCheck,
  Eye,
  Gavel,
  MapPin,
  ChevronRight
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

export interface AuctionCardProps {
  id: string;
  title: string;
  imageUrl: string;
  year: number;
  currentBid: number;
  startingBid: number;
  bidsCount: number;
  endsInSeconds?: number;
  startsInSeconds?: number;
  status: 'live' | 'upcoming' | 'ended' | 'suspended';
  reserveStatus?: 'met' | 'near' | 'no_reserve' | 'not_met';
  location: string;
  inspectionScore?: number;
  organizerName: string;
  organizerType: string;
  organizerVerified: boolean;
  onViewDetails?: () => void;
  onRegister?: () => void;
  onBid?: () => void;
  compact?: boolean;
}

const formatCurrency = (amount: number) => {
  if (amount >= 1000000) {
    return `Ksh ${(amount / 1000000).toFixed(1)}M`;
  }
  return `Ksh ${amount.toLocaleString()}`;
};

const formatTimeRemaining = (seconds: number) => {
  if (seconds <= 0) return 'Ended';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  
  return `${minutes}m`;
};

export const AuctionCard: React.FC<AuctionCardProps> = ({
  id,
  title,
  imageUrl,
  year,
  currentBid,
  startingBid,
  bidsCount,
  endsInSeconds = 0,
  startsInSeconds,
  status,
  reserveStatus,
  location,
  inspectionScore,
  organizerName,
  organizerType,
  organizerVerified,
  onViewDetails,
  onRegister,
  onBid,
  compact = false,
}) => {
  const displayPrice = status === 'upcoming' ? startingBid : currentBid;
  const isLive = status === 'live';
  const isUpcoming = status === 'upcoming';
  const isEnded = status === 'ended' || status === 'suspended';

  // Reserve status badge
  const getReserveBadge = () => {
    if (!reserveStatus || reserveStatus === 'no_reserve') return null;
    
    const styles = {
      met: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      near: 'bg-amber-100 text-amber-700 border-amber-200',
      not_met: 'bg-red-100 text-red-700 border-red-200',
    };
    
    const labels = {
      met: 'Reserve Met',
      near: 'Near Reserve',
      not_met: 'Reserve Not Met',
    };
    
    return (
      <Badge size="sm" className={styles[reserveStatus]}>
        {reserveStatus === 'met' && <ShieldCheck className="w-3 h-3 mr-1" />}
        {labels[reserveStatus]}
      </Badge>
    );
  };

  // Status badge
  const getStatusBadge = () => {
    if (isLive) {
      return (
        <Badge size="sm" className="bg-red-100 text-red-700 border-red-200 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-red-500 mr-1 animate-ping" />
          LIVE
        </Badge>
      );
    }
    if (isUpcoming) {
      return (
        <Badge size="sm" className="bg-blue-100 text-blue-700 border-blue-200">
          UPCOMING
        </Badge>
      );
    }
    if (status === 'suspended') {
      return (
        <Badge size="sm" className="bg-slate-100 text-slate-600 border-slate-200">
          SUSPENDED
        </Badge>
      );
    }
    return (
      <Badge size="sm" className="bg-slate-100 text-slate-500 border-slate-200">
        ENDED
      </Badge>
    );
  };

  if (compact) {
    return (
      <Card className="group overflow-hidden hover:shadow-lg transition-all cursor-pointer" onClick={onViewDetails}>
        <div className="relative aspect-[16/10] overflow-hidden">
          <img 
            src={imageUrl} 
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute top-2 left-2 flex gap-1.5">
            {getStatusBadge()}
          </div>
          {isLive && endsInSeconds > 0 && (
            <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 rounded-lg">
              <span className="text-xs font-bold text-white flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTimeRemaining(endsInSeconds)}
              </span>
            </div>
          )}
        </div>
        <div className="p-3">
          <h3 className="font-bold text-sm text-[#1E3063] truncate mb-1">{title}</h3>
          <div className="flex items-center justify-between">
            <span className="text-xs text-emerald-600 font-bold">{formatCurrency(displayPrice)}</span>
            <span className="text-xs text-slate-500">{bidsCount} bids</span>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="group overflow-hidden hover:shadow-lg transition-all">
      {/* Image Section */}
      <div className="relative aspect-[16/9] overflow-hidden">
        <img 
          src={imageUrl} 
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        
        {/* Status Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {getStatusBadge()}
          {getReserveBadge()}
        </div>

        {/* Inspection Badge */}
        {inspectionScore && inspectionScore >= 95 && (
          <div className="absolute top-3 right-3">
            <Badge size="sm" className="bg-emerald-100 text-emerald-700 border-emerald-200">
              <ClipboardCheck className="w-3 h-3 mr-1" />
              Inspected
            </Badge>
          </div>
        )}

        {/* Time Remaining Overlay */}
        {isLive && endsInSeconds > 0 && (
          <div className="absolute bottom-3 left-3">
            <div className="px-3 py-1.5 bg-red-600 rounded-lg">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Ends in {formatTimeRemaining(endsInSeconds)}
              </span>
            </div>
          </div>
        )}

        {isUpcoming && startsInSeconds && startsInSeconds > 0 && (
          <div className="absolute bottom-3 left-3">
            <div className="px-3 py-1.5 bg-blue-600 rounded-lg">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Starts in {formatTimeRemaining(startsInSeconds)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-4 space-y-4">
        {/* Vehicle Info */}
        <div>
          <h3 className="font-bold text-[#1E3063] text-lg leading-tight mb-1">{title}</h3>
          <p className="text-sm text-slate-500">{year} • {location}</p>
        </div>

        {/* Price & Bids */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-slate-500 mb-0.5">
              {isUpcoming ? 'Starting Bid' : isEnded ? 'Final Price' : 'Current Bid'}
            </p>
            <p className="text-2xl font-black text-[#1E3063]">{formatCurrency(displayPrice)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 mb-0.5">Bids</p>
            <p className="text-lg font-bold text-slate-700 flex items-center gap-1">
              <Users className="w-4 h-4" />
              {bidsCount}
            </p>
          </div>
        </div>

        {/* Organizer Trust Info */}
        <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
          {organizerVerified ? (
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
              <Gavel className="w-4 h-4 text-slate-500" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate">{organizerName}</p>
            <p className="text-xs text-slate-500">{organizerType}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={onViewDetails}
          >
            View Details
          </Button>
          {isLive && (
            <Button 
              variant="primary" 
              size="sm" 
              className="flex-1 bg-[#1E3063] hover:bg-[#2a4080]"
              onClick={onBid}
            >
              Place Bid
            </Button>
          )}
          {isUpcoming && (
            <Button 
              variant="primary" 
              size="sm" 
              className="flex-1 bg-[#1E3063] hover:bg-[#2a4080]"
              onClick={onRegister}
            >
              Register
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};

export default AuctionCard;

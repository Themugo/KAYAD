// src/components/CarCard.tsx
import { memo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MapPin, Clock, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatKES } from '../api/api';
import ReportButton from './ReportButton';

interface Car {
  _id: string;
  title: string;
  brand?: string;
  images?: Array<{ url?: string } | string>;
  coverImage?: number;
  auctionStartTime?: string;
  auctionEnd?: string;
  currentBid?: number;
  price?: number;
  dealer?: {
    name?: string;
    businessName?: string;
    isBank?: boolean;
  };
  bankOwned?: boolean;
  isDemo?: boolean;
  year?: number;
  fuel?: string;
  mileage?: number;
  location?: {
    city?: string;
  };
}

interface CarCardProps {
  car: Car;
  isComparing?: boolean;
  onToggleCompare?: () => void;
  compareCount?: number;
  onFavorite?: (carId: string) => void;
  isFavorited?: boolean;
}

const CarCard = memo(function CarCard({ 
  car, 
  isComparing = false, 
  onToggleCompare, 
  compareCount = 0,
  onFavorite,
  isFavorited = false 
}: CarCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);

  const coverIdx = car.coverImage ?? 0;
  const img = typeof car.images?.[coverIdx] === 'string' ? car.images[coverIdx] : car.images?.[coverIdx]?.url;

  // Time-aware auction status — don't trust static DB field alone
  const now = Date.now();
  const auctionStartTime = car.auctionStartTime ? new Date(car.auctionStartTime).getTime() : 0;
  const auctionEnd = car.auctionEnd ? new Date(car.auctionEnd).getTime() : 0;
  const isLiveNow = auctionStartTime > 0 && auctionEnd > 0 && auctionStartTime <= now && auctionEnd > now;
  const isScheduled = auctionStartTime > now;
  const isOnAuction = isLiveNow || isScheduled;

  const currentPrice = isOnAuction && car.currentBid && car.currentBid > 0 ? car.currentBid : car.price;
  const linkTo = isLiveNow ? `/auction/${car._id}` : `/cars/${car._id}`;
  const sellerName = car.dealer?.name || car.dealer?.businessName || '';
  const isBank = car.dealer?.isBank || car.bankOwned;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="card group relative overflow-hidden h-full flex flex-col"
    >
      <Link to={linkTo} className="flex flex-col h-full">
        {/* Image Section */}
        <div className="relative aspect-[16/10] overflow-hidden">
          {!imgLoaded && (
            <div className="absolute inset-0 bg-surface flex items-center justify-center z-10">
              <span className="text-4xl opacity-30">🚗</span>
            </div>
          )}
          
          {img ? (
            <img
              src={typeof img === 'string' ? img : ''}
              alt={`${car.title}`}
              loading="lazy"
              decoding="async"
              onLoad={() => setImgLoaded(true)}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-6xl opacity-40">
              🚗
            </div>
          )}

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

          {/* Status Badges */}
          {isLiveNow && (
            <span className="absolute top-3 left-3 badge-gold text-[10px] flex items-center gap-1.5"
              style={{ background: 'rgba(239,68,68,0.9)', color: '#fff' }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
              LIVE
            </span>
          )}
          {isScheduled && (
            <span className="absolute top-3 left-3 badge-gold text-[10px]">Upcoming</span>
          )}
          {car.isDemo && (
            <span style={{
              position: 'absolute', top: 8, right: 8,
              background: 'rgba(251,191,36,0.92)', backdropFilter: 'blur(8px)',
              borderRadius: 5, padding: '2px 7px', zIndex: 5,
              fontSize: 8, color: '#0A1628', fontWeight: 800, letterSpacing: '0.04em',
            }}>DEMO</span>
          )}

          {/* Favorite Button */}
          {onFavorite && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onFavorite(car._id);
              }}
              className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center transition-all hover:bg-black/50 z-20"
            >
              <Heart
                size={14}
                className={`transition-colors duration-200 ${
                  isFavorited 
                    ? 'fill-red-500 text-red-500' 
                    : 'text-white'
                }`}
              />
            </button>
          )}

          {/* Price Overlay */}
          <div className="absolute bottom-3 left-3">
            <p className="text-white font-display text-base font-semibold drop-shadow-lg">
              {formatKES(currentPrice || 0)}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 flex flex-col">
          {/* Year & Brand */}
          <p className="text-text-muted text-xs mb-0.5">{car.year} {car.brand}</p>

          {/* Title */}
          <h3 className="font-display text-sm font-semibold text-text group-hover:text-gold transition-colors line-clamp-1 mb-1">
            {car.title}
          </h3>

          {/* Dealer Name */}
          {sellerName && (
            <p className="text-text-dim text-xs mb-2">{sellerName}</p>
          )}

          {/* Specs Row */}
          <div className="mt-auto pt-3 border-t border-border flex items-center justify-between text-xs text-text-muted">
            <span>{car.mileage ? `${Number(car.mileage).toLocaleString()} km` : '-'}</span>
            <span className="capitalize">{car.fuel || '-'}</span>
            {isBank && (
              <span className="flex items-center gap-1 text-success">
                <CheckCircle2 className="w-3 h-3" />
                Verified
              </span>
            )}
          </div>

          <div onClick={e => { e.preventDefault(); e.stopPropagation(); }} style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
            <ReportButton targetType="listing" targetId={car._id} />
          </div>
        </div>
      </Link>

      {/* Compare Button */}
      {onToggleCompare && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleCompare();
          }}
          disabled={compareCount >= 4 && !isComparing}
          title={isComparing ? 'Remove from compare' : compareCount >= 4 ? 'Maximum 4 vehicles' : 'Add to compare'}
          className={`absolute top-3 right-14 z-20 px-3 py-1.5 text-xs font-bold rounded-lg transition-all border backdrop-blur-md
            ${isComparing 
              ? 'bg-gold text-black border-gold' 
              : 'bg-black/70 border-border hover:border-gold text-text-muted hover:text-white'
            }`}
        >
          {isComparing ? '✓' : '⇄'}
        </button>
      )}
    </motion.div>
  );
});

export default CarCard;

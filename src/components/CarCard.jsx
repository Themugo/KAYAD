// src/components/CarCard.jsx
import { memo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MapPin, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatKES } from '../api/api';

const CarCard = memo(function CarCard({ 
  car, 
  isComparing, 
  onToggleCompare, 
  compareCount,
  onFavorite,
  isFavorited = false 
}) {
  const [imgLoaded, setImgLoaded] = useState(false);

  const coverIdx = car.coverImage ?? 0;
  const img = car.images?.[coverIdx]?.url || car.images?.[coverIdx];
  
  const isLive = car.auctionStatus === 'live';
  const currentPrice = isLive && car.currentBid > 0 ? car.currentBid : car.price;

  const linkTo = isLive ? `/auction/${car._id}` : `/cars/${car._id}`;

  return (
    <motion.div
      whileHover={{ y: -6 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="card group relative overflow-hidden h-full flex flex-col"
    >
      <Link to={linkTo} className="flex flex-col h-full">
        {/* Image Section */}
        <div className="car-img-wrap relative">
          {!imgLoaded && (
            <div className="absolute inset-0 bg-surface flex items-center justify-center z-10">
              <span className="text-4xl opacity-30">🚗</span>
            </div>
          )}
          
          {img ? (
            <img
              src={img}
              alt={`${car.title}`}
              loading="lazy"
              decoding="async"
              onLoad={() => setImgLoaded(true)}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="car-img-placeholder flex items-center justify-center h-full text-6xl opacity-40">
              🚗
            </div>
          )}

          {/* Gradient Overlay */}
          <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/80 to-transparent" />

          {/* Badges */}
          {isLive && (
            <div className="absolute top-3 left-3">
              <span className="badge badge-green flex items-center gap-1.5 px-3 py-1 text-xs font-bold tracking-wider">
                <span className="live-dot" /> LIVE AUCTION
              </span>
            </div>
          )}

          {car.isDemo && (
            <div className="absolute top-3 right-3">
              <span className="badge badge-orange text-xs font-bold">DEMO</span>
            </div>
          )}

          {/* Favorite Button */}
          {onFavorite && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onFavorite(car._id);
              }}
              className="absolute top-3 right-3 p-2.5 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-full transition-all hover:scale-110 z-20"
            >
              <Heart
                size={18}
                className={`transition-colors duration-200 ${
                  isFavorited 
                    ? 'fill-red-500 text-red-500' 
                    : 'text-white hover:text-red-400'
                }`}
              />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-5 flex flex-col">
          <h3 className="text-lg font-semibold leading-tight mb-3 line-clamp-2 group-hover:text-gold transition-colors">
            {car.title}
          </h3>

          {/* Quick Specs */}
          <div className="flex flex-wrap gap-2 mb-4">
            {car.year && (
              <span className="text-xs px-3 py-1 bg-surface rounded-md text-text-muted">
                {car.year}
              </span>
            )}
            {car.fuel && (
              <span className="text-xs px-3 py-1 bg-surface rounded-md text-text-muted">
                {car.fuel}
              </span>
            )}
            {car.mileage && (
              <span className="text-xs px-3 py-1 bg-surface rounded-md text-text-muted">
                {Number(car.mileage).toLocaleString()} km
              </span>
            )}
          </div>

          {/* Location */}
          {car.location?.city && (
            <div className="flex items-center gap-1.5 text-text-muted text-sm mb-4">
              <MapPin size={15} />
              <span>{car.location.city}</span>
            </div>
          )}

          <div className="gold-line my-2" />

          {/* Price & Action */}
          <div className="mt-auto flex items-end justify-between">
            <div>
              <p className="price-tag text-2xl font-bold text-gold-light">
                {formatKES(currentPrice)}
              </p>
              {isLive && (
                <div className="flex items-center gap-1 text-xs text-text-muted mt-1">
                  <Clock size={14} />
                  <span>Current Bid</span>
                </div>
              )}
            </div>

            <span className="text-gold text-sm font-medium opacity-70 group-hover:opacity-100 transition-opacity">
              View →
            </span>
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

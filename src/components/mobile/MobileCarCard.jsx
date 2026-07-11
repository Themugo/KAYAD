import { useState, useCallback, useRef, memo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Gauge, Fuel, MapPin, Clock, Shield, 
  Zap, Calendar, ChevronRight 
} from 'lucide-react';

function MobileCarCard({ car, onFavorite, onSwipeAction, style }) {
  const [fav, setFav] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const cardRef = useRef(null);
  const startXRef = useRef(0);

  const id = car._id || car.id;
  const images = car.images?.map(img => typeof img === 'string' ? img : img.url).filter(Boolean) || [];
  const primaryImage = images[0] || car.image || 'https://images.pexels.com/photos/3593922/pexels-photo-3593922.jpeg?auto=compress&cs=tinysrgb&w=800';

  const isAuction = car.auction_status === 'live' || car.isAuction;
  const isLive = car.auction_status === 'live' || car.isLive;
  const isVerified = car.verified || car.isVerified;
  const isInspected = car.inspection_status === 'passed' || car.inspected;

  const price = isAuction && car.currentBid > 0 ? car.currentBid : car.price;
  const dealer = car.dealer?.business_name || car.dealer?.name || car.dealerName || 'Nairobi Auto Hub';
  const mileage = car.mileage != null
    ? (typeof car.mileage === 'number' ? `${(car.mileage / 1000).toFixed(0)}k km` : car.mileage)
    : null;
  const fuel = car.fuel || null;
  const transmission = car.transmission || null;
  const location = car.location?.city || (typeof car.location === 'string' ? car.location : null) || 'Nairobi';
  const year = car.year || null;

  const handleFavorite = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setFav(f => !f);
    onFavorite?.(car, !fav);
  }, [car, fav, onFavorite]);

  // Touch handlers for swipe actions
  const handleTouchStart = useCallback((e) => {
    startXRef.current = e.touches[0].clientX;
    setIsSwiping(true);
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!isSwiping) return;
    
    const currentX = e.touches[0].clientX;
    const diff = currentX - startXRef.current;
    
    // Only allow left swipe (negative values)
    if (diff < 0) {
      setSwipeX(Math.max(diff, -100)); // Cap at -100px
    }
  }, [isSwiping]);

  const handleTouchEnd = useCallback(() => {
    setIsSwiping(false);
    
    if (swipeX < -60) {
      // Threshold reached - trigger action
      onSwipeAction?.('favorite', car);
      setSwipeX(-80); // Keep revealed state briefly
      setTimeout(() => setSwipeX(0), 300);
    } else {
      // Snap back
      setSwipeX(0);
    }
  }, [swipeX, car, onSwipeAction]);

  const formatPrice = (value) => {
    if (value >= 1000000) {
      return `KES ${(value / 1000000).toFixed(1)}M`;
    }
    return `KES ${value.toLocaleString()}`;
  };

  return (
    <Link
      ref={cardRef}
      to={`/cars/${id}`}
      className="mobile-car-card"
      style={{ 
        transform: `translateX(${swipeX}px)`,
        transition: isSwiping ? 'none' : 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        ...style 
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Swipe action reveal */}
      <div 
        className="mobile-car-card__swipe-actions"
        style={{ 
          opacity: Math.min(1, Math.abs(swipeX) / 60),
          transform: `translateX(${100 + swipeX}px)`,
        }}
      >
        <button 
          className="mobile-car-card__swipe-btn"
          style={{ background: 'rgba(239, 68, 68, 0.9)', color: 'white' }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleFavorite(e);
          }}
          aria-label="Save to favorites"
        >
          ♥
        </button>
      </div>

      {/* Image */}
      <div className="mobile-car-card__image-wrap">
        {!imageLoaded && (
          <div className="mobile-car-card__image-skeleton" />
        )}
        <img
          src={primaryImage}
          alt={car.title}
          loading="lazy"
          className="mobile-car-card__image"
          style={{ opacity: imageLoaded ? 1 : 0 }}
          onLoad={() => setImageLoaded(true)}
        />
        
        {/* Badges */}
        <div className="mobile-car-card__badges">
          {isLive && (
            <span className="mobile-car-card__badge mobile-car-card__badge--live">
              LIVE
            </span>
          )}
          {isAuction && !isLive && (
            <span className="mobile-car-card__badge mobile-car-card__badge--auction">
              ⚡ Auction
            </span>
          )}
          {isVerified && (
            <span className="mobile-car-card__badge mobile-car-card__badge--verified">
              ✓ Verified
            </span>
          )}
        </div>

        {/* Favorite button */}
        <button
          className={`mobile-car-card__favorite ${fav ? 'mobile-car-card__favorite--active' : ''}`}
          onClick={handleFavorite}
          aria-label={fav ? 'Remove from favorites' : 'Add to favorites'}
        />

        {/* Image counter if multiple */}
        {images.length > 1 && (
          <div className="mobile-car-card__image-count">
            <span>📷</span>
            <span>{images.length}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="mobile-car-card__content">
        <h3 className="mobile-car-card__title">{car.title}</h3>
        
        <div className="mobile-car-card__dealer">
          {dealer}
          {isInspected && (
            <span style={{ color: 'var(--green-400)', marginLeft: '6px' }}>• Inspected</span>
          )}
        </div>
        
        <div className="mobile-car-card__price">
          <span className="mobile-car-card__price-label">
            {isAuction ? 'Current Bid' : 'Asking Price'}
          </span>
          {formatPrice(price)}
        </div>

        {/* Meta info */}
        <div className="mobile-car-card__meta">
          {year && (
            <span className="mobile-car-card__meta-item">
              <Calendar size={14} className="mobile-car-card__meta-icon" />
              {year}
            </span>
          )}
          {mileage && (
            <span className="mobile-car-card__meta-item">
              <Gauge size={14} className="mobile-car-card__meta-icon" />
              {mileage}
            </span>
          )}
          {fuel && (
            <span className="mobile-car-card__meta-item">
              <Fuel size={14} className="mobile-car-card__meta-icon" />
              {fuel}
            </span>
          )}
          {transmission && (
            <span className="mobile-car-card__meta-item">
              <Zap size={14} className="mobile-car-card__meta-icon" />
              {transmission}
            </span>
          )}
        </div>

        {/* Location & CTA */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginTop: 'var(--mobile-space-3)',
          paddingTop: 'var(--mobile-space-3)',
          borderTop: '1px solid var(--border-soft)',
        }}>
          <span className="mobile-car-card__meta-item">
            <MapPin size={14} className="mobile-car-card__meta-icon" />
            {location}
          </span>
          <span style={{ 
            color: 'var(--gold-400)', 
            fontSize: 'var(--mobile-text-sm)',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
          }}>
            View Details
            <ChevronRight size={14} />
          </span>
        </div>
      </div>
    </Link>
  );
}

// Skeleton card for loading state
export function MobileCarCardSkeleton() {
  return (
    <div className="mobile-car-card" style={{ pointerEvents: 'none' }}>
      <div className="mobile-car-card__image-wrap">
        <div className="mobile-car-card__image-skeleton" />
      </div>
      <div className="mobile-car-card__content">
        <div className="mobile-skeleton-line mobile-skeleton-line--title" />
        <div className="mobile-skeleton-line mobile-skeleton-line--subtitle" />
        <div className="mobile-skeleton-line mobile-skeleton-line--price" />
        <div className="mobile-car-card__meta" style={{ marginTop: 'var(--mobile-space-3)' }}>
          <div className="mobile-skeleton-line" style={{ width: '60px', height: '14px' }} />
          <div className="mobile-skeleton-line" style={{ width: '50px', height: '14px' }} />
        </div>
      </div>
    </div>
  );
}

export default memo(MobileCarCard);

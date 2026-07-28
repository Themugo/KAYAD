import { memo, useState, useCallback } from 'react';
import { Calendar, Gauge, Fuel, MapPin, Shield, Gavel, Heart, BarChart3, Eye } from 'lucide-react';
import LazyImage from '../common/LazyImage';
import { useDesignTheme } from '../../../theme/DesignThemeProvider';

export interface Car {
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
  isBankOwned?: boolean;
  isDemo?: boolean;
  isNegotiable?: boolean;
  hasFinancing?: boolean;
  views?: number;
  createdAt?: string;
  currentBid?: number;
  auctionEnd?: string;
  listedDate?: string;
}

interface CarCardProps {
  car: Car;
  onClick?: () => void;
  onCompare?: () => void;
  onFavorite?: () => void;
  isFavorited?: boolean;
  isComparing?: boolean;
}

function CarCardComponent({
  car,
  onClick,
  onCompare,
  onFavorite,
  isFavorited = false,
  isComparing = false,
}: CarCardProps) {
  const { theme } = useDesignTheme();
  const [imgLoaded, setImgLoaded] = useState(false);

  const layout = theme.layouts.card || 'standard';
  const c = theme.colors;

  const now = Date.now();
  const auctionEnd = car.auctionEnd ? new Date(car.auctionEnd).getTime() : 0;
  const isOnAuction = car.badges.includes('auction') && auctionEnd > now;
  const currentPrice = isOnAuction && car.currentBid && car.currentBid > 0 ? car.currentBid : car.price;
  const formattedPrice = `KES ${currentPrice.toLocaleString('en-KE')}`;

  const handleImageLoad = useCallback(() => setImgLoaded(true), []);

  // ── MAGAZINE LAYOUT ──────────────────────────────────────────────
  if (layout === 'magazine') {
    return (
      <div
        onClick={onClick}
        className="group relative overflow-hidden cursor-pointer"
        style={{
          borderRadius: 'var(--radius, 16px)',
          border: `1px solid ${c.cardBorder}`,
          background: c.cardBg,
        }}
      >
        {/* Image with gradient overlay */}
        <div className="relative overflow-hidden" style={{ aspectRatio: '3/4' }}>
          <LazyImage
            src={car.image}
            alt={`${car.make} ${car.model}`}
            width={400}
            height={533}
            className="w-full h-full"
            onLoad={handleImageLoad}
            style={{
              opacity: imgLoaded ? 1 : 0,
              transition: 'transform 0.6s ease',
            }}
          />
          {!imgLoaded && (
            <div className="absolute inset-0 animate-pulse" style={{ background: c.cardBorder }} />
          )}

          {/* Full gradient overlay for magazine */}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to top, ${c.cardBg}ee 0%, ${c.cardBg}88 30%, transparent 60%)`,
            }}
          />

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
            {isOnAuction && (
              <span className="card-badge backdrop-blur-sm" style={{ background: 'rgba(239,68,68,0.92)', color: '#fff' }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#fff' }} />
                LIVE
              </span>
            )}
            {car.badges.includes('escrow') && (
              <span className="card-badge backdrop-blur-sm" style={{ background: 'rgba(30,30,30,0.88)', color: '#fff' }}>
                <Shield size={10} />
                ESCROW
              </span>
            )}
            {car.isVerified && (
              <span className="card-badge backdrop-blur-sm" style={{ background: 'rgba(16,185,129,0.92)', color: '#fff' }}>
                ✓ VERIFIED
              </span>
            )}
          </div>

          {/* Actions top-right */}
          <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-10">
            {onFavorite && (
              <button
                onClick={(e) => { e.stopPropagation(); onFavorite(); }}
                className="p-2 rounded-full backdrop-blur-md transition-all hover:scale-110"
                style={{
                  background: isFavorited ? 'rgba(239,68,68,0.9)' : 'rgba(0,0,0,0.5)',
                  color: '#fff',
                  border: 'none',
                }}
              >
                <Heart size={16} className={isFavorited ? 'fill-current' : ''} />
              </button>
            )}
            {onCompare && (
              <button
                onClick={(e) => { e.stopPropagation(); onCompare(); }}
                className="p-2 rounded-full backdrop-blur-md transition-all hover:scale-110"
                style={{
                  background: isComparing ? c.cardAccent : 'rgba(0,0,0,0.5)',
                  color: '#fff',
                  border: 'none',
                  opacity: isComparing ? 1 : undefined,
                }}
              >
                <BarChart3 size={16} />
              </button>
            )}
          </div>

          {/* Type tag bottom-right */}
          <div className="absolute bottom-3 right-3 z-10">
            <span
              className="card-badge backdrop-blur-sm"
              style={{
                background: `${c.cardBg}dd`,
                color: c.cardBody,
                fontWeight: 600,
              }}
            >
              {car.type}
            </span>
          </div>

          {/* Magazine-style text over image */}
          <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
            <p className="section-label" style={{ color: c.cardAccent, marginBottom: 2 }}>
              {car.make}
            </p>
            <h3
              className="font-bold leading-tight line-clamp-2 m-0"
              style={{
                color: c.cardHeading,
                fontFamily: `var(--font-heading, ${theme.fonts.heading})`,
                fontSize: 'clamp(1.2rem, 3vw, 1.6rem)',
              }}
            >
              {car.model}
            </h3>
            <p
              className="font-bold mt-2 m-0"
              style={{
                color: c.cardAccent,
                fontFamily: `var(--font-heading, ${theme.fonts.heading})`,
                fontSize: '1.4rem',
              }}
            >
              {formattedPrice}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── COMPACT LAYOUT ───────────────────────────────────────────────
  if (layout === 'compact') {
    return (
      <div
        onClick={onClick}
        className="group flex overflow-hidden cursor-pointer"
        style={{
          borderRadius: 'var(--radius, 16px)',
          border: `1px solid ${c.cardBorder}`,
          background: c.cardBg,
          transition: 'box-shadow 0.3s ease, transform 0.3s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.08)';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        {/* Image */}
        <div className="relative overflow-hidden flex-shrink-0" style={{ width: 140, height: 120 }}>
          <LazyImage
            src={car.image}
            alt={`${car.make} ${car.model}`}
            width={400}
            height={300}
            className="w-full h-full"
            onLoad={handleImageLoad}
            style={{ opacity: imgLoaded ? 1 : 0 }}
          />
          {!imgLoaded && (
            <div className="absolute inset-0 animate-pulse" style={{ background: c.cardBorder }} />
          )}

          {/* Badges inline */}
          {isOnAuction && (
            <span
              className="card-badge absolute top-1.5 left-1.5 backdrop-blur-sm"
              style={{ background: 'rgba(239,68,68,0.92)', color: '#fff', fontSize: 7 }}
            >
              <span className="w-1 h-1 rounded-full animate-pulse" style={{ background: '#fff' }} />
              LIVE
            </span>
          )}
          {car.badges.includes('escrow') && (
            <span
              className="card-badge absolute bottom-1.5 left-1.5 backdrop-blur-sm"
              style={{ background: 'rgba(30,30,30,0.88)', color: '#fff', fontSize: 7 }}
            >
              <Shield size={8} />
              ESCROW
            </span>
          )}

          {/* Type tag */}
          <span
            className="absolute bottom-1.5 right-1.5 backdrop-blur-sm"
            style={{
              background: `${c.cardBg}dd`,
              color: c.cardBody,
              fontSize: 8,
              fontWeight: 700,
              padding: '1px 6px',
              borderRadius: 'var(--radius, 16px)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            {car.type}
          </span>
        </div>

        {/* Content inline */}
        <div className="flex-1 card-pad flex flex-col justify-between min-w-0" style={{ padding: 10 }}>
          <div>
            <p className="section-label m-0" style={{ fontSize: 9, marginBottom: 1 }}>{car.make}</p>
            <h3
              className="font-semibold line-clamp-1 m-0"
              style={{
                color: c.cardHeading,
                fontFamily: `var(--font-heading, ${theme.fonts.heading})`,
                fontSize: 14,
                lineHeight: 1.3,
              }}
            >
              {car.model}
            </h3>

            {/* Inline specs */}
            <div className="flex items-center gap-2 mt-1" style={{ fontSize: 10, color: c.cardBody, opacity: 0.7 }}>
              <span className="flex items-center gap-0.5"><Calendar size={9} />{car.year}</span>
              <span>·</span>
              <span>{car.mileage}</span>
              <span>·</span>
              <span>{car.fuel}</span>
            </div>
          </div>

          <div className="flex items-end justify-between mt-1">
            <p
              className="font-bold m-0"
              style={{ color: c.cardHeading, fontSize: 15 }}
            >
              {formattedPrice}
            </p>

            {/* Actions */}
            <div className="flex items-center gap-1">
              {onFavorite && (
                <button
                  onClick={(e) => { e.stopPropagation(); onFavorite(); }}
                  className="p-1 rounded-full transition-colors"
                  style={{ color: isFavorited ? '#ef4444' : c.cardBody, background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <Heart size={13} className={isFavorited ? 'fill-current' : ''} />
                </button>
              )}
              {onCompare && (
                <button
                  onClick={(e) => { e.stopPropagation(); onCompare(); }}
                  className="p-1 rounded-full transition-colors"
                  style={{
                    color: isComparing ? c.cardAccent : c.cardBody,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <BarChart3 size={13} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── STANDARD LAYOUT (default) ────────────────────────────────────
  return (
    <div
      onClick={onClick}
      className="group overflow-hidden cursor-pointer"
      style={{
        borderRadius: 'var(--radius, 16px)',
        border: `1px solid ${c.cardBorder}`,
        background: c.cardBg,
        transition: 'box-shadow 0.3s ease, transform 0.3s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.08)';
        e.currentTarget.style.transform = 'translateY(-4px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Image */}
      <div className="relative overflow-hidden" style={{ aspectRatio: '16/10' }}>
        <LazyImage
          src={car.image}
          alt={`${car.make} ${car.model}`}
          width={400}
          height={250}
          className="w-full h-full"
          onLoad={handleImageLoad}
          style={{
            opacity: imgLoaded ? 1 : 0,
            transition: 'transform 0.5s ease',
          }}
        />
        {!imgLoaded && (
          <div className="absolute inset-0 animate-pulse" style={{ background: c.cardBorder }} />
        )}

        {/* Hover zoom effect via CSS */}
        <style>{`
          .car-card-img:hover img { transform: scale(1.05); }
        `}</style>
        <div className="absolute inset-0 car-card-img">
          {/* This inner div triggers the sibling img scale on group-hover */}
        </div>

        {/* Gradient overlay */}
        <div
          className="absolute inset-x-0 bottom-0"
          style={{
            height: '40%',
            background: 'linear-gradient(to top, rgba(0,0,0,0.35), transparent)',
          }}
        />

        {/* Badges - Top Left (simplified) */}
        <div className="absolute top-3 left-3 flex gap-1.5">
          {isOnAuction && (
            <span className="card-badge backdrop-blur-sm" style={{ background: 'rgba(239,68,68,0.92)', color: '#fff' }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#fff' }} />
              LIVE
            </span>
          )}
          {(car.badges.includes('escrow') || car.isVerified) && (
            <span className="card-badge backdrop-blur-sm" style={{ background: 'rgba(16,185,129,0.88)', color: '#fff' }}>
              <Shield size={10} />
              {car.isVerified ? 'VERIFIED' : 'ESCROW'}
            </span>
          )}
        </div>

        {/* Badges - Top Right: Favorite & Compare */}
        <div className="absolute top-3 right-3 flex flex-col gap-1.5">
          {onFavorite && (
            <button
              onClick={(e) => { e.stopPropagation(); onFavorite(); }}
              className="p-2 rounded-full backdrop-blur-md transition-all hover:scale-110"
              style={{
                background: isFavorited ? 'rgba(239,68,68,0.9)' : 'rgba(0,0,0,0.55)',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <Heart size={16} className={isFavorited ? 'fill-current' : ''} />
            </button>
          )}
          {onCompare && (
            <button
              onClick={(e) => { e.stopPropagation(); onCompare(); }}
              className="p-2 rounded-full backdrop-blur-md transition-all hover:scale-110"
              style={{
                background: isComparing ? c.cardAccent : 'rgba(0,0,0,0.55)',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
              }}
              title={isComparing ? 'Remove from compare' : 'Add to compare'}
            >
              <BarChart3 size={16} />
            </button>
          )}
        </div>

        {/* Vehicle type tag - bottom right */}
        <div className="absolute bottom-3 right-3">
          <span
            className="card-badge backdrop-blur-sm"
            style={{
              background: `${c.cardBg}dd`,
              color: c.cardBody,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {car.type}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="card-pad" style={{ padding: 'var(--card-pad, 20px)' }}>
        {/* Make label */}
        <p className="section-label m-0" style={{ marginBottom: 2 }}>{car.make}</p>

        {/* Model heading */}
        <h3
          className="font-semibold line-clamp-1 m-0"
          style={{
            color: c.cardHeading,
            fontFamily: `var(--font-heading, ${theme.fonts.heading})`,
            fontSize: '1.15rem',
            lineHeight: 1.3,
            marginBottom: 8,
            transition: 'color 0.2s ease',
          }}
        >
          {car.model}
        </h3>

        {/* Price */}
        <div style={{ marginBottom: 12 }}>
          <p
            className="m-0"
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: c.cardBody,
              opacity: 0.5,
              marginBottom: 2,
            }}
          >
            {isOnAuction ? (car.currentBid ? 'Current Bid' : 'Starting Bid') : 'Price'}
          </p>
          <p
            className="font-bold m-0"
            style={{
              color: c.cardHeading,
              fontSize: '1.35rem',
            }}
          >
            {formattedPrice}
          </p>
          {car.isNegotiable && (
            <span style={{ fontSize: 11, color: c.cardBody, opacity: 0.5 }}>Negotiable</span>
          )}
        </div>

        {/* Specs grid */}
        <div
          className="grid grid-cols-2 gap-2"
          style={{ marginBottom: 14 }}
        >
          <div className="flex items-center gap-1.5" style={{ fontSize: 12, color: c.cardBody }}>
            <Calendar size={13} style={{ color: c.cardAccent, flexShrink: 0 }} />
            <span>{car.year}</span>
          </div>
          <div className="flex items-center gap-1.5" style={{ fontSize: 12, color: c.cardBody }}>
            <Gauge size={13} style={{ color: c.cardAccent, flexShrink: 0 }} />
            <span>{car.mileage}</span>
          </div>
          <div className="flex items-center gap-1.5" style={{ fontSize: 12, color: c.cardBody }}>
            <Fuel size={13} style={{ color: c.cardAccent, flexShrink: 0 }} />
            <span>{car.fuel}</span>
          </div>
          <div className="flex items-center gap-1.5" style={{ fontSize: 12, color: c.cardBody }}>
            <MapPin size={13} style={{ color: c.cardAccent, flexShrink: 0 }} />
            <span className="line-clamp-1">{car.city}</span>
          </div>
        </div>

        {/* View Details button with hover fill */}
        <button
          onClick={(e) => { e.stopPropagation(); onClick?.(); }}
          className="w-full relative overflow-hidden text-center"
          style={{
            padding: '10px 0',
            borderRadius: 'calc(var(--radius, 16px) * 0.6)',
            border: `1.5px solid ${c.cardAccent}`,
            background: 'transparent',
            color: c.cardAccent,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'color 0.3s ease',
            fontFamily: `var(--font-body, ${theme.fonts.body})`,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = c.cardAccent;
            e.currentTarget.style.color = c.cardBg;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = c.cardAccent;
          }}
        >
          View Details
        </button>
      </div>
    </div>
  );
}

const CarCard = memo(CarCardComponent, (prev, next) => {
  return (
    prev.car.id === next.car.id &&
    prev.car.price === next.car.price &&
    prev.car.image === next.car.image &&
    prev.isComparing === next.isComparing &&
    prev.isFavorited === next.isFavorited
  );
});

CarCard.displayName = 'CarCard';

export default CarCard;

// src/components/OptimizedCarGallery.tsx
// High-performance car gallery with virtualization for 100k+ vehicles
// Supports multiple view modes (grid, list, table) with smooth scrolling

import { useState, useCallback, useMemo, memo, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Gauge, MapPin, Eye, Heart, ArrowRight } from 'lucide-react';
import LazyImage from './LazyImage';
import VirtualList from './VirtualList';

// Constants
const ESTIMATED_CARD_HEIGHT = 380;
const GRID_BREAKPOINTS = {
  sm: { columns: 1, minWidth: 300 },
  md: { columns: 2, minWidth: 400 },
  lg: { columns: 3, minWidth: 500 },
  xl: { columns: 4, minWidth: 600 },
};

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1503376780353-7e8f0e4b39f4?q=80&w=1200&auto=format&fit=crop';

// Types
interface CarImage { url?: string; }
interface CarLocation { city?: string; }
interface Car {
  _id: string;
  title: string;
  image?: string;
  images?: (string | CarImage)[];
  coverImage?: number;
  auctionStartTime?: string;
  auctionEnd?: string;
  currentBid?: number;
  price?: number;
  location?: string | CarLocation;
  year?: number;
  fuel?: string;
  transmission?: string;
  mileage?: number;
  ntsaVerified?: boolean;
  isDemo?: boolean;
  isPromoted?: boolean;
  escrowEnabled?: boolean;
  dealer?: { name?: string; businessName?: string; logo?: string; _id?: string; role?: string; verified?: boolean };
  seller?: { name?: string; avatar?: string; _id?: string };
  createdAt?: string;
  status?: string;
  paymentStatus?: string;
}

interface OptimizedCarGalleryProps {
  cars: Car[];
  loading?: boolean;
  viewMode?: 'grid' | 'list' | 'table';
  onViewModeChange?: (mode: 'grid' | 'list' | 'table') => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  skeletonCount?: number;
  className?: string;
  useVirtualization?: boolean;
  virtualPageSize?: number;
}

// Utility functions (memoized outside component)
const formatMileage = (km?: number) => km ? `${Math.round(Number(km) / 1000)}k km` : null;
const formatPrice = (price: number) => `KES ${price.toLocaleString()}`;
const getSellerName = (car: Car) => car.dealer?.businessName || car.dealer?.name || car.seller?.name || 'Private Seller';
const getCity = (car: Car) => typeof car.location === 'string' ? car.location : car.location?.city || 'Nairobi';
const getFirstImage = (car: Car) => {
  if (car.image) return car.image;
  const imgs = car.images || [];
  if (!imgs.length) return undefined;
  const idx = typeof car.coverImage === 'number' ? car.coverImage : 0;
  const img = imgs[idx] || imgs[0];
  if (typeof img === 'string' && img) return img;
  if (typeof img === 'object' && img?.url) return img.url;
  return undefined;
};

// Skeleton Card Component
const SkeletonCard = memo(function SkeletonCard() {
  return (
    <div className="car-gallery-skeleton" style={{
      background: 'var(--card)',
      borderRadius: 12,
      overflow: 'hidden',
      border: '1px solid var(--border)',
    }}>
      <div style={{
        aspectRatio: '16/9',
        background: 'linear-gradient(90deg, var(--surface) 25%, var(--card) 50%, var(--surface) 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.4s infinite',
      }} />
      <div style={{ padding: 16 }}>
        <div style={{
          height: 16,
          width: '75%',
          background: 'var(--surface)',
          borderRadius: 4,
          marginBottom: 12,
        }} />
        <div style={{
          height: 12,
          width: '50%',
          background: 'var(--surface)',
          borderRadius: 4,
          marginBottom: 16,
        }} />
        <div style={{
          height: 24,
          width: '40%',
          background: 'var(--surface)',
          borderRadius: 4,
        }} />
      </div>
    </div>
  );
});

// Grid Card Component (memoized)
const GridCard = memo(function GridCard({ car, onFav }: { car: Car; onFav?: (id: string) => void }) {
  const [hovered, setHovered] = useState(false);
  const [fav, setFav] = useState(false);
  
  const now = Date.now();
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
  const img = getFirstImage(car);
  const price = Number(car.currentBid || car.price || 0);
  const city = getCity(car);
  const sellerName = getSellerName(car);
  
  const auctionStartTime = car.auctionStartTime ? new Date(car.auctionStartTime).getTime() : 0;
  const auctionEnd = car.auctionEnd ? new Date(car.auctionEnd).getTime() : 0;
  const isLiveNow = auctionStartTime > 0 && auctionEnd > 0 && auctionStartTime <= now && auctionEnd > now;
  const isUpcomingAuction = auctionStartTime > 0 && auctionStartTime > now;
  const isSold = car.status === 'sold' || car.paymentStatus === 'released';
  const isNewListing = car.createdAt && (now - new Date(car.createdAt).getTime()) < SEVEN_DAYS;
  const showEscrowBadge = car.escrowEnabled || !car.dealer || car.dealer?.role === 'individual_seller';

  const handleFav = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFav(f => !f);
    onFav?.(car._id);
  }, [car._id, onFav]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
    >
      <Link to={`/cars/${car._id}`} style={{ textDecoration: 'none', display: 'block' }}>
        <div style={{
          background: 'var(--card)',
          borderRadius: 12,
          overflow: 'hidden',
          border: '1px solid var(--border)',
          transition: 'border-color 0.2s, transform 0.2s',
          borderColor: hovered ? 'var(--gold)' : 'var(--border)',
          transform: hovered ? 'translateY(-4px)' : 'none',
          boxShadow: hovered ? '0 8px 30px rgba(212, 196, 168, 0.15)' : 'none',
        }}>
          {/* Image */}
          <div style={{ position: 'relative', aspectRatio: '16/9', background: '#0A0A0A' }}>
            <LazyImage
              src={img}
              fallback={FALLBACK_IMAGE}
              alt={car.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            
            {/* Badges */}
            <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {isLiveNow && (
                <span style={{
                  padding: '3px 10px',
                  borderRadius: 9999,
                  fontSize: 9,
                  fontWeight: 700,
                  background: 'rgba(239,68,68,0.92)',
                  color: '#fff',
                  letterSpacing: '0.06em',
                }}>
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#fff', display: 'inline-block', marginRight: 4 }} />
                  LIVE
                </span>
              )}
              {isUpcomingAuction && (
                <span style={{
                  padding: '3px 10px',
                  borderRadius: 9999,
                  fontSize: 9,
                  fontWeight: 700,
                  background: 'rgba(245,158,11,0.92)',
                  color: '#1a1200',
                }}>
                  UPCOMING
                </span>
              )}
              {showEscrowBadge && !isSold && (
                <span style={{
                  padding: '3px 10px',
                  borderRadius: 9999,
                  fontSize: 9,
                  fontWeight: 700,
                  background: 'rgba(34,197,94,0.92)',
                  color: '#fff',
                }}>
                  ESCROW
                </span>
              )}
            </div>

            {/* Favorite Button */}
            <button
              onClick={handleFav}
              style={{
                position: 'absolute',
                top: 10,
                right: 10,
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'rgba(0,0,0,0.5)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                color: fav ? '#ef4444' : '#fff',
                transition: 'transform 0.2s',
                transform: hovered ? 'scale(1.1)' : 'scale(1)',
              }}
            >
              {fav ? '♥' : '♡'}
            </button>

            {/* Sold Overlay */}
            {isSold && (
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0,0,0,0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <span style={{
                  fontSize: 14,
                  fontWeight: 900,
                  color: '#fff',
                  letterSpacing: '0.15em',
                  background: 'rgba(239,68,68,0.85)',
                  padding: '6px 18px',
                  borderRadius: 6,
                }}>
                  SOLD
                </span>
              </div>
            )}
          </div>

          {/* Content */}
          <div style={{ padding: '14px 16px 16px' }}>
            <h3 style={{
              fontSize: 15,
              fontWeight: 600,
              color: '#fff',
              margin: '0 0 4px',
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {car.year && <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 400 }}>{car.year} </span>}
              {car.title}
            </h3>
            
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: '0 0 12px' }}>
              {sellerName}
            </p>

            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {car.currentBid ? 'Current Bid' : 'Price'}
              </div>
              <div style={{
                fontSize: 20,
                fontWeight: 700,
                color: 'var(--gold)',
                fontFamily: 'var(--font-display)',
                fontStyle: 'italic',
              }}>
                {formatPrice(price)}
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              fontSize: 11,
              color: 'rgba(255,255,255,0.5)',
            }}>
              {car.mileage && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Gauge size={12} /> {formatMileage(car.mileage)}
                </span>
              )}
              {car.transmission && <span>{car.transmission}</span>}
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
                <MapPin size={12} /> {city}
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
});

// List Card Component (memoized)
const ListCard = memo(function ListCard({ car, onFav }: { car: Car; onFav?: (id: string) => void }) {
  const [hovered, setHovered] = useState(false);
  const [fav, setFav] = useState(false);
  
  const now = Date.now();
  const img = getFirstImage(car);
  const price = Number(car.currentBid || car.price || 0);
  const city = getCity(car);
  const sellerName = getSellerName(car);
  const auctionStartTime = car.auctionStartTime ? new Date(car.auctionStartTime).getTime() : 0;
  const auctionEnd = car.auctionEnd ? new Date(car.auctionEnd).getTime() : 0;
  const isLiveNow = auctionStartTime > 0 && auctionEnd > 0 && auctionStartTime <= now && auctionEnd > now;

  const handleFav = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFav(f => !f);
    onFav?.(car._id);
  }, [car._id, onFav]);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
    >
      <Link
        to={`/cars/${car._id}`}
        style={{
          display: 'flex',
          gap: 16,
          padding: 12,
          background: hovered ? 'rgba(255,255,255,0.03)' : 'transparent',
          borderRadius: 12,
          textDecoration: 'none',
          color: 'inherit',
          transition: 'background 0.2s',
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Image */}
        <div style={{
          width: 160,
          height: 100,
          borderRadius: 8,
          overflow: 'hidden',
          flexShrink: 0,
          background: '#0A0A0A',
        }}>
          <LazyImage
            src={img}
            fallback={FALLBACK_IMAGE}
            alt={car.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          {isLiveNow && (
            <div style={{
              position: 'absolute',
              top: 4,
              left: 4,
              padding: '2px 6px',
              borderRadius: 4,
              fontSize: 8,
              fontWeight: 700,
              background: 'rgba(239,68,68,0.92)',
              color: '#fff',
            }}>
              LIVE
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{
            fontSize: 14,
            fontWeight: 600,
            color: '#fff',
            margin: '0 0 4px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {car.year && <span style={{ color: 'rgba(255,255,255,0.5)' }}>{car.year} </span>}
            {car.title}
          </h3>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: '0 0 8px' }}>
            {sellerName} · {city}
          </p>
          <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
            {car.mileage && <span>{formatMileage(car.mileage)}</span>}
            {car.transmission && <span>{car.transmission}</span>}
            {car.fuel && <span>{car.fuel}</span>}
          </div>
        </div>

        {/* Price & Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: '0.1em' }}>
              {car.currentBid ? 'BID' : 'PRICE'}
            </div>
            <div style={{
              fontSize: 16,
              fontWeight: 700,
              color: 'var(--gold)',
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
            }}>
              {formatPrice(price)}
            </div>
          </div>
          <button
            onClick={handleFav}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 18,
              color: fav ? '#ef4444' : 'rgba(255,255,255,0.3)',
              padding: 4,
            }}
          >
            {fav ? '♥' : '♡'}
          </button>
        </div>
      </Link>
    </motion.div>
  );
});

// Table Row Component
const TableRow = memo(function TableRow({ car, onFav }: { car: Car; onFav?: (id: string) => void }) {
  const [fav, setFav] = useState(false);
  const img = getFirstImage(car);
  const price = Number(car.currentBid || car.price || 0);
  const city = getCity(car);

  const handleFav = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFav(f => !f);
    onFav?.(car._id);
  }, [car._id, onFav]);

  return (
    <tr style={{ borderBottom: '1px solid var(--border)' }}>
      <td style={{ padding: '12px 8px' }}>
        <Link to={`/cars/${car._id}`} style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: 'inherit' }}>
          <img src={img || FALLBACK_IMAGE} alt="" style={{ width: 80, height: 50, objectFit: 'cover', borderRadius: 6 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{car.year} {car.title}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{city}</div>
          </div>
        </Link>
      </td>
      <td style={{ padding: 12, textAlign: 'center', fontSize: 13 }}>{car.mileage ? formatMileage(car.mileage) : '-'}</td>
      <td style={{ padding: 12, textAlign: 'center', fontSize: 13 }}>{car.transmission || '-'}</td>
      <td style={{ padding: 12, textAlign: 'center', fontSize: 13 }}>{car.fuel || '-'}</td>
      <td style={{ padding: 12, textAlign: 'right', fontSize: 14, fontWeight: 700, color: 'var(--gold)' }}>
        {formatPrice(price)}
      </td>
      <td style={{ padding: 12, textAlign: 'center' }}>
        <button onClick={handleFav} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: fav ? '#ef4444' : 'rgba(255,255,255,0.3)' }}>
          {fav ? '♥' : '♡'}
        </button>
      </td>
    </tr>
  );
});

// Main Gallery Component
export default function OptimizedCarGallery({
  cars,
  loading = false,
  viewMode = 'grid',
  onViewModeChange,
  onLoadMore,
  hasMore = false,
  skeletonCount = 8,
  className,
  useVirtualization = true,
  virtualPageSize = 50,
}: OptimizedCarGalleryProps) {
  const [displayCount, setDisplayCount] = useState(virtualPageSize);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [, sentinelEntry] = useIntersectionObserver({ threshold: 0.1 });

  // Load more when sentinel is visible
  useEffect(() => {
    if (sentinelEntry?.isIntersecting && hasMore && !loading) {
      setDisplayCount(prev => prev + virtualPageSize);
      onLoadMore?.();
    }
  }, [sentinelEntry, hasMore, loading, onLoadMore, virtualPageSize]);

  // Determine if we should use virtualization
  const shouldVirtualize = useMemo(() => 
    useVirtualization && cars.length > 100,
    [useVirtualization, cars.length]
  );

  // Get display cars (for virtual scrolling)
  const displayCars = useMemo(() => 
    shouldVirtualize ? cars.slice(0, displayCount) : cars,
    [cars, shouldVirtualize, displayCount]
  );

  // Memoized handlers
  const handleFav = useCallback((id: string) => {
    // Handle favorite toggle - could call API here
    console.log('Toggle favorite:', id);
  }, []);

  // Render based on view mode
  const renderGridItem = useCallback((car: Car, index: number) => (
    <div key={car._id || index} style={{
      padding: 8,
      minWidth: 280,
      maxWidth: 400,
    }}>
      <GridCard car={car} onFav={handleFav} />
    </div>
  ), [handleFav]);

  const renderListItem = useCallback((car: Car, index: number) => (
    <div key={car._id || index}>
      <ListCard car={car} onFav={handleFav} />
    </div>
  ), [handleFav]);

  // Loading skeletons
  const skeletons = useMemo(() => (
    <div style={{
      display: viewMode === 'grid' ? 'grid' : 'flex',
      flexDirection: viewMode === 'list' ? 'column' : undefined,
      gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(280px, 1fr))' : undefined,
      gap: 16,
    }}>
      {[...Array(skeletonCount)].map((_, i) => (
        viewMode === 'table' ? (
          <tr key={i}><td colSpan={6}><SkeletonCard /></td></tr>
        ) : (
          <SkeletonCard key={i} />
        )
      ))}
    </div>
  ), [viewMode, skeletonCount]);

  // Empty state
  if (!loading && cars.length === 0) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
        <p style={{ fontSize: 18, marginBottom: 8 }}>No vehicles found</p>
        <p style={{ fontSize: 14 }}>Try adjusting your filters or search terms</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* View Mode Toggle */}
      {onViewModeChange && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, justifyContent: 'flex-end' }}>
          <button
            onClick={() => onViewModeChange('grid')}
            style={{
              padding: '8px 12px',
              borderRadius: 6,
              border: 'none',
              background: viewMode === 'grid' ? 'var(--gold)' : 'var(--surface)',
              color: viewMode === 'grid' ? '#000' : 'rgba(255,255,255,0.7)',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Grid
          </button>
          <button
            onClick={() => onViewModeChange('list')}
            style={{
              padding: '8px 12px',
              borderRadius: 6,
              border: 'none',
              background: viewMode === 'list' ? 'var(--gold)' : 'var(--surface)',
              color: viewMode === 'list' ? '#000' : 'rgba(255,255,255,0.7)',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            List
          </button>
          <button
            onClick={() => onViewModeChange('table')}
            style={{
              padding: '8px 12px',
              borderRadius: 6,
              border: 'none',
              background: viewMode === 'table' ? 'var(--gold)' : 'var(--surface)',
              color: viewMode === 'table' ? '#000' : 'rgba(255,255,255,0.7)',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Table
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && cars.length === 0 && skeletons}

      {/* Content */}
      <AnimatePresence mode="wait">
        {viewMode === 'grid' && (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 16,
            }}
          >
            {displayCars.map((car, index) => (
              <GridCard key={car._id || index} car={car} onFav={handleFav} />
            ))}
          </motion.div>
        )}

        {viewMode === 'list' && (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
          >
            {displayCars.map((car, index) => (
              <ListCard key={car._id || index} car={car} onFav={handleFav} />
            ))}
          </motion.div>
        )}

        {viewMode === 'table' && (
          <motion.div
            key="table"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ overflowX: 'auto' }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Vehicle</th>
                  <th style={{ padding: 12, textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Mileage</th>
                  <th style={{ padding: 12, textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Transmission</th>
                  <th style={{ padding: 12, textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Fuel</th>
                  <th style={{ padding: 12, textAlign: 'right', fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Price</th>
                  <th style={{ padding: 12, textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Fav</th>
                </tr>
              </thead>
              <tbody>
                {displayCars.map((car, index) => (
                  <TableRow key={car._id || index} car={car} onFav={handleFav} />
                ))}
              </tbody>
            </table>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading More Indicator */}
      {loading && cars.length > 0 && (
        <div style={{ padding: 20, textAlign: 'center' }}>
          <div className="spinner" />
        </div>
      )}

      {/* Infinite Scroll Sentinel */}
      {hasMore && <div ref={sentinelRef} style={{ height: 1 }} />}

      {/* Stats */}
      <div style={{ marginTop: 16, fontSize: 12, color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
        Showing {displayCars.length} of {cars.length} vehicles
        {shouldVirtualize && ' (virtualized)'}
      </div>
    </div>
  );
}
